# ==================================================
# GarmentFlow ERP - Dockerfile
# Multi-stage production build
# ==================================================

FROM python:3.12-slim as builder

WORKDIR /app

# Install system dependencies for Pillow
RUN apt-get update && apt-get install -y \
    libpq-dev \
    gcc \
    libjpeg-dev \
    zlib1g-dev \
    libwebp-dev \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# ==================================================
FROM python:3.12-slim as production

WORKDIR /app

# Install runtime libs for Pillow
RUN apt-get update && apt-get install -y \
    libjpeg62-turbo \
    zlib1g \
    libwebp7 \
    && rm -rf /var/lib/apt/lists/*

# Copy installed packages from builder
COPY --from=builder /usr/local/lib/python3.12/site-packages /usr/local/lib/python3.12/site-packages
COPY --from=builder /usr/local/bin /usr/local/bin

# Copy application code
COPY . .

# Create directories
RUN mkdir -p uploads logs

# Create non-root user for security
RUN useradd -m -u 1000 garmentflow && \
    chown -R garmentflow:garmentflow /app

USER garmentflow

EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD python -c "import httpx; httpx.get('http://localhost:8000/health')" || exit 1

CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000"]
