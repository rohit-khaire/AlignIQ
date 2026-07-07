from pydantic import BaseModel
from typing import List, Any, Optional, Dict

class ComplianceReportResponse(BaseModel):
    status: str
    report: List[Any]
    consulting_insights: Optional[Dict[str, Any]] = None
    extraction_metadata: Optional[Dict[str, Any]] = None
