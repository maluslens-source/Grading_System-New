"""
Simple sync grading API.

POST /api/v1/grade
  - accepts 1 to 10 tray images in one request
  - runs existing AppleGrader (grader.py — not modified)
  - returns JSON per image + summary totals
  - deletes temp uploads after analysis

Form fields:
  - images: file (repeat up to 10 times)  [preferred]
  - image:  file (single, optional alias for one photo)
  - a_threshold: float (optional)
"""

from __future__ import annotations

import shutil
import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile

from api.config import (
    ALLOWED_EXTENSIONS,
    DEFAULT_A_THRESHOLD,
    MAX_IMAGES_PER_REQUEST,
    MAX_UPLOAD_BYTES,
    UPLOAD_DIR,
    ensure_dirs,
)
from api.auth import require_active_subscription
from api.ml_service import grader_service

router = APIRouter(tags=["grade"])


async def _save_upload(upload: UploadFile, dest: Path) -> int:
    size = 0
    with dest.open("wb") as out:
        while True:
            chunk = await upload.read(1024 * 1024)
            if not chunk:
                break
            size += len(chunk)
            if size > MAX_UPLOAD_BYTES:
                raise HTTPException(
                    status_code=413,
                    detail=f"File '{upload.filename}' exceeds max size of {MAX_UPLOAD_BYTES} bytes",
                )
            out.write(chunk)
    return size


def _format_one(result: dict, filename: str, a_threshold: float) -> dict:
    total = int(result.get("total_detected", 0))
    grade_a = int(result.get("grade_A_count", 0))
    grade_b = int(result.get("grade_B_count", 0))
    return {
        "success": True,
        "image_filename": filename,
        "total_apples": total,
        "good_apples": grade_a,
        "bad_apples": grade_b,
        "total_detected": total,
        "grade_A_count": grade_a,
        "grade_B_count": grade_b,
        "pct_A": result.get("pct_A", 0.0),
        "pct_B": result.get("pct_B", 0.0),
        "a_threshold": a_threshold,
        "apples": result.get("apples", []),
    }


@router.post("/grade")
async def grade_images(
    images: list[UploadFile] | None = File(
        default=None,
        description="Tray photos — send this field 1 to 10 times",
    ),
    image: UploadFile | None = File(
        default=None,
        description="Optional single image (same as one 'images' file)",
    ),
    a_threshold: float | None = Form(
        default=None,
        description=(
            "Optional. Agar na bhejo to system value use hoti hai "
            f"(models/config.json → a_threshold, abhi default {DEFAULT_A_THRESHOLD}). "
            "Software CLI jaisa — sirf images kaafi hain."
        ),
    ),
    _user: dict = Depends(require_active_subscription),
):
    """
    1–10 images upload → analyze each → JSON list + summary.

    Use form-data key ``images`` multiple times (or once), or single key ``image``.
    ``a_threshold`` optional — system uses models/config.json (same as software).
    """
    ensure_dirs()

    if not grader_service.ready:
        raise HTTPException(
            status_code=503,
            detail=f"ML model not ready: {grader_service.load_error}",
        )

    uploads: list[UploadFile] = []
    if images:
        uploads.extend(images)
    if image is not None:
        uploads.append(image)

    # Drop empty placeholder parts some clients send
    uploads = [u for u in uploads if u is not None and (u.filename or "").strip()]

    if not uploads:
        raise HTTPException(
            status_code=422,
            detail="At least one image is required. Use form field 'images' (1–10 files) or 'image'.",
        )

    if len(uploads) > MAX_IMAGES_PER_REQUEST:
        raise HTTPException(
            status_code=400,
            detail=f"Maximum {MAX_IMAGES_PER_REQUEST} images allowed per request (got {len(uploads)})",
        )

    # Same as software: use system config unless client explicitly overrides
    threshold = float(DEFAULT_A_THRESHOLD if a_threshold is None else a_threshold)
    batch_dir = UPLOAD_DIR / f"batch_{uuid.uuid4().hex}"
    batch_dir.mkdir(parents=True, exist_ok=True)

    results: list[dict] = []
    errors: list[dict] = []

    try:
        for idx, upload in enumerate(uploads):
            filename = upload.filename or f"upload_{idx}.jpg"
            suffix = Path(filename).suffix.lower()
            if suffix not in ALLOWED_EXTENSIONS:
                errors.append(
                    {
                        "image_filename": filename,
                        "success": False,
                        "error": f"Unsupported type '{suffix}'. Allowed: {sorted(ALLOWED_EXTENSIONS)}",
                    }
                )
                continue

            dest = batch_dir / f"{idx}_{uuid.uuid4().hex[:8]}{suffix}"
            try:
                size = await _save_upload(upload, dest)
                if size == 0:
                    errors.append(
                        {
                            "image_filename": filename,
                            "success": False,
                            "error": "Empty image upload",
                        }
                    )
                    continue

                grade_result = grader_service.grade(dest, a_threshold=threshold)
                results.append(_format_one(grade_result, filename, threshold))
            except HTTPException as exc:
                errors.append(
                    {
                        "image_filename": filename,
                        "success": False,
                        "error": exc.detail if isinstance(exc.detail, str) else str(exc.detail),
                    }
                )
            except Exception as exc:
                errors.append(
                    {
                        "image_filename": filename,
                        "success": False,
                        "error": f"Analysis failed: {exc}",
                    }
                )
            finally:
                await upload.close()
    finally:
        shutil.rmtree(batch_dir, ignore_errors=True)

    sum_total = sum(r["total_apples"] for r in results)
    sum_good = sum(r["good_apples"] for r in results)
    sum_bad = sum(r["bad_apples"] for r in results)

    return {
        "success": len(errors) == 0 and len(results) > 0,
        "message": (
            f"Analyzed {len(results)} image(s)"
            + (f", {len(errors)} failed" if errors else "")
        ),
        "image_count": len(results),
        "failed_count": len(errors),
        "max_images": MAX_IMAGES_PER_REQUEST,
        "a_threshold": threshold,
        "summary": {
            "total_apples": sum_total,
            "good_apples": sum_good,
            "bad_apples": sum_bad,
            "pct_A": round(sum_good / sum_total * 100, 2) if sum_total else 0.0,
            "pct_B": round(sum_bad / sum_total * 100, 2) if sum_total else 0.0,
        },
        "results": results,
        "errors": errors,
    }
