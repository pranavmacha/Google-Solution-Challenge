FROM python:3.11-slim

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    OLLAMA_BASE_URL=http://ollama:11434 \
    OLLAMA_MODEL=llama3 \
    QDRANT_PATH=/data/qdrant

WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        build-essential \
        curl \
    && rm -rf /var/lib/apt/lists/*

COPY GlobalSentry-Web/requirements.txt /tmp/requirements.txt
RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir -r /tmp/requirements.txt

COPY GlobalSentry-Web ./GlobalSentry-Web
COPY Radio ./Radio

EXPOSE 8000

WORKDIR /app/GlobalSentry-Web
CMD ["python", "-m", "uvicorn", "api:app", "--host", "0.0.0.0", "--port", "8000"]
