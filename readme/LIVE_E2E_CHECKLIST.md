# Live end-to-end grading checklist

## Prerequisites (done in this worktree)

- [x] Model weights in `models/`  
  - `detector_best.pt` (copied from `F:\Ahmad\models\`)  
  - `classifier_best.pt` (copied from `F:\Ahmad\models\`)  
- [x] `Productapp/.env` with:
  - `REACT_APP_API_URL=http://127.0.0.1:8000`
  - `REACT_APP_DEMO_MODE=false`
- [x] FastAPI health: `GET http://127.0.0.1:8000/health` → `ml_ready: true`
- [x] Smoke grade: `POST /api/v1/grade` with `sample_images/apple.jpg` → success

## Run both servers

**Terminal 1 — API (project root):**
```powershell
python -m uvicorn api.main:app --host 127.0.0.1 --port 8000
```

**Terminal 2 — React:**
```powershell
cd Productapp
npm start
```

Open http://127.0.0.1:3000

## Manual UI test

1. Login: `admin@example.com` / `Admin123!` (real API — not demo mock)
2. Dashboard → **New Analysis**
3. Fill lot fields (crates + avg weight)
4. Photos: upload **exactly 1 image per crate** (use `sample_images/apple.jpg` or a real tray photo)
5. Review → Processing → Results  
   - Counts should come from the model (not fixed demo 72%/28%)
6. Download PDF

## If login fails

- Confirm API is on port 8000 (`/health`)
- Confirm `.env` has `REACT_APP_DEMO_MODE=false` and restart `npm start` after any `.env` change
- Clear site localStorage if an old demo session sticks around
