FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

# Install system libraries needed by OpenCV and image processing
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

# Install Python dependencies
COPY requirements.txt ./
COPY api/requirements.txt ./api/requirements.txt

RUN pip install --upgrade pip setuptools wheel \
    && pip install --no-cache-dir -r requirements.txt \
    && pip install --no-cache-dir -r api/requirements.txt \
    && rm -rf /root/.cache/pip

# Copy everything (including frontend_build/) into /app
COPY . .

# Ensure necessary directories exist
RUN mkdir -p /app/models /app/output /app/sample_images /app/frontend_build

EXPOSE 8000

# Run FastAPI backend via Uvicorn with Cloud Run's dynamic PORT
CMD exec uvicorn api.main:app --host 0.0.0.0 --port ${PORT:-8000}
