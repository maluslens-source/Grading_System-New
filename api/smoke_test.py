"""
Quick end-to-end smoke test against a running API on localhost:8000.

Usage (from project root, with server running):
  python api/smoke_test.py
"""

from __future__ import annotations

import json
import sys
import time
import uuid
from pathlib import Path

import urllib.error
import urllib.request

BASE = "http://127.0.0.1:8000"
DEVICE = f"smoke-{uuid.uuid4().hex[:8]}"
ROOT = Path(__file__).resolve().parent.parent
SAMPLE = ROOT / "sample_images" / "apple.jpg"


def req(method: str, path: str, body=None, headers=None, form_fields=None, file_field=None):
    url = BASE + path
    hdrs = dict(headers or {})
    data = None

    if form_fields is not None or file_field is not None:
        import uuid as _uuid

        boundary = "----SmokeBoundary" + _uuid.uuid4().hex
        parts = []
        for k, v in (form_fields or {}).items():
            if v is None:
                continue
            parts.append(
                f"--{boundary}\r\n"
                f'Content-Disposition: form-data; name="{k}"\r\n\r\n'
                f"{v}\r\n"
            )
        if file_field:
            name, filename, content, ctype = file_field
            parts.append(
                f"--{boundary}\r\n"
                f'Content-Disposition: form-data; name="{name}"; filename="{filename}"\r\n'
                f"Content-Type: {ctype}\r\n\r\n"
            )
            body_bytes = "".join(parts).encode("utf-8") + content + f"\r\n--{boundary}--\r\n".encode(
                "utf-8"
            )
        else:
            body_bytes = ("".join(parts) + f"--{boundary}--\r\n").encode("utf-8")
        data = body_bytes
        hdrs["Content-Type"] = f"multipart/form-data; boundary={boundary}"
    elif body is not None:
        data = json.dumps(body).encode("utf-8")
        hdrs.setdefault("Content-Type", "application/json")

    request = urllib.request.Request(url, data=data, headers=hdrs, method=method)
    try:
        with urllib.request.urlopen(request, timeout=120) as resp:
            raw = resp.read().decode("utf-8")
            return resp.status, json.loads(raw) if raw else {}
    except urllib.error.HTTPError as e:
        raw = e.read().decode("utf-8")
        try:
            payload = json.loads(raw)
        except Exception:
            payload = {"detail": raw}
        return e.code, payload


def main() -> int:
    print("1) health")
    code, health = req("GET", "/health")
    print(code, health)
    if code != 200:
        return 1

    print("2) admin login")
    code, login = req(
        "POST",
        "/api/v1/auth/login",
        {"email": "admin@example.com", "password": "Admin123!", "device_id": DEVICE},
    )
    print(code, {k: login.get(k) for k in ("token_type", "expires_at", "device_id")} if code == 200 else login)
    if code != 200:
        return 1
    token = login["access_token"]
    auth = {"Authorization": f"Bearer {token}", "X-Device-Id": DEVICE}

    print("3) create org + activate subscription")
    org_name = f"Smoke Org {uuid.uuid4().hex[:6]}"
    code, org = req("POST", "/api/v1/admin/organizations", {"name": org_name}, headers=auth)
    print(code, org)
    if code != 201:
        return 1
    code, org = req(
        "POST",
        f"/api/v1/admin/organizations/{org['id']}/subscription",
        {"status": "active", "expires_at": "2030-01-01T00:00:00+00:00"},
        headers=auth,
    )
    print(code, org.get("subscription_status"), org.get("subscription_expires_at"))

    print("4) register user")
    email = f"user_{uuid.uuid4().hex[:8]}@example.com"
    code, msg = req(
        "POST",
        "/api/v1/auth/register",
        {
            "email": email,
            "password": "UserPass123!",
            "full_name": "Smoke User",
            "org_name": None,
        },
    )
    print(code, msg)

    print("5) list pending + approve")
    code, pending = req("GET", "/api/v1/admin/users/pending", headers=auth)
    user = next(u for u in pending if u["email"] == email)
    code, msg = req(
        "POST",
        f"/api/v1/admin/users/{user['id']}/approval",
        {"status": "approved", "org_id": org["id"]},
        headers=auth,
    )
    print(code, msg)

    print("6) user login")
    user_device = DEVICE + "-user"
    code, ulogin = req(
        "POST",
        "/api/v1/auth/login",
        {"email": email, "password": "UserPass123!", "device_id": user_device},
    )
    print(code, ulogin.get("user", {}).get("email"))
    utoken = ulogin["access_token"]
    uauth = {"Authorization": f"Bearer {utoken}", "X-Device-Id": user_device}

    if not SAMPLE.exists():
        print("SKIP submit: sample image missing", SAMPLE)
        print("SMOKE OK (auth/admin only)")
        return 0

    print("7) submit job")
    code, job = req(
        "POST",
        "/api/v1/jobs/submit",
        headers=uauth,
        form_fields={
            "lot_id": "LOT-SMOKE-1",
            "lot_name": "Smoke Lot",
            "total_sampled_weight_g": "12000",
            "auto_process": "true",
        },
        file_field=("image", SAMPLE.name, SAMPLE.read_bytes(), "image/jpeg"),
    )
    print(code, job)
    if code not in (200, 202):
        return 1
    job_id = job["job_id"]

    print("8) poll status")
    final = None
    for _ in range(120):
        code, st = req("GET", f"/api/v1/jobs/{job_id}/status", headers=uauth)
        print(" ", st.get("status"), st.get("error_message"))
        if st.get("status") in ("completed", "failed"):
            final = st
            break
        time.sleep(2)

    if not final:
        print("TIMEOUT waiting for job")
        return 1
    if final["status"] != "completed":
        print("JOB FAILED", final)
        return 1

    print("9) results")
    code, results = req("GET", f"/api/v1/jobs/{job_id}/results", headers=uauth)
    print(json.dumps(results.get("result"), indent=2)[:2000])
    print("SMOKE OK")
    return 0


if __name__ == "__main__":
    sys.exit(main())
