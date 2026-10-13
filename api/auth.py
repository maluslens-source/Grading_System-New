"""Password hashing, JWT tokens, and FastAPI auth dependencies."""

from __future__ import annotations

import hashlib
import secrets
from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import Depends, Header, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
import bcrypt
from jose import JWTError, jwt

from api.config import (
    ACCESS_TOKEN_EXPIRE_DAYS,
    ALGORITHM,
    PASSWORD_RESET_EXPIRE_HOURS,
    SECRET_KEY,
)
from api.database import db

bearer_scheme = HTTPBearer(auto_error=False)


def hash_password(password: str) -> str:
    # bcrypt has a 72-byte limit; encode explicitly for cross-version safety
    raw = password.encode("utf-8")[:72]
    return bcrypt.hashpw(raw, bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    raw = plain.encode("utf-8")[:72]
    try:
        return bcrypt.checkpw(raw, hashed.encode("utf-8"))
    except ValueError:
        return False


def hash_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def create_access_token(
    user_id: int,
    email: str,
    role: str,
    device_id: str,
    expires_days: int = ACCESS_TOKEN_EXPIRE_DAYS,
) -> tuple[str, datetime]:
    expire = datetime.now(timezone.utc) + timedelta(days=expires_days)
    payload = {
        "sub": str(user_id),
        "email": email,
        "role": role,
        "device_id": device_id,
        "exp": expire,
        "type": "access",
    }
    token = jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)
    return token, expire


def create_reset_token() -> tuple[str, str, datetime]:
    """Returns (raw_token, token_hash, expires_at)."""
    raw = secrets.token_urlsafe(32)
    expires = datetime.now(timezone.utc) + timedelta(hours=PASSWORD_RESET_EXPIRE_HOURS)
    return raw, hash_token(raw), expires


def decode_token(token: str) -> dict:
    return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])


def public_user(user: dict, include_subscription: bool = False) -> dict:
    data = {
        "id": user["id"],
        "email": user["email"],
        "full_name": user["full_name"],
        "role": user["role"],
        "status": user["status"],
        "org_id": user["org_id"],
        "created_at": user["created_at"],
        "updated_at": user["updated_at"],
    }
    if include_subscription:
        # Admins can always analyze; others need active org subscription
        if user.get("role") == "admin":
            data["subscription_active"] = True
            data["subscription_status"] = "active"
            data["subscription_expires_at"] = None
            data["organization_name"] = None
        elif user.get("org_id"):
            active = org_subscription_active(user["org_id"])
            org = db.get_organization(user["org_id"])
            data["subscription_active"] = active
            data["subscription_status"] = (org or {}).get("subscription_status")
            data["subscription_expires_at"] = (org or {}).get("subscription_expires_at")
            data["organization_name"] = (org or {}).get("name")
        else:
            data["subscription_active"] = False
            data["subscription_status"] = "none"
            data["subscription_expires_at"] = None
            data["organization_name"] = None
    return data


async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
    x_device_id: Optional[str] = Header(default=None, alias="X-Device-Id"),
) -> dict:
    if credentials is None or not credentials.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing authentication token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    try:
        payload = decode_token(credentials.credentials)
        if payload.get("type") != "access":
            raise HTTPException(status_code=401, detail="Invalid token type")
        user_id = int(payload["sub"])
        token_device = payload.get("device_id")
    except (JWTError, KeyError, ValueError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user = db.get_user(user_id)
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    if user["status"] != "approved":
        raise HTTPException(status_code=403, detail=f"Account status is '{user['status']}'")

    # One-device session enforcement
    device_id = x_device_id or token_device
    if not device_id:
        raise HTTPException(
            status_code=401,
            detail="X-Device-Id header required for session validation",
        )
    if not db.validate_session_device(user_id, device_id):
        raise HTTPException(
            status_code=401,
            detail="Session invalid or logged in on another device",
        )

    return user


async def require_admin(user: dict = Depends(get_current_user)) -> dict:
    if user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return user


async def require_active_subscription(user: dict = Depends(get_current_user)) -> dict:
    """Login is allowed without a sub; analysis / grade is not."""
    if user.get("role") == "admin":
        return user
    if not org_subscription_active(user.get("org_id")):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Subscription inactive or expired. Login is allowed; new analysis is blocked.",
        )
    return user


def org_subscription_active(org_id: Optional[int]) -> bool:
    if org_id is None:
        return False
    org = db.get_organization(org_id)
    if not org:
        return False
    if org["subscription_status"] != "active":
        return False
    expires = org.get("subscription_expires_at")
    if expires and expires < datetime.now(timezone.utc).replace(microsecond=0).isoformat():
        return False
    return True
