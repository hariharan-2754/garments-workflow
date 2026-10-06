from pydantic import BaseModel, Field, EmailStr
from typing import Optional, List

class CustomerCreateRequest(BaseModel):
    name: str
    contactPerson: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[EmailStr] = None
    address: Optional[str] = None
    taxId: Optional[str] = None
    customerType: Optional[str] = "Retail Brand" # Retail Brand, Wholesaler, Boutique, Exporter
    notes: Optional[str] = None

class CustomerUpdateRequest(BaseModel):
    name: Optional[str] = None
    contactPerson: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[EmailStr] = None
    address: Optional[str] = None
    taxId: Optional[str] = None
    customerType: Optional[str] = None
    notes: Optional[str] = None

class OrderLineItem(BaseModel):
    productName: str
    sku: Optional[str] = None
    color: Optional[str] = "Standard"
    size: Optional[str] = "M"
    quantity: int = Field(..., gt=0)
    unitPrice: float = Field(..., ge=0)
    total: float = Field(..., ge=0)

class CustomerOrderCreate(BaseModel):
    customerId: str
    customerName: str
    deliveryDate: str
    priority: Optional[str] = "Medium"
    items: List[OrderLineItem]
    taxPercent: Optional[float] = 0.0
    discount: Optional[float] = 0.0
    notes: Optional[str] = None
    autoCreateProductionOrder: Optional[bool] = True

class CustomerOrderResponse(BaseModel):
    id: str
    orderNumber: str
    customerId: str
    customerName: str
    orderDate: str
    deliveryDate: str
    priority: str
    items: List[dict]
    totalQuantity: int
    subtotal: float
    taxAmount: float
    discount: float
    totalAmount: float
    paymentStatus: str = "Unpaid" # Unpaid, Partially Paid, Paid
    productionStatus: str = "Pending" # Pending, In Production, QC Passed, Packed, Dispatched, Delivered
    deliveryStatus: str = "Pending" # Pending, Ready to Dispatch, In Transit, Delivered, Returned
    productionOrderId: Optional[str] = None
    notes: Optional[str] = None
