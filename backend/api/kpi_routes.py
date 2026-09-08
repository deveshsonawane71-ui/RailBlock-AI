"""
KPI Routes — API endpoints for dashboard KPI data.
"""

from fastapi import APIRouter

from engine.kpi_calculator import build_kpi_dashboard, build_comparison_kpis

router = APIRouter(prefix="/api", tags=["kpis"])

_state = {}


def init_state(state: dict):
    global _state
    _state = state


@router.get("/kpis")
def get_kpis():
    """Return computed KPIs for the dashboard."""
    current = _state.get("current_schedule")
    manual = _state.get("manual_schedule")
    defects = _state.get("defects", [])

    if not current or not manual:
        # Return placeholder KPIs
        return {
            "asset_availability": {"label": "Asset Availability", "value": 0, "unit": "%", "trend": "flat", "is_good": False, "baseline_value": 0, "improvement_pct": 0},
            "block_utilization": {"label": "Block Utilization", "value": 0, "unit": "%", "trend": "flat", "is_good": False, "baseline_value": 0, "improvement_pct": 0},
            "integrated_block_ratio": {"label": "Integrated Block Ratio", "value": 0, "unit": "%", "trend": "flat", "is_good": False, "baseline_value": 0, "improvement_pct": 0},
            "overdue_maintenance": {"label": "Overdue Maintenance", "value": 0, "unit": "items", "trend": "flat", "is_good": False, "baseline_value": 0, "improvement_pct": 0},
            "avg_block_duration": {"label": "Avg Block Duration", "value": 0, "unit": "hours", "trend": "flat", "is_good": False, "baseline_value": 0, "improvement_pct": 0},
            "delay_minutes_saved": {"label": "Delay Minutes Saved", "value": 0, "unit": "min", "trend": "flat", "is_good": False, "baseline_value": 0, "improvement_pct": 0},
        }

    dashboard = build_kpi_dashboard(
        optimized_blocks=current.blocks,
        manual_blocks=manual.blocks,
        defects=defects,
    )
    return dashboard.model_dump()


@router.get("/kpis/comparison")
def get_comparison_kpis():
    """Return before/after comparison KPIs."""
    current = _state.get("current_schedule")
    manual = _state.get("manual_schedule")
    defects = _state.get("defects", [])

    if not current or not manual:
        return []

    comparisons = build_comparison_kpis(
        optimized_blocks=current.blocks,
        manual_blocks=manual.blocks,
        defects=defects,
    )
    return [c.model_dump() for c in comparisons]
