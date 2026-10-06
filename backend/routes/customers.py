from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import List, Optional
from bson import ObjectId
from datetime import datetime, timezone
from config.db import get_db
from middleware.auth import get_current_user, require_supervisor_or_above, require_manager_or_above
from models.customer import (
    CustomerCreateRequest, CustomerUpdateRequest,
    CustomerOrderCreate, CustomerOrderResponse
)
from utils.audit_helper import log_audit, create_notification

router = APIRouter(prefix="/customers", tags=["Customers & Sales Orders"])

def _make_id_query(id_str: str) -> dict:
    if ObjectId.is_valid(id_str):
        return {"$or": [{"_id": ObjectId(id_str)}, {"_id": id_str}]}
    return {"_id": id_str}

@router.get("")
async def list_customers(
    search: Optional[str] = Query(None),
    db=Depends(get_db),
    current_user=Depends(get_current_user)
):
    docs = await db.customers.find({}).sort("name", 1).to_list(1000)
    for d in docs:
        d["id"] = str(d["_id"])
    if search:
        s = search.lower().strip()
        docs = [d for d in docs if s in d.get("name", "").lower() or s in d.get("email", "").lower()]
    return docs

@router.post("", status_code=status.HTTP_201_CREATED)
async def create_customer(
    body: CustomerCreateRequest,
    db=Depends(get_db),
    admin=Depends(require_supervisor_or_above)
):
    now = datetime.now(timezone.utc).isoformat()
    doc = body.dict()
    doc["createdAt"] = now
    res = await db.customers.insert_one(doc)
    doc["id"] = str(res.inserted_id)

    await log_audit(f"Created customer profile: {body.name}", "Customers", doc["id"], user=admin)
    return doc

@router.put("/{customer_id}")
async def update_customer(
    customer_id: str,
    body: CustomerUpdateRequest,
    db=Depends(get_db),
    admin=Depends(require_supervisor_or_above)
):
    existing = await db.customers.find_one(_make_id_query(customer_id))
    if not existing:
        raise HTTPException(status_code=404, detail="Customer not found")
    
    update_data = {k: v for k, v in body.dict().items() if v is not None}
    await db.customers.update_one(_make_id_query(customer_id), {"$set": update_data})
    return {"message": "Customer updated successfully"}

# ================= CUSTOMER SALES ORDERS =================
def _doc_to_sales_order_res(d: dict) -> dict:
    return {
        "id": str(d["_id"]),
        "orderNumber": d.get("orderNumber", "SO-000"),
        "customerId": str(d.get("customerId")),
        "customerName": d.get("customerName", "Client"),
        "orderDate": d.get("orderDate", ""),
        "deliveryDate": d.get("deliveryDate", ""),
        "priority": d.get("priority", "Medium"),
        "items": d.get("items") or [],
        "totalQuantity": int(d.get("totalQuantity", 0)),
        "subtotal": float(d.get("subtotal", 0.0)),
        "taxAmount": float(d.get("taxAmount", 0.0)),
        "discount": float(d.get("discount", 0.0)),
        "totalAmount": float(d.get("totalAmount", 0.0)),
        "paymentStatus": d.get("paymentStatus", "Unpaid"),
        "productionStatus": d.get("productionStatus", "Pending"),
        "deliveryStatus": d.get("deliveryStatus", "Pending"),
        "productionOrderId": d.get("productionOrderId"),
        "notes": d.get("notes")
    }

@router.get("/orders/list", response_model=List[CustomerOrderResponse])
@router.get("/orders", response_model=List[CustomerOrderResponse])
async def list_customer_orders(
    customerId: Optional[str] = Query(None),
    paymentStatus: Optional[str] = Query(None),
    productionStatus: Optional[str] = Query(None),
    db=Depends(get_db),
    current_user=Depends(get_current_user)
):
    query = {}
    if customerId:
        query["customerId"] = customerId
    if paymentStatus:
        query["paymentStatus"] = paymentStatus
    if productionStatus:
        query["productionStatus"] = productionStatus

    docs = await db.customer_orders.find(query).sort("orderDate", -1).to_list(1000)
    return [_doc_to_sales_order_res(d) for d in docs]

@router.post("/orders", response_model=CustomerOrderResponse, status_code=status.HTTP_201_CREATED)
async def create_customer_order(
    body: CustomerOrderCreate,
    db=Depends(get_db),
    admin=Depends(require_supervisor_or_above)
):
    now = datetime.now(timezone.utc).isoformat()
    count = await db.customer_orders.count_documents({})
    order_num = f"SO-{datetime.now().strftime('%y%m')}-{count + 1:04d}"

    total_qty = sum(item.quantity for item in body.items)
    subtotal = sum(item.total for item in body.items)
    tax_amt = (subtotal * (body.taxPercent or 0.0)) / 100.0
    discount_amt = body.discount or 0.0
    total_amt = max(0.0, subtotal + tax_amt - discount_amt)

    doc = {
        "orderNumber": order_num,
        "customerId": body.customerId,
        "customerName": body.customerName,
        "orderDate": now.split("T")[0],
        "deliveryDate": body.deliveryDate,
        "priority": body.priority or "Medium",
        "items": [item.dict() for item in body.items],
        "totalQuantity": total_qty,
        "subtotal": round(subtotal, 2),
        "taxAmount": round(tax_amt, 2),
        "discount": round(discount_amt, 2),
        "totalAmount": round(total_amt, 2),
        "paymentStatus": "Unpaid",
        "productionStatus": "Pending",
        "deliveryStatus": "Pending",
        "productionOrderId": None,
        "notes": body.notes,
        "createdAt": now
    }

    # Automatically create linked Production Order
    if body.autoCreateProductionOrder and body.items:
        first_item = body.items[0]
        prod_order_num = f"PO-{order_num}"
        prod_doc = {
            "orderNumber": prod_order_num,
            "customerName": body.customerName,
            "productName": first_item.productName,
            "quantity": total_qty,
            "priority": body.priority or "Medium",
            "dueDate": body.deliveryDate,
            "targetStages": ["Cutting", "Stitching", "Printing", "Embroidery", "Quality Control", "Packing", "Dispatch"],
            "completedStages": [],
            "currentStage": "Cutting",
            "status": "In Progress",
            "notes": f"Auto-generated from Sales Order {order_num}",
            "createdAt": now,
            "updatedAt": now
        }
        res_prod = await db.production_orders.insert_one(prod_doc)
        doc["productionOrderId"] = str(res_prod.inserted_id)

        # Spawn stage 1 job card
        await db.job_cards.insert_one({
            "jobNumber": f"JC-{prod_order_num}-CUT",
            "productionOrderId": str(res_prod.inserted_id),
            "orderNumber": prod_order_num,
            "productName": first_item.productName,
            "department": "Cutting",
            "workerId": None,
            "workerName": None,
            "plannedQuantity": total_qty,
            "completedQuantity": 0,
            "rejectedQuantity": 0,
            "reworkQuantity": 0,
            "status": "Pending",
            "pieceRate": 5.0,
            "dueDate": body.deliveryDate,
            "createdAt": now,
            "updatedAt": now
        })

    res = await db.customer_orders.insert_one(doc)
    doc["_id"] = res.inserted_id

    # Record Accounts Receivable in transactions as pending income
    await log_audit(f"Created Sales Order {order_num} for {body.customerName} (Total: ₹{total_amt})", "Sales", str(doc["_id"]), user=admin)
    return _doc_to_sales_order_res(doc)
