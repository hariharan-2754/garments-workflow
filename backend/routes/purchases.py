from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import List, Optional
from bson import ObjectId
from datetime import datetime, timezone
from config.db import get_db
from middleware.auth import get_current_user, require_supervisor_or_above, require_manager_or_above
from models.purchase import (
    PurchaseOrderCreate, PurchaseOrderStatusUpdate,
    GoodsReceiptCreate, PurchaseOrderResponse
)
from utils.audit_helper import log_audit, create_notification

router = APIRouter(prefix="/purchases", tags=["Purchasing & POs"])

def _make_id_query(id_str: str) -> dict:
    if ObjectId.is_valid(id_str):
        return {"$or": [{"_id": ObjectId(id_str)}, {"_id": id_str}]}
    return {"_id": id_str}

def _doc_to_po_res(d: dict) -> dict:
    return {
        "id": str(d["_id"]),
        "poNumber": d.get("poNumber", "PO-000"),
        "supplierId": str(d.get("supplierId")),
        "supplierName": d.get("supplierName", ""),
        "expectedDeliveryDate": d.get("expectedDeliveryDate", ""),
        "items": d.get("items") or [],
        "subtotal": float(d.get("subtotal", 0.0)),
        "taxAmount": float(d.get("taxAmount", 0.0)),
        "discount": float(d.get("discount", 0.0)),
        "totalAmount": float(d.get("totalAmount", 0.0)),
        "status": d.get("status", "Draft"),
        "notes": d.get("notes"),
        "createdAt": d.get("createdAt", "")
    }

@router.get("", response_model=List[PurchaseOrderResponse])
@router.get("/orders", response_model=List[PurchaseOrderResponse])
async def list_purchase_orders(
    status: Optional[str] = Query(None),
    supplierId: Optional[str] = Query(None),
    db=Depends(get_db),
    current_user=Depends(get_current_user)
):
    query = {}
    if status:
        query["status"] = status
    if supplierId:
        query["supplierId"] = supplierId

    docs = await db.purchase_orders.find(query).sort("createdAt", -1).to_list(1000)
    return [_doc_to_po_res(d) for d in docs]

@router.post("", response_model=PurchaseOrderResponse, status_code=status.HTTP_201_CREATED)
async def create_purchase_order(
    body: PurchaseOrderCreate,
    db=Depends(get_db),
    admin=Depends(require_supervisor_or_above)
):
    now = datetime.now(timezone.utc).isoformat()
    count = await db.purchase_orders.count_documents({})
    po_num = f"PO-RAW-{datetime.now().strftime('%y%m')}-{count + 1:04d}"

    subtotal = sum(item.total for item in body.items)
    tax_amt = (subtotal * (body.taxPercent or 0.0)) / 100.0
    discount = body.discount or 0.0
    total = max(0.0, subtotal + tax_amt - discount)

    doc = {
        "poNumber": po_num,
        "supplierId": body.supplierId,
        "supplierName": body.supplierName,
        "expectedDeliveryDate": body.expectedDeliveryDate,
        "items": [item.dict() for item in body.items],
        "subtotal": round(subtotal, 2),
        "taxAmount": round(tax_amt, 2),
        "discount": round(discount, 2),
        "totalAmount": round(total, 2),
        "status": "Pending Approval",
        "notes": body.notes,
        "createdBy": admin.get("name"),
        "createdAt": now
    }

    res = await db.purchase_orders.insert_one(doc)
    doc["_id"] = res.inserted_id

    # Update supplier order count
    await db.suppliers.update_one(_make_id_query(body.supplierId), {"$inc": {"totalOrdersCount": 1}})

    await log_audit(f"Generated Purchase Order {po_num} for {body.supplierName} (Total: ₹{total})", "Purchases", str(doc["_id"]), user=admin)
    return _doc_to_po_res(doc)

@router.put("/{po_id}/status")
async def update_po_status(
    po_id: str,
    body: PurchaseOrderStatusUpdate,
    db=Depends(get_db),
    admin=Depends(require_manager_or_above)
):
    po = await db.purchase_orders.find_one(_make_id_query(po_id))
    if not po:
        raise HTTPException(status_code=404, detail="Purchase order not found")

    await db.purchase_orders.update_one(_make_id_query(po_id), {
        "$set": {"status": body.status, "updatedAt": datetime.now(timezone.utc).isoformat()}
    })

    await log_audit(f"Updated PO {po.get('poNumber')} status to '{body.status}'", "Purchases", po_id, user=admin)
    return {"message": f"PO status updated to {body.status}"}

# ================= GOODS RECEIPT & AUTOMATIC STOCK UPDATE =================
@router.post("/goods-receipt")
async def receive_goods(
    body: GoodsReceiptCreate,
    db=Depends(get_db),
    user=Depends(require_supervisor_or_above)
):
    po = await db.purchase_orders.find_one(_make_id_query(body.purchaseOrderId))
    if not po:
        raise HTTPException(status_code=404, detail="Purchase order not found")

    now = datetime.now(timezone.utc).isoformat()
    receipt_num = f"GRN-{datetime.now().strftime('%y%m')}-{datetime.now().strftime('%M%S')}"

    # Increment stock for each received material & record in inventory ledger
    for item in body.receivedItems:
        mat_query = None
        if item.materialId:
            mat_query = _make_id_query(item.materialId)
        else:
            mat_query = {"name": {"$regex": f"^{item.materialName.strip()}$", "$options": "i"}}

        mat = await db.materials.find_one(mat_query)
        if mat:
            curr = float(mat.get("currentQuantity", 0.0))
            new_qty = curr + float(item.quantity)
            await db.materials.update_one({"_id": mat["_id"]}, {
                "$set": {"currentQuantity": new_qty, "updatedAt": now}
            })
            await db.inventory_ledger.insert_one({
                "materialId": str(mat["_id"]),
                "materialSku": mat.get("sku"),
                "materialName": mat.get("name"),
                "type": "Stock In",
                "quantity": float(item.quantity),
                "balanceAfter": new_qty,
                "reason": f"Goods Receipt against {po.get('poNumber')}",
                "referenceId": receipt_num,
                "performedBy": user.get("name"),
                "timestamp": now
            })

    # Update PO status to Received
    await db.purchase_orders.update_one({"_id": po["_id"]}, {
        "$set": {"status": "Received", "updatedAt": now}
    })

    # Automatically record Material Purchase Expense in transactions
    await db.transactions.insert_one({
        "transactionNumber": f"TXN-PO-{datetime.now().strftime('%y%m')}-{receipt_num[-4:]}",
        "date": now.split("T")[0],
        "type": "Expense",
        "category": "Material Purchase",
        "amount": float(po.get("totalAmount", 0.0)),
        "referenceId": str(po["_id"]),
        "partyName": po.get("supplierName"),
        "description": f"Raw material consignment against PO {po.get('poNumber')} (GRN: {receipt_num})",
        "paymentMethod": "Bank Transfer",
        "status": "Completed",
        "createdAt": now
    })

    await log_audit(f"Received Goods {receipt_num} for PO {po.get('poNumber')} -> Added to Inventory", "Purchases", str(po["_id"]), user=user)
    return {"message": "Goods received successfully. Material inventory and financial ledger updated."}
