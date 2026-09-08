"""
Data Routes — API endpoints for corridor, defects, and train data.
"""

from fastapi import APIRouter, Query
from typing import Optional

router = APIRouter(prefix="/api", tags=["data"])

# These will be populated by the main app's state
_state = {}


def init_state(state: dict):
    global _state
    _state = state


@router.get("/corridor")
def get_corridor():
    """Return corridor topology (stations, sections)."""
    return _state["corridor"].model_dump()


@router.get("/defects")
def get_defects(
    department: Optional[str] = Query(None, description="Filter by department: ENG, S&T, TRD"),
    section_id: Optional[str] = Query(None, description="Filter by section ID"),
    priority: Optional[str] = Query(None, description="Filter by priority label: Critical, High, Medium, Low"),
    status: Optional[str] = Query(None, description="Filter by status: Open, Scheduled, Completed"),
):
    """Return all active defects with priority scores, with optional filters."""
    defects = _state["defects"]

    if department:
        defects = [d for d in defects if d.department == department]
    if section_id:
        defects = [d for d in defects if d.section_id == section_id]
    if priority:
        defects = [d for d in defects if d.priority_label == priority]
    if status:
        defects = [d for d in defects if d.status == status]

    return [d.model_dump() for d in defects]


@router.get("/defects/{defect_id}")
def get_defect(defect_id: str):
    """Return a single defect by ID."""
    for d in _state["defects"]:
        if d.defect_id == defect_id:
            return d.model_dump()
    return {"error": "Defect not found"}


@router.get("/trains")
def get_trains(
    section_id: Optional[str] = Query(None),
    day: Optional[int] = Query(None, description="Day index (0-6)"),
    train_type: Optional[str] = Query(None),
):
    """Return train timetable."""
    trains = _state["trains"]

    if section_id:
        trains = [t for t in trains if t.section_id == section_id]
    if day is not None:
        trains = [t for t in trains if t.day_of_week == day]
    if train_type:
        trains = [t for t in trains if t.train_type == train_type]

    # Limit response size
    return [t.model_dump() for t in trains[:500]]


@router.get("/trains/summary")
def get_trains_summary():
    """Return summary statistics of train movements."""
    trains = _state["trains"]
    by_type = {}
    for t in trains:
        by_type[t.train_type] = by_type.get(t.train_type, 0) + 1

    return {
        "total_movements": len(trains),
        "by_type": by_type,
        "sections": len(set(t.section_id for t in trains)),
        "daily_avg": len(trains) // max(1, len(set(t.day_of_week for t in trains))),
    }
