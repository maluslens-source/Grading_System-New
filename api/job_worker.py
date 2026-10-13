"""Background job processing: upload → grade → weights → delete image."""

from __future__ import annotations

import json
import logging
import os
import threading
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

from api.config import DELETE_IMAGE_AFTER_PROCESS
from api.database import db
from api.ml_service import grader_service
from api.weights import calculate_weights

logger = logging.getLogger("api.job_worker")


def _utc_now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


class JobWorker:
    def __init__(self, max_workers: int = 1):
        # Default 1 worker: GPU inference is typically serialized.
        self._executor = ThreadPoolExecutor(max_workers=max_workers, thread_name_prefix="grade-job")
        self._lock = threading.Lock()

    def submit(self, job_id: str) -> None:
        self._executor.submit(self._run_job, job_id)

    def _delete_image(self, image_path: Optional[str]) -> None:
        if not image_path or not DELETE_IMAGE_AFTER_PROCESS:
            return
        try:
            path = Path(image_path)
            if path.exists():
                path.unlink()
                logger.info("Deleted temporary image %s", image_path)
        except OSError as exc:
            logger.warning("Failed to delete image %s: %s", image_path, exc)

    def _run_job(self, job_id: str) -> None:
        job = db.get_job(job_id)
        if not job:
            logger.error("Job %s not found", job_id)
            return
        if job["status"] not in ("queued", "retrying"):
            logger.info("Job %s skipped (status=%s)", job_id, job["status"])
            return

        db.update_job(
            job_id,
            status="processing",
            started_at=_utc_now(),
            error_message=None,
        )

        image_path = job.get("image_path")
        try:
            if not image_path or not Path(image_path).exists():
                raise FileNotFoundError("Uploaded image is missing or already deleted")

            grade_result = grader_service.grade(
                image_path,
                a_threshold=float(job.get("a_threshold") or 0.45),
            )

            weights = calculate_weights(
                grade_a_count=int(grade_result["grade_A_count"]),
                grade_b_count=int(grade_result["grade_B_count"]),
                total_sampled_weight_g=job.get("total_sampled_weight_g"),
                avg_apple_weight_g=job.get("avg_apple_weight_g"),
            )

            result = {
                "lot_id": job.get("lot_id"),
                "lot_name": job.get("lot_name"),
                "grading": {
                    "image": grade_result.get("image"),
                    "total_detected": grade_result["total_detected"],
                    "grade_A_count": grade_result["grade_A_count"],
                    "grade_B_count": grade_result["grade_B_count"],
                    "pct_A": grade_result["pct_A"],
                    "pct_B": grade_result["pct_B"],
                    "a_threshold": float(job.get("a_threshold") or 0.45),
                    "apples": grade_result.get("apples", []),
                },
                "weights": weights,
            }

            # Temporary image lifecycle: delete after successful process
            self._delete_image(image_path)

            db.update_job(
                job_id,
                status="completed",
                result_json=json.dumps(result),
                image_path=None if DELETE_IMAGE_AFTER_PROCESS else image_path,
                completed_at=_utc_now(),
                error_message=None,
            )
            logger.info("Job %s completed", job_id)

        except Exception as exc:
            logger.exception("Job %s failed: %s", job_id, exc)
            retry_count = int(job.get("retry_count") or 0)
            max_retries = int(job.get("max_retries") or 3)
            # Keep image for possible retry unless max retries exceeded
            new_status = "failed"
            if retry_count < max_retries:
                # Stay failed until client calls /retry; image kept
                new_status = "failed"

            db.update_job(
                job_id,
                status=new_status,
                error_message=str(exc),
                completed_at=_utc_now(),
            )

    def shutdown(self) -> None:
        self._executor.shutdown(wait=False, cancel_futures=False)


job_worker = JobWorker(max_workers=int(os.getenv("GRADE_WORKERS", "1")))
