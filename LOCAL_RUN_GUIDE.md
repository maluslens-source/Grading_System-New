# Localhost Run Guide — For Senior Review

How this project is structured, which services run on localhost, and the exact commands to start them.

---

## 1. What this project does

Tray photo → detect each apple → classify **Grade A (good)** / **Grade B (bad)** → show counts, weights, and job history in a web UI.

---

## 2. Services overview (what runs where)

There are **three pieces**. On localhost you usually run **two terminals** (Python backend + React UI). Laravel is an optional second backend path.

```text
┌─────────────────────────────────────┐
│  React UI  (Productapp)             │  http://127.0.0.1:3000
│  Login, dashboard, upload, results  │
└──────────────────┬──────────────────┘
                   │ REST (REACT_APP_API_URL)
                   ▼
┌─────────────────────────────────────┐
│  Python FastAPI  (api/)             │  http://127.0.0.1:8000
│  Auth, admin, jobs, AND AI/ML       │
│  Uses grader.py + models/*.pt       │
└─────────────────────────────────────┘

Optional alternate business API:
┌─────────────────────────────────────┐
│  Laravel PHP  (laravel-api/)        │  http://127.0.0.1:8080
│  Auth / admin / jobs / weights      │
│  Calls Python ONLY for grading      │  → POST http://127.0.0.1:8000/api/v1/grade
└─────────────────────────────────────┘
```

### Who does what

| Concern | Python FastAPI (`:8000`) | Laravel (`:8080`) | React (`:3000`) |
|---------|--------------------------|-------------------|-----------------|
| Login / register / admin | Yes (built-in) | Yes (if you use Laravel path) | UI only |
| Analysis jobs | Yes | Yes | UI only |
| **AI/ML grading** | **Yes — only here** | No (calls Python) | No |
| Model files | `models/detector_best.pt`, `models/classifier_best.pt` | — | — |
| Database | SQLite under Python `api` data | SQLite `laravel-api/database/database.sqlite` | — |

**Important:** All AI/ML inference runs in **Python** (`grader.py` + Ultralytics YOLO + EfficientNet via the FastAPI service). There is no separate “ML microservice folder” you must start — `ml-service/` is documentation; the live service is `uvicorn api.main:app`.

---

## 3. Recommended localhost setup (simplest)

This matches the current `Productapp/.env`:

```env
REACT_APP_API_URL=http://127.0.0.1:8000
REACT_APP_DEMO_MODE=true
```

### One-time setup

```powershell
# From F:\Ahmad — Python deps
cd F:\Ahmad
pip install -r requirements.txt
pip install -r api/requirements.txt

# Confirm model weights exist
dir models\detector_best.pt
dir models\classifier_best.pt

# React deps
cd F:\Ahmad\Productapp
npm install
```

### Every time you want to run (2 terminals)

**Terminal 1 — Backend + AI/ML (Python FastAPI)**

```powershell
cd F:\Ahmad
python -m uvicorn api.main:app --host 127.0.0.1 --port 8000
```

Check:

| URL | Meaning |
|-----|---------|
| http://127.0.0.1:8000/health | `"status":"ok"`, `"ml_ready":true` |
| http://127.0.0.1:8000/docs | Swagger API docs |
| http://127.0.0.1:8000/api/v1/grade | ML grade endpoint (POST) |

**Terminal 2 — Frontend (React)**

```powershell
cd F:\Ahmad\Productapp
npm start
```

Open: **http://127.0.0.1:3000**

Default admin (Python bootstrap):

- Email: `admin@example.com`
- Password: `Admin123!`

---

## 4. How the AI/ML service works (inside Python)

```text
Upload image(s)
    → FastAPI route  POST /api/v1/grade  (or via jobs flow)
    → api/ml_service.py loads AppleGrader
    → grader.py
         Stage 1: YOLOv8 detector  (models/detector_best.pt)
         Stage 2: EfficientNet classifier (models/classifier_best.pt)
    → returns Grade A / Grade B counts (+ boxes / scores as configured)
```

Key files:

| File | Role |
|------|------|
| `grader.py` | Core ML engine (do not rewrite for business APIs) |
| `api/ml_service.py` | Loads models into memory |
| `api/routers/grade_routes.py` | HTTP wrapper for grading |
| `api/routers/auth_routes.py` | Login / register (Python path) |
| `api/routers/jobs_routes.py` | Job submit / status / results |
| `models/*.pt` | Trained weights (required for `ml_ready: true`) |

CLI grading without the server:

```powershell
cd F:\Ahmad
python grade.py sample_images\apple.jpg
```

---

## 5. Optional: Laravel + Python split

Use this when senior wants the **PHP database / Laravel business API** in front, and Python only for ML.

**Terminal 1 — AI/ML only**

```powershell
cd F:\Ahmad
python -m uvicorn api.main:app --host 127.0.0.1 --port 8000
```

**Terminal 2 — Laravel business API**

```powershell
cd F:\Ahmad\laravel-api
# once: composer install, copy .env.example .env, php artisan key:generate
# once: ensure database\database.sqlite exists, then:
php artisan migrate --seed
php artisan serve --host=0.0.0.0 --port=8080
```

Laravel `.env` already points ML to Python:

```env
PYTHON_ML_URL=http://127.0.0.1:8000
PYTHON_ML_GRADE_PATH=/api/v1/grade
```

- Business API base: `http://127.0.0.1:8080/api/v1`
- ML still at: `http://127.0.0.1:8000/api/v1/grade`
- Admin: `admin@example.com` / `Admin123!`
- More detail: `laravel-api/PHP_DATABASE.md`

> Note: The React app is currently configured for the **Python** API on port **8000**. To use Laravel from the UI you must point `REACT_APP_API_URL` to `http://127.0.0.1:8080` and confirm endpoint shapes match.

---

## 6. Quick health checklist for senior demo

1. Python running → open http://127.0.0.1:8000/health → `ml_ready: true`
2. React running → open http://127.0.0.1:3000
3. Login with admin credentials
4. Upload a tray image from `sample_images/`
5. Confirm Grade A / B results return

If `ml_ready` is false: missing or unloadable `models/*.pt`.

If login 404: UI is not talking to uvicorn (do not use `python -m http.server` for the API).

---

## 7. Port map (memorize this)

| Port | Service |
|------|---------|
| **8000** | Python FastAPI — backend + AI/ML |
| **3000** | React UI (npm start) |
| **8080** | Laravel PHP API (optional) |

---

## 8. Related docs

| Doc | Topic |
|-----|--------|
| `ARCHITECTURE.md` | Laravel ↔ Python split diagram |
| `DEPENDENCIES.md` | All install + run commands |
| `laravel-api/PHP_DATABASE.md` | Why Laravel needs a DB |
| `ml-service/README.md` | ML-only notes |
| `api/README.md` | FastAPI feature / client flow |
| `SERVER_DEPLOY.md` | Deploy UI+API on a server |
