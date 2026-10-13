# Apple Tray Grading — REST API

Separate API layer around the existing `grader.py` / `grade.py` pipeline.

**Original ML code is not modified.** The API imports `AppleGrader` read-only.

## Features

| Area | What you get |
|------|----------------|
| Jobs | Upload photo + lot inputs → process → results |
| ML | Uses existing GPU/CPU `AppleGrader` |
| Weights | Total sampled weight + estimated Grade A/B weights |
| Images | Temporary lifecycle: upload → process → delete |
| Auth | Register (pending approval), one-device session, 7-day JWT, forgot/reset password |
| Admin | Approve users, orgs, subscription activate/expiry |
| Ops | Status endpoints, retry on failure, structured errors |

## Install

From the **project root** (`F:\Ahmad`):

```bash
# Original ML deps (unchanged)
pip install -r requirements.txt

# API deps
pip install -r api/requirements.txt
```

## Run

```bash
# From project root
uvicorn api.main:app --host 0.0.0.0 --port 8000 --reload
```

- Swagger UI: http://127.0.0.1:8000/docs  
- Health: http://127.0.0.1:8000/health  

### Bootstrap admin (first start)

| Field | Default |
|-------|---------|
| Email | `admin@example.com` |
| Password | `Admin123!` |

Override with env vars: `BOOTSTRAP_ADMIN_EMAIL`, `BOOTSTRAP_ADMIN_PASSWORD`, `GRADING_SECRET_KEY`.

## Typical client flow

```text
1. POST /api/v1/auth/register
2. Admin: POST /api/v1/admin/users/{id}/approval  { "status": "approved", "org_id": 1 }
3. Admin: POST /api/v1/admin/organizations/{id}/subscription  { "status": "active", "expires_at": "2027-01-01T00:00:00+00:00" }
4. POST /api/v1/auth/login  { email, password, device_id }
5. POST /api/v1/jobs/submit   (multipart: image + lot fields)  → job_id
6. GET  /api/v1/jobs/{job_id}/status   (poll until completed / failed)
7. GET  /api/v1/jobs/{job_id}/results
8. On failure: POST /api/v1/jobs/{job_id}/retry
```

Every authenticated request after login must send:

```http
Authorization: Bearer <access_token>
X-Device-Id: <same device_id used at login>
```

Logging in on a new `device_id` **revokes** the previous device session (one-device policy). Tokens last **7 days**.

## Job form fields (`POST /api/v1/jobs/submit`)

| Field | Type | Notes |
|-------|------|--------|
| `image` | file | jpg/png/webp/bmp/heic |
| `lot_id` | string | optional |
| `lot_name` | string | optional |
| `total_sampled_weight_g` | float | lot scale reading (preferred) |
| `avg_apple_weight_g` | float | used if lot weight omitted (default 180 g) |
| `a_threshold` | float | Grade A cutoff (default 0.45) |
| `auto_process` | bool | default true; if false call `/process` later |

### Weight math

- If `total_sampled_weight_g` is provided → that is **Total Sampled Weight**.
- Else → `total_count * avg_apple_weight_g`.
- Estimated Grade A weight = total × (A / total_count)
- Estimated Grade B weight = total × (B / total_count)

After a **successful** run, the uploaded image file is deleted (`DELETE_IMAGE_AFTER_PROCESS=true`).

## Example curl

```bash
# Login
curl -s -X POST http://127.0.0.1:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"admin@example.com\",\"password\":\"Admin123!\",\"device_id\":\"dev-1\"}"

# Submit (replace TOKEN)
curl -s -X POST http://127.0.0.1:8000/api/v1/jobs/submit \
  -H "Authorization: Bearer TOKEN" \
  -H "X-Device-Id: dev-1" \
  -F "image=@sample_images/apple.jpg" \
  -F "lot_id=LOT-001" \
  -F "lot_name=Morning Batch" \
  -F "total_sampled_weight_g=15000"
```

## What was left untouched

- `grader.py`
- `grade.py`
- `models/*`
- root `requirements.txt`
- `sample_images/*`

All API state lives under `api/data/` (SQLite + uploads).
