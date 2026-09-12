# RailBlock AI

**AI-Powered Automatic Block Planning to Maximize Asset Availability for Train Operations on Indian Railways**

> SIH 2026 | PS ID: SIH26027 | Ministry of Railways | Category: Software

---

## 🌐 Live Deployments

| Component | Status | Live Public URL |
|---|---|---|
| **Frontend Web App** | [![GitHub Pages](https://img.shields.io/badge/GitHub%20Pages-Live-brightgreen)](https://deveshsonawane71-ui.github.io/RailBlock-AI/) | 👉 **[https://deveshsonawane71-ui.github.io/RailBlock-AI/](https://deveshsonawane71-ui.github.io/RailBlock-AI/)** |
| **Backend REST API** | [![Render](https://img.shields.io/badge/Render-Backend%20API-blue)](https://railblock-ai-backend.onrender.com) | 👉 **[https://railblock-ai-backend.onrender.com](https://railblock-ai-backend.onrender.com)** |
| **Interactive API Docs** | [![Swagger](https://img.shields.io/badge/Swagger-Docs-orange)](https://railblock-ai-backend.onrender.com/docs) | 👉 **[https://railblock-ai-backend.onrender.com/docs](https://railblock-ai-backend.onrender.com/docs)** |

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/deveshsonawane71-ui/RailBlock-AI)

---

## Overview

RailBlock AI is an intelligent block scheduling system that uses **Google OR-Tools CP-SAT constraint programming** to optimize maintenance block schedules across Indian Railway corridors. It replaces manual, siloed planning with AI-driven optimization that:

- **Prioritizes** defects by risk using ML-based scoring (safety-critical first)
- **Bundles** multi-department tasks into integrated blocks (ENG + S&T + TRD)
- **Minimizes** total block time and maximizes asset availability
- **Respects** real-world constraints (train timetable, equipment, crew hours, safety)
- **Re-plans dynamically** when emergencies occur
- **Keeps humans in the loop** with approval workflows

## Architecture

```
                    +------------------+
                    |   React Frontend |
                    |   (Vite + D3.js) |
                    +--------+---------+
                             |
                         REST API
                             |
                    +--------+---------+
                    |  FastAPI Backend  |
                    |                  |
                    |  +------------+  |
                    |  | Priority   |  |     TMS / SMMS / TDMS
                    |  | Scorer     |<-+---- (Simulated via
                    |  | (ML)       |  |      Synthetic Data)
                    |  +------------+  |
                    |  +------------+  |
                    |  | Task       |  |
                    |  | Bundler    |  |
                    |  +------------+  |
                    |  +------------+  |
                    |  | CP-SAT     |  |     COA
                    |  | Optimizer  |<-+---- (Simulated via
                    |  | (OR-Tools) |  |      Train Timetable)
                    |  +------------+  |
                    |  +------------+  |
                    |  | Dynamic    |  |
                    |  | Re-planner |  |
                    |  +------------+  |
                    +------------------+
```

## Tech Stack

| Layer | Technology | Purpose |
|---|---|---|
| **Frontend** | React 19 + Vite | Interactive dashboard |
| **Visualization** | D3.js (custom Gantt) | Block schedule timeline |
| **Icons** | Lucide React | Premium icon library |
| **Backend** | Python + FastAPI | REST API server |
| **Optimization** | Google OR-Tools (CP-SAT) | Constraint programming solver |
| **ML** | scikit-learn | Priority scoring model |
| **Data** | Synthetic generator | Realistic Mumbai CST-Thane corridor |

## Features

### 1. Dashboard
- 6 KPI cards with before/after improvement metrics
- Corridor map with station health indicators
- Defect distribution by department and priority
- Manual vs AI comparison table

### 2. Block Schedule (Gantt Chart)
- Custom D3.js-powered interactive timeline
- Color-coded blocks by type (Traffic/Power/Disconnection/Integrated)
- Engineering hours highlighting (00:00-05:00)
- Zoom controls (1-day / 3-day / 7-day view)
- Hover tooltips with block details
- Toggle between Manual baseline and AI-optimized views

### 3. Defect Management
- Searchable, filterable defect table
- Priority scores with color-coded labels
- Safety-critical flags
- Department and section filters

### 4. Block Approvals (Human-in-the-Loop)
- Pending approval queue
- Approve / Reject / Approve All actions
- Approval history with timestamps
- Task details per block

### 5. Emergency Re-Planning
- Quick preset emergency types (Rail Fracture, OHE Wire Snap, etc.)
- Real-time re-planning with frozen approved blocks
- Change summary (frozen / rescheduled / new blocks)

## Setup Instructions

### Prerequisites
- Python 3.9+ (tested with 3.14)
- Node.js 18+ (tested with 24.19)
- pip and npm

### 1-Click Permanent Launch (Recommended)

You can launch RailBlock AI with a single action:
- **Desktop Shortcut**: Double-click the **RailBlock AI** icon on your Desktop.
- **From Any Terminal**: Type `railblock` in any Command Prompt or PowerShell window.
- **From Project Folder**: Double-click `launch.bat` (or run `launch-with-tunnel.bat` to also generate a public shareable URL).
- **To Stop**: Double-click `stop.bat` or type `railblock-stop` in any terminal.

### Manual Backend Setup

```bash
cd backend
pip install -r requirements.txt
python -m uvicorn main:app --host 0.0.0.0 --port 8000
```

The backend will:
1. Generate synthetic corridor data (Mumbai CST - Thane, 5 stations, 4 sections)
2. Create 50 maintenance defects across ENG/S&T/TRD departments
3. Score all defects with the ML priority model
4. Generate a train timetable (~7500 movements/week)
5. Create a manual baseline schedule for comparison

API docs available at: https://railblock-ai-backend.onrender.com/docs (or http://localhost:8000/docs when running locally)

### Manual Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

### Cloud Deployment (Production)

#### 1. Frontend on GitHub Pages (Automated CI/CD)
The repository includes an automated GitHub Actions workflow (`.github/workflows/deploy-pages.yml`):
1. In your GitHub repository, go to **Settings** → **Pages**.
2. Under **Build and deployment** → **Source**, select **`GitHub Actions`**.
3. Push to `main` (or trigger the workflow under the Actions tab).
4. Your live app will be published at: **`https://deveshsonawane71-ui.github.io/RailBlock-AI/`**

#### 2. Backend on Render / Railway / Docker
- **Render**: Click the **Deploy to Render** button above or connect your GitHub repository on [render.com](https://render.com). Render automatically detects `render.yaml` and deploys the FastAPI backend for free!
- **Railway**: Connect your repository on [railway.app](https://railway.app), which automatically uses `railway.json` / `Procfile`.
- **Docker**: Run `docker build -t railblock-backend . && docker run -p 8000:8000 railblock-backend`.

### Quick Start Demo


1. Open the app -> Dashboard shows defect overview and corridor map
2. Go to **Block Schedule** -> Click **"Generate Optimal Schedule"**
3. Watch the CP-SAT solver produce an optimized schedule (~15s)
4. Toggle **"Show Manual Baseline"** to compare before/after
5. Go to **Approvals** -> Review and approve blocks
6. Go to **Emergency** -> Inject a "Rail Fracture" emergency -> Trigger re-plan
7. Return to **Dashboard** to see updated KPIs

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/corridor` | Corridor topology |
| GET | `/api/defects` | Active defects with priority scores |
| GET | `/api/trains` | Train timetable |
| POST | `/api/optimize` | Run CP-SAT optimizer |
| GET | `/api/schedule` | Current optimized schedule |
| GET | `/api/schedule/manual` | Manual baseline schedule |
| GET | `/api/schedule/compare` | Before/after comparison |
| POST | `/api/replan` | Emergency re-planning |
| GET | `/api/approvals/pending` | Pending approvals |
| POST | `/api/approvals/{id}/approve` | Approve a block |
| POST | `/api/approvals/{id}/reject` | Reject a block |
| GET | `/api/kpis` | Dashboard KPIs |
| GET | `/api/kpis/comparison` | Comparison KPIs |

## Corridor Data (Simulated)

**Mumbai CST -> Thane** (Central Railway, Mumbai Division)

| Section | Length | Tracks | Density |
|---|---|---|---|
| Mumbai CST -> Byculla | 5.2 km | 4 | Very High |
| Byculla -> Dadar | 5.8 km | 4 | Very High |
| Dadar -> Kurla | 7.5 km | 4 | High |
| Kurla -> Thane | 15.5 km | 4 | High |

## How the Optimizer Works

1. **Priority Scoring**: Each defect is scored 0-100 based on severity, overdue days, traffic density, safety impact, and weather factors
2. **Task Bundling**: Tasks on the same section from different departments are grouped into integrated blocks
3. **CP-SAT Optimization**: The solver assigns blocks to time windows (engineering hours preferred) with constraints:
   - No overlap on same section
   - Resource limits (tamping machines, tower wagons)
   - High-priority tasks scheduled earlier
   - Engineering hours preferred over off-peak
4. **Output**: Optimized schedule with blocks, timings, and task assignments

## Key Metrics

| KPI | What It Measures |
|---|---|
| Asset Availability % | % of time sections are available for trains |
| Block Utilization % | % of block time used productively |
| Integrated Block Ratio | % of blocks serving multiple departments |
| Overdue Maintenance | Count of overdue items |
| Avg Block Duration | Average hours per block |
| Delay Minutes Saved | Estimated delay reduction vs manual |

## License

Built for Smart India Hackathon 2026
