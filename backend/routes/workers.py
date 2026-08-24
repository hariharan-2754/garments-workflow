from fastapi import APIRouter, Depends, HTTPException, status
from typing import List
from config.db import get_db
from middleware.auth import get_current_user, require_admin, hash_password
from models.user import UserCreateRequest, UserResponse

router = APIRouter(prefix="/workers", tags=["Workers"])

@router.get("", response_model=List[UserResponse])
async def list_workers(db=Depends(get_db), current_user=Depends(get_current_user)):
    docs = await db.users.find({"role": "WORKER"}).sort("name", 1).to_list(500)
    res = []
    for d in docs:
        res.append({
            "id": str(d["_id"]),
            "name": d["name"],
            "email": d["email"],
            "role": d["role"],
            "department": d.get("department"),
            "phone": d.get("phone"),
        })
    return res

@router.post("", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def create_worker(
    body: UserCreateRequest,
    db=Depends(get_db),
    admin=Depends(require_admin),
):
    email_clean = body.email.lower().strip()
    existing = await db.users.find_one({"email": email_clean})
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User email already exists",
        )
    
    password_hash = hash_password(body.password)
    doc = {
        "name": body.name.strip(),
        "email": email_clean,
        "password_hash": password_hash,
        "role": "WORKER",
        "department": body.department,
        "phone": body.phone,
    }
    
    result = await db.users.insert_one(doc)
    
    return {
        "id": str(result.inserted_id),
        "name": doc["name"],
        "email": doc["email"],
        "role": doc["role"],
        "department": doc["department"],
        "phone": doc["phone"],
    }
