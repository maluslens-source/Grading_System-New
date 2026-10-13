"""Image submission, analysis trigger, status, results, retry."""

from __future__ import annotations

import shutil
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile

from api.auth import get_current_user, org_subscription_active
from api.config import (
    ALLOWED_EXTENSIONS,
    DEFAULT_A_THRESHOLD,
    DEFAULT_AVG_APPLE_WEIGHT_G,
    MAX_UPLOAD_BYTES,
    UPLOAD_DIR,
    ensure_dirs,
)
from api.database import db
from api.job_worker import job_worker
from api.schemas import JobStatusResponse, JobSubmitResponse, RetryResponse

router = APIRouter(prefix="/jobs", tags=["jobs"])


def _utc_now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def _to_status(job: dict) -> JobStatusResponse:
    return JobStatusResponse(
        job_id=job["id"],
        status=job["status"],
        lot_id=job.get("lot_id"),
        lot_name=job.get("lot_name"),
        retry_count=job.get("retry_count") or 0,
        max_retries=job.get("max_retries") or 3,
        error_message=job.get("error_message"),
        created_at=job["created_at"],
        updated_at=job["updated_at"],
        started_at=job.get("started_at"),
        completed_at=job.get("completed_at"),
        result=job.get("result"),
    )


def _ensure_can_process(user: dict) -> None:
    if user["role"] == "admin":
        return
    if not user.get("org_id"):
        raise HTTPException(
            status_code=403,
            detail="User is not assigned to an organization",
        )
    if not org_subscription_active(user["org_id"]):
        raise HTTPException(
            status_code=403,
            detail="Organization subscription is inactive or expired",
        )


@router.post("/submit", response_model=JobSubmitResponse, status_code=202)
async def submit_job(
    image: UploadFile = File(..., description="Tray photo"),
    lot_id: Optional[str] = Form(default=None),
    lot_name: Optional[str] = Form(default=None),
    total_sampled_weight_g: Optional[float] = Form(
        default=None,
        description="Total weight of the sampled lot in grams (scale reading)",
    ),
    avg_apple_weight_g: Optional[float] = Form(
        default=None,
        description="Optional average apple weight in grams if lot weight unknown",
    ),
    a_threshold: Optional[float] = Form(default=None),
    auto_process: bool = Form(
        default=True,
        description="If true, analysis starts immediately; else call /jobs/{id}/process",
    ),
    user: dict = Depends(get_current_user),
):
    """Upload a tray photo + lot inputs. Optionally trigger analysis immediately."""
    _ensure_can_process(user)
    ensure_dirs()

    filename = image.filename or "upload.jpg"
    suffix = Path(filename).suffix.lower()
    if suffix not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported image type '{suffix}'. Allowed: {sorted(ALLOWED_EXTENSIONS)}",
        )

    job_id = str(uuid.uuid4())
    dest_dir = UPLOAD_DIR / job_id
    dest_dir.mkdir(parents=True, exist_ok=True)
    dest_path = dest_dir / f"input{suffix}"

    size = 0
    try:
        with dest_path.open("wb") as out:
            while True:
                chunk = await image.read(1024 * 1024)
                if not chunk:
                    break
                size += len(chunk)
                if size > MAX_UPLOAD_BYTES:
                    raise HTTPException(
                        status_code=413,
                        detail=f"File exceeds max size of {MAX_UPLOAD_BYTES} bytes",
                    )
                out.write(chunk)
    except HTTPException:
        shutil.rmtree(dest_dir, ignore_errors=True)
        raise
    except Exception as exc:
        shutil.rmtree(dest_dir, ignore_errors=True)
        raise HTTPException(status_code=500, detail=f"Upload failed: {exc}") from exc
    finally:
        await image.close()

    if size == 0:
        shutil.rmtree(dest_dir, ignore_errors=True)
        raise HTTPException(status_code=400, detail="Empty image upload")

    now = _utc_now()
    status = "queued" if auto_process else "uploaded"
    db.create_job(
        {
            "id": job_id,
            "user_id": user["id"],
            "org_id": user.get("org_id"),
            "status": status,
            "lot_id": lot_id,
            "lot_name": lot_name,
            "total_sampled_weight_g": total_sampled_weight_g,
            "avg_apple_weight_g": avg_apple_weight_g
            if avg_apple_weight_g is not None
            else (DEFAULT_AVG_APPLE_WEIGHT_G if total_sampled_weight_g is None else None),
            "a_threshold": a_threshold if a_threshold is not None else DEFAULT_A_THRESHOLD,
            "image_path": str(dest_path),
            "image_filename": filename,
            "error_message": None,
            "retry_count": 0,
            "max_retries": 3,
            "result_json": None,
            "created_at": now,
            "updated_at": now,
            "started_at": None,
            "completed_at": None,
        }
    )

    if auto_process:
        job_worker.submit(job_id)
        return JobSubmitResponse(
            job_id=job_id,
            status="queued",
            message="Image uploaded and analysis queued",
        )

    return JobSubmitResponse(
        job_id=job_id,
        status="uploaded",
        message="Image uploaded. Call POST /jobs/{job_id}/process to start analysis.",
    )


@router.post("/{job_id}/process", response_model=JobSubmitResponse)
def trigger_process(job_id: str, user: dict = Depends(get_current_user)):
    """Explicitly trigger analysis for an uploaded job."""
    _ensure_can_process(user)
    job = db.get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    if user["role"] != "admin" and job["user_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="Not your job")
    if job["status"] not in ("uploaded", "failed"):
        raise HTTPException(
            status_code=409,
            detail=f"Cannot process job in status '{job['status']}'",
        )
    if not job.get("image_path") or not Path(job["image_path"]).exists():
        raise HTTPException(status_code=409, detail="Image no longer available for processing")

    db.update_job(job_id, status="queued", error_message=None)
    job_worker.submit(job_id)
    return JobSubmitResponse(
        job_id=job_id,
        status="queued",
        message="Analysis queued",
    )


@router.get("/{job_id}/status", response_model=JobStatusResponse)
def job_status(job_id: str, user: dict = Depends(get_current_user)):
    job = db.get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    if user["role"] != "admin" and job["user_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="Not your job")
    return _to_status(job)


@router.get("/{job_id}/results", response_model=JobStatusResponse)
def job_results(job_id: str, user: dict = Depends(get_current_user)):
    job = db.get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    if user["role"] != "admin" and job["user_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="Not your job")
    if job["status"] != "completed":
        raise HTTPException(
            status_code=409,
            detail=f"Results not ready. Current status: {job['status']}",
        )
    return _to_status(job)


@router.post("/{job_id}/retry", response_model=RetryResponse)
def retry_job(job_id: str, user: dict = Depends(get_current_user)):
    """Retry a failed job (keeps original image if still present)."""
    _ensure_can_process(user)
    job = db.get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    if user["role"] != "admin" and job["user_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="Not your job")
    if job["status"] != "failed":
        raise HTTPException(
            status_code=409,
            detail=f"Only failed jobs can be retried (status={job['status']})",
        )

    retry_count = int(job.get("retry_count") or 0)
    max_retries = int(job.get("max_retries") or 3)
    if retry_count >= max_retries:
        raise HTTPException(
            status_code=409,
            detail=f"Max retries ({max_retries}) reached",
        )
    if not job.get("image_path") or not Path(job["image_path"]).exists():
        raise HTTPException(
            status_code=409,
            detail="Cannot retry: temporary image was already deleted. Re-submit a new job.",
        )

    new_count = retry_count + 1
    db.update_job(
        job_id,
        status="retrying",
        retry_count=new_count,
        error_message=None,
        completed_at=None,
    )
    job_worker.submit(job_id)
    return RetryResponse(
        job_id=job_id,
        status="retrying",
        retry_count=new_count,
        message=f"Retry {new_count}/{max_retries} queued",
    )


@router.get("", response_model=list[JobStatusResponse])
def list_my_jobs(
    status: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
    user: dict = Depends(get_current_user),
):
    jobs = db.list_jobs(
        user_id=None if user["role"] == "admin" else user["id"],
        status=status,
        limit=min(limit, 200),
        offset=max(offset, 0),
    )
    if user["role"] != "admin":
        jobs = [j for j in jobs if j["user_id"] == user["id"]]
    return [_to_status(j) for j in jobs]
