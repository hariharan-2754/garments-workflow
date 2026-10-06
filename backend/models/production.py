from pydantic import BaseModel, Field
from typing import Optional, List

# Production Stages:
# 1. Order Confirmed -> 2. Material Planning -> 3. Material Ready -> 4. Cutting -> 5. Stitching -> 6. Printing -> 7. Embroidery -> 8. Quality Control -> 9. Rework -> 10. Packing -> 11. Dispatch -> 12. Completed

class ProductionOrderCreateRequest(BaseModel):
    orderNumber: Optional[str] = None # Auto-generated if omitted (e.g. PO-2026-001)
    customerName: str
    productName: str
    quantity: int = Field(..., gt=0)
    priority: str = Field("Medium", pattern="^(High|Medium|Low|Urgent)$")
    dueDate: str
    targetStages: Optional[List[str]] = [
        "Cutting", "Stitching", "Printing", "Embroidery", "Quality Control", "Packing", "Dispatch"
    ]
    notes: Optional[str] = None
    reserveMaterial: Optional[bool] = True

class ProductionOrderStatusUpdate(BaseModel):
    currentStage: str
    status: str = Field("In Progress", pattern="^(Pending|In Progress|Completed|On Hold|Cancelled)$")
    notes: Optional[str] = None

class JobCardCreateRequest(BaseModel):
    productionOrderId: str
    department: str
    workerId: Optional[str] = None
    workerName: Optional[str] = None
    machineId: Optional[str] = None
    plannedQuantity: int
    startDate: Optional[str] = None
    dueDate: Optional[str] = None
    pieceRate: Optional[float] = 0.0 # Payout per accepted piece
    notes: Optional[str] = None

class JobCardCompleteRequest(BaseModel):
    completedQuantity: int = Field(..., ge=0)
    rejectedQuantity: int = Field(0, ge=0)
    reworkQuantity: int = Field(0, ge=0)
    proofImage: Optional[str] = None
    notes: Optional[str] = None

class ProductionOrderResponse(BaseModel):
    id: str
    orderNumber: str
    customerName: str
    productName: str
    quantity: int
    priority: str
    dueDate: str
    currentStage: str
    status: str
    targetStages: List[str]
    completedStages: List[str]
    progressPercent: int = 0
    notes: Optional[str] = None
    createdAt: str
    updatedAt: str
