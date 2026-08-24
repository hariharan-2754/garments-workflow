from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

class TaskCreateRequest(BaseModel):
    title: str = Field(..., min_length=2, max_length=150)
    description: str = Field(..., max_length=1000)
    department: str
    priority: str = Field("Medium", pattern="^(Low|Medium|High)$")
    dueDate: str  # YYYY-MM-DD format

class TaskStatusUpdateRequest(BaseModel):
    status: str = Field(..., pattern="^(Pending|Completed|Not Completed|Reviewed)$")

class TaskResponse(BaseModel):
    id: str
    title: str
    description: str
    department: str
    workerId: Optional[str] = None
    workerName: Optional[str] = None
    priority: str
    dueDate: str
    status: str
    createdAt: str
    updatedAt: str
    image: Optional[str] = None
