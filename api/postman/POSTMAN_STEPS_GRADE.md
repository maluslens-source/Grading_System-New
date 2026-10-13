# Postman — Grade API (1–10 images) Steps

## Files to import

1. `api/postman/Grade_API_Multi.postman_collection.json`
2. `api/postman/Grade_API_Local.postman_environment.json`

---

## STEP 0 — Server start

```powershell
cd F:\Ahmad
python -m uvicorn api.main:app --host 127.0.0.1 --port 8000
```

Browser check: http://127.0.0.1:8000/health

---

## STEP 1 — Import collection

1. Postman open
2. **Create New** aaye to **Cancel**
3. **Import** dabao
4. Select: `Grade_API_Multi.postman_collection.json`
5. Phir Import: `Grade_API_Local.postman_environment.json`
6. Top-right environment: **Grade API Local** select

---

## STEP 2 — Desktop Agent (zaroori)

Bottom-right pe Agent:

- **Cloud Agent** mat use karo (local file nahi jati → 422)
- **Desktop Agent** select karo

---

## STEP 3 — Health

1. Collection: **Grade API (1–10 Images)**
2. **1. Health Check** → **Send**
3. Expect: `"status": "ok"`

---

## STEP 4 — 1 image test

1. **2. Grade 1 Image** open
2. Confirm:
   - Method **POST**
   - URL `{{base_url}}/api/v1/grade` ya `http://127.0.0.1:8000/api/v1/grade`
3. **Body** → **form-data**
4. Row `images`:
   - TYPE = **File**
   - **Select Files** → `F:\Ahmad\sample_images\apple.jpg`
   - VALUE mein `apple.jpg` dikhe
5. **Send**

Success example:

```json
{
  "success": true,
  "image_count": 1,
  "summary": { "total_apples": ..., "good_apples": ..., "bad_apples": ... },
  "results": [ { "image_filename": "apple.jpg", ... } ]
}
```

---

## STEP 5 — Multiple images (max 10)

1. **3. Grade Multiple Images (up to 10)** open
2. Body → form-data
3. Har photo ke liye:
   - KEY = **`images`** (same name)
   - TYPE = **File**
   - Alag file select
4. Max **10** rows with key `images`
5. **Send**

`summary` = sab images ka total  
`results` = har image alag

---

## Common errors

| Error | Fix |
|-------|-----|
| ECONNREFUSED | Server start (STEP 0) |
| 422 image required | File select + Desktop Agent |
| 400 max 10 | 10 se zyada files hatao |
| Cloud Agent | Desktop Agent pe switch |

---

## Easy alternative (no Postman)

http://127.0.0.1:8000/test  
Multiple select → Analyze Images
