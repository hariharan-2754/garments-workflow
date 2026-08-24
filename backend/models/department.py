from pydantic import BaseModel, Field

class DepartmentCreateRequest(BaseModel):
    name: str = Field(..., min_length=2, max_length=50)

class DepartmentResponse(BaseModel):
    id: str
    name: str
    workerCount: int = 0
