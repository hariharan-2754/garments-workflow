from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import List, Optional
from bson import ObjectId
from datetime import datetime, timezone
from config.db import get_db
from middleware.auth import get_current_user, require_manager_or_above, hash_password
from models.user import UserCreateRequest, UserUpdateRequest, UserResponse
from utils.audit_helper import log_audit, create_notification

router = APIRouter(prefix="/employees", tags=["Employees"])

def _make_id_query(id_str: str) -> dict:
    if ObjectId.is_valid(id_str):
        return {"$or": [{"_id": ObjectId(id_str)}, {"_id": id_str}]}
    return {"_id": id_str}

def _doc_to_user_res(d: dict) -> dict:
    return {
        "id": str(d["_id"]),
        "name": d["name"],
        "email": d["email"],
        "role": d.get("role", "WORKER"),
        "department": d.get("department"),
        "phone": d.get("phone"),
        "designation": d.get("designation"),
        "salary": d.get("salary"),
        "employmentType": d.get("employmentType", "Full-Time"),
        "shift": d.get("shift", "General"),
        "status": d.get("status", "Active"),
        "emergencyContact": d.get("emergencyContact"),
        "address": d.get("address"),
        "joiningDate": d.get("joiningDate")
    }

@router.get("", response_model=List[UserResponse])
async def list_employees(
    department: Optional[str] = Query(None),
    role: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    db=Depends(get_db),
    current_user=Depends(get_current_user)
):
    query = {}
    if department:
        query["department"] = {"$regex": f"^{department}$", "$options": "i"}
    if role:
        query["role"] = role
    if status:
        query["status"] = status

    docs = await db.users.find(query).sort("name", 1).to_list(1000)
    
    if search:
        s = search.lower().strip()
        docs = [d for d in docs if s in (d.get("name") or "").lower() or s in (d.get("email") or "").lower() or s in (d.get("phone") or "").lower()]

    return [_doc_to_user_res(d) for d in docs]

@router.get("/{employee_id}", response_model=UserResponse)
async def get_employee(employee_id: str, db=Depends(get_db), current_user=Depends(get_current_user)):
    user_doc = await db.users.find_one(_make_id_query(employee_id))
    if not user_doc:
        raise HTTPException(status_code=404, detail="Employee not found")
    return _doc_to_user_res(user_doc)

@router.post("", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def create_employee(
    body: UserCreateRequest,
    db=Depends(get_db),
    admin=Depends(require_manager_or_above)
):
    email_clean = body.email.lower().strip()
    existing = await db.users.find_one({"email": email_clean})
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Employee with this email already exists"
        )
    
    now_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    doc = {
        "name": body.name.strip(),
        "email": email_clean,
        "password_hash": hash_password(body.password),
        "role": body.role,
        "department": body.department,
        "phone": body.phone,
        "designation": body.designation or body.role.capitalize(),
        "salary": body.salary or 0.0,
        "employmentType": body.employmentType or "Full-Time",
        "shift": body.shift or "General",
        "emergencyContact": body.emergencyContact,
        "address": body.address,
        "status": body.status or "Active",
        "joiningDate": now_str
    }
    
    result = await db.users.insert_one(doc)
    doc["_id"] = result.inserted_id
    
    await log_audit(f"Created employee: {doc['name']} ({doc['role']})", "Employees", str(result.inserted_id), user=admin)
    return _doc_to_user_res(doc)

@router.put("/{employee_id}", response_model=UserResponse)
async def update_employee(
    employee_id: str,
    body: UserUpdateRequest,
    db=Depends(get_db),
    admin=Depends(require_manager_or_above)
):
    existing = await db.users.find_one(_make_id_query(employee_id))
    if not existing:
        raise HTTPException(status_code=404, detail="Employee not found")
    
    update_data = {k: v for k, v in body.dict().items() if v is not None}
    if update_data:
        await db.users.update_one(_make_id_query(employee_id), {"$set": update_data})
        await log_audit(f"Updated employee details for {existing.get('name')}", "Employees", employee_id, user=admin)
    
    updated = await db.users.find_one(_make_id_query(employee_id))
    return _doc_to_user_res(updated)

@router.delete("/{employee_id}")
async def delete_employee(
    employee_id: str,
    db=Depends(get_db),
    admin=Depends(require_manager_or_above)
):
    existing = await db.users.find_one(_make_id_query(employee_id))
    if not existing:
        raise HTTPException(status_code=404, detail="Employee not found")
    
    # Soft delete status to Inactive / Resigned
    await db.users.update_one(_make_id_query(employee_id), {"$set": {"status": "Resigned"}})
    await log_audit(f"Deactivated employee: {existing.get('name')}", "Employees", employee_id, user=admin)
    return {"message": "Employee deactivated successfully"}
