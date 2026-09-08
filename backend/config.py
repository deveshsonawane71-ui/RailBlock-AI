"""
RailBlock AI — Configuration Constants
Defines the corridor topology, time parameters, and system constants.
"""

from datetime import datetime, timedelta

# ──────────────────────────────────────────────
# Corridor Definition (Mumbai CST → Thane)
# ──────────────────────────────────────────────
STATIONS = [
    {"id": "STA01", "name": "Mumbai CST",  "km": 0.0,   "lat": 18.9398, "lon": 72.8355},
    {"id": "STA02", "name": "Byculla",     "km": 5.2,   "lat": 18.9775, "lon": 72.8331},
    {"id": "STA03", "name": "Dadar",       "km": 11.0,  "lat": 19.0178, "lon": 72.8425},
    {"id": "STA04", "name": "Kurla",       "km": 18.5,  "lat": 19.0653, "lon": 72.8794},
    {"id": "STA05", "name": "Thane",       "km": 34.0,  "lat": 19.1860, "lon": 72.9756},
]

SECTIONS = [
    {"id": "SEC01", "from_station": "STA01", "to_station": "STA02", "length_km": 5.2,  "tracks": 4, "max_speed_kmh": 100, "electrified": True,  "traffic_density": "very_high"},
    {"id": "SEC02", "from_station": "STA02", "to_station": "STA03", "length_km": 5.8,  "tracks": 4, "max_speed_kmh": 100, "electrified": True,  "traffic_density": "very_high"},
    {"id": "SEC03", "from_station": "STA03", "to_station": "STA04", "length_km": 7.5,  "tracks": 4, "max_speed_kmh": 110, "electrified": True,  "traffic_density": "high"},
    {"id": "SEC04", "from_station": "STA04", "to_station": "STA05", "length_km": 15.5, "tracks": 4, "max_speed_kmh": 120, "electrified": True,  "traffic_density": "high"},
]

# ──────────────────────────────────────────────
# Time Parameters
# ──────────────────────────────────────────────
PLANNING_HORIZON_DAYS = 7
TIME_SLOT_MINUTES = 15  # Granularity of scheduling
ENGINEERING_HOURS_START = 0   # 00:00
ENGINEERING_HOURS_END = 5     # 05:00
PEAK_HOURS = [(7, 10), (17, 21)]  # Morning and evening rush

# ──────────────────────────────────────────────
# Resource Constraints
# ──────────────────────────────────────────────
MAX_TAMPING_MACHINES = 2
MAX_TOWER_WAGONS = 2
MAX_CREW_SHIFT_HOURS = 8
MIN_REST_BETWEEN_SHIFTS_HOURS = 8
OHE_DEENERGIZE_LEAD_TIME_MIN = 15
BLOCK_SETUP_TIME_MIN = 10
BLOCK_TEARDOWN_TIME_MIN = 10

# ──────────────────────────────────────────────
# Defect Configuration
# ──────────────────────────────────────────────
DEPARTMENTS = ["ENG", "S&T", "TRD"]

DEFECT_TYPES = {
    "ENG": [
        {"type": "Rail Fracture",           "base_severity": 95, "duration_range": (60, 120),  "safety_critical": True},
        {"type": "Weld Failure",            "base_severity": 85, "duration_range": (90, 180),  "safety_critical": True},
        {"type": "Sleeper Damage",          "base_severity": 60, "duration_range": (30, 60),   "safety_critical": False},
        {"type": "Ballast Deficiency",      "base_severity": 40, "duration_range": (120, 240), "safety_critical": False},
        {"type": "Track Geometry Defect",   "base_severity": 70, "duration_range": (60, 120),  "safety_critical": True},
        {"type": "Drainage Issue",          "base_severity": 35, "duration_range": (90, 180),  "safety_critical": False},
        {"type": "Routine Tamping",         "base_severity": 20, "duration_range": (120, 300), "safety_critical": False},
        {"type": "Rail Grinding",           "base_severity": 30, "duration_range": (180, 360), "safety_critical": False},
    ],
    "S&T": [
        {"type": "Signal Cable Fault",      "base_severity": 80, "duration_range": (30, 90),   "safety_critical": True},
        {"type": "Point Machine Failure",   "base_severity": 90, "duration_range": (60, 120),  "safety_critical": True},
        {"type": "Track Circuit Fault",     "base_severity": 85, "duration_range": (45, 120),  "safety_critical": True},
        {"type": "Relay Replacement",       "base_severity": 50, "duration_range": (30, 60),   "safety_critical": False},
        {"type": "Axle Counter Maintenance","base_severity": 55, "duration_range": (60, 120),  "safety_critical": False},
        {"type": "LED Signal Replacement",  "base_severity": 40, "duration_range": (20, 45),   "safety_critical": False},
    ],
    "TRD": [
        {"type": "OHE Wire Sag",            "base_severity": 75, "duration_range": (60, 120),  "safety_critical": True},
        {"type": "Insulator Damage",        "base_severity": 80, "duration_range": (45, 90),   "safety_critical": True},
        {"type": "Mast Foundation Crack",   "base_severity": 70, "duration_range": (120, 240), "safety_critical": True},
        {"type": "Catenary Wire Wear",      "base_severity": 50, "duration_range": (60, 180),  "safety_critical": False},
        {"type": "Jumper Wire Replacement", "base_severity": 35, "duration_range": (30, 60),   "safety_critical": False},
        {"type": "Power Supply Unit Check", "base_severity": 25, "duration_range": (45, 90),   "safety_critical": False},
    ],
}

# ──────────────────────────────────────────────
# Train Priority Classes
# ──────────────────────────────────────────────
TRAIN_PRIORITIES = {
    "Rajdhani":     {"priority": 1, "color": "#ef4444"},
    "Shatabdi":     {"priority": 2, "color": "#f97316"},
    "Mail/Express": {"priority": 3, "color": "#eab308"},
    "Passenger":    {"priority": 4, "color": "#3b82f6"},
    "Suburban":     {"priority": 5, "color": "#8b5cf6"},
    "Freight":      {"priority": 6, "color": "#6b7280"},
}

# ──────────────────────────────────────────────
# Block Type Configuration
# ──────────────────────────────────────────────
BLOCK_TYPES = {
    "Traffic":        {"color": "#3b82f6", "departments": ["ENG"]},
    "Power":          {"color": "#f59e0b", "departments": ["TRD"]},
    "Disconnection":  {"color": "#8b5cf6", "departments": ["S&T"]},
    "Integrated":     {"color": "#10b981", "departments": ["ENG", "S&T", "TRD"]},
    "Shadow":         {"color": "#6366f1", "departments": ["ENG", "S&T", "TRD"]},
}

# ──────────────────────────────────────────────
# Scoring Weights for Priority Model
# ──────────────────────────────────────────────
PRIORITY_WEIGHTS = {
    "base_severity": 0.35,
    "days_overdue": 0.25,
    "traffic_density": 0.20,
    "safety_impact": 0.15,
    "weather_factor": 0.05,
}

TRAFFIC_DENSITY_SCORES = {
    "very_high": 1.0,
    "high": 0.75,
    "medium": 0.5,
    "low": 0.25,
}
