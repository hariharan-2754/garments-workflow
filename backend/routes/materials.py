from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import List, Optional
from bson import ObjectId
from datetime import datetime, timezone
from config.db import get_db
from middleware.auth import get_current_user, require_supervisor_or_above, require_manager_or_above
from models.material import (
    MaterialCreateRequest, MaterialUpdateRequest,
    StockMovementRequest, BOMCreateRequest, MaterialResponse
)
from utils.audit_helper import log_audit, create_notification

router = APIRouter(prefix="/materials", tags=["Materials & Inventory"])

def _make_id_query(id_str: str) -> dict:
    if ObjectId.is_valid(id_str):
        return {"$or": [{"_id": ObjectId(id_str)}, {"_id": id_str}]}
    return {"_id": id_str}

def _doc_to_mat_res(d: dict) -> dict:
    curr_qty = float(d.get("currentQuantity", 0.0))
    min_stock = float(d.get("minimumStock", 10.0))
    return {
        "id": str(d["_id"]),
        "sku": d.get("sku", ""),
        "name": d.get("name", ""),
        "category": d.get("category", "Other"),
        "description": d.get("description"),
        "unit": d.get("unit", "Meter"),
        "currentQuantity": curr_qty,
        "minimumStock": min_stock,
        "reorderLevel": float(d.get("reorderLevel", 20.0)),
        "warehouseLocation": d.get("warehouseLocation"),
        "supplierName": d.get("supplierName"),
        "costPerUnit": float(d.get("costPerUnit", 0.0)),
        "isLowStock": curr_qty <= min_stock,
        "createdAt": d.get("createdAt"),
        "updatedAt": d.get("updatedAt")
    }

@router.get("", response_model=List[MaterialResponse])
async def list_materials(
    category: Optional[str] = Query(None),
    lowStockOnly: Optional[bool] = Query(False),
    search: Optional[str] = Query(None),
    db=Depends(get_db),
    current_user=Depends(get_current_user)
):
    query = {}
    if category:
        query["category"] = category
    
    docs = await db.materials.find(query).sort("name", 1).to_list(1000)
    
    if search:
        s = search.lower().strip()
        docs = [d for d in docs if s in (d.get("name") or "").lower() or s in (d.get("sku") or "").lower()]

    results = [_doc_to_mat_res(d) for d in docs]
    if lowStockOnly:
        results = [r for r in results if r["isLowStock"]]

    return results

@router.get("/{material_id}", response_model=MaterialResponse)
async def get_material(material_id: str, db=Depends(get_db), current_user=Depends(get_current_user)):
    doc = await db.materials.find_one(_make_id_query(material_id))
    if not doc:
        raise HTTPException(status_code=404, detail="Material SKU not found")
    return _doc_to_mat_res(doc)

@router.post("", response_model=MaterialResponse, status_code=status.HTTP_201_CREATED)
async def create_material(
    body: MaterialCreateRequest,
    db=Depends(get_db),
    admin=Depends(require_supervisor_or_above)
):
    sku_clean = body.sku.strip().upper()
    existing = await db.materials.find_one({"sku": sku_clean})
    if existing:
        raise HTTPException(status_code=400, detail="Material SKU already exists")

    now = datetime.now(timezone.utc).isoformat()
    doc = {
        "sku": sku_clean,
        "name": body.name.strip(),
        "category": body.category,
        "description": body.description,
        "unit": body.unit,
        "currentQuantity": float(body.currentQuantity),
        "minimumStock": float(body.minimumStock),
        "reorderLevel": float(body.reorderLevel),
        "warehouseLocation": body.warehouseLocation,
        "supplierName": body.supplierName,
        "costPerUnit": float(body.costPerUnit),
        "createdAt": now,
        "updatedAt": now
    }

    result = await db.materials.insert_one(doc)
    doc["_id"] = result.inserted_id

    # Record initial stock in ledger if quantity > 0
    if doc["currentQuantity"] > 0:
        await db.inventory_ledger.insert_one({
            "materialId": str(doc["_id"]),
            "materialSku": doc["sku"],
            "materialName": doc["name"],
            "type": "Stock In",
            "quantity": doc["currentQuantity"],
            "balanceAfter": doc["currentQuantity"],
            "reason": "Initial Stock Setup",
            "referenceId": "INIT",
            "performedBy": admin.get("name"),
            "timestamp": now
        })

    await log_audit(f"Created Material SKU: {doc['sku']} - {doc['name']}", "Inventory", str(doc["_id"]), user=admin)
    return _doc_to_mat_res(doc)

@router.put("/{material_id}", response_model=MaterialResponse)
async def update_material(
    material_id: str,
    body: MaterialUpdateRequest,
    db=Depends(get_db),
    admin=Depends(require_supervisor_or_above)
):
    existing = await db.materials.find_one(_make_id_query(material_id))
    if not existing:
        raise HTTPException(status_code=404, detail="Material not found")

    update_data = {k: v for k, v in body.dict().items() if v is not None}
    update_data["updatedAt"] = datetime.now(timezone.utc).isoformat()

    await db.materials.update_one(_make_id_query(material_id), {"$set": update_data})
    updated = await db.materials.find_one(_make_id_query(material_id))
    await log_audit(f"Updated Material SKU: {existing.get('sku')}", "Inventory", material_id, user=admin)
    return _doc_to_mat_res(updated)

# ================= INVENTORY MOVEMENTS & LEDGER =================
@router.post("/movement")
async def record_stock_movement(
    body: StockMovementRequest,
    db=Depends(get_db),
    user=Depends(require_supervisor_or_above)
):
    material = await db.materials.find_one(_make_id_query(body.materialId))
    if not material:
        raise HTTPException(status_code=404, detail="Material not found")

    current_qty = float(material.get("currentQuantity", 0.0))
    qty = float(body.quantity)
    new_qty = current_qty

    if body.type in ["Stock Out", "Consumption", "Reservation"]:
        if current_qty < qty:
            raise HTTPException(
                status_code=400,
                detail=f"Insufficient stock for {material.get('name')}. Available: {current_qty} {material.get('unit')}, Requested: {qty}"
            )
        new_qty = current_qty - qty
    elif body.type in ["Stock In", "Return"]:
        new_qty = current_qty + qty
    elif body.type == "Adjustment":
        new_qty = qty # direct balance adjustment

    now = datetime.now(timezone.utc).isoformat()
    await db.materials.update_one(_make_id_query(body.materialId), {
        "$set": {"currentQuantity": new_qty, "updatedAt": now}
    })

    ledger_entry = {
        "materialId": str(material["_id"]),
        "materialSku": material.get("sku"),
        "materialName": material.get("name"),
        "type": body.type,
        "quantity": qty,
        "balanceAfter": new_qty,
        "reason": body.reason,
        "referenceId": body.referenceId,
        "performedBy": user.get("name"),
        "timestamp": now
    }
    await db.inventory_ledger.insert_one(ledger_entry)

    # Low stock alert check
    if new_qty <= float(material.get("minimumStock", 10.0)):
        await create_notification(
            "Low Stock Alert",
            f"Material '{material.get('name')}' is below minimum stock ({new_qty} {material.get('unit')} remaining).",
            "danger",
            "Inventory"
        )

    await log_audit(f"Stock {body.type}: {qty} {material.get('unit')} for {material.get('name')}", "Inventory", str(material["_id"]), user=user)
    return {"message": "Stock updated successfully", "newQuantity": new_qty}

@router.get("/ledger/history")
async def get_inventory_ledger(
    materialId: Optional[str] = Query(None),
    type: Optional[str] = Query(None),
    db=Depends(get_db),
    current_user=Depends(get_current_user)
):
    query = {}
    if materialId:
        query["materialId"] = materialId
    if type:
        query["type"] = type

    docs = await db.inventory_ledger.find(query).sort("timestamp", -1).to_list(500)
    for d in docs:
        d["id"] = str(d["_id"])
    return docs

# ================= BILL OF MATERIALS (BOM) =================
@router.get("/bom/list")
async def list_boms(db=Depends(get_db), current_user=Depends(get_current_user)):
    docs = await db.boms.find({}).sort("productName", 1).to_list(500)
    for d in docs:
        d["id"] = str(d["_id"])
    return docs

@router.post("/bom")
async def create_or_update_bom(
    body: BOMCreateRequest,
    db=Depends(get_db),
    admin=Depends(require_supervisor_or_above)
):
    now = datetime.now(timezone.utc).isoformat()
    existing = await db.boms.find_one({"productCode": body.productCode.strip().upper()})
    
    doc = {
        "productName": body.productName.strip(),
        "productCode": body.productCode.strip().upper(),
        "description": body.description,
        "items": [item.dict() for item in body.items],
        "updatedAt": now
    }

    if existing:
        await db.boms.update_one({"_id": existing["_id"]}, {"$set": doc})
        doc["id"] = str(existing["_id"])
    else:
        doc["createdAt"] = now
        res = await db.boms.insert_one(doc)
        doc["id"] = str(res.inserted_id)

    await log_audit(f"Configured BOM for product: {body.productName}", "BOM", doc["id"], user=admin)
    return doc
