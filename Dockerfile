# Dockerfile for Grading_System-New
# Production-ready container for the Python FastAPI backend + ML engine.
#
# Build:
#   docker build -t grading-system-new .
# Run:
#   docker run --rm -p 8000:8000 \
#     -v $(pwd)/models:/app/models \
#     grading-system-new
#
# The API serves the built frontend from frontend_build/ if present and runs the
# ML grading pipeline using the models stored in /app/models.

FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

# Install system deps for OpenCV, ultralytics, pillow-heif, and image processing.
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    ffmpeg \
    libgl1 \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender-dev \
    libheif-dev \
    git \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy dependency files first for better layer caching.
COPY requirements.txt ./
COPY api/requirements.txt ./api/requirements.txt

# Install Python dependencies.
RUN pip install --upgrade pip setuptools wheel \
    && pip install --no-cache-dir -r requirements.txt \
    && pip install --no-cache-dir -r api/requirements.txt \
    && rm -rf /root/.cache/pip

# Copy the rest of the app.
COPY . .

# Mountable model directory for weights.
RUN mkdir -p /app/models /app/output /app/sample_images
VOLUME ["/app/models", "/app/output", "/app/sample_images"]

EXPOSE 8000

# Default command: run the FastAPI app.
CMD ["uvicorn", "api.main:app", "--host", "0.0.0.0", "--port", "8000"]
