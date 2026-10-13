"""API configuration. Override via environment variables."""

from __future__ import annotations

import json
import os
from pathlib import Path

# Project root (parent of api/)
PROJECT_ROOT = Path(__file__).resolve().parent.parent

# Data / storage (all under api/ so original tree stays clean)
API_DIR = Path(__file__).resolve().parent


def _load_env_file() -> None:
    """Load KEY=VALUE from api/.env or project .env without overriding existing env."""
    for path in (API_DIR / ".env", PROJECT_ROOT / ".env"):
        if not path.is_file():
            continue
        try:
            for raw in path.read_text(encoding="utf-8").splitlines():
                line = raw.strip()
                if not line or line.startswith("#") or "=" not in line:
                    continue
                key, _, value = line.partition("=")
                key = key.strip()
                value = value.strip().strip('"').strip("'")
                if key and key not in os.environ:
                    os.environ[key] = value
        except OSError:
            pass
        break


_load_env_file()
DATA_DIR = Path(os.getenv("GRADING_DATA_DIR", API_DIR / "data"))
UPLOAD_DIR = DATA_DIR / "uploads"
DB_PATH = Path(os.getenv("GRADING_DB_PATH", DATA_DIR / "grading.db"))

# Models (reuse existing weights — read-only)
DETECTOR_PATH = Path(os.getenv("DETECTOR_PATH", PROJECT_ROOT / "models" / "detector_best.pt"))
CLASSIFIER_PATH = Path(os.getenv("CLASSIFIER_PATH", PROJECT_ROOT / "models" / "classifier_best.pt"))
MODEL_CONFIG_PATH = Path(os.getenv("MODEL_CONFIG_PATH", PROJECT_ROOT / "models" / "config.json"))


def _load_system_a_threshold() -> float:
    """
    Same default the software uses — from models/config.json (a_threshold).
    Matches grade.py default / trained config. No need for client to send it.
    """
    env = os.getenv("DEFAULT_A_THRESHOLD")
    if env is not None and env.strip() != "":
        return float(env)
    try:
        if MODEL_CONFIG_PATH.exists():
            data = json.loads(MODEL_CONFIG_PATH.read_text(encoding="utf-8"))
            if "a_threshold" in data:
                return float(data["a_threshold"])
    except (OSError, ValueError, TypeError, json.JSONDecodeError):
        pass
    return 0.45  # same fallback as grade.py CLI


# Auth
SECRET_KEY = os.getenv("GRADING_SECRET_KEY", "change-me-in-production-use-openssl-rand")
ACCESS_TOKEN_EXPIRE_DAYS = int(os.getenv("ACCESS_TOKEN_EXPIRE_DAYS", "7"))
PASSWORD_RESET_EXPIRE_HOURS = int(os.getenv("PASSWORD_RESET_EXPIRE_HOURS", "1"))
ALGORITHM = "HS256"

# Bootstrap admin (created on first startup if no admin exists)
BOOTSTRAP_ADMIN_EMAIL = os.getenv("BOOTSTRAP_ADMIN_EMAIL", "admin@example.com")
BOOTSTRAP_ADMIN_PASSWORD = os.getenv("BOOTSTRAP_ADMIN_PASSWORD", "Admin123!")
BOOTSTRAP_ADMIN_NAME = os.getenv("BOOTSTRAP_ADMIN_NAME", "System Admin")

# Inference — system value from software config (client does not need to set)
DEFAULT_A_THRESHOLD = _load_system_a_threshold()
DEFAULT_AVG_APPLE_WEIGHT_G = float(os.getenv("DEFAULT_AVG_APPLE_WEIGHT_G", "180.0"))
MAX_UPLOAD_BYTES = int(os.getenv("MAX_UPLOAD_BYTES", str(25 * 1024 * 1024)))  # 25 MB per file
MAX_IMAGES_PER_REQUEST = int(os.getenv("MAX_IMAGES_PER_REQUEST", "10"))
ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".bmp", ".heic", ".heif"}

# Delete uploaded image after successful processing
DELETE_IMAGE_AFTER_PROCESS = os.getenv("DELETE_IMAGE_AFTER_PROCESS", "true").lower() in (
    "1",
    "true",
    "yes",
)

# Public UI origin for password-reset links (HashRouter)
PUBLIC_APP_URL = os.getenv("PUBLIC_APP_URL", "http://127.0.0.1:8000").rstrip("/")

# SMTP (optional). If SMTP_HOST and SMTP_FROM are set, reset mail is sent
# and the raw token is not returned in the API response.
SMTP_HOST = os.getenv("SMTP_HOST", "").strip()
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER = os.getenv("SMTP_USER", "").strip()
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")
SMTP_FROM = os.getenv("SMTP_FROM", "").strip()
SMTP_USE_TLS = os.getenv("SMTP_USE_TLS", "true").lower() in ("1", "true", "yes")
SMTP_USE_SSL = os.getenv("SMTP_USE_SSL", "false").lower() in ("1", "true", "yes")

# Gmail helper. Gmail needs an app password (not the account password) with
# TLS on port 587: https://myaccount.google.com/apppasswords
GMAIL_SMTP_HOST = "smtp.gmail.com"
GMAIL_SMTP_PORT = 587


def gmail_smtp_ready() -> bool:
    """True when a Gmail account plus app password are configured."""
    return bool(SMTP_USER and SMTP_PASSWORD and SMTP_HOST == GMAIL_SMTP_HOST)


# ── Registration OTP ──────────────────────────────────────────────────
# The 6-digit code proves the applicant controls the address before the
# account row is created, so nobody can reserve an email they do not own.
OTP_LENGTH = int(os.getenv("OTP_LENGTH", "6"))
OTP_EXPIRE_MINUTES = int(os.getenv("OTP_EXPIRE_MINUTES", "10"))
OTP_MAX_ATTEMPTS = int(os.getenv("OTP_MAX_ATTEMPTS", "5"))
# Minimum seconds between OTP sends for the same address.
OTP_RESEND_COOLDOWN_SECONDS = int(os.getenv("OTP_RESEND_COOLDOWN_SECONDS", "60"))


def ensure_dirs() -> None:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
