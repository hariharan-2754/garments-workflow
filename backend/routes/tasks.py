import os
import uuid
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status, File, UploadFile, Form
from typing import List, Optional
from bson import ObjectId
from config.db import get_db
from config.settings import settings
from middleware.auth import get_current_user, require_admin
from models.task import TaskResponse, TaskStatusUpdateRequest

router = APIRouter(prefix="/tasks", tags=["Tasks"])

def _doc_to_response(doc: dict) -> dict:
    return {
        "id": str(doc["_id"]),
        "title": doc["title"],
        "description": doc["description"],
        "department": doc["department"],
        "workerId": doc.get("workerId"),
        "workerName": doc.get("workerName"),
        "priority": doc["priority"],
        "dueDate": doc["dueDate"],
        "status": doc["status"],
        "createdAt": doc["createdAt"].isoformat() if isinstance(doc.get("createdAt"), datetime) else str(doc.get("createdAt", "")),
        "updatedAt": doc["updatedAt"].isoformat() if isinstance(doc.get("updatedAt"), datetime) else str(doc.get("updatedAt", "")),
        "image": doc.get("image")
    }

@router.get("", response_model=List[TaskResponse])
async def list_tasks(db=Depends(get_db), current_user=Depends(get_current_user)):
    # Admin gets all tasks, Worker gets tasks belonging to their department
    if current_user.get("role") == "ADMIN":
        docs = await db.tasks.find({}).sort("createdAt", -1).to_list(1000)
    else:
        dept = current_user.get("department")
        if not dept:
            return []
        # Match case-insensitively for safety
        docs = await db.tasks.find({"department": {"$regex": f"^{dept}$", "$options": "i"}}).sort("createdAt", -1).to_list(1000)
    
    return [_doc_to_response(d) for d in docs]

@router.get("/{task_id}", response_model=TaskResponse)
async def get_task(task_id: str, db=Depends(get_db), current_user=Depends(get_current_user)):
    task = await db.tasks.find_one({"_id": task_id})
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    if current_user.get("role") == "WORKER":
        user_dept = current_user.get("department")
        if not user_dept or task["department"].strip().lower() != user_dept.strip().lower():
            raise HTTPException(status_code=403, detail="Not authorized to view tasks outside your department")
    
    return _doc_to_response(task)

@router.post("", response_model=TaskResponse, status_code=status.HTTP_201_CREATED)
async def create_task(
    title: str = Form(...),
    description: str = Form(...),
    department: str = Form(...),
    priority: str = Form("Medium"),
    dueDate: str = Form(...),
    image: Optional[UploadFile] = File(None),
    db=Depends(get_db),
    admin=Depends(require_admin)
):
    # Handle image upload
    image_url = None
    if image and image.filename:
        os.makedirs(settings.upload_dir, exist_ok=True)
        ext = os.path.splitext(image.filename)[1]
        filename = f"{uuid.uuid4()}{ext}"
        filepath = os.path.join(settings.upload_dir, filename)
        with open(filepath, "wb") as f:
            content = await image.read()
            f.write(content)
        image_url = f"/uploads/{filename}"

    now = datetime.now(timezone.utc)
    doc = {
        "title": title.strip(),
        "description": description.strip(),
        "department": department.strip(),
        "workerId": None,
        "workerName": None,
        "priority": priority,
        "dueDate": dueDate,
        "status": "Pending",
        "createdAt": now,
        "updatedAt": now,
        "image": image_url
    }
    
    result = await db.tasks.insert_one(doc)
    doc["_id"] = result.inserted_id
    return _doc_to_response(doc)

@router.put("/{task_id}", response_model=TaskResponse)
async def update_task(
    task_id: str,
    title: Optional[str] = Form(None),
    description: Optional[str] = Form(None),
    department: Optional[str] = Form(None),
    priority: Optional[str] = Form(None),
    dueDate: Optional[str] = Form(None),
    status: Optional[str] = Form(None),
    image: Optional[UploadFile] = File(None),
    db=Depends(get_db),
    admin=Depends(require_admin)
):
    task = await db.tasks.find_one({"_id": task_id})
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    update_fields = {}
    if title is not None:
        update_fields["title"] = title.strip()
    if description is not None:
        update_fields["description"] = description.strip()
    if department is not None:
        update_fields["department"] = department.strip()
    if priority is not None:
        if priority not in ["Low", "Medium", "High"]:
            raise HTTPException(status_code=400, detail="Invalid priority value")
        update_fields["priority"] = priority
    if dueDate is not None:
        update_fields["dueDate"] = dueDate
    if status is not None:
        if status not in ["Pending", "Completed", "Not Completed", "Reviewed"]:
            raise HTTPException(status_code=400, detail="Invalid status value")
        update_fields["status"] = status
        
    if image and image.filename:
        os.makedirs(settings.upload_dir, exist_ok=True)
        ext = os.path.splitext(image.filename)[1]
        filename = f"{uuid.uuid4()}{ext}"
        filepath = os.path.join(settings.upload_dir, filename)
        with open(filepath, "wb") as f:
            content = await image.read()
            f.write(content)
        update_fields["image"] = f"/uploads/{filename}"
        
    if update_fields:
        update_fields["updatedAt"] = datetime.now(timezone.utc)
        await db.tasks.update_one({"_id": task_id}, {"$set": update_fields})
        
    updated_task = await db.tasks.find_one({"_id": task_id})
    return _doc_to_response(updated_task)

@router.put("/{task_id}/status", response_model=TaskResponse)
async def update_task_status(
    task_id: str,
    body: TaskStatusUpdateRequest,
    db=Depends(get_db),
    current_user=Depends(get_current_user)
):
    task = await db.tasks.find_one({"_id": task_id})
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    update_data = {
        "status": body.status,
        "updatedAt": datetime.now(timezone.utc)
    }

    if current_user.get("role") == "WORKER":
        user_dept = current_user.get("department")
        if not user_dept or task["department"].strip().lower() != user_dept.strip().lower():
            raise HTTPException(status_code=403, detail="You can only update tasks belonging to your department")
        if body.status not in ["Completed", "Not Completed"]:
            raise HTTPException(status_code=400, detail="Workers can only mark tasks as Completed or Not Completed")
        
        # Tag which worker completed/processed it
        update_data["workerId"] = str(current_user["_id"])
        update_data["workerName"] = current_user["name"]
    
    await db.tasks.update_one({"_id": task_id}, {"$set": update_data})
    
    updated_task = await db.tasks.find_one({"_id": task_id})
    return _doc_to_response(updated_task)

@router.delete("/{task_id}")
async def delete_task(task_id: str, db=Depends(get_db), admin=Depends(require_admin)):
    result = await db.tasks.delete_one({"_id": task_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Task not found")
    
    return {"success": True, "message": "Task deleted successfully"}
