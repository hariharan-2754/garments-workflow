from pydantic import BaseModel, Field
from typing import Optional, List

class MachineCreateRequest(BaseModel):
    machineCode: str
    name: str
    machineType: str = Field(..., pattern="^(Single Needle|Overlock|Flatlock|Cutting Machine|Embroidery Machine|Printing Machine|Button Machine|Buttonhole Machine|Ironing Machine|Packing Machine|Other)$")
    department: str
    productionLine: Optional[str] = "Line 1"
    serialNumber: Optional[str] = None
    manufacturer: Optional[str] = None
    purchaseDate: Optional[str] = None
    status: str = Field("Running", pattern="^(Running|Idle|Maintenance|Breakdown|Offline)$")
    assignedOperator: Optional[str] = None
    notes: Optional[str] = None

class MachineUpdateRequest(BaseModel):
    name: Optional[str] = None
    machineType: Optional[str] = None
    department: Optional[str] = None
    productionLine: Optional[str] = None
    status: Optional[str] = None
    assignedOperator: Optional[str] = None
    notes: Optional[str] = None

class MaintenanceTicketCreate(BaseModel):
    machineId: str
    issue: str
    maintenanceType: str = Field(..., pattern="^(Preventive|Corrective|Emergency)$")
    assignedTechnician: Optional[str] = None
    cost: Optional[float] = 0.0
    notes: Optional[str] = None

class MaintenanceTicketUpdate(BaseModel):
    status: str = Field(..., pattern="^(Open|In Progress|Resolved|Closed)$")
    downtimeHours: Optional[float] = 0.0
    cost: Optional[float] = None
    resolutionNotes: Optional[str] = None

class MachineResponse(BaseModel):
    id: str
    machineCode: str
    name: str
    machineType: str
    department: str
    productionLine: Optional[str] = None
    serialNumber: Optional[str] = None
    manufacturer: Optional[str] = None
    status: str
    assignedOperator: Optional[str] = None
    lastMaintenanceDate: Optional[str] = None
    totalDowntimeHours: float = 0.0
    notes: Optional[str] = None
