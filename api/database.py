"""SQLite persistence for users, orgs, sessions, and grading jobs."""

from __future__ import annotations

import json
import sqlite3
import threading
from contextlib import contextmanager
from datetime import datetime, timezone
from typing import Any, Iterator, Optional

from api.config import DB_PATH, ensure_dirs


def _utc_now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


class Database:
    def __init__(self, path: Optional[str] = None):
        ensure_dirs()
        self.path = str(path or DB_PATH)
        self._lock = threading.RLock()
        self._init_schema()

    def _connect(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self.path, check_same_thread=False)
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA foreign_keys = ON")
        return conn

    @contextmanager
    def connection(self) -> Iterator[sqlite3.Connection]:
        with self._lock:
            conn = self._connect()
            try:
                yield conn
                conn.commit()
            except Exception:
                conn.rollback()
                raise
            finally:
                conn.close()

    def _init_schema(self) -> None:
        with self.connection() as conn:
            conn.executescript(
                """
                CREATE TABLE IF NOT EXISTS organizations (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT NOT NULL UNIQUE,
                    subscription_status TEXT NOT NULL DEFAULT 'inactive',
                    subscription_expires_at TEXT,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL
                );

                CREATE TABLE IF NOT EXISTS users (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    email TEXT NOT NULL UNIQUE,
                    full_name TEXT NOT NULL,
                    password_hash TEXT NOT NULL,
                    role TEXT NOT NULL DEFAULT 'user',
                    status TEXT NOT NULL DEFAULT 'pending',
                    org_id INTEGER,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL,
                    FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE SET NULL
                );

                CREATE TABLE IF NOT EXISTS sessions (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER NOT NULL,
                    device_id TEXT NOT NULL,
                    refresh_token_hash TEXT NOT NULL,
                    expires_at TEXT NOT NULL,
                    created_at TEXT NOT NULL,
                    revoked INTEGER NOT NULL DEFAULT 0,
                    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
                );

                CREATE TABLE IF NOT EXISTS password_resets (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER NOT NULL,
                    token_hash TEXT NOT NULL UNIQUE,
                    expires_at TEXT NOT NULL,
                    used INTEGER NOT NULL DEFAULT 0,
                    created_at TEXT NOT NULL,
                    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
                );

                CREATE TABLE IF NOT EXISTS email_verifications (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    email TEXT NOT NULL,
                    code_hash TEXT NOT NULL,
                    expires_at TEXT NOT NULL,
                    attempts INTEGER NOT NULL DEFAULT 0,
                    used INTEGER NOT NULL DEFAULT 0,
                    created_at TEXT NOT NULL,
                    last_sent_at TEXT,
                    -- Form details held until the code is proven, so the account
                    -- row is created only after the address is verified.
                    full_name TEXT NOT NULL,
                    password_hash TEXT NOT NULL,
                    org_name TEXT
                );

                CREATE TABLE IF NOT EXISTS jobs (
                    id TEXT PRIMARY KEY,
                    user_id INTEGER NOT NULL,
                    org_id INTEGER,
                    status TEXT NOT NULL,
                    lot_id TEXT,
                    lot_name TEXT,
                    total_sampled_weight_g REAL,
                    avg_apple_weight_g REAL,
                    a_threshold REAL,
                    image_path TEXT,
                    image_filename TEXT,
                    error_message TEXT,
                    retry_count INTEGER NOT NULL DEFAULT 0,
                    max_retries INTEGER NOT NULL DEFAULT 3,
                    result_json TEXT,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL,
                    started_at TEXT,
                    completed_at TEXT,
                    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                    FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE SET NULL
                );

                CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
                CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
                CREATE INDEX IF NOT EXISTS idx_email_verif_email ON email_verifications(email);
                CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
                CREATE INDEX IF NOT EXISTS idx_jobs_user ON jobs(user_id);
                CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
                """
            )

    # ── Organizations ────────────────────────────────────────────────
    def create_organization(self, name: str) -> dict:
        now = _utc_now()
        with self.connection() as conn:
            cur = conn.execute(
                """
                INSERT INTO organizations (name, subscription_status, created_at, updated_at)
                VALUES (?, 'inactive', ?, ?)
                """,
                (name, now, now),
            )
            return self.get_organization(cur.lastrowid, conn=conn)

    def get_organization(self, org_id: int, conn: Optional[sqlite3.Connection] = None) -> Optional[dict]:
        def _get(c: sqlite3.Connection):
            row = c.execute("SELECT * FROM organizations WHERE id = ?", (org_id,)).fetchone()
            return dict(row) if row else None

        if conn:
            return _get(conn)
        with self.connection() as c:
            return _get(c)

    def list_organizations(self) -> list[dict]:
        with self.connection() as conn:
            rows = conn.execute("SELECT * FROM organizations ORDER BY id").fetchall()
            return [dict(r) for r in rows]

    def update_subscription(
        self,
        org_id: int,
        status: str,
        expires_at: Optional[str] = None,
    ) -> Optional[dict]:
        now = _utc_now()
        with self.connection() as conn:
            conn.execute(
                """
                UPDATE organizations
                SET subscription_status = ?, subscription_expires_at = ?, updated_at = ?
                WHERE id = ?
                """,
                (status, expires_at, now, org_id),
            )
            return self.get_organization(org_id, conn=conn)

    # ── Users ────────────────────────────────────────────────────────
    def create_user(
        self,
        email: str,
        full_name: str,
        password_hash: str,
        role: str = "user",
        status: str = "pending",
        org_id: Optional[int] = None,
    ) -> dict:
        now = _utc_now()
        with self.connection() as conn:
            cur = conn.execute(
                """
                INSERT INTO users (email, full_name, password_hash, role, status, org_id, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (email.lower().strip(), full_name, password_hash, role, status, org_id, now, now),
            )
            return self.get_user(cur.lastrowid, conn=conn)

    def get_user(self, user_id: int, conn: Optional[sqlite3.Connection] = None) -> Optional[dict]:
        def _get(c: sqlite3.Connection):
            row = c.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
            return dict(row) if row else None

        if conn:
            return _get(conn)
        with self.connection() as c:
            return _get(c)

    def get_user_by_email(self, email: str) -> Optional[dict]:
        with self.connection() as conn:
            row = conn.execute(
                "SELECT * FROM users WHERE email = ?", (email.lower().strip(),)
            ).fetchone()
            return dict(row) if row else None

    def get_user_by_username(self, full_name: str) -> Optional[dict]:
        name = (full_name or "").strip()
        if not name:
            return None
        with self.connection() as conn:
            row = conn.execute(
                "SELECT * FROM users WHERE LOWER(full_name) = LOWER(?)",
                (name,),
            ).fetchone()
            return dict(row) if row else None

    def list_users(self, status: Optional[str] = None, org_id: Optional[int] = None) -> list[dict]:
        clauses = []
        params: list[Any] = []
        if status:
            clauses.append("status = ?")
            params.append(status)
        if org_id is not None:
            clauses.append("org_id = ?")
            params.append(org_id)
        where = ("WHERE " + " AND ".join(clauses)) if clauses else ""
        with self.connection() as conn:
            rows = conn.execute(
                f"SELECT * FROM users {where} ORDER BY id", params
            ).fetchall()
            return [dict(r) for r in rows]

    def update_user(self, user_id: int, **fields: Any) -> Optional[dict]:
        allowed = {"full_name", "password_hash", "role", "status", "org_id"}
        updates = {k: v for k, v in fields.items() if k in allowed}
        if not updates:
            return self.get_user(user_id)
        updates["updated_at"] = _utc_now()
        cols = ", ".join(f"{k} = ?" for k in updates)
        values = list(updates.values()) + [user_id]
        with self.connection() as conn:
            conn.execute(f"UPDATE users SET {cols} WHERE id = ?", values)
            return self.get_user(user_id, conn=conn)

    def delete_user(self, user_id: int) -> None:
        """Remove a user row. Sessions, resets and jobs cascade."""
        with self.connection() as conn:
            conn.execute("DELETE FROM users WHERE id = ?", (user_id,))

    def count_admins(self) -> int:
        with self.connection() as conn:
            row = conn.execute(
                "SELECT COUNT(*) AS c FROM users WHERE role = 'admin'"
            ).fetchone()
            return int(row["c"])

    # ── Sessions (one active device per user) ────────────────────────
    def replace_session(
        self,
        user_id: int,
        device_id: str,
        refresh_token_hash: str,
        expires_at: str,
    ) -> dict:
        """Revoke all existing sessions for user, then create one new session."""
        now = _utc_now()
        with self.connection() as conn:
            conn.execute(
                "UPDATE sessions SET revoked = 1 WHERE user_id = ? AND revoked = 0",
                (user_id,),
            )
            cur = conn.execute(
                """
                INSERT INTO sessions (user_id, device_id, refresh_token_hash, expires_at, created_at, revoked)
                VALUES (?, ?, ?, ?, ?, 0)
                """,
                (user_id, device_id, refresh_token_hash, expires_at, now),
            )
            row = conn.execute(
                "SELECT * FROM sessions WHERE id = ?", (cur.lastrowid,)
            ).fetchone()
            return dict(row)

    def get_active_session(self, user_id: int) -> Optional[dict]:
        with self.connection() as conn:
            row = conn.execute(
                """
                SELECT * FROM sessions
                WHERE user_id = ? AND revoked = 0
                ORDER BY id DESC LIMIT 1
                """,
                (user_id,),
            ).fetchone()
            return dict(row) if row else None

    def revoke_user_sessions(self, user_id: int) -> None:
        with self.connection() as conn:
            conn.execute(
                "UPDATE sessions SET revoked = 1 WHERE user_id = ?", (user_id,)
            )

    def validate_session_device(self, user_id: int, device_id: str) -> bool:
        session = self.get_active_session(user_id)
        if not session:
            return False
        if session["revoked"]:
            return False
        if session["expires_at"] < _utc_now():
            return False
        return session["device_id"] == device_id

    # ── Password resets ──────────────────────────────────────────────
    def create_password_reset(self, user_id: int, token_hash: str, expires_at: str) -> dict:
        now = _utc_now()
        with self.connection() as conn:
            # Invalidate previous unused tokens
            conn.execute(
                "UPDATE password_resets SET used = 1 WHERE user_id = ? AND used = 0",
                (user_id,),
            )
            cur = conn.execute(
                """
                INSERT INTO password_resets (user_id, token_hash, expires_at, created_at)
                VALUES (?, ?, ?, ?)
                """,
                (user_id, token_hash, expires_at, now),
            )
            row = conn.execute(
                "SELECT * FROM password_resets WHERE id = ?", (cur.lastrowid,)
            ).fetchone()
            return dict(row)

    def get_password_reset(self, token_hash: str) -> Optional[dict]:
        with self.connection() as conn:
            row = conn.execute(
                "SELECT * FROM password_resets WHERE token_hash = ?", (token_hash,)
            ).fetchone()
            return dict(row) if row else None

    def mark_password_reset_used(self, reset_id: int) -> None:
        with self.connection() as conn:
            conn.execute(
                "UPDATE password_resets SET used = 1 WHERE id = ?", (reset_id,)
            )

    # ── Registration email verification (OTP) ─────────────────────────
    def create_email_verification(
        self,
        email: str,
        code_hash: str,
        expires_at: str,
        full_name: str,
        password_hash: str,
        org_name: Optional[str] = None,
    ) -> dict:
        """Store a fresh OTP plus the form details it unlocks.

        Any earlier unused code for this address is retired, so only the newest
        code can complete a registration.
        """
        now = _utc_now()
        with self.connection() as conn:
            conn.execute(
                "UPDATE email_verifications SET used = 1 WHERE email = ? AND used = 0",
                (email,),
            )
            cur = conn.execute(
                """
                INSERT INTO email_verifications
                    (email, code_hash, expires_at, full_name, password_hash,
                     org_name, attempts, used, created_at, last_sent_at)
                VALUES (?, ?, ?, ?, ?, ?, 0, 0, ?, ?)
                """,
                (
                    email,
                    code_hash,
                    expires_at,
                    full_name,
                    password_hash,
                    org_name,
                    now,
                    now,
                ),
            )
            row = conn.execute(
                "SELECT * FROM email_verifications WHERE id = ?", (cur.lastrowid,)
            ).fetchone()
            return dict(row)

    def get_active_email_verification(self, email: str) -> Optional[dict]:
        """Newest unused code for this address, or None."""
        with self.connection() as conn:
            row = conn.execute(
                """
                SELECT * FROM email_verifications
                WHERE email = ? AND used = 0
                ORDER BY id DESC LIMIT 1
                """,
                (email,),
            ).fetchone()
            return dict(row) if row else None

    def increment_email_verification_attempts(self, verification_id: int) -> None:
        with self.connection() as conn:
            conn.execute(
                "UPDATE email_verifications SET attempts = attempts + 1 WHERE id = ?",
                (verification_id,),
            )

    def mark_email_verification_sent(self, verification_id: int) -> None:
        with self.connection() as conn:
            conn.execute(
                "UPDATE email_verifications SET last_sent_at = ? WHERE id = ?",
                (_utc_now(), verification_id),
            )

    def consume_email_verification(self, verification_id: int) -> None:
        """Single use — one code can create at most one account."""
        with self.connection() as conn:
            conn.execute(
                "UPDATE email_verifications SET used = 1 WHERE id = ?", (verification_id,)
            )

    # ── Jobs ─────────────────────────────────────────────────────────
    def create_job(self, job: dict) -> dict:
        with self.connection() as conn:
            conn.execute(
                """
                INSERT INTO jobs (
                    id, user_id, org_id, status, lot_id, lot_name,
                    total_sampled_weight_g, avg_apple_weight_g, a_threshold,
                    image_path, image_filename, error_message, retry_count, max_retries,
                    result_json, created_at, updated_at, started_at, completed_at
                ) VALUES (
                    :id, :user_id, :org_id, :status, :lot_id, :lot_name,
                    :total_sampled_weight_g, :avg_apple_weight_g, :a_threshold,
                    :image_path, :image_filename, :error_message, :retry_count, :max_retries,
                    :result_json, :created_at, :updated_at, :started_at, :completed_at
                )
                """,
                job,
            )
            return self.get_job(job["id"], conn=conn)

    def get_job(self, job_id: str, conn: Optional[sqlite3.Connection] = None) -> Optional[dict]:
        def _get(c: sqlite3.Connection):
            row = c.execute("SELECT * FROM jobs WHERE id = ?", (job_id,)).fetchone()
            if not row:
                return None
            data = dict(row)
            if data.get("result_json"):
                data["result"] = json.loads(data["result_json"])
            else:
                data["result"] = None
            return data

        if conn:
            return _get(conn)
        with self.connection() as c:
            return _get(c)

    def update_job(self, job_id: str, **fields: Any) -> Optional[dict]:
        allowed = {
            "status",
            "error_message",
            "retry_count",
            "result_json",
            "image_path",
            "started_at",
            "completed_at",
            "updated_at",
        }
        updates = {k: v for k, v in fields.items() if k in allowed}
        if "updated_at" not in updates:
            updates["updated_at"] = _utc_now()
        cols = ", ".join(f"{k} = ?" for k in updates)
        values = list(updates.values()) + [job_id]
        with self.connection() as conn:
            conn.execute(f"UPDATE jobs SET {cols} WHERE id = ?", values)
            return self.get_job(job_id, conn=conn)

    def list_jobs(
        self,
        user_id: Optional[int] = None,
        status: Optional[str] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> list[dict]:
        clauses = []
        params: list[Any] = []
        if user_id is not None:
            clauses.append("user_id = ?")
            params.append(user_id)
        if status:
            clauses.append("status = ?")
            params.append(status)
        where = ("WHERE " + " AND ".join(clauses)) if clauses else ""
        params.extend([limit, offset])
        with self.connection() as conn:
            rows = conn.execute(
                f"SELECT * FROM jobs {where} ORDER BY created_at DESC LIMIT ? OFFSET ?",
                params,
            ).fetchall()
            out = []
            for row in rows:
                data = dict(row)
                if data.get("result_json"):
                    data["result"] = json.loads(data["result_json"])
                else:
                    data["result"] = None
                out.append(data)
            return out


# Singleton used by the app
db = Database()
