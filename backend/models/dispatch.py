from pydantic import BaseModel, Field
from typing import Optional, List

class PackingSlipCreate(BaseModel):
    customerOrderId: str
    productionOrderId: Optional[str] = None
    packageCount: int = Field(1, ge=1)
    weightKg: Optional[float] = 0.0
    dimensions: Optional[str] = "Standard Carton"
    items: List[dict]
    packedBy: Optional[str] = None
    notes: Optional[str] = None

class DispatchCreate(BaseModel):
    customerOrderId: str
    packingSlipId: Optional[str] = None
    courierName: str # FedEx, BlueDart, DHL, In-house Van, DTDC
    trackingNumber: str # AWB
    expectedDeliveryDate: Optional[str] = None
    shippingAddress: str
    shippingCost: Optional[float] = 0.0
    notes: Optional[str] = None

class DispatchStatusUpdate(BaseModel):
    status: str = Field(..., pattern="^(Ready to Dispatch|Dispatched|In Transit|Delivered|Delayed|Returned)$")
    location: Optional[str] = None
    remarks: Optional[str] = None

class DispatchResponse(BaseModel):
    id: str
    dispatchNumber: str
    customerOrderId: str
    orderNumber: Optional[str] = None
    customerName: Optional[str] = None
    courierName: str
    trackingNumber: str
    dispatchDate: str
    expectedDeliveryDate: Optional[str] = None
    status: str
    timeline: List[dict] = []
    shippingAddress: str
    shippingCost: float
