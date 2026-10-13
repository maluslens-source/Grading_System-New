"""Registration, login, logout, forgot/reset password."""

from __future__ import annotations

import logging
import secrets
from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status

from api.auth import (
    create_access_token,
    create_reset_token,
    get_current_user,
    hash_password,
    hash_token,
    public_user,
    verify_password,
)
from api.config import (
    OTP_EXPIRE_MINUTES,
    OTP_LENGTH,
    OTP_MAX_ATTEMPTS,
    OTP_RESEND_COOLDOWN_SECONDS,
    PASSWORD_RESET_EXPIRE_HOURS,
)
from api.database import db
from api.email import send_otp_email, smtp_configured
from api.schemas import (
    ForgotOtpVerifiedResponse,
    ForgotPasswordRequest,
    LoginRequest,
    MessageResponse,
    RegisterRequest,
    RequestOtpRequest,
    RequestOtpResponse,
    ResetPasswordRequest,
    TokenResponse,
    VerifyOtpRequest,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/auth", tags=["auth"])


def _generate_otp() -> str:
    """Cryptographically random numeric code of OTP_LENGTH digits."""
    upper = 10 ** OTP_LENGTH - 1
    return f"{secrets.randbelow(upper):0{OTP_LENGTH}d}"


def _existing_registration(email: str) -> Optional[dict]:
    """The user already holding this email, if it blocks a fresh registration.

    A rejected account does not keep its address: the holder still owns the
    inbox, so they are allowed to apply again and the row is reused.
    """
    existing = db.get_user_by_email(email)
    if existing and existing["status"] != "rejected":
        raise HTTPException(status_code=409, detail="Email already registered")
    return existing


def _validate_registration_fields(email: str, full_name: str, org_name: str) -> Optional[dict]:
    """Shared checks for both the OTP request and the original register route."""
    existing = _existing_registration(email)
    if not full_name.strip():
        raise HTTPException(status_code=400, detail="User name is required")
    if db.get_user_by_username(full_name.strip()):
        raise HTTPException(status_code=409, detail="User name already taken")
    if not org_name.strip():
        raise HTTPException(status_code=400, detail="Organisation is required")
    return existing


def _resolve_org(org_name: str) -> int:
    try:
        return db.create_organization(org_name.strip())["id"]
    except Exception:
        # Unique name collision — attach to the existing org with that name
        existing = [o for o in db.list_organizations() if o["name"] == org_name.strip()]
        if existing:
            return existing[0]["id"]
        raise HTTPException(status_code=400, detail="Could not create organization")


@router.post("/register/request-otp", response_model=RequestOtpResponse)
def request_registration_otp(body: RequestOtpRequest):
    """Step 1 — validate the form, then email a 6-digit code.

    No account row is created yet: the user is stored only after the code is
    proven, so an address cannot be reserved by someone who does not own it.
    """
    email = body.email.strip().lower()
    full_name = body.full_name.strip()
    org_name = (body.org_name or "").strip()

    _validate_registration_fields(email, full_name, org_name)

    # Throttle resends so the endpoint cannot be used to flood an inbox.
    active = db.get_active_email_verification(email)
    if active and active.get("last_sent_at"):
        try:
            last_sent = datetime.fromisoformat(active["last_sent_at"])
            elapsed = (datetime.now(timezone.utc) - last_sent).total_seconds()
        except ValueError:
            elapsed = OTP_RESEND_COOLDOWN_SECONDS
        if elapsed < OTP_RESEND_COOLDOWN_SECONDS:
            wait = int(OTP_RESEND_COOLDOWN_SECONDS - elapsed)
            raise HTTPException(
                status_code=429,
                detail=f"Please wait {wait}s before requesting another code.",
            )

    code = _generate_otp()
    expires = datetime.now(timezone.utc) + timedelta(minutes=OTP_EXPIRE_MINUTES)
    db.create_email_verification(
        email=email,
        code_hash=hash_token(code),
        expires_at=expires.replace(microsecond=0).isoformat(),
        full_name=full_name,
        password_hash=hash_password(body.password),
        org_name=org_name,
    )

    sent = False
    dev_code = None
    if smtp_configured():
        try:
            send_otp_email(email, code, full_name)
            sent = True
        except Exception as exc:
            # Surface the mail failure instead of pretending the code was sent.
            raise HTTPException(
                status_code=503, detail=f"Could not send verification email: {exc}"
            ) from exc
    else:
        # No SMTP configured: log the code so the flow is testable locally.
        dev_code = code
        logger.warning(
            "SMTP not configured — OTP for %s is %s (development only)", email, code
        )

    return RequestOtpResponse(
        message=f"Verification code sent to {email}",
        email=email,
        expires_in_seconds=OTP_EXPIRE_MINUTES * 60,
        resend_after_seconds=OTP_RESEND_COOLDOWN_SECONDS,
        email_sent=sent,
        dev_code=dev_code,
    )


@router.post("/register/verify-otp", response_model=MessageResponse)
def verify_registration_otp(body: VerifyOtpRequest):
    """Step 2 — prove the code, then create the account."""
    email = body.email.strip().lower()
    code = (body.code or "").strip()

    record = db.get_active_email_verification(email)
    if not record or record.get("full_name") == "__password_reset__":
        raise HTTPException(
            status_code=400, detail="No verification in progress. Please request a new code."
        )

    now = datetime.now(timezone.utc).replace(microsecond=0).isoformat()
    if record["expires_at"] < now:
        db.consume_email_verification(record["id"])
        raise HTTPException(status_code=400, detail="Verification code expired")

    if record["attempts"] >= OTP_MAX_ATTEMPTS:
        db.consume_email_verification(record["id"])
        raise HTTPException(
            status_code=429, detail="Too many incorrect attempts. Request a new code."
        )

    # Constant-time comparison avoids leaking the code through timing.
    if not secrets.compare_digest(record["code_hash"], hash_token(code)):
        db.increment_email_verification_attempts(record["id"])
        left = OTP_MAX_ATTEMPTS - (record["attempts"] + 1)
        raise HTTPException(
            status_code=400,
            detail=f"Incorrect code. {max(left, 0)} attempt(s) remaining.",
        )

    # Re-check at commit time in case the address was registered meanwhile.
    existing = _existing_registration(email)

    db.consume_email_verification(record["id"])
    org_id = _resolve_org(record["org_name"]) if record["org_name"] else None
    if existing:
        # Re-applying after a rejection: reset the same row rather than
        # inserting a second one, which the unique email forbids anyway.
        # Role is forced to "user" so a rejected ex-admin keeps no privilege.
        db.update_user(
            existing["id"],
            full_name=record["full_name"],
            password_hash=record["password_hash"],
            org_id=org_id,
            role="user",
            status="pending",
        )
        db.revoke_user_sessions(existing["id"])
    else:
        db.create_user(
            email=email,
            full_name=record["full_name"],
            password_hash=record["password_hash"],
            role="user",
            status="pending",
            org_id=org_id,
        )
    return MessageResponse(
        message="Email verified. Registration submitted. An admin must approve your account before login."
    )


@router.post("/register", response_model=MessageResponse, status_code=201)
def register(body: RegisterRequest):
    """Direct registration without OTP. Used by API clients and the smoke test."""
    email = body.email.strip().lower()
    full_name = body.full_name.strip()
    org_name = (body.org_name or "").strip()

    existing = _validate_registration_fields(email, full_name, org_name)

    org_id = _resolve_org(org_name) if org_name else None
    if existing:
        db.update_user(
            existing["id"],
            full_name=full_name,
            password_hash=hash_password(body.password),
            org_id=org_id,
            role="user",
            status="pending",
        )
        db.revoke_user_sessions(existing["id"])
    else:
        db.create_user(
            email=email,
            full_name=full_name,
            password_hash=hash_password(body.password),
            role="user",
            status="pending",
            org_id=org_id,
        )
    return MessageResponse(
        message="Registration submitted. An admin must approve your account before login."
    )


@router.post("/login", response_model=TokenResponse)
def login(body: LoginRequest):
    user = db.get_user_by_email(body.email)
    if not user or not verify_password(body.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    if user["status"] == "pending":
        raise HTTPException(status_code=403, detail="Account pending admin approval")
    if user["status"] == "rejected":
        raise HTTPException(status_code=403, detail="Account was rejected")
    if user["status"] != "approved":
        raise HTTPException(status_code=403, detail=f"Account status is '{user['status']}'")

    # One-device session: revoke any previous device, create new session
    token, expire = create_access_token(
        user_id=user["id"],
        email=user["email"],
        role=user["role"],
        device_id=body.device_id,
    )
    db.replace_session(
        user_id=user["id"],
        device_id=body.device_id,
        refresh_token_hash=hash_token(token),
        expires_at=expire.replace(microsecond=0).isoformat(),
    )

    return TokenResponse(
        access_token=token,
        expires_at=expire.replace(microsecond=0).isoformat(),
        device_id=body.device_id,
        user=public_user(user, include_subscription=True),
    )


@router.post("/logout", response_model=MessageResponse)
def logout(user: dict = Depends(get_current_user)):
    db.revoke_user_sessions(user["id"])
    return MessageResponse(message="Logged out. All sessions revoked.")


@router.get("/me")
def me(user: dict = Depends(get_current_user)):
    return public_user(user, include_subscription=True)


def _active_reset_otp(email: str) -> Optional[dict]:
    record = db.get_active_email_verification(email)
    if record and record.get("full_name") == "__password_reset__":
        return record
    return None


@router.post("/forgot-password", response_model=RequestOtpResponse)
def forgot_password(body: ForgotPasswordRequest):
    """Email a 6-digit code. The password is changed only after that code is proven."""
    email = body.email.strip().lower()
    user = db.get_user_by_email(email)
    if not user:
        raise HTTPException(status_code=404, detail="No account found for this email.")

    active = _active_reset_otp(email)
    if active and active.get("last_sent_at"):
        try:
            last_sent = datetime.fromisoformat(active["last_sent_at"])
            elapsed = (datetime.now(timezone.utc) - last_sent).total_seconds()
        except ValueError:
            elapsed = OTP_RESEND_COOLDOWN_SECONDS
        if elapsed < OTP_RESEND_COOLDOWN_SECONDS:
            wait = int(OTP_RESEND_COOLDOWN_SECONDS - elapsed)
            raise HTTPException(
                status_code=429,
                detail=f"Please wait {wait}s before requesting another code.",
            )

    code = _generate_otp()
    expires = datetime.now(timezone.utc) + timedelta(minutes=OTP_EXPIRE_MINUTES)
    db.create_email_verification(
        email=email,
        code_hash=hash_token(code),
        expires_at=expires.replace(microsecond=0).isoformat(),
        full_name="__password_reset__",
        password_hash="reset",
        org_name=None,
    )

    sent = False
    dev_code = None
    if smtp_configured():
        try:
            send_otp_email(email, code, user.get("full_name") or "", purpose="reset")
            sent = True
        except Exception as exc:
            raise HTTPException(
                status_code=503, detail=f"Could not send reset email: {exc}"
            ) from exc
    else:
        dev_code = code
        logger.warning("SMTP not configured — reset OTP for %s is %s", email, code)

    return RequestOtpResponse(
        message=f"Reset code sent to {email}",
        email=email,
        expires_in_seconds=OTP_EXPIRE_MINUTES * 60,
        resend_after_seconds=OTP_RESEND_COOLDOWN_SECONDS,
        email_sent=sent,
        dev_code=dev_code,
    )


@router.post("/forgot-password/verify-otp", response_model=ForgotOtpVerifiedResponse)
def verify_password_reset_otp(body: VerifyOtpRequest):
    """Prove the reset code, then hand back a one-time token for the new password."""
    email = body.email.strip().lower()
    code = (body.code or "").strip()
    record = _active_reset_otp(email)
    if not record:
        raise HTTPException(
            status_code=400, detail="No reset in progress. Please request a new code."
        )

    now = datetime.now(timezone.utc).replace(microsecond=0).isoformat()
    if record["expires_at"] < now:
        db.consume_email_verification(record["id"])
        raise HTTPException(status_code=400, detail="Reset code expired")

    if record["attempts"] >= OTP_MAX_ATTEMPTS:
        db.consume_email_verification(record["id"])
        raise HTTPException(
            status_code=429, detail="Too many incorrect attempts. Request a new code."
        )

    if not secrets.compare_digest(record["code_hash"], hash_token(code)):
        db.increment_email_verification_attempts(record["id"])
        left = OTP_MAX_ATTEMPTS - (record["attempts"] + 1)
        raise HTTPException(
            status_code=400,
            detail=f"Incorrect code. {max(left, 0)} attempt(s) remaining.",
        )

    user = db.get_user_by_email(email)
    if not user:
        db.consume_email_verification(record["id"])
        raise HTTPException(status_code=404, detail="No account found for this email.")

    db.consume_email_verification(record["id"])
    raw, token_hash, expires = create_reset_token()
    db.create_password_reset(
        user_id=user["id"],
        token_hash=token_hash,
        expires_at=expires.replace(microsecond=0).isoformat(),
    )
    return ForgotOtpVerifiedResponse(message="Code verified", reset_token=raw)


@router.post("/reset-password", response_model=MessageResponse)
def reset_password(body: ResetPasswordRequest):
    record = db.get_password_reset(hash_token(body.token))
    if not record or record["used"]:
        raise HTTPException(status_code=400, detail="Invalid or used reset token")

    now = datetime.now(timezone.utc).replace(microsecond=0).isoformat()
    if record["expires_at"] < now:
        raise HTTPException(status_code=400, detail="Reset token expired")

    db.update_user(record["user_id"], password_hash=hash_password(body.new_password))
    db.mark_password_reset_used(record["id"])
    db.revoke_user_sessions(record["user_id"])
    return MessageResponse(message="Password updated. Please log in again.")
