# PHP / Laravel Database — Why It Matters & How It Runs

## Short answer for your sir

**Yes — Laravel cannot run the business API without a database.**  
Auth, users, organizations, subscriptions, analysis jobs, and device sessions are all stored in the DB.

In this project the PHP database is **already created** and migrations have been applied:

| Item | Value |
|------|--------|
| Engine | **SQLite** (default; MySQL also supported) |
| File | `laravel-api/database/database.sqlite` |
| Config | `laravel-api/.env` → `DB_CONNECTION=sqlite` |
| Tables | 7 (see below) |
| Bootstrap admin | `admin@example.com` / `Admin123!` |

You do **not** need a separate MySQL install for local demo unless you want one.

---

## Why Laravel is important here

This app is split into two backends:

| Layer | Role |
|-------|------|
| **Laravel (PHP)** | Product / business API: login, register, admin approval, one-device sessions, orgs, subscription, job submit/status/results, weight calculation, image lifecycle |
| **Python FastAPI** | **Only** ML: detect apples + Grade A / Grade B |

Without Laravel + its database:

- Users cannot register / login / get tokens  
- Admin cannot approve users or manage subscriptions  
- Analysis jobs (upload → process → results) have nowhere to persist  
- The React UI’s business flows break even if Python ML still works  

Python alone grades an image. **Laravel + DB turns that into a multi-user product.**

```text
React UI  →  Laravel API + Database  →  Python ML (grade only)
```

---

## Tables in the PHP database

| Table | Purpose |
|-------|---------|
| `organizations` | Company/org + subscription status / expiry |
| `users` | Accounts (role: user/admin, status: pending/approved/rejected) |
| `sessions_devices` | One-device login sessions + token hash + expiry |
| `password_reset_tokens` | Forgot-password tokens |
| `personal_access_tokens` | Sanctum API tokens |
| `analysis_jobs` | Upload jobs, status, lot fields, results JSON, retries |
| `migrations` | Laravel migration history |

Schema source: `database/migrations/2024_01_01_000001_create_core_tables.php`

---

## How to create / refresh the database (if missing)

From `F:\Ahmad\laravel-api`:

```powershell
# 1) Dependencies (once)
composer install

# 2) Env + app key (once)
copy .env.example .env
php artisan key:generate

# 3) Ensure SQLite file exists
New-Item database\database.sqlite -ItemType File -Force

# 4) Create tables + seed admin user
php artisan migrate --seed

# 5) Run Laravel
php artisan serve --host=0.0.0.0 --port=8080
```

API base: `http://127.0.0.1:8080/api/v1`

Python ML must run separately (for grading only):

```powershell
cd F:\Ahmad
python -m uvicorn api.main:app --host 127.0.0.1 --port 8000
```

---

## Optional: use MySQL instead of SQLite

In `.env`:

```env
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=apple_grading
DB_USERNAME=root
DB_PASSWORD=your_password
```

Create the empty MySQL database, then:

```powershell
php artisan migrate --seed
```

---

## Current status on this machine

- `database/database.sqlite` exists  
- Migration `2024_01_01_000001_create_core_tables` has **Ran**  
- Laravel is configured with `DB_CONNECTION=sqlite`  

So for local use: **the PHP database is ready**; start Laravel with `php artisan serve --port=8080`.
