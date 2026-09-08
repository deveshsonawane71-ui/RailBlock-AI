"""
Pydantic models for railway infrastructure assets.
Represents stations, track sections, OHE segments, and signal equipment.
"""

from pydantic import BaseModel
from typing import Optional


class Station(BaseModel):
    id: str
    name: str
    km: float
    lat: float
    lon: float


class TrackSection(BaseModel):
    id: str
    from_station: str
    to_station: str
    length_km: float
    tracks: int
    max_speed_kmh: int
    electrified: bool
    traffic_density: str  # "very_high", "high", "medium", "low"
    from_station_name: Optional[str] = None
    to_station_name: Optional[str] = None


class TrainMovement(BaseModel):
    train_id: str
    train_name: str
    train_type: str  # Rajdhani, Shatabdi, Mail/Express, Suburban, Freight
    priority: int
    section_id: str
    direction: str  # "UP" or "DOWN"
    departure_time: str   # ISO format
    arrival_time: str     # ISO format
    day_of_week: int      # 0=Monday ... 6=Sunday


class Corridor(BaseModel):
    stations: list[Station]
    sections: list[TrackSection]
    name: str = "Mumbai CST — Thane Corridor"
    zone: str = "Central Railway"
    division: str = "Mumbai Division"
