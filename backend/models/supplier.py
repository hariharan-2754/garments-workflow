from pydantic import BaseModel, Field, EmailStr
from typing import Optional, List

class SupplierCreateRequest(BaseModel):
    name: str
    contactPerson: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[EmailStr] = None
    address: Optional[str] = None
    taxId: Optional[str] = None # GST or Tax ID
    category: Optional[str] = "Fabrics & Trims"
    paymentTerms: Optional[str] = "Net 30"
    rating: Optional[float] = 5.0
    status: Optional[str] = "Active"

class SupplierUpdateRequest(BaseModel):
    name: Optional[str] = None
    contactPerson: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[EmailStr] = None
    address: Optional[str] = None
    taxId: Optional[str] = None
    category: Optional[str] = None
    paymentTerms: Optional[str] = None
    rating: Optional[float] = None
    status: Optional[str] = None

class SupplierResponse(BaseModel):
    id: str
    name: str
    contactPerson: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[EmailStr] = None
    address: Optional[str] = None
    taxId: Optional[str] = None
    category: Optional[str] = None
    paymentTerms: Optional[str] = None
    rating: Optional[float] = 5.0
    status: str = "Active"
    totalOrdersCount: int = 0
    outstandingBalance: float = 0.0
