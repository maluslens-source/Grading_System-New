"""SMTP helpers for password-reset mail. Uses stdlib smtplib."""

from __future__ import annotations

import logging
import smtplib
import ssl
from email.message import EmailMessage

from api.config import (
    OTP_EXPIRE_MINUTES,
    PUBLIC_APP_URL,
    SMTP_FROM,
    SMTP_HOST,
    SMTP_PASSWORD,
    SMTP_PORT,
    SMTP_USER,
    SMTP_USE_SSL,
    SMTP_USE_TLS,
)

logger = logging.getLogger(__name__)


def smtp_configured() -> bool:
    return bool(SMTP_HOST and SMTP_FROM)


def _deliver(msg: EmailMessage) -> None:
    """Shared SMTP send. Handles implicit/explicit TLS and optional login."""
    timeout = 20
    if SMTP_USE_SSL:
        context = ssl.create_default_context()
        with smtplib.SMTP_SSL(SMTP_HOST, SMTP_PORT, timeout=timeout, context=context) as smtp:
            if SMTP_USER:
                smtp.login(SMTP_USER, SMTP_PASSWORD)
            smtp.send_message(msg)
        return

    with smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=timeout) as smtp:
        smtp.ehlo()
        if SMTP_USE_TLS:
            context = ssl.create_default_context()
            smtp.starttls(context=context)
            smtp.ehlo()
        if SMTP_USER:
            smtp.login(SMTP_USER, SMTP_PASSWORD)
        smtp.send_message(msg)


def reset_link(raw_token: str) -> str:
    base = PUBLIC_APP_URL.rstrip("/")
    return f"{base}/#/authentication/reset-password?token={raw_token}"


def send_password_reset(to_email: str, raw_token: str) -> None:
    if not smtp_configured():
        raise RuntimeError("SMTP is not configured (set SMTP_HOST and SMTP_FROM)")

    link = reset_link(raw_token)
    msg = EmailMessage()
    msg["Subject"] = "Malus Lens password reset"
    msg["From"] = SMTP_FROM
    msg["To"] = to_email
    msg.set_content(
        "You requested a password reset for Malus Lens.\n\n"
        f"Open this link (valid for a limited time):\n{link}\n\n"
        "If you did not request this, ignore this email.\n"
    )
    msg.add_alternative(
        "<p>You requested a password reset for <strong>Malus Lens</strong>.</p>"
        f'<p><a href="{link}">Reset your password</a></p>'
        "<p>If you did not request this, ignore this email.</p>",
        subtype="html",
    )

    _deliver(msg)
    logger.info("Password reset email sent to %s", to_email)


def send_otp_email(to_email: str, code: str, full_name: str = "", purpose: str = "register") -> None:
    """Email a 6-digit code. purpose is "register" or "reset"."""
    if not smtp_configured():
        raise RuntimeError("SMTP is not configured (set SMTP_HOST and SMTP_FROM)")

    minutes = OTP_EXPIRE_MINUTES
    who = f"Hi {full_name}," if full_name and not full_name.startswith("__") else "Hi,"
    if purpose == "reset":
        subject = f"{code} is your Malus Lens password reset code"
        reason = "If you did not ask to reset your Malus Lens password, ignore this email."
        lead = f"Your Malus Lens password reset code is: {code}"
    else:
        subject = f"{code} is your Malus Lens verification code"
        reason = "If you did not try to create a Malus Lens account, ignore this email."
        lead = f"Your Malus Lens verification code is: {code}"
    msg = EmailMessage()
    msg["Subject"] = subject
    msg["From"] = SMTP_FROM
    msg["To"] = to_email
    msg.set_content(
        f"{who}\n\n"
        f"{lead}\n\n"
        f"The code expires in {minutes} minutes.\n\n"
        f"{reason}\n"
    )
    msg.add_alternative(
        f"<p>{who}</p>"
        f'<p style="font-size:26px;font-weight:700;letter-spacing:6px;margin:18px 0">'
        f"{code}</p>"
        f"<p>This code expires in {minutes} minutes.</p>"
        f"<p>{reason}</p>",
        subtype="html",
    )

    try:
        _deliver(msg)
    except smtplib.SMTPAuthenticationError as exc:
        # Gmail rejects plain account passwords; an app password is required.
        raise RuntimeError(
            "Gmail rejected the login. Use a 16-character App Password "
            "(https://myaccount.google.com/apppasswords), not the account password."
        ) from exc
    logger.info("OTP email sent to %s", to_email)
