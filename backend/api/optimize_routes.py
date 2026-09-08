"""
Optimize Routes — API endpoints for running the optimizer and re-planning.
"""

from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional
from datetime import datetime

from engine.optimizer import optimize_schedule
from engine.replanner import create_emergency_defect, replan_schedule
from engine.priority_scorer import score_all_defects
from data.generator import defects_to_tasks

router = APIRouter(prefix="/api", tags=["optimize"])

_state = {}


def init_state(state: dict):
    global _state
    _state = state


class OptimizeRequest(BaseModel):
    time_limit_seconds: int = 30


class EmergencyRequest(BaseModel):
    section_id: str
    defect_type: str
    department: str
    duration_min: int = 90
    description: str = ""


@router.post("/optimize")
def run_optimizer(request: OptimizeRequest = OptimizeRequest()):
    """Run the CP-SAT optimizer to produce an optimal block schedule."""
    defects = _state["defects"]
    trains = _state["trains"]
    base_date = _state["base_date"]

    # Score defects
    scored_defects = score_all_defects(defects, base_date)
    _state["defects"] = scored_defects

    # Convert to tasks
    tasks = defects_to_tasks(scored_defects)

    # Run optimizer
    result = optimize_schedule(
        tasks=tasks,
        trains=trains,
        base_date=base_date,
        time_limit_seconds=request.time_limit_seconds,
    )

    # Calculate improvement over manual baseline
    manual = _state.get("manual_schedule")
    if manual:
        result.improvement_over_baseline = round(
            result.asset_availability_pct - manual.asset_availability_pct, 1
        )

    # Store result
    _state["current_schedule"] = result

    return result.model_dump()


@router.post("/replan")
def replan(request: EmergencyRequest):
    """Handle emergency: create emergency defect and re-plan schedule."""
    current = _state.get("current_schedule")
    if not current:
        return {"error": "No current schedule to re-plan. Run optimizer first."}

    # Create emergency defect
    emergency = create_emergency_defect(
        section_id=request.section_id,
        defect_type=request.defect_type,
        department=request.department,
        duration_min=request.duration_min,
        description=request.description,
    )

    # Add to defects list
    _state["defects"].append(emergency)

    # Re-plan
    result = replan_schedule(
        current_schedule=current,
        emergency_defect=emergency,
        all_defects=_state["defects"],
        trains=_state["trains"],
        base_date=_state["base_date"],
    )

    # Update current schedule
    _state["current_schedule"] = result["new_schedule"]

    return {
        "new_schedule": result["new_schedule"].model_dump(),
        "changes": result["changes"],
        "emergency_defect": emergency.model_dump(),
        "emergency_block": result["emergency_block"].model_dump() if result["emergency_block"] else None,
    }


@router.get("/schedule")
def get_schedule():
    """Return current optimized schedule."""
    current = _state.get("current_schedule")
    if not current:
        return {"error": "No schedule generated yet. Run optimizer first.", "blocks": []}
    return current.model_dump()


@router.get("/schedule/manual")
def get_manual_schedule():
    """Return the manual baseline schedule for comparison."""
    manual = _state.get("manual_schedule")
    if not manual:
        return {"error": "No manual schedule available.", "blocks": []}
    return manual.model_dump()


@router.get("/schedule/compare")
def compare_schedules():
    """Return before/after comparison data."""
    manual = _state.get("manual_schedule")
    current = _state.get("current_schedule")

    if not manual or not current:
        return {"error": "Both manual and optimized schedules required."}

    return {
        "manual": manual.model_dump(),
        "optimized": current.model_dump(),
        "improvement": {
            "asset_availability_delta": round(
                current.asset_availability_pct - manual.asset_availability_pct, 1
            ),
            "block_hours_saved": round(
                manual.total_block_hours - current.total_block_hours, 1
            ),
            "integrated_blocks_gained": current.integrated_block_count - manual.integrated_block_count,
            "conflicts_resolved": manual.conflict_count - current.conflict_count,
        }
    }
