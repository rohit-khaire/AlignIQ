from pydantic import BaseModel
from typing import List, Any

class ComplianceReportResponse(BaseModel):
    status: str
    report: List[Any]
