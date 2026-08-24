from pydantic import BaseModel, EmailStr, Field
from typing import Optional

class UserLoginRequest(BaseModel):
    email: EmailStr
    password: str

class UserCreateRequest(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    email: EmailStr
    password: str = Field(..., min_length=6)
    role: str = Field("WORKER", pattern="^(ADMIN|WORKER)$")
    department: Optional[str] = None
    phone: Optional[str] = None

class UserResponse(BaseModel):
    id: str
    name: str
    email: EmailStr
    role: str
    department: Optional[str] = None
    phone: Optional[str] = None
