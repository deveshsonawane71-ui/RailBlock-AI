"""
Pydantic models for block schedules and approval workflow.
"""

from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class BlockRequest(BaseModel):
    request_id: str
    section_id: str
    block_type: str         # "Traffic", "Power", "Disconnection", "Integrated", "Shadow"
    requested_by: str       # Department
    requested_start: str    # ISO format
    requested_end: str      # ISO format
    task_ids: list[str]     # Tasks to be performed during this block
    reason: str
    priority: str = "Normal"  # "Emergency", "High", "Normal"


class ScheduledBlock(BaseModel):
    block_id: str
    section_id: str
    section_name: Optional[str] = None
    block_type: str
    start_time: str         # ISO format
    end_time: str           # ISO format
    duration_min: int
    departments: list[str]
    assigned_tasks: list[str]  # Task IDs
    task_details: list[dict] = []  # Enriched task info for display
    status: str = "Proposed"   # "Proposed", "Approved", "Rejected", "InProgress", "Completed"
    approved_by: Optional[str] = None
    approved_at: Optional[str] = None
    rejection_reason: Optional[str] = None
    is_integrated: bool = False
    disruption_score: float = 0.0  # How much this block disrupts train traffic (0-1)
    conflicts: list[dict] = []     # Any detected conflicts


class ScheduleResult(BaseModel):
    schedule_id: str
    created_at: str
    blocks: list[ScheduledBlock]
    total_block_hours: float
    total_tasks_scheduled: int
    integrated_block_count: int
    conflict_count: int
    solver_status: str          # "OPTIMAL", "FEASIBLE", "INFEASIBLE"
    solver_time_seconds: float
    asset_availability_pct: float
    improvement_over_baseline: float


class ManualSchedule(BaseModel):
    """Represents the naive/manual baseline schedule for comparison."""
    blocks: list[ScheduledBlock]
    total_block_hours: float
    total_tasks_scheduled: int
    integrated_block_count: int
    conflict_count: int
    asset_availability_pct: float
