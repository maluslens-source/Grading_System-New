# Dependencies & Run Commands

Single reference for install deps and how to run each part of this project.
Manifest files (do not edit this doc instead of them): `requirements.txt`, `api/requirements.txt`, `Productapp/package.json`, `laravel-api/composer.json`.

---

## System prerequisites

| Stack | Need |
|-------|------|
| Python ML + FastAPI | Python 3.10+ recommended, pip |
| React UI (`Productapp`) | Node.js LTS (18+), npm or yarn |
| Laravel API (`laravel-api`) | PHP 8.2+, Composer, SQLite or MySQL |
| Models | Place weights under `models/` (see root `README.md`) |

Installed folders **not** shipped in source zips: `node_modules/`, `vendor/`, `.venv/` / `venv/`.

---

## 1. Python ML (CLI grader)

**Manifest:** `requirements.txt`

| Package | Purpose |
|---------|---------|
| `torch`, `torchvision` | Deep learning runtime |
| `ultralytics` | YOLOv8 detection |
| `opencv-python` | Image I/O / drawing |
| `numpy` | Arrays |
| `pillow-heif` | HEIC image support |

**Install (from project root):**

```bash
pip install -r requirements.txt
```

**Run:**

```bash
python grade.py tray_photo.jpg
python grade.py images/
python grade.py tray.jpg --save --output results/
python grade.py tray.jpg --json
python grade.py tray.jpg --device cpu
```

---

## 2. Python FastAPI (`api/`)

**Manifest:** `api/requirements.txt` (install **in addition to** root `requirements.txt`)

| Package | Purpose |
|---------|---------|
| `fastapi` | REST API |
| `uvicorn[standard]` | ASGI server |
| `python-multipart` | File uploads |
| `python-jose[cryptography]` | JWT |
| `bcrypt` | Password hashing |
| `pydantic[email]`, `email-validator` | Validation |

**Install (from project root):**

```bash
pip install -r requirements.txt
pip install -r api/requirements.txt
```

**Run (from project root):**

```bash
python -m uvicorn api.main:app --host 0.0.0.0 --port 8000
# or with reload:
uvicorn api.main:app --host 0.0.0.0 --port 8000 --reload
```

| URL | Use |
|-----|-----|
| http://127.0.0.1:8000/ | UI if `frontend_build/` is present |
| http://127.0.0.1:8000/docs | Swagger |
| http://127.0.0.1:8000/health | Health check |

Default bootstrap admin: `admin@example.com` / `Admin123!`

Windows demo helper: `api/start_demo.bat`

---

## 3. React frontend (`Productapp/`)

**Manifest:** `Productapp/package.json`

Main runtime deps: React 18, MUI 5, Emotion, React Router 6, Chart.js, chroma-js, jspdf, yup, react-scripts 5.

**Install & run:**

```bash
cd Productapp
npm install
npm start
```

**Production build** (copy contents of `Productapp/build/` → project `frontend_build/` for uvicorn static serving):

```bash
cd Productapp
npm run build
```

Other scripts: `npm test`, `npm run install:clean`

---

## 4. Laravel API (`laravel-api/`)

**Manifest:** `laravel-api/composer.json`

| Package | Purpose |
|---------|---------|
| `php` ^8.2 | Runtime |
| `laravel/framework` ^11 | App framework |
| `laravel/sanctum` ^4 | API tokens |
| `guzzlehttp/guzzle` ^7.8 | HTTP client to Python ML |

Dev: `laravel/pint`, `nunomaduro/collision`, `phpunit/phpunit`

**Install & run:**

```bash
cd laravel-api
composer install
copy .env.example .env
php artisan key:generate
# create SQLite DB file if using SQLite, then:
php artisan migrate --seed
php artisan serve --host=0.0.0.0 --port=8080
```

Python ML must still be running separately (e.g. port 8000) for grading.

---

## Typical local layouts

**A — Python API only (auth + jobs + ML in FastAPI):**

```bash
# terminal 1 — project root
pip install -r requirements.txt
pip install -r api/requirements.txt
python -m uvicorn api.main:app --host 0.0.0.0 --port 8000
```

**B — Laravel API + Python ML:**

```bash
# terminal 1 — project root
python -m uvicorn api.main:app --host 127.0.0.1 --port 8000

# terminal 2
cd laravel-api
php artisan serve --host=0.0.0.0 --port=8080
```

**C — React UI in dev mode:**

```bash
cd Productapp
npm start
```

Point the app API base URL at whichever backend you are using (see `Productapp/src/services/api.js` / env as configured).

---

## Related docs

| File | Topic |
|------|--------|
| `README.md` | CLI grader quick start & model weights |
| `api/README.md` | FastAPI features & client flow |
| `laravel-api/README.md` | Laravel endpoints |
| `SERVER_DEPLOY.md` | Deploy UI + API on a server |
| `ARCHITECTURE.md` | System architecture |
| `ml-service/README.md` | ML service notes |
| `Productapp/PHASE2_README.md` | Frontend phase notes |
