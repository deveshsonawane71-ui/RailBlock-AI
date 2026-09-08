"""
Dynamic Re-planner
Handles emergency defects by freezing approved blocks and re-optimizing.
"""

import uuid
from datetime import datetime
from typing import Optional

from models.defects import Defect, MaintenanceTask
from models.assets import TrainMovement
from models.blocks import ScheduledBlock, ScheduleResult
from engine.optimizer import optimize_schedule
from engine.priority_scorer import score_defect
from data.generator import defects_to_tasks


def create_emergency_defect(
    section_id: str,
    defect_type: str,
    department: str,
    duration_min: int = 90,
    description: str = "",
) -> Defect:
    """Create an emergency defect with maximum priority."""
    now = datetime.now()

    # Block type based on department
    if department == "TRD":
        block_type = "Power"
    elif department == "S&T":
        block_type = "Disconnection"
    else:
        block_type = "Traffic"

    emergency = Defect(
        defect_id=f"EMR-{uuid.uuid4().hex[:6]}",
        section_id=section_id,
        department=department,
        defect_type=defect_type,
        severity=98,
        safety_critical=True,
        date_reported=now.isoformat(),
        due_date=now.isoformat(),  # Due immediately
        estimated_duration_min=duration_min,
        priority_score=99.0,
        priority_label="Critical",
        status="Open",
        requires_block_type=block_type,
        equipment_needed=[],
        description=description or f"EMERGENCY: {defect_type} on section {section_id}",
    )
    return emergency


def replan_schedule(
    current_schedule: ScheduleResult,
    emergency_defect: Defect,
    all_defects: list[Defect],
    trains: list[TrainMovement],
    base_date: Optional[datetime] = None,
) -> dict:
    """
    Re-plan the schedule after an emergency.

    1. Freeze already-approved blocks
    2. Add emergency as highest priority
    3. Re-run optimizer on remaining tasks
    4. Return diff showing changes

    Returns:
        Dict with new_schedule, changes, emergency_block
    """
    if base_date is None:
        base_date = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)

    # Identify frozen blocks (approved ones stay)
    frozen_blocks = [b for b in current_schedule.blocks if b.status == "Approved"]
    frozen_task_ids = set()
    for b in frozen_blocks:
        frozen_task_ids.update(b.assigned_tasks)

    # Get unfrozen tasks + emergency
    remaining_defects = [d for d in all_defects if d.defect_id not in frozen_task_ids and d.status != "Completed"]
    remaining_defects.append(emergency_defect)

    # Convert to tasks
    tasks = defects_to_tasks(remaining_defects)

    # Re-optimize
    new_result = optimize_schedule(
        tasks=tasks,
        trains=trains,
        base_date=base_date,
        time_limit_seconds=15,
        frozen_block_ids={b.block_id for b in frozen_blocks},
    )

    # Combine frozen blocks with new schedule
    all_blocks = frozen_blocks + new_result.blocks
    all_blocks.sort(key=lambda b: b.start_time)

    # Build diff
    old_block_ids = {b.block_id for b in current_schedule.blocks}
    new_block_ids = {b.block_id for b in new_result.blocks}

    # Find the emergency block
    emergency_block = None
    for b in new_result.blocks:
        if emergency_defect.defect_id in b.assigned_tasks:
            emergency_block = b
            break

    changes = {
        "frozen_count": len(frozen_blocks),
        "rescheduled_count": len(new_result.blocks),
        "removed_blocks": len(old_block_ids - new_block_ids - {b.block_id for b in frozen_blocks}),
        "new_blocks": len(new_block_ids),
        "emergency_block_id": emergency_block.block_id if emergency_block else None,
        "solver_status": new_result.solver_status,
        "solver_time": new_result.solver_time_seconds,
    }

    # Update the result
    new_result.blocks = all_blocks
    new_result.total_block_hours = round(sum(b.duration_min for b in all_blocks) / 60.0, 1)
    new_result.total_tasks_scheduled = sum(len(b.assigned_tasks) for b in all_blocks)
    new_result.integrated_block_count = sum(1 for b in all_blocks if b.is_integrated)

    return {
        "new_schedule": new_result,
        "changes": changes,
        "emergency_block": emergency_block,
        "frozen_blocks": frozen_blocks,
    }
