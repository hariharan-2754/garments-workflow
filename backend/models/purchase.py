from pydantic import BaseModel, Field
from typing import Optional, List

class PurchaseOrderItem(BaseModel):
    materialId: Optional[str] = None
    materialName: str
    quantity: float = Field(..., gt=0)
    unit: str
    unitPrice: float = Field(..., ge=0)
    total: float = Field(..., ge=0)

class PurchaseOrderCreate(BaseModel):
    supplierId: str
    supplierName: str
    expectedDeliveryDate: str
    items: List[PurchaseOrderItem]
    taxPercent: Optional[float] = 0.0
    discount: Optional[float] = 0.0
    notes: Optional[str] = None

class PurchaseOrderStatusUpdate(BaseModel):
    status: str = Field(..., pattern="^(Draft|Pending Approval|Approved|Ordered|Partially Received|Received|Cancelled)$")
    notes: Optional[str] = None

class GoodsReceiptCreate(BaseModel):
    purchaseOrderId: str
    receivedItems: List[PurchaseOrderItem]
    qualityApproved: bool = True
    invoiceNumber: Optional[str] = None
    notes: Optional[str] = None

class PurchaseOrderResponse(BaseModel):
    id: str
    poNumber: str
    supplierId: str
    supplierName: str
    expectedDeliveryDate: str
    items: List[dict]
    subtotal: float
    taxAmount: float
    discount: float
    totalAmount: float
    status: str
    notes: Optional[str] = None
    createdAt: str
