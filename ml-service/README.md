# Python ML Service (Apple Grade A / B ONLY)

Ye service **sirf** tray image se apples detect karke Good (A) / Bad (B) count return karti hai.

Baaki sab (auth, admin, jobs, weights, image lifecycle) **Laravel** mein hai:
`F:\Ahmad\laravel-api`

## Run

From project root `F:\Ahmad` (uses existing `api/` + `grader.py` + `models/`):

```bash
cd F:\Ahmad
pip install -r requirements.txt
pip install -r api/requirements.txt
python -m uvicorn api.main:app --host 127.0.0.1 --port 8000
```

Laravel calls:

`POST http://127.0.0.1:8000/api/v1/grade`  
form-data: `images` (1–10 files)

## Core file (do not modify for business APIs)

- `grader.py` — ML engine
- `api/routers/grade_routes.py` — HTTP wrapper
- `api/ml_service.py` — loads AppleGrader
