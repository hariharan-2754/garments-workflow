from pydantic import BaseModel, Field
from typing import Optional, List

class TransactionCreate(BaseModel):
    type: str = Field(..., pattern="^(Income|Expense)$")
    category: str = Field(..., pattern="^(Customer Payment|Sales|Material Purchase|Machine Maintenance|Salary|Worker Payout|Utilities|Transport|Other)$")
    amount: float = Field(..., gt=0)
    referenceId: Optional[str] = None # Order ID, PO ID, Worker ID, Machine ID
    partyName: Optional[str] = None # Customer, Supplier, or Worker name
    description: Optional[str] = None
    paymentMethod: str = Field("Bank Transfer", pattern="^(Cash|UPI|Bank Transfer|Card|Cheque|Other)$")
    status: Optional[str] = "Completed" # Completed, Pending, Failed

class PieceRatePayoutRequest(BaseModel):
    workerId: str
    workerName: str
    jobCardId: Optional[str] = None
    taskType: str
    ratePerPiece: float = Field(..., gt=0)
    completedQuantity: int = Field(..., ge=0)
    rejectedQuantity: int = Field(0, ge=0)
    acceptedQuantity: int = Field(..., ge=0)
    payoutAmount: float = Field(..., ge=0)
    notes: Optional[str] = None

class TransactionResponse(BaseModel):
    id: str
    transactionNumber: str
    date: str
    type: str
    category: str
    amount: float
    referenceId: Optional[str] = None
    partyName: Optional[str] = None
    description: Optional[str] = None
    paymentMethod: str
    status: str
    createdAt: str
