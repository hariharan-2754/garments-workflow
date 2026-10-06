from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime

class AttendanceCheckInRequest(BaseModel):
    shift: Optional[str] = "General"
    remarks: Optional[str] = None

class AttendanceCheckOutRequest(BaseModel):
    remarks: Optional[str] = None

class AdminMarkAttendanceRequest(BaseModel):
    employeeId: str
    date: str # YYYY-MM-DD
    status: str = Field(..., pattern="^(Present|Absent|Half Day|Late|Leave|Holiday|Week Off)$")
    checkInTime: Optional[str] = None
    checkOutTime: Optional[str] = None
    shift: Optional[str] = "General"
    overtimeHours: Optional[float] = 0.0
    remarks: Optional[str] = None

class BulkAttendanceRequest(BaseModel):
    date: str # YYYY-MM-DD
    records: List[AdminMarkAttendanceRequest]

class LeaveRequestCreate(BaseModel):
    leaveType: str = Field(..., pattern="^(Casual Leave|Sick Leave|Emergency Leave|Paid Leave|Unpaid Leave)$")
    startDate: str # YYYY-MM-DD
    endDate: str # YYYY-MM-DD
    reason: str

class LeaveStatusUpdate(BaseModel):
    status: str = Field(..., pattern="^(Approved|Rejected)$")
    remarks: Optional[str] = None

class AttendanceResponse(BaseModel):
    id: str
    employeeId: str
    employeeName: str
    department: Optional[str] = None
    date: str
    checkInTime: Optional[str] = None
    checkOutTime: Optional[str] = None
    status: str
    workingHours: Optional[float] = 0.0
    overtimeHours: Optional[float] = 0.0
    shift: Optional[str] = "General"
    remarks: Optional[str] = None
    markedBy: Optional[str] = None
    createdAt: Optional[str] = None
