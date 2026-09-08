"""
Pydantic models for KPI (Key Performance Indicator) responses.
"""

from pydantic import BaseModel


class KPIValue(BaseModel):
    label: str
    value: float
    unit: str
    trend: str  # "up", "down", "flat"
    is_good: bool  # True if trend direction is desirable
    baseline_value: float = 0.0
    improvement_pct: float = 0.0


class KPIDashboard(BaseModel):
    asset_availability: KPIValue
    block_utilization: KPIValue
    integrated_block_ratio: KPIValue
    overdue_maintenance: KPIValue
    avg_block_duration: KPIValue
    delay_minutes_saved: KPIValue


class ComparisonKPI(BaseModel):
    metric: str
    manual_value: float
    ai_value: float
    improvement: float
    unit: str
