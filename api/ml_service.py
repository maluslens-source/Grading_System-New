"""
Lazy wrapper around the existing AppleGrader.

Imports grader.py from the project root without modifying it.
"""

from __future__ import annotations

import sys
import threading
from pathlib import Path
from typing import Optional

from api.config import CLASSIFIER_PATH, DETECTOR_PATH, PROJECT_ROOT

# Ensure project root is on sys.path so `import grader` works when uvicorn
# is started from any working directory.
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))


class GraderService:
    """Thread-safe singleton that loads AppleGrader once."""

    def __init__(self) -> None:
        self._grader = None
        self._lock = threading.Lock()
        self._load_error: Optional[str] = None

    def _ensure_loaded(self):
        if self._grader is not None:
            return self._grader
        with self._lock:
            if self._grader is not None:
                return self._grader
            if not DETECTOR_PATH.exists():
                self._load_error = f"Detector weights missing: {DETECTOR_PATH}"
                raise FileNotFoundError(self._load_error)
            if not CLASSIFIER_PATH.exists():
                self._load_error = f"Classifier weights missing: {CLASSIFIER_PATH}"
                raise FileNotFoundError(self._load_error)

            from grader import AppleGrader  # original code — never modified

            self._grader = AppleGrader(str(DETECTOR_PATH), str(CLASSIFIER_PATH))
            return self._grader

    @property
    def ready(self) -> bool:
        try:
            self._ensure_loaded()
            return True
        except Exception as exc:
            self._load_error = str(exc)
            return False

    @property
    def load_error(self) -> Optional[str]:
        return self._load_error

    def grade(self, image_path: str | Path, a_threshold: float) -> dict:
        grader = self._ensure_loaded()
        return grader.grade(str(image_path), a_threshold=a_threshold)


grader_service = GraderService()
