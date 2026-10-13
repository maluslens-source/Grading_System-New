# Postman se API test kaise karein

## 1. Import

Postman → **Import** → ye 2 files select karo:

1. `api/postman/Apple_Grading_API.postman_collection.json`
2. `api/postman/Apple_Grading_Local.postman_environment.json`

Top-right pe environment select karo: **Apple Grading Local**

## 2. Server chalao

Project root se:

```bash
uvicorn api.main:app --host 0.0.0.0 --port 8000
```

## 3. Suggested order (pehli baar)

| # | Folder | Request | Notes |
|---|--------|---------|--------|
| 1 | 0. Health | Health Check | `ml_ready: true` hona chahiye |
| 2 | 1. Auth | **Admin Login** | Token auto-save (`access_token`) |
| 3 | 2. Admin | List Organizations / Create Organization | `org_id` save |
| 4 | 2. Admin | **Activate Subscription** | Warna user job nahi chala sakta |
| 5 | 1. Auth | Register User | Pending account |
| 6 | 2. Admin | List Pending Users → **Approve User** | `user_id` + `org_id` |
| 7 | 1. Auth | **User Login** | `user_access_token` save |
| 8 | 3. Jobs | **Submit Job as Admin** (easy) YA Submit Job (auto process) | Body → image file select karo (`sample_images/apple.jpg`) |
| 9 | 3. Jobs | Get Job Status | Poll jab tak `completed` |
| 10 | 3. Jobs | Get Job Results | Grades + weights |

## 4. Important headers

Protected APIs pe dono chahiye:

- `Authorization: Bearer <token>`
- `X-Device-Id: <same device_id as login>`

Naye device se login = purana session invalidate (one-device rule).

## 5. Default admin

- Email: `admin@example.com`
- Password: `Admin123!`

## 6. Image upload tip

`Submit Job` requests mein **Body → form-data → image** pe Select Files dabao aur tray photo choose karo.
