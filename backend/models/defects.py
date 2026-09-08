"""
Pydantic models for maintenance defects and tasks.
"""

from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class Defect(BaseModel):
    defect_id: str
    section_id: str
    department: str         # "ENG", "S&T", "TRD"
    defect_type: str        # e.g., "Rail Fracture", "OHE Wire Sag"
    severity: int           # 0-100 base severity
    safety_critical: bool
    date_reported: str      # ISO format
    due_date: str           # ISO format
    estimated_duration_min: int
    priority_score: float = 0.0   # Computed by ML model (0-100)
    priority_label: str = "Medium" # "Critical", "High", "Medium", "Low"
    status: str = "Open"    # "Open", "Scheduled", "InProgress", "Completed"
    requires_block_type: str = "Traffic"  # Traffic, Power, Disconnection
    equipment_needed: list[str] = []
    description: Optional[str] = None


class MaintenanceTask(BaseModel):
    task_id: str
    defect_id: str
    section_id: str
    department: str
    task_type: str
    duration_min: int
    priority_score: float
    requires_block_type: str
    equipment_needed: list[str]
    assigned_block_id: Optional[str] = None
    status: str = "Pending"
