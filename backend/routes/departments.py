from fastapi import APIRouter, Depends, HTTPException, status
from typing import List
from config.db import get_db
from middleware.auth import get_current_user, require_admin
from models.department import DepartmentCreateRequest, DepartmentResponse

router = APIRouter(prefix="/departments", tags=["Departments"])

@router.get("", response_model=List[DepartmentResponse])
async def list_departments(db=Depends(get_db), current_user=Depends(get_current_user)):
    pipeline = [
        {
            "$lookup": {
                "from": "users",
                "localField": "name",
                "foreignField": "department",
                "as": "workers"
            }
        },
        {
            "$project": {
                "id": {"$toString": "$_id"},
                "name": "$name",
                "workerCount": {"$size": "$workers"}
            }
        },
        {"$sort": {"name": 1}}
    ]
    results = await db.departments.aggregate(pipeline).to_list(100)
    return results

@router.post("", response_model=DepartmentResponse, status_code=status.HTTP_201_CREATED)
async def create_department(
    body: DepartmentCreateRequest,
    db=Depends(get_db),
    admin=Depends(require_admin),
):
    name_clean = body.name.strip()
    existing = await db.departments.find_one({"name": {"$regex": f"^{name_clean}$", "$options": "i"}})
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Department already exists",
        )
    
    doc = {"name": name_clean}
    result = await db.departments.insert_one(doc)
    
    return {
        "id": str(result.inserted_id),
        "name": name_clean,
        "workerCount": 0
    }
