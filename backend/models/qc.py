from pydantic import BaseModel, Field
from typing import Optional, List

class DefectItem(BaseModel):
    category: str # e.g. "Stitching fault", "Open seam", "Broken stitch", "Fabric defect", "Shade variation", "Measurement issue", "Printing defect", "Embroidery defect", "Button issue", "Stain", "Cutting defect", "Packaging defect", "Other"
    count: int = Field(1, ge=1)
    notes: Optional[str] = None

class QCInspectionCreate(BaseModel):
    productionOrderId: str
    jobCardId: Optional[str] = None
    stageName: Optional[str] = "Quality Control"
    quantityInspected: int = Field(..., gt=0)
    quantityPassed: int = Field(..., ge=0)
    quantityRejected: int = Field(0, ge=0)
    quantityRework: int = Field(0, ge=0)
    defects: Optional[List[DefectItem]] = []
    result: str = Field(..., pattern="^(PASS|FAIL|REWORK|HOLD)$")
    remarks: Optional[str] = None
    proofImage: Optional[str] = None

class QCInspectionResponse(BaseModel):
    id: str
    productionOrderId: str
    orderNumber: Optional[str] = None
    productName: Optional[str] = None
    jobCardId: Optional[str] = None
    inspectorId: str
    inspectorName: str
    quantityInspected: int
    quantityPassed: int
    quantityRejected: int
    quantityRework: int
    defectRate: float # percentage
    firstPassYield: float # percentage
    defects: List[dict] = []
    result: str
    remarks: Optional[str] = None
    proofImage: Optional[str] = None
    createdAt: str
