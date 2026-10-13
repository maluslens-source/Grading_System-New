# Apple Grading — Laravel API + Python ML

## Architecture

```text
Client / React
    │
    ▼
Laravel PHP API  (this folder)     ← auth, admin, jobs, weights, image lifecycle
    │
    │  HTTP POST multipart images
    ▼
Python FastAPI   (F:\Ahmad\api)    ← ONLY apple Grade A / Grade B (grader.py)
```

| Concern | Where |
|---------|--------|
| Login, register, approval, one-device, 7-day token, forgot password | **Laravel** |
| Admin: users, orgs, subscription | **Laravel** |
| Job submit / status / results / retry | **Laravel** |
| Weight calculation | **Laravel** |
| Upload → process → delete images | **Laravel** |
| Detect apples + good/bad counts | **Python** (`grader.py` via `/api/v1/grade`) |

## Requirements

- PHP 8.2+
- Composer
- SQLite or MySQL
- Running Python ML service (`uvicorn api.main:app --port 8000`)

## Install

```bash
cd laravel-api
composer install
copy .env.example .env   # Windows
# cp .env.example .env   # Linux
php artisan key:generate
# SQLite:
New-Item database\database.sqlite -ItemType File   # Windows
# touch database/database.sqlite                   # Linux
php artisan migrate --seed
php artisan serve --host=0.0.0.0 --port=8080
```

Python ML (separate terminal, from `F:\Ahmad`):

```bash
python -m uvicorn api.main:app --host 127.0.0.1 --port 8000
```

## Main endpoints (prefix `/api/v1`)

### Auth
- `POST /auth/register`
- `POST /auth/login`  (body includes `device_id`)
- `POST /auth/logout` + headers `Authorization`, `X-Device-Id`
- `GET  /auth/me`
- `POST /auth/forgot-password`
- `POST /auth/reset-password`

### Admin
- `GET  /admin/users/pending`
- `POST /admin/users/{id}/approval`
- `GET|PATCH /admin/users`
- `POST|GET /admin/organizations`
- `POST /admin/organizations/{id}/subscription`

### Jobs (analysis)
- `POST /jobs/submit`  multipart: `images[]`, `lot_id`, `lot_name`, `crates_sampled`, `average_weight_kg`, `auto_process`
- `POST /jobs/{id}/process`
- `GET  /jobs/{id}/status`
- `GET  /jobs/{id}/results`
- `POST /jobs/{id}/retry`
- `GET  /jobs`

Bootstrap admin: `admin@example.com` / `Admin123!`
