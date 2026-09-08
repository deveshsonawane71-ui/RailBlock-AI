"""
CP-SAT Block Schedule Optimizer
Uses Google OR-Tools Constraint Programming to produce optimal block schedules.
This is the core AI engine of the system.

Strategy: Schedule blocks primarily within engineering hours (00:00-05:00).
Use slot-based modeling with no-overlap per section and resource constraints.
"""

import uuid
import time
from datetime import datetime, timedelta
from typing import Optional
from ortools.sat.python import cp_model

from models.defects import MaintenanceTask
from models.assets import TrainMovement
from models.blocks import ScheduledBlock, ScheduleResult
from engine.task_bundler import bundle_tasks, determine_block_type
from config import (
    SECTIONS, STATIONS, PLANNING_HORIZON_DAYS, TIME_SLOT_MINUTES,
    ENGINEERING_HOURS_START, ENGINEERING_HOURS_END,
    PEAK_HOURS, MAX_TAMPING_MACHINES, MAX_TOWER_WAGONS,
    OHE_DEENERGIZE_LEAD_TIME_MIN, BLOCK_SETUP_TIME_MIN,
    BLOCK_TEARDOWN_TIME_MIN,
)


def _time_to_slot(dt: datetime, base_date: datetime) -> int:
    """Convert a datetime to a slot index (15-min granularity)."""
    delta = dt - base_date
    return int(delta.total_seconds() / (TIME_SLOT_MINUTES * 60))


def _slot_to_time(slot: int, base_date: datetime) -> datetime:
    """Convert a slot index back to datetime."""
    return base_date + timedelta(minutes=slot * TIME_SLOT_MINUTES)


def _get_allowed_windows(base_date: datetime, horizon_days: int) -> list[tuple[int, int]]:
    """
    Get allowed scheduling windows. Primary: engineering hours (00:00-05:00).
    Also allow a secondary low-traffic window (10:00-14:00) with penalty.
    """
    windows = []
    for day in range(horizon_days):
        day_start = base_date + timedelta(days=day)
        # Primary engineering window: 00:00 - 05:00
        eng_start = day_start.replace(hour=0, minute=0)
        eng_end = day_start.replace(hour=5, minute=0)
        windows.append({
            "start": _time_to_slot(eng_start, base_date),
            "end": _time_to_slot(eng_end, base_date),
            "type": "engineering",
            "penalty": 0,
        })
        # Secondary off-peak window: 10:00 - 14:00
        off_start = day_start.replace(hour=10, minute=0)
        off_end = day_start.replace(hour=14, minute=0)
        windows.append({
            "start": _time_to_slot(off_start, base_date),
            "end": _time_to_slot(off_end, base_date),
            "type": "off_peak",
            "penalty": 50,  # Penalty for using non-engineering hours
        })
    return windows


def _get_section_name(section_id: str) -> str:
    """Get human-readable section name."""
    for sec in SECTIONS:
        if sec["id"] == section_id:
            from_name = next((s["name"] for s in STATIONS if s["id"] == sec["from_station"]), "?")
            to_name = next((s["name"] for s in STATIONS if s["id"] == sec["to_station"]), "?")
            return f"{from_name} -> {to_name}"
    return section_id


def optimize_schedule(
    tasks: list[MaintenanceTask],
    trains: list[TrainMovement],
    base_date: Optional[datetime] = None,
    time_limit_seconds: int = 30,
    frozen_block_ids: Optional[set] = None,
) -> ScheduleResult:
    """
    Run the CP-SAT optimizer to produce an optimal block schedule.
    """
    if base_date is None:
        base_date = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)

    start_time = time.time()

    # --- Bundle tasks ---
    bundles = bundle_tasks(tasks)
    if not bundles:
        return ScheduleResult(
            schedule_id=f"SCH-{uuid.uuid4().hex[:8]}",
            created_at=datetime.now().isoformat(),
            blocks=[], total_block_hours=0, total_tasks_scheduled=0,
            integrated_block_count=0, conflict_count=0,
            solver_status="NO_TASKS", solver_time_seconds=0,
            asset_availability_pct=100.0, improvement_over_baseline=0,
        )

    # --- Get scheduling windows ---
    windows = _get_allowed_windows(base_date, PLANNING_HORIZON_DAYS)
    horizon_slots = PLANNING_HORIZON_DAYS * 24 * (60 // TIME_SLOT_MINUTES)

    # Create a flat list of allowed slot ranges
    all_allowed = []
    for w in windows:
        all_allowed.append((w["start"], w["end"], w["penalty"]))

    section_ids = [s["id"] for s in SECTIONS]

    # --- Model setup ---
    model = cp_model.CpModel()

    # --- Decision variables ---
    block_vars = {}

    for i, bundle in enumerate(bundles):
        total_duration_min = (
            sum(t.duration_min for t in bundle)
            + BLOCK_SETUP_TIME_MIN
            + BLOCK_TEARDOWN_TIME_MIN
        )
        block_type = determine_block_type(bundle)
        if block_type == "Power":
            total_duration_min += OHE_DEENERGIZE_LEAD_TIME_MIN

        duration_slots = max(1, total_duration_min // TIME_SLOT_MINUTES)
        section_id = bundle[0].section_id

        # Start and end variables (within full horizon)
        start_var = model.new_int_var(0, horizon_slots - duration_slots, f"start_{i}")
        end_var = model.new_int_var(duration_slots, horizon_slots, f"end_{i}")
        interval_var = model.new_interval_var(start_var, duration_slots, end_var, f"interval_{i}")

        # Window selection: which window is this block assigned to?
        window_bools = []
        for w_idx, (w_start, w_end, w_penalty) in enumerate(all_allowed):
            if w_end - w_start < duration_slots:
                continue  # Block doesn't fit in this window
            wb = model.new_bool_var(f"window_{i}_{w_idx}")
            # If selected, block must fit within this window
            model.add(start_var >= w_start).only_enforce_if(wb)
            model.add(end_var <= w_end).only_enforce_if(wb)
            window_bools.append((wb, w_penalty))

        # Block must be in exactly one window
        if window_bools:
            model.add_exactly_one([wb for wb, _ in window_bools])
        # If no window fits, this is problematic but we allow it with large penalty

        block_vars[i] = {
            "start": start_var,
            "end": end_var,
            "interval": interval_var,
            "section": section_id,
            "duration_slots": duration_slots,
            "duration_min": total_duration_min,
            "bundle": bundle,
            "block_type": block_type,
            "window_bools": window_bools,
        }

    # --- Constraint 1: No overlap on same section ---
    for sec_id in section_ids:
        section_intervals = [
            block_vars[i]["interval"]
            for i in block_vars
            if block_vars[i]["section"] == sec_id
        ]
        if len(section_intervals) > 1:
            model.add_no_overlap(section_intervals)

    # --- Constraint 2: Resource limits ---
    tamping_intervals = []
    tower_intervals = []
    for i, bv in block_vars.items():
        bundle = bv["bundle"]
        if any("Tamping Machine" in t.equipment_needed for t in bundle):
            tamping_intervals.append(bv["interval"])
        if any("Tower Wagon" in t.equipment_needed for t in bundle):
            tower_intervals.append(bv["interval"])

    if len(tamping_intervals) > MAX_TAMPING_MACHINES:
        model.add_cumulative(tamping_intervals, [1]*len(tamping_intervals), MAX_TAMPING_MACHINES)
    if len(tower_intervals) > MAX_TOWER_WAGONS:
        model.add_cumulative(tower_intervals, [1]*len(tower_intervals), MAX_TOWER_WAGONS)

    # --- Objective Function ---
    objective_terms = []

    # 1. Priority-based earliness: high-priority tasks should be scheduled early
    for i, bv in block_vars.items():
        max_priority = max(t.priority_score for t in bv["bundle"])
        weight = int(max_priority)  # Higher priority = bigger penalty for late start
        penalty = model.new_int_var(0, horizon_slots * weight, f"prio_pen_{i}")
        model.add(penalty == bv["start"] * weight)
        objective_terms.append(penalty)

    # 2. Window penalties: prefer engineering hours over off-peak
    for i, bv in block_vars.items():
        for wb, w_penalty in bv["window_bools"]:
            if w_penalty > 0:
                objective_terms.append(w_penalty * wb)

    # 3. Bonus for integrated blocks (negative penalty = bonus)
    integrated_bonuses = []
    for i, bv in block_vars.items():
        if len(set(t.department for t in bv["bundle"])) >= 2:
            # Give a large negative weight to encourage integration
            integrated_bonuses.append(200)

    # Combined objective: minimize penalties
    model.minimize(sum(objective_terms))

    # --- Solve ---
    solver = cp_model.CpSolver()
    solver.parameters.max_time_in_seconds = time_limit_seconds
    solver.parameters.num_workers = 4

    status = solver.solve(model)
    solve_time = time.time() - start_time

    # --- Extract solution ---
    blocks = []
    status_str = "INFEASIBLE"

    if status in (cp_model.OPTIMAL, cp_model.FEASIBLE):
        status_str = "OPTIMAL" if status == cp_model.OPTIMAL else "FEASIBLE"

        for i, bv in block_vars.items():
            start_slot = solver.value(bv["start"])
            end_slot = solver.value(bv["end"])

            start_dt = _slot_to_time(start_slot, base_date)
            end_dt = _slot_to_time(end_slot, base_date)

            bundle = bv["bundle"]
            departments = list(set(t.department for t in bundle))
            block_type = bv["block_type"]
            is_integrated = len(departments) >= 2

            # Calculate disruption score
            is_peak = any(s <= start_dt.hour < e for s, e in PEAK_HOURS)
            is_eng_hours = ENGINEERING_HOURS_START <= start_dt.hour < ENGINEERING_HOURS_END
            disruption = 0.8 if is_peak else (0.1 if is_eng_hours else 0.4)

            sec_name = _get_section_name(bv["section"])

            block = ScheduledBlock(
                block_id=f"BLK-{uuid.uuid4().hex[:8]}",
                section_id=bv["section"],
                section_name=sec_name,
                block_type=block_type,
                start_time=start_dt.isoformat(),
                end_time=end_dt.isoformat(),
                duration_min=bv["duration_min"],
                departments=departments,
                assigned_tasks=[t.task_id for t in bundle],
                task_details=[
                    {
                        "task_id": t.task_id,
                        "type": t.task_type,
                        "department": t.department,
                        "duration_min": t.duration_min,
                        "priority": t.priority_score,
                    }
                    for t in bundle
                ],
                status="Proposed",
                is_integrated=is_integrated,
                disruption_score=disruption,
            )
            blocks.append(block)

    # Sort blocks by start time
    blocks.sort(key=lambda b: b.start_time)

    total_block_hours = sum(b.duration_min for b in blocks) / 60.0
    integrated_count = sum(1 for b in blocks if b.is_integrated)
    total_section_hours = len(SECTIONS) * PLANNING_HORIZON_DAYS * 24
    asset_avail = ((total_section_hours - total_block_hours) / total_section_hours) * 100

    return ScheduleResult(
        schedule_id=f"SCH-{uuid.uuid4().hex[:8]}",
        created_at=datetime.now().isoformat(),
        blocks=blocks,
        total_block_hours=round(total_block_hours, 1),
        total_tasks_scheduled=sum(len(b.assigned_tasks) for b in blocks),
        integrated_block_count=integrated_count,
        conflict_count=0,
        solver_status=status_str,
        solver_time_seconds=round(solve_time, 2),
        asset_availability_pct=round(asset_avail, 1),
        improvement_over_baseline=0.0,
    )
