from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List

class UserLoginRequest(BaseModel):
    email: EmailStr
    password: str

class UserCreateRequest(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    email: EmailStr
    password: str = Field(..., min_length=6)
    role: str = Field("WORKER", pattern="^(ADMIN|MANAGER|SUPERVISOR|WORKER)$")
    department: Optional[str] = None
    phone: Optional[str] = None
    designation: Optional[str] = None
    salary: Optional[float] = None
    employmentType: Optional[str] = "Full-Time" # Full-Time, Part-Time, Contract, Piece-Rate
    shift: Optional[str] = "General" # Morning, Evening, Night, General
    emergencyContact: Optional[str] = None
    address: Optional[str] = None
    status: Optional[str] = "Active" # Active, Inactive, On Leave, Resigned

class UserUpdateRequest(BaseModel):
    name: Optional[str] = None
    role: Optional[str] = None
    department: Optional[str] = None
    phone: Optional[str] = None
    designation: Optional[str] = None
    salary: Optional[float] = None
    employmentType: Optional[str] = None
    shift: Optional[str] = None
    emergencyContact: Optional[str] = None
    address: Optional[str] = None
    status: Optional[str] = None

class UserResponse(BaseModel):
    id: str
    name: str
    email: EmailStr
    role: str
    department: Optional[str] = None
    phone: Optional[str] = None
    designation: Optional[str] = None
    salary: Optional[float] = None
    employmentType: Optional[str] = "Full-Time"
    shift: Optional[str] = "General"
    status: Optional[str] = "Active"
    emergencyContact: Optional[str] = None
    address: Optional[str] = None
    joiningDate: Optional[str] = None

