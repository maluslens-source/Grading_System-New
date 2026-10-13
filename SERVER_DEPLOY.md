# Server pe UI + API kaise chalaye

## Login 404 fix (important)

Agar browser mein `POST /api/v1/auth/login` → **404**:

**Galat:** UI ko `python -m http.server 8000` se chalana  
**Sahi:** project root se:

```bash
cd ~/apple-grading-system
python -m uvicorn api.main:app --host 0.0.0.0 --port 8000
```

Check:
```bash
curl http://127.0.0.1:8000/health
curl -X POST http://127.0.0.1:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"Admin123!","device_id":"test-1"}'
```

`/health` mein `auth_routes_loaded: true` hona chahiye.

## Problem
Sirf React `build/` upload karne se:
- UI tab tak nahi dikhegi jab usko **web server** na mile
- `uvicorn api.main:app` Python API ke liye hai — `build` folder se nahi chalta
- `http.server` se login **hamesha 404** dega

## Sahi structure (server pe)

```text
~/apple-grading-system/          ← yahan se uvicorn chalao
├── api/
├── grader.py
├── models/
│   ├── detector_best.pt
│   ├── classifier_best.pt
│   └── config.json
├── requirements.txt
├── frontend_build/              ← React build ka POORA content yahan
│   ├── index.html
│   ├── static/
│   │   ├── css/
│   │   └── js/
│   └── ...
└── ...
```

`frontend_build` = local `Productapp/build` ke **andar** ki files  
(yani `frontend_build/index.html` hona chahiye, `frontend_build/build/index.html` nahi)

## Local se naya build banao (API same server)

```powershell
cd F:\Ahmad\Productapp
npm run build
```

Phir `Productapp\build\*` copy karke server pe `frontend_build\` mein daalo.

## Server commands

```bash
cd ~/apple-grading-system
pip install -r requirements.txt
pip install -r api/requirements.txt

python -m uvicorn api.main:app --host 0.0.0.0 --port 8000
```

Browser:
- UI:  `http://SERVER_IP:8000/`
- API: `http://SERVER_IP:8000/api/v1/grade`
- Docs:`http://SERVER_IP:8000/docs`
- Health:`http://SERVER_IP:8000/health`

## Quick UI-only test (bina Python API)

Agar pehle sirf UI dekhni ho:

```bash
cd ~/path/where/index.html/hai
python3 -m http.server 3000 --bind 0.0.0.0
```

Phir `http://SERVER_IP:3000`  
(Login/analysis tab fail hoga jab tak backend alag se na chale.)
