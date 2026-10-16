# ==========================================
# Stage 1: Build the Frontend (React / Vue)
# ==========================================
FROM node:18-alpine AS frontend-builder
WORKDIR /frontend

# Copy frontend package definitions and source
# (adjust the path if your frontend code is in a subfolder, e.g. frontend/)
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# ==========================================
# Stage 2: Production Python Backend Container
# ==========================================
FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

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

# Copy backend code
COPY . .

# Copy the compiled frontend assets from Stage 1 into frontend_build/
COPY --from=frontend-builder /frontend/build ./frontend_build
# (Note: Change "/frontend/build" to "/frontend/dist" if you are using Vite instead of Create-React-App)

# Ensure models and output directories exist
RUN mkdir -p /app/models /app/output /app/sample_images

EXPOSE 8000

# Cloud Run injects PORT; fallback to 8000
CMD exec uvicorn api.main:app --host 0.0.0.0 --port ${PORT:-8000}
