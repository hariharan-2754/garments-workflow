from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import List, Optional
from bson import ObjectId
from datetime import datetime, timezone
from config.db import get_db
from middleware.auth import get_current_user, require_manager_or_above
from models.settings import SystemSettings
from utils.audit_helper import log_audit

router = APIRouter(prefix="/settings", tags=["System Settings & Audit"])

def _make_id_query(id_str: str) -> dict:
    if ObjectId.is_valid(id_str):
        return {"$or": [{"_id": ObjectId(id_str)}, {"_id": id_str}]}
    return {"_id": id_str}

@router.get("")
async def get_system_settings(db=Depends(get_db), current_user=Depends(get_current_user)):
    doc = await db.settings.find_one({"type": "system"})
    if not doc:
        default = SystemSettings().dict()
        default["type"] = "system"
        await db.settings.insert_one(default)
        return default
    doc["id"] = str(doc.get("_id", "sys"))
    return doc

@router.put("")
async def update_system_settings(
    body: SystemSettings,
    db=Depends(get_db),
    admin=Depends(require_manager_or_above)
):
    existing = await db.settings.find_one({"type": "system"})
    doc = body.dict()
    doc["type"] = "system"
    doc["updatedAt"] = datetime.now(timezone.utc).isoformat()

    if existing:
        await db.settings.update_one({"type": "system"}, {"$set": doc})
    else:
        await db.settings.insert_one(doc)

    await log_audit("Updated Factory System & Shift Rules", "Settings", user=admin)
    return {"message": "Settings updated successfully", "settings": doc}

# ================= AUDIT LOGS =================
@router.get("/audit-logs")
async def list_audit_logs(
    module: Optional[str] = Query(None),
    userId: Optional[str] = Query(None),
    db=Depends(get_db),
    admin=Depends(require_manager_or_above)
):
    query = {}
    if module:
        query["module"] = module
    if userId:
        query["userId"] = userId

    docs = await db.audit_logs.find(query).sort("timestamp", -1).to_list(1000)
    for d in docs:
        d["id"] = str(d["_id"])
    return docs

# ================= NOTIFICATIONS =================
@router.get("/notifications")
async def list_notifications(
    db=Depends(get_db),
    current_user=Depends(get_current_user)
):
    user_role = current_user.get("role", "WORKER")
    query = {
        "$or": [
            {"targetRole": None},
            {"targetRole": "All"},
            {"targetRole": user_role}
        ]
    }
    docs = await db.notifications.find(query).sort("createdAt", -1).to_list(50)
    for d in docs:
        d["id"] = str(d["_id"])
    return docs

@router.put("/notifications/{notif_id}/read")
async def mark_notification_read(notif_id: str, db=Depends(get_db), current_user=Depends(get_current_user)):
    await db.notifications.update_one(_make_id_query(notif_id), {"$set": {"isRead": True}})
    return {"message": "Notification marked as read"}
