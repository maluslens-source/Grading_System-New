"""Pydantic request/response models."""

from __future__ import annotations

from typing import Any, Optional

from pydantic import BaseModel, EmailStr, Field


# ── Auth ─────────────────────────────────────────────────────────────
class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    full_name: str = Field(min_length=1, max_length=200)
    org_name: Optional[str] = Field(default=None, max_length=200)


class RequestOtpRequest(RegisterRequest):
    """Same payload as register; the API answers with a masked destination."""


class RequestOtpResponse(BaseModel):
    message: str
    email: str
    expires_in_seconds: int
    resend_after_seconds: int
    email_sent: bool
    # Only populated when SMTP is absent, so the flow stays testable locally.
    dev_code: Optional[str] = Field(
        default=None,
        description="Development fallback when SMTP is not configured. Never set in production.",
    )


class VerifyOtpRequest(BaseModel):
    email: EmailStr
    code: str = Field(min_length=4, max_length=10)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str
    device_id: str = Field(min_length=4, max_length=128, description="Stable client device identifier")


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_at: str
    device_id: str
    user: dict


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ForgotPasswordResponse(BaseModel):
    message: str
    reset_token: Optional[str] = Field(
        default=None,
        description="Only when SMTP is not configured (local fallback). Omitted after a real email send.",
    )
    email_sent: bool = False


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str = Field(min_length=8, max_length=128)


class ForgotOtpVerifiedResponse(BaseModel):
    message: str
    reset_token: str


class MessageResponse(BaseModel):
    message: str


# ── Jobs / grading ───────────────────────────────────────────────────
class JobStatusResponse(BaseModel):
    job_id: str
    status: str
    lot_id: Optional[str] = None
    lot_name: Optional[str] = None
    retry_count: int = 0
    max_retries: int = 3
    error_message: Optional[str] = None
    created_at: str
    updated_at: str
    started_at: Optional[str] = None
    completed_at: Optional[str] = None
    result: Optional[dict[str, Any]] = None


class JobSubmitResponse(BaseModel):
    job_id: str
    status: str
    message: str


class RetryResponse(BaseModel):
    job_id: str
    status: str
    retry_count: int
    message: str


# ── Admin ────────────────────────────────────────────────────────────
class ApproveUserRequest(BaseModel):
    status: str = Field(description="approved | rejected")
    org_id: Optional[int] = None
    role: Optional[str] = Field(default=None, description="user | admin")


class UpdateUserRequest(BaseModel):
    full_name: Optional[str] = None
    role: Optional[str] = None
    status: Optional[str] = None
    org_id: Optional[int] = None


class CreateOrgRequest(BaseModel):
    name: str = Field(min_length=1, max_length=200)


class SubscriptionRequest(BaseModel):
    status: str = Field(description="active | inactive | expired")
    expires_at: Optional[str] = Field(
        default=None,
        description="ISO-8601 UTC datetime, e.g. 2026-12-31T23:59:59+00:00",
    )


class OrgResponse(BaseModel):
    id: int
    name: str
    subscription_status: str
    subscription_expires_at: Optional[str] = None
    created_at: str
    updated_at: str
