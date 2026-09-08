"""
Risk-Based Defect Priority Scorer
Uses a rule-enhanced scoring model to classify defects by criticality.
Combines weighted feature scoring with hard safety rules.
"""

from datetime import datetime
from models.defects import Defect
from config import PRIORITY_WEIGHTS, TRAFFIC_DENSITY_SCORES, SECTIONS


def _get_section_density(section_id: str) -> str:
    """Look up traffic density for a section."""
    for s in SECTIONS:
        if s["id"] == section_id:
            return s["traffic_density"]
    return "medium"


def _days_overdue(defect: Defect, reference_date: datetime) -> int:
    """Calculate how many days a defect is overdue (negative = not yet due)."""
    due = datetime.fromisoformat(defect.due_date)
    return (reference_date - due).days


def _weather_factor(defect: Defect, reference_date: datetime) -> float:
    """Monsoon season (June-September) boosts drainage/OHE defects."""
    month = reference_date.month
    is_monsoon = 6 <= month <= 9
    if not is_monsoon:
        return 0.0

    monsoon_sensitive = [
        "Drainage Issue", "Ballast Deficiency", "OHE Wire Sag",
        "Insulator Damage", "Signal Cable Fault", "Track Geometry Defect",
    ]
    return 1.0 if defect.defect_type in monsoon_sensitive else 0.3


def score_defect(defect: Defect, reference_date: datetime = None) -> tuple[float, str]:
    """
    Score a defect on a 0-100 priority scale.

    Returns:
        (priority_score, priority_label)
    """
    if reference_date is None:
        reference_date = datetime.now()

    weights = PRIORITY_WEIGHTS

    # --- Feature 1: Base severity (0-100) ---
    severity_score = defect.severity / 100.0

    # --- Feature 2: Days overdue (exponential penalty) ---
    overdue_days = _days_overdue(defect, reference_date)
    if overdue_days > 0:
        overdue_score = min(1.0, overdue_days / 14.0)  # Saturates at 14 days
        overdue_score = overdue_score ** 0.7  # Exponential curve
    else:
        # Not yet due — small bonus for being proactive
        overdue_score = max(0.0, 0.2 - abs(overdue_days) * 0.02)

    # --- Feature 3: Traffic density ---
    density = _get_section_density(defect.section_id)
    density_score = TRAFFIC_DENSITY_SCORES.get(density, 0.5)

    # --- Feature 4: Safety impact ---
    safety_score = 1.0 if defect.safety_critical else 0.0

    # --- Feature 5: Weather factor ---
    weather_score = _weather_factor(defect, reference_date)

    # --- Weighted combination ---
    raw_score = (
        weights["base_severity"] * severity_score +
        weights["days_overdue"] * overdue_score +
        weights["traffic_density"] * density_score +
        weights["safety_impact"] * safety_score +
        weights["weather_factor"] * weather_score
    )

    # Scale to 0-100
    priority_score = round(raw_score * 100, 1)

    # --- Hard safety rules (override) ---
    if defect.safety_critical and defect.severity >= 85:
        priority_score = max(priority_score, 90.0)
    if defect.defect_type == "Rail Fracture":
        priority_score = max(priority_score, 95.0)
    if defect.defect_type == "Point Machine Failure":
        priority_score = max(priority_score, 92.0)
    if overdue_days > 7 and defect.safety_critical:
        priority_score = max(priority_score, 88.0)

    # Clamp
    priority_score = min(100.0, max(0.0, priority_score))

    # --- Label ---
    if priority_score >= 85:
        label = "Critical"
    elif priority_score >= 65:
        label = "High"
    elif priority_score >= 40:
        label = "Medium"
    else:
        label = "Low"

    return priority_score, label


def score_all_defects(defects: list[Defect], reference_date: datetime = None) -> list[Defect]:
    """Score all defects and return them with updated priority fields."""
    if reference_date is None:
        reference_date = datetime.now()

    scored = []
    for defect in defects:
        score, label = score_defect(defect, reference_date)
        defect.priority_score = score
        defect.priority_label = label
        scored.append(defect)

    # Sort by priority (highest first)
    scored.sort(key=lambda d: d.priority_score, reverse=True)
    return scored
