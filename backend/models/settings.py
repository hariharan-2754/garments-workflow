from pydantic import BaseModel
from typing import Optional, List

class SystemSettings(BaseModel):
    shiftStartTime: str = "09:00"
    shiftEndTime: str = "18:00"
    gracePeriodMinutes: int = 15
    standardWorkingHours: float = 8.0
    overtimeThresholdHours: float = 8.5
    weeklyHolidays: List[str] = ["Sunday"]
    lowStockThresholdDefault: int = 20
    currencySymbol: str = "₹"
    companyName: str = "GarmentFlow Apparels Ltd."
    companyAddress: str = "Sector 5, Industrial Apparel Park, Tirupur, India"
    taxRatePercent: float = 5.0
