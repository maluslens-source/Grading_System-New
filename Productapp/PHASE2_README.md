# Phase 2 — Frontend Analysis App

Authenticated mobile-first React app connected to `F:\\Ahmad\\api` ML grading API.

## Run

**API (terminal 1):**
```bash
cd F:\Ahmad
python -m uvicorn api.main:app --host 0.0.0.0 --port 8000
```

**React (terminal 2):**
```bash
cd F:\Ahmad\Productapp
npm start
```

Open http://localhost:3000

API URL: `.env` → `REACT_APP_API_URL=http://127.0.0.1:8000`

## Demo accounts

- Bootstrap admin: `admin@example.com` / `Admin123!` (can run analysis + **Admin** panel)
- In **demo mode**, any email starting with `admin@` gets the Admin sidebar
- New users: Register → admin must approve + activate org subscription

## PWA (service worker)

Production builds include a Workbox service worker that caches the app shell for install / offline open.

```bash
cd F:\Ahmad\Productapp
npm run build
# output: build/  (also copied to F:\Ahmad\frontend_build for FastAPI static serve)
```

- **Dev (`npm start`)**: service worker is **not** registered (CRA production-only).
- **Production**: open the built app over **HTTPS** or **localhost** → browser can Install / Add to Home Screen.
- `/api/*` grading and auth calls are **never cached** (network-only).

## Screens

Login · Forgot/Reset password · Register · Pending · Dashboard · **Admin** · Landing · Lot · Photos · Review · Processing · Results · Subscription blocked

### Admin (`/admin`, role=admin only)

- Pending: approve / reject + assign organisation
- Users: list all
- Organisations: create + set subscription status / expiry
