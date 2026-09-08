"""
RailBlock AI — FastAPI Main Application
AI-Powered Automatic Block Planning System for Indian Railways
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime

from data.generator import generate_corridor, generate_defects, generate_train_timetable, generate_manual_baseline
from engine.priority_scorer import score_all_defects
from api import data_routes, optimize_routes, approval_routes, kpi_routes

# ──────────────────────────────────────────────
# Initialize FastAPI App
# ──────────────────────────────────────────────
app = FastAPI(
    title="RailBlock AI",
    description="AI-Powered Automatic Block Planning to Maximize Asset Availability for Train Operations on Indian Railways",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS — allow frontend dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ──────────────────────────────────────────────
# Application State (in-memory for prototype)
# ──────────────────────────────────────────────
base_date = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)

print("[RailBlock AI] Initializing...")
print("   Generating corridor topology...")
corridor = generate_corridor()

print("   Generating defect data (50 defects)...")
defects = generate_defects(n=50, base_date=base_date)

print("   Scoring defects with priority model...")
defects = score_all_defects(defects, base_date)

print("   Generating train timetable...")
trains = generate_train_timetable(base_date=base_date)

print("   Generating manual baseline schedule...")
manual_schedule = generate_manual_baseline(defects, base_date=base_date)

print(f"   [OK] Ready! {len(defects)} defects, {len(trains)} train movements, {len(manual_schedule.blocks)} manual blocks")

# Shared state dict
state = {
    "corridor": corridor,
    "defects": defects,
    "trains": trains,
    "manual_schedule": manual_schedule,
    "current_schedule": None,
    "base_date": base_date,
}

# Initialize route modules with shared state
data_routes.init_state(state)
optimize_routes.init_state(state)
approval_routes.init_state(state)
kpi_routes.init_state(state)

# Register routers
app.include_router(data_routes.router)
app.include_router(optimize_routes.router)
app.include_router(approval_routes.router)
app.include_router(kpi_routes.router)


# ──────────────────────────────────────────────
# Root endpoint
# ──────────────────────────────────────────────
@app.get("/")
def root():
    return {
        "name": "RailBlock AI",
        "version": "1.0.0",
        "description": "AI-Powered Block Planning System for Indian Railways",
        "status": "running",
        "corridor": corridor.name,
        "stats": {
            "stations": len(corridor.stations),
            "sections": len(corridor.sections),
            "active_defects": len([d for d in defects if d.status == "Open"]),
            "train_movements": len(trains),
            "manual_blocks": len(manual_schedule.blocks),
            "optimized_schedule": state["current_schedule"] is not None,
        },
        "endpoints": {
            "docs": "/docs",
            "corridor": "/api/corridor",
            "defects": "/api/defects",
            "trains": "/api/trains",
            "optimize": "POST /api/optimize",
            "schedule": "/api/schedule",
            "kpis": "/api/kpis",
        }
    }


@app.get("/health")
@app.get("/api/health")
def health():
    return {"status": "healthy", "timestamp": datetime.now().isoformat()}

