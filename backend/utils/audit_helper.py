import uuid
from datetime import datetime, timezone
from config.db import get_db

async def log_audit(action: str, module: str, record_id: str = None, old_val: str = None, new_val: str = None, user: dict = None, ip: str = None):
    try:
        db = get_db()
        entry = {
            "userId": str(user.get("_id") or user.get("id")) if user else "SYSTEM",
            "userName": user.get("name", "System") if user else "System",
            "userRole": user.get("role", "SYSTEM") if user else "SYSTEM",
            "action": action,
            "module": module,
            "recordId": str(record_id) if record_id else None,
            "oldValue": str(old_val) if old_val else None,
            "newValue": str(new_val) if new_val else None,
            "ipAddress": ip,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
        await db.audit_logs.insert_one(entry)
    except Exception:
        pass

async def create_notification(title: str, message: str, notif_type: str = "info", module: str = "System", target_role: str = None):
    try:
        db = get_db()
        doc = {
            "title": title,
            "message": message,
            "type": notif_type,
            "module": module,
            "targetRole": target_role,
            "isRead": False,
            "createdAt": datetime.now(timezone.utc).isoformat()
        }
        await db.notifications.insert_one(doc)
    except Exception:
        pass
