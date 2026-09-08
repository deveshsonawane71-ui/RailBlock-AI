"""
Multi-Department Task Bundler
Groups tasks from different departments that can share an integrated block.
Uses proximity scoring and time-window compatibility.
"""

from models.defects import MaintenanceTask
from config import BLOCK_TYPES


def bundle_tasks(tasks: list[MaintenanceTask]) -> list[list[MaintenanceTask]]:
    """
    Group tasks into bundles that can share an integrated block.

    Rules:
    - Tasks must be on the same section
    - Tasks must be from different departments (to justify integration)
    - Combined duration should not exceed 300 minutes (5 hours)
    - At least 2 departments must be represented for an "integrated" block

    Returns:
        List of task bundles. Each bundle is a list of tasks.
    """
    # Group tasks by section
    section_tasks: dict[str, list[MaintenanceTask]] = {}
    for task in tasks:
        if task.section_id not in section_tasks:
            section_tasks[task.section_id] = []
        section_tasks[task.section_id].append(task)

    bundles = []

    for section_id, sec_tasks in section_tasks.items():
        # Group by department within section
        dept_tasks: dict[str, list[MaintenanceTask]] = {}
        for t in sec_tasks:
            if t.department not in dept_tasks:
                dept_tasks[t.department] = []
            dept_tasks[t.department].append(t)

        # Sort each department's tasks by priority (highest first)
        for dept in dept_tasks:
            dept_tasks[dept].sort(key=lambda t: t.priority_score, reverse=True)

        # Try to create integrated bundles
        departments = list(dept_tasks.keys())

        if len(departments) >= 2:
            # Greedy bundling: take the highest-priority task from each department
            used_tasks = set()
            while True:
                bundle = []
                total_duration = 0
                max_duration = 300  # 5 hours max

                for dept in departments:
                    available = [t for t in dept_tasks[dept] if t.task_id not in used_tasks]
                    if not available:
                        continue

                    # Pick the highest priority task that fits
                    for candidate in available:
                        if total_duration + candidate.duration_min <= max_duration:
                            bundle.append(candidate)
                            total_duration += candidate.duration_min
                            used_tasks.add(candidate.task_id)
                            break

                if len(bundle) >= 2 and len(set(t.department for t in bundle)) >= 2:
                    bundles.append(bundle)
                else:
                    # Can't form an integrated bundle, add remaining as singles
                    for t in bundle:
                        used_tasks.discard(t.task_id)
                    break

            # Remaining unbundled tasks become single-task blocks
            for dept in departments:
                remaining = [t for t in dept_tasks[dept] if t.task_id not in used_tasks]
                for t in remaining:
                    bundles.append([t])
        else:
            # Only one department on this section — no integration possible
            for t in sec_tasks:
                bundles.append([t])

    return bundles


def determine_block_type(bundle: list[MaintenanceTask]) -> str:
    """Determine the block type needed for a bundle of tasks."""
    departments = set(t.department for t in bundle)

    if len(departments) >= 2:
        return "Integrated"

    dept = departments.pop()
    if dept == "TRD":
        return "Power"
    elif dept == "S&T":
        return "Disconnection"
    else:
        return "Traffic"


def get_bundle_summary(bundles: list[list[MaintenanceTask]]) -> dict:
    """Get summary statistics about the bundles."""
    integrated = [b for b in bundles if len(set(t.department for t in b)) >= 2]
    single = [b for b in bundles if len(b) == 1]

    return {
        "total_bundles": len(bundles),
        "integrated_bundles": len(integrated),
        "single_task_blocks": len(single),
        "total_tasks": sum(len(b) for b in bundles),
        "avg_tasks_per_integrated": (
            round(sum(len(b) for b in integrated) / len(integrated), 1)
            if integrated else 0
        ),
    }
