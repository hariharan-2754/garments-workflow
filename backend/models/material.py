from pydantic import BaseModel, Field
from typing import Optional, List

class MaterialCreateRequest(BaseModel):
    sku: str
    name: str
    category: str = Field(..., pattern="^(Fabric|Thread|Buttons|Zippers|Labels|Packaging|Accessories|Dyes|Printing materials|Other)$")
    description: Optional[str] = None
    unit: str = Field(..., pattern="^(Meter|Kg|Piece|Roll|Box|Packet|Liter|Yard)$")
    currentQuantity: float = 0.0
    minimumStock: float = 10.0
    reorderLevel: float = 20.0
    warehouseLocation: Optional[str] = "Main Factory Store"
    supplierName: Optional[str] = None
    costPerUnit: float = 0.0

class MaterialUpdateRequest(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = None
    description: Optional[str] = None
    unit: Optional[str] = None
    minimumStock: Optional[float] = None
    reorderLevel: Optional[float] = None
    warehouseLocation: Optional[str] = None
    supplierName: Optional[str] = None
    costPerUnit: Optional[float] = None

class StockMovementRequest(BaseModel):
    materialId: str
    type: str = Field(..., pattern="^(Stock In|Stock Out|Adjustment|Consumption|Reservation|Return)$")
    quantity: float = Field(..., gt=0)
    reason: str
    referenceId: Optional[str] = None # PO Number, Production Order Number, Job Card Number
    unitCost: Optional[float] = None

class BOMItem(BaseModel):
    materialId: str
    materialName: str
    category: str
    requiredQuantity: float
    wastagePercentage: float = 0.0 # e.g. 5.0%
    unit: str

class BOMCreateRequest(BaseModel):
    productName: str
    productCode: str
    description: Optional[str] = None
    items: List[BOMItem]

class MaterialResponse(BaseModel):
    id: str
    sku: str
    name: str
    category: str
    description: Optional[str] = None
    unit: str
    currentQuantity: float
    minimumStock: float
    reorderLevel: float
    warehouseLocation: Optional[str] = None
    supplierName: Optional[str] = None
    costPerUnit: float
    isLowStock: bool = False
    createdAt: Optional[str] = None
    updatedAt: Optional[str] = None
