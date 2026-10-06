from pydantic import BaseModel
from typing import Optional

class AuditLogEntry(BaseModel):
    userId: Optional[str] = None
    userName: Optional[str] = None
    userRole: Optional[str] = None
    action: str
    module: str # Employees, Attendance, Inventory, Production, QC, Machines, Purchases, Sales, Finance, Settings
    recordId: Optional[str] = None
    oldValue: Optional[str] = None
    newValue: Optional[str] = None
    ipAddress: Optional[str] = None
    timestamp: str

class NotificationItem(BaseModel):
    id: Optional[str] = None
    title: str
    message: str
    type: str = "info" # info, warning, danger, success
    module: str
    targetRole: Optional[str] = None # All, ADMIN, MANAGER, SUPERVISOR, WORKER
    isRead: bool = False
    createdAt: str
