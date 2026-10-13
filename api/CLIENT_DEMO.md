# Apple Tray Grading — Client Demo API

## What this API does

Send **1 to 10 tray photos** in one request → get JSON:

- how many apples detected  
- how many **good** (Grade A)  
- how many **bad** (Grade B)  

No login required for the demo grade endpoint.

| Item | Value |
|------|--------|
| **Endpoint** | `POST /api/v1/grade` |
| **Max images** | 10 per request |
| **Auth** | None (demo) |
| **Easy test UI** | `GET /test` |
| **Swagger docs** | `GET /docs` |
| **Health** | `GET /health` |

---

## Option A — Client runs on their PC (recommended package)

### Requirements

- Windows / Linux / Mac  
- Python 3.8+  
- Project folder with `models/detector_best.pt` + `models/classifier_best.pt`  
- ~500 MB disk for Python packages  

### Install

```bash
cd Ahmad   # project root
pip install -r requirements.txt
pip install -r api/requirements.txt
```

### Start demo server

**Windows:** double-click `api/start_demo.bat`  

**Or terminal:**

```bash
cd Ahmad
python -m uvicorn api.main:app --host 0.0.0.0 --port 8000
```

### URLs (on that machine)

| Purpose | URL |
|---------|-----|
| Test page | http://127.0.0.1:8000/test |
| API docs | http://127.0.0.1:8000/docs |
| Grade API | http://127.0.0.1:8000/api/v1/grade |
| Health | http://127.0.0.1:8000/health |

Same Wi‑Fi pe doosre device se: `http://<PC-IP>:8000/test`  
(Windows Firewall mein port 8000 allow karna pad sakta hai.)

---

## Option B — Live demo link for remote client (ngrok)

Aapke PC pe server chalu + public link:

1. Server start: `api/start_demo.bat`  
2. [ngrok](https://ngrok.com) install + login  
3. Run:

```bash
ngrok http 8000
```

4. Jo URL aaye (jaise `https://abc123.ngrok-free.app`) woh client ko do:

| Client link | Example |
|-------------|---------|
| Test page | `https://abc123.ngrok-free.app/test` |
| Docs | `https://abc123.ngrok-free.app/docs` |
| API | `https://abc123.ngrok-free.app/api/v1/grade` |

**Note:** ngrok band / PC sleep = link dead. Demo call ke liye best.

---

## Option C — Always-on server (production-style)

VPS / cloud machine pe project copy + same `uvicorn` command  
(GPU recommended for speed; CPU bhi chalega, slow.)

Domain/IP client ko do: `http://YOUR_SERVER_IP:8000`

---

## API usage (for client developers)

### Request

- Method: `POST`  
- URL: `/api/v1/grade`  
- Body: `multipart/form-data`  

| Field | Type | Required | Notes |
|-------|------|----------|--------|
| `images` | file | Yes (1–10) | Same field name, multiple files |
| `image` | file | Optional | Alias for single file |
| `a_threshold` | number | No | Default `0.45` |

### Example (curl)

```bash
curl -X POST "http://127.0.0.1:8000/api/v1/grade" \
  -F "images=@tray1.jpg" \
  -F "images=@tray2.jpg" \
  -F "a_threshold=0.45"
```

### Example response

```json
{
  "success": true,
  "image_count": 2,
  "max_images": 10,
  "summary": {
    "total_apples": 160,
    "good_apples": 120,
    "bad_apples": 40,
    "pct_A": 75.0,
    "pct_B": 25.0
  },
  "results": [
    {
      "image_filename": "tray1.jpg",
      "total_apples": 82,
      "good_apples": 64,
      "bad_apples": 18,
      "pct_A": 78.05,
      "pct_B": 21.95
    }
  ],
  "errors": []
}
```

---

## Postman

Import:

- `api/postman/Grade_API_Multi.postman_collection.json`  
- `api/postman/Grade_API_Local.postman_environment.json`  

Use **Desktop Agent** for file upload.

---

## What client receives (checklist)

- [ ] This project folder (or zip) including `models/*.pt`  
- [ ] `api/CLIENT_DEMO.md` (this file)  
- [ ] Postman collection  
- [ ] OR a live ngrok/server URL during demo call  

---

## Notes

- Core ML code: `grader.py` (unchanged)  
- Demo API layer: `api/` only  
- Temp images are deleted after analysis  
- First request may be slow (model load); later requests faster  
