# Malus Lens — Project Status

**Date:** 15 September 2026  
**Source of scope:** `readme/MalusLensProposalCnELIndia-1-v64.pdf`  
**Codebase:** `F:\Ahmad` (Productapp + Python API + Laravel API + models)

---

## Executive summary

| Area | Status |
|------|--------|
| User analysis flow (lot → photos → results → PDF) | **Done** |
| Custom AI model + Python grading API | **Done** (backend) |
| End-to-end live grading from the app | **Ready to verify** — weights copied, `.env` live, API `ml_ready` |
| Admin panel UI | **Done** (`/admin` — pending users, orgs, subscriptions) |
| True installable PWA | **Done** (manifest + service worker; production build) |
| Phase 3 landing / production handover | **Landing UI done**; hosting/Calendly/accuracy figures still pending |

---

## Proposal deliverables

| # | Deliverable | Status | Notes |
|---|-------------|--------|--------|
| 1 | Mobile-friendly **PWA** | **DONE** | Mobile-first React + `manifest.json` (192/512 icons, standalone) + Workbox **service worker** (`src/service-worker.js`). App shell caches on `npm run build`; `/api/*` is network-only. Requires HTTPS (or localhost) in production. |
| 2 | Custom-trained **AI model** for apple grading | **DONE** | Weights in `models/` (`detector_best.pt`, `classifier_best.pt`, `config.json`). Engine: `grader.py`. API: `api/ml_service.py`. Training scripts/datasets not in repo (expected if client-provided). |
| 3 | **Admin panel** (users / orgs / subscriptions) | **DONE** | Backend APIs + React Admin UI at `/admin` (pending approve/reject, user list, orgs + subscription). Demo mode uses local store. |
| 4 | Secure **auth & sessions** | **MOSTLY DONE** | API + UI: register → pending → login, 7-day tokens, one-device. Live `.env` path available. **Forgot / reset password UI added** (token returned until SMTP is wired). |
| 5 | **PDF reports** (A/B grades + weight estimates) | **DONE** | Client PDF via `Productapp/src/utils/pdfReport.js` + Results screen. A/B labels, weights, grower fields, org name, sampled-by. Not stored on server. |

---

## Key features

| Feature | Status | Evidence / gap |
|---------|--------|----------------|
| Capture tray photos → grade counts | **DONE** | Camera + upload in `Photos.js`; UI shows **A Grade / B Grade** |
| Photo count rule | **DONE** (stricter than PDF) | App enforces **exactly 1 image per crate** |
| Estimate A/B weights from avg crate weight | **DONE** | `utils/weights.js` + Results + PDF (incl. avg per crate) |
| Download / share PDF | **DONE** | Results screen |
| Temp images deleted after processing | **DONE** (API) | Grade/job workers delete after process |
| No report history | **DONE** | By product design |
| Admin: users / orgs / subscriptions | **DONE** | APIs + `/admin` UI (role=admin only) |
| Subscription gating | **PARTIAL** | UI blocks analysis; live `POST /grade` is unauthenticated unless jobs path is used |
| Processing status / retry jobs | **PARTIAL** | Jobs API exists; React uses sync grade (demo delay) |
| Public marketing landing page (Phase 3) | **DONE (UI)** | `/` and `/landing` — hero, About, Problem, Benefits, Accuracy/Feedback placeholders, Showcase, Vision, Contact, footer. Set `REACT_APP_CALENDLY_URL` for booking. |
| Production hosting / handover | **PARTIAL** | Docs exist; demo mode default; frontend build packaging incomplete |

---

## Timeline vs proposal phases

| Phase | Focus | Status |
|-------|--------|--------|
| **Phase 1** — Planning, data, model / API foundation | ML + FastAPI | **Mostly DONE** |
| **Phase 2** — App (camera, analysis, reports), auth, admin | Product app | **User flow + Admin UI + PWA DONE**; live E2E ready to verify |
| **Phase 3** — Testing, deploy, training, landing | Go-live | **Landing UI DONE**; deploy + Calendly + field accuracy copy pending |

---

## Focused status: Python API ↔ PWA ↔ AI model

### Short answer

**Yes — the Python grading API and custom model integration are done.**  
**But** the React app is in **demo mode by default**, so it does **not** call that API until demo is turned off.

### What is done (backend / ML)

| Piece | Status | Location |
|-------|--------|----------|
| Model weights | Done | `models/detector_best.pt`, `models/classifier_best.pt`, `models/config.json` |
| Grader engine | Done | `grader.py` |
| FastAPI ML wrapper | Done | `api/ml_service.py` |
| Grade HTTP endpoint | Done | `POST /api/v1/grade` — `api/routers/grade_routes.py` |
| Frontend API client | Done | `Productapp/src/services/api.js` → `gradeImages()` |
| Analysis wiring (when demo off) | Done | `Productapp/src/context/AnalysisContext.js` |

### Live connection path

```
Productapp (PWA)
  → POST /api/v1/grade  (FormData images)
  → FastAPI api/routers/grade_routes.py
  → api/ml_service.py
  → grader.py + models/*.pt
  → JSON A/B counts
  → UI weights + PDF report
```

### What blocks “fully live” end-to-end

1. Set `REACT_APP_DEMO_MODE=false` in `Productapp/.env`
2. Run uvicorn with models present (`api.main:app`)
3. Optional production hardening: auth/subscription on grade path (or use jobs API)
4. Deploy production build over HTTPS so the service worker can install on devices

**Proposal line item “Custom-trained AI model + API the product app uses”:**  
→ **Backend/API/model: DONE**  
→ **End-to-end live in the app: PENDING until demo mode is disabled and API is running**

---

## Extra UI work completed (beyond core PDF wording)

- Malus Lens branding and logo (PNG)
- Darker red theme; white sidebar + white header (“Quality Check Report” + cold store name)
- Grower Name / Sub-Grower Name fields + PDF
- Login centered frosted card + background photo
- Register solid red background + centered form
- 1-image-per-crate enforcement

---

## Suggested next priorities

1. Set **Calendly / booking URL** + real contact details on landing  
2. **Model accuracy spot-check** → fill Accuracy section with real numbers  
3. **Production deploy** (client server / GPU host) — serve `Productapp/build` or copy to `frontend_build/`  
4. Wire **SMTP** for password reset; harden grade/jobs for production  
5. Confirm **Live E2E** grading on phones via installed PWA  

---

## Accuracy note

Training val accuracy in `models/config.json` (~91%) ≠ field accuracy. Use annotated CLI runs (`python grade.py … --save`) and a human score sheet before trusting production counts.

---

## Related docs in this folder

- `MalusLensProposalCnELIndia-1-v64.pdf` — original scope / commercial proposal  
- `PROJECT_STATUS.md` — this status file  

---

*Generated from codebase review against the proposal PDF. Update this file as milestones complete.*
