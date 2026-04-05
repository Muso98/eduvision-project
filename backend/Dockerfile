FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq-dev gcc \
    libglib2.0-0 \
    libgomp1 \
    libgl1 \
    libxcb1 \
    && rm -rf /var/lib/apt/lists/*

COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
RUN mkdir -p /app/ai_module /app/static && chmod 777 /app/ai_module /app/static
COPY backend/ .
COPY ai_module/ ./ai_module/

EXPOSE 8000

CMD ["daphne", "-b", "0.0.0.0", "-p", "8000", "eduvision.asgi:application"]
