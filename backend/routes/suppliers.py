from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import List, Optional
from bson import ObjectId
from datetime import datetime, timezone
from config.db import get_db
from middleware.auth import get_current_user, require_supervisor_or_above, require_manager_or_above
from models.supplier import SupplierCreateRequest, SupplierUpdateRequest, SupplierResponse
from utils.audit_helper import log_audit

router = APIRouter(prefix="/suppliers", tags=["Suppliers"])

def _make_id_query(id_str: str) -> dict:
    if ObjectId.is_valid(id_str):
        return {"$or": [{"_id": ObjectId(id_str)}, {"_id": id_str}]}
    return {"_id": id_str}

def _doc_to_supplier_res(d: dict) -> dict:
    return {
        "id": str(d["_id"]),
        "name": d.get("name", ""),
        "contactPerson": d.get("contactPerson"),
        "phone": d.get("phone"),
        "email": d.get("email"),
        "address": d.get("address"),
        "taxId": d.get("taxId"),
        "category": d.get("category", "Fabrics & Trims"),
        "paymentTerms": d.get("paymentTerms", "Net 30"),
        "rating": float(d.get("rating", 5.0)),
        "status": d.get("status", "Active"),
        "totalOrdersCount": int(d.get("totalOrdersCount", 0)),
        "outstandingBalance": float(d.get("outstandingBalance", 0.0))
    }

@router.get("", response_model=List[SupplierResponse])
async def list_suppliers(
    category: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    db=Depends(get_db),
    current_user=Depends(get_current_user)
):
    query = {}
    if category:
        query["category"] = category
    if status:
        query["status"] = status

    docs = await db.suppliers.find(query).sort("name", 1).to_list(1000)
    if search:
        s = search.lower().strip()
        docs = [d for d in docs if s in d.get("name", "").lower() or s in d.get("contactPerson", "").lower()]

    return [_doc_to_supplier_res(d) for d in docs]

@router.post("", response_model=SupplierResponse, status_code=status.HTTP_201_CREATED)
async def create_supplier(
    body: SupplierCreateRequest,
    db=Depends(get_db),
    admin=Depends(require_supervisor_or_above)
):
    doc = body.dict()
    doc["totalOrdersCount"] = 0
    doc["outstandingBalance"] = 0.0
    doc["createdAt"] = datetime.now(timezone.utc).isoformat()

    res = await db.suppliers.insert_one(doc)
    doc["_id"] = res.inserted_id

    await log_audit(f"Registered Supplier: {body.name}", "Suppliers", str(doc["_id"]), user=admin)
    return _doc_to_supplier_res(doc)

@router.put("/{supplier_id}", response_model=SupplierResponse)
async def update_supplier(
    supplier_id: str,
    body: SupplierUpdateRequest,
    db=Depends(get_db),
    admin=Depends(require_supervisor_or_above)
):
    existing = await db.suppliers.find_one(_make_id_query(supplier_id))
    if not existing:
        raise HTTPException(status_code=404, detail="Supplier not found")

    update_data = {k: v for k, v in body.dict().items() if v is not None}
    await db.suppliers.update_one(_make_id_query(supplier_id), {"$set": update_data})
    updated = await db.suppliers.find_one(_make_id_query(supplier_id))
    return _doc_to_supplier_res(updated)
