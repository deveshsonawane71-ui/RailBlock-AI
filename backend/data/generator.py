"""
Synthetic Data Generator for RailBlock AI
Generates realistic corridor data, defects, train timetables, and baseline schedules.
"""

import random
import uuid
from datetime import datetime, timedelta
from typing import Optional

from models.assets import Station, TrackSection, TrainMovement, Corridor
from models.defects import Defect, MaintenanceTask
from models.blocks import ScheduledBlock, ManualSchedule
from config import (
    STATIONS, SECTIONS, DEFECT_TYPES, DEPARTMENTS,
    TRAIN_PRIORITIES, PLANNING_HORIZON_DAYS,
    ENGINEERING_HOURS_START, ENGINEERING_HOURS_END,
    PEAK_HOURS, BLOCK_TYPES,
)

random.seed(42)


def generate_corridor() -> Corridor:
    """Generate the corridor topology from config."""
    stations = [Station(**s) for s in STATIONS]
    station_map = {s["id"]: s["name"] for s in STATIONS}
    sections = []
    for s in SECTIONS:
        sec = TrackSection(
            **s,
            from_station_name=station_map[s["from_station"]],
            to_station_name=station_map[s["to_station"]],
        )
        sections.append(sec)
    return Corridor(stations=stations, sections=sections)


def generate_defects(n: int = 50, base_date: Optional[datetime] = None) -> list[Defect]:
    """Generate n synthetic defects across all departments and sections."""
    if base_date is None:
        base_date = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)

    section_ids = [s["id"] for s in SECTIONS]
    defects = []

    for i in range(n):
        dept = random.choice(DEPARTMENTS)
        defect_info = random.choice(DEFECT_TYPES[dept])
        section_id = random.choice(section_ids)

        # Date reported: 1-30 days ago
        days_ago = random.randint(1, 30)
        date_reported = base_date - timedelta(days=days_ago)

        # Due date: reported + 3 to 21 days
        due_days = random.randint(3, 21)
        due_date = date_reported + timedelta(days=due_days)

        # Duration within range
        dur_min, dur_max = defect_info["duration_range"]
        duration = random.randint(dur_min, dur_max)

        # Equipment needed
        equipment = []
        if dept == "ENG":
            if defect_info["type"] in ["Routine Tamping", "Ballast Deficiency"]:
                equipment = ["Tamping Machine"]
            elif defect_info["type"] == "Rail Grinding":
                equipment = ["Rail Grinding Machine"]
        elif dept == "TRD":
            equipment = ["Tower Wagon"]
        elif dept == "S&T":
            if defect_info["type"] == "Signal Cable Fault":
                equipment = ["Cable Locator"]

        # Block type required
        if dept == "TRD":
            block_type = "Power"
        elif dept == "S&T":
            block_type = "Disconnection"
        else:
            block_type = "Traffic"

        defect = Defect(
            defect_id=f"DEF-{i+1:04d}",
            section_id=section_id,
            department=dept,
            defect_type=defect_info["type"],
            severity=defect_info["base_severity"],
            safety_critical=defect_info["safety_critical"],
            date_reported=date_reported.isoformat(),
            due_date=due_date.isoformat(),
            estimated_duration_min=duration,
            requires_block_type=block_type,
            equipment_needed=equipment,
            description=f"{defect_info['type']} detected on section {section_id}",
        )
        defects.append(defect)

    return defects


def generate_train_timetable(base_date: Optional[datetime] = None) -> list[TrainMovement]:
    """Generate a realistic train timetable for the corridor."""
    if base_date is None:
        base_date = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)

    section_ids = [s["id"] for s in SECTIONS]
    section_lengths = {s["id"]: s["length_km"] for s in SECTIONS}
    trains = []

    # --- Long-distance trains (fewer, higher priority) ---
    long_distance = [
        ("12124", "Deccan Queen",   "Mail/Express", 3, "06:40"),
        ("12126", "Pragati Express","Mail/Express", 3, "07:45"),
        ("12952", "Rajdhani Exp",   "Rajdhani",     1, "16:35"),
        ("12010", "Shatabdi Exp",   "Shatabdi",     2, "06:25"),
        ("11010", "Panchvati Exp",  "Mail/Express", 3, "08:10"),
        ("12140", "Sewagram Exp",   "Mail/Express", 3, "14:00"),
        ("11058", "Amritsar Exp",   "Mail/Express", 3, "19:05"),
        ("12106", "Vidarbha Exp",   "Mail/Express", 3, "20:30"),
    ]

    for day in range(PLANNING_HORIZON_DAYS):
        current_date = base_date + timedelta(days=day)

        # Long-distance trains — pass through all sections
        for train_no, name, ttype, prio, dep_str in long_distance:
            dep_h, dep_m = map(int, dep_str.split(":"))
            base_dep = current_date.replace(hour=dep_h, minute=dep_m)

            for direction in ["UP", "DOWN"]:
                cumulative_min = 0
                ordered_sections = section_ids if direction == "UP" else list(reversed(section_ids))
                for sec_id in ordered_sections:
                    length = section_lengths[sec_id]
                    travel_time_min = int(length / 1.2)  # ~72 km/h avg
                    dep_time = base_dep + timedelta(minutes=cumulative_min)
                    arr_time = dep_time + timedelta(minutes=travel_time_min)

                    trains.append(TrainMovement(
                        train_id=f"{train_no}-{direction}-D{day}",
                        train_name=name,
                        train_type=ttype,
                        priority=prio,
                        section_id=sec_id,
                        direction=direction,
                        departure_time=dep_time.isoformat(),
                        arrival_time=arr_time.isoformat(),
                        day_of_week=current_date.weekday(),
                    ))
                    cumulative_min += travel_time_min + 2  # 2 min dwell

        # Suburban trains — every 5-15 min during peak, 15-30 min off-peak
        for day_offset in range(PLANNING_HORIZON_DAYS):
            if day_offset != day:
                continue
            current = current_date.replace(hour=4, minute=30)
            end_time = current_date.replace(hour=23, minute=59)

            while current < end_time:
                hour = current.hour
                # Determine frequency based on time of day
                is_peak = any(start <= hour < end for start, end in PEAK_HOURS)
                interval = random.randint(3, 8) if is_peak else random.randint(10, 20)

                for direction in ["UP", "DOWN"]:
                    # Suburban trains run through all sections
                    cumulative = 0
                    for sec_id in section_ids:
                        length = section_lengths[sec_id]
                        travel_min = int(length / 0.8)  # ~48 km/h avg for suburban
                        dep = current + timedelta(minutes=cumulative)
                        arr = dep + timedelta(minutes=travel_min)

                        trains.append(TrainMovement(
                            train_id=f"SUB-{current.strftime('%H%M')}-{direction}-D{day}",
                            train_name=f"Suburban {current.strftime('%H:%M')}",
                            train_type="Suburban",
                            priority=5,
                            section_id=sec_id,
                            direction=direction,
                            departure_time=dep.isoformat(),
                            arrival_time=arr.isoformat(),
                            day_of_week=current_date.weekday(),
                        ))
                        cumulative += travel_min + 1

                current += timedelta(minutes=interval)

        # Freight trains — 4-6 per day, usually night
        freight_times = ["01:00", "02:30", "03:15", "22:00", "23:30"]
        for ft in freight_times:
            ft_h, ft_m = map(int, ft.split(":"))
            base_dep = current_date.replace(hour=ft_h, minute=ft_m)
            for direction in ["UP"]:
                cumulative_min = 0
                for sec_id in section_ids:
                    length = section_lengths[sec_id]
                    travel_min = int(length / 0.6)  # ~36 km/h
                    dep = base_dep + timedelta(minutes=cumulative_min)
                    arr = dep + timedelta(minutes=travel_min)
                    trains.append(TrainMovement(
                        train_id=f"FRT-{ft.replace(':','')}-D{day}",
                        train_name=f"Freight {ft}",
                        train_type="Freight",
                        priority=6,
                        section_id=sec_id,
                        direction=direction,
                        departure_time=dep.isoformat(),
                        arrival_time=arr.isoformat(),
                        day_of_week=current_date.weekday(),
                    ))
                    cumulative_min += travel_min + 3

    return trains


def generate_manual_baseline(defects: list[Defect], base_date: Optional[datetime] = None) -> ManualSchedule:
    """
    Generate a naive/manual baseline schedule.
    Each department schedules independently, one task per block, no bundling.
    This represents the 'before' state for comparison.
    """
    if base_date is None:
        base_date = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)

    blocks = []
    conflict_count = 0

    # Sort defects by due date (FIFO — no priority intelligence)
    sorted_defects = sorted(defects, key=lambda d: d.due_date)

    # Track next available slot per section (naive: just stack sequentially in engineering hours)
    section_slots = {}
    for sec in SECTIONS:
        section_slots[sec["id"]] = base_date.replace(
            hour=ENGINEERING_HOURS_START, minute=30
        )

    for defect in sorted_defects:
        if defect.status == "Completed":
            continue

        sec_id = defect.section_id
        slot_start = section_slots[sec_id]

        # If past engineering hours end, move to next day
        while slot_start.hour >= ENGINEERING_HOURS_END and slot_start.hour < 24:
            slot_start = (slot_start + timedelta(days=1)).replace(
                hour=ENGINEERING_HOURS_START, minute=30
            )

        # Check if within planning horizon
        if (slot_start - base_date).days >= PLANNING_HORIZON_DAYS:
            continue

        slot_end = slot_start + timedelta(minutes=defect.estimated_duration_min + 20)  # +20 for setup/teardown

        # Naive: no check for train conflicts, just schedule
        is_peak = any(start <= slot_start.hour < end for start, end in PEAK_HOURS)
        if is_peak:
            conflict_count += 1

        block = ScheduledBlock(
            block_id=f"MAN-{uuid.uuid4().hex[:8]}",
            section_id=sec_id,
            block_type=defect.requires_block_type,
            start_time=slot_start.isoformat(),
            end_time=slot_end.isoformat(),
            duration_min=defect.estimated_duration_min + 20,
            departments=[defect.department],
            assigned_tasks=[defect.defect_id],
            status="Proposed",
            is_integrated=False,
            disruption_score=0.7 if is_peak else 0.3,
        )
        blocks.append(block)

        # Move slot forward
        section_slots[sec_id] = slot_end + timedelta(minutes=15)

    total_block_hours = sum(b.duration_min for b in blocks) / 60.0

    # Calculate asset availability (simple: total hours - block hours) / total hours
    total_section_hours = len(SECTIONS) * PLANNING_HORIZON_DAYS * 24
    asset_avail = ((total_section_hours - total_block_hours) / total_section_hours) * 100

    return ManualSchedule(
        blocks=blocks,
        total_block_hours=round(total_block_hours, 1),
        total_tasks_scheduled=len(blocks),
        integrated_block_count=0,  # Manual scheduling never integrates
        conflict_count=conflict_count,
        asset_availability_pct=round(asset_avail, 1),
    )


def defects_to_tasks(defects: list[Defect]) -> list[MaintenanceTask]:
    """Convert scored defects into schedulable maintenance tasks."""
    tasks = []
    for d in defects:
        if d.status == "Completed":
            continue
        task = MaintenanceTask(
            task_id=f"TSK-{d.defect_id.split('-')[1]}",
            defect_id=d.defect_id,
            section_id=d.section_id,
            department=d.department,
            task_type=d.defect_type,
            duration_min=d.estimated_duration_min,
            priority_score=d.priority_score,
            requires_block_type=d.requires_block_type,
            equipment_needed=d.equipment_needed,
        )
        tasks.append(task)
    return tasks
