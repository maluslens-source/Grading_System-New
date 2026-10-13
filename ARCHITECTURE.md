# Apple Grading — Split Architecture

```text
┌─────────────────────┐
│  React / Client UI  │
└──────────┬──────────┘
           │ REST
           ▼
┌──────────────────────────────┐
│  Laravel PHP API             │  F:\Ahmad\laravel-api
│  /api/v1/auth/*              │
│  /api/v1/admin/*             │
│  /api/v1/jobs/*              │
│  weights + image lifecycle   │
└──────────┬───────────────────┘
           │ HTTP multipart → Python
           ▼
┌──────────────────────────────┐
│  Python FastAPI (ML only)    │  F:\Ahmad\api + grader.py
│  POST /api/v1/grade          │
│  Good / Bad apple counts     │
└──────────────────────────────┘
```

## Responsibility split

| Feature | Stack |
|---------|--------|
| Registration + admin approval | Laravel |
| Login, 7-day token, one-device, logout | Laravel |
| Forgot / reset password | Laravel |
| Org + subscription activate/expiry | Laravel |
| Job submit / status / results / retry | Laravel |
| Total + estimated A/B weights | Laravel |
| Upload → process → delete images | Laravel |
| Apple good/bad ML inference | **Python only** |

## Run both

```bash
# Terminal 1 — Python ML
cd F:\Ahmad
python -m uvicorn api.main:app --host 127.0.0.1 --port 8000

# Terminal 2 — Laravel
cd F:\Ahmad\laravel-api
composer install
copy .env.example .env
php artisan key:generate
php artisan migrate --seed
php artisan serve --port=8080
```

Client / Postman base URL for business APIs: `http://127.0.0.1:8080/api/v1`
