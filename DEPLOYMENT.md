# GlobalSentry Deployment

This file covers the Ollama VM deployment path. On the `apiKeys` branch, you can also deploy the FastAPI website/backend with Groq instead of running Ollama.

## API-Key Deployment Path

Use this when deploying to Render or another normal web host where Ollama is too expensive to run.

Set these environment variables on the host:

```bash
LLM_PROVIDER=groq
GROQ_API_KEY=your_groq_key
GROQ_MODEL=llama-3.1-8b-instant
EMBEDDINGS_PROVIDER=hash
QDRANT_PATH=/data/qdrant
RESET_DEMO_STATE_ON_START=true
```

Do not commit the real `GROQ_API_KEY`.

Use `RESET_DEMO_STATE_ON_START=true` for a fresh judging deployment. After the first successful deploy, change it back to `false` if you want memory to persist across restarts.

For Render, create a Docker Web Service from this repo/branch and add the variables above in the Render dashboard.

`EMBEDDINGS_PROVIDER=hash` is important on Render's 512 MB tier. It avoids loading `sentence-transformers`/Torch at startup, which can otherwise crash the service before it opens a port.

## Ollama VM Deployment Path

This deploys the FastAPI website/backend and Ollama agent runtime together with Docker Compose.

## Server Setup

Use an Ubuntu VM with Docker and Docker Compose installed.

Recommended minimum for the demo:

- 4 vCPU
- 16 GB RAM
- 40+ GB disk

GPU is better, but CPU works for a slower demo.

## Run

From the repo root:

```bash
docker compose up -d --build
```

The first run downloads:

- Python dependencies
- Ollama image
- `llama3`
- `all-MiniLM-L6-v2` embedding model

Open:

```text
http://SERVER_IP:8000
```

API status:

```bash
curl http://SERVER_IP:8000/api/status
```

## Logs

```bash
docker compose logs -f globalsentry-web
docker compose logs -f ollama
```

## Stop

```bash
docker compose down
```

## Production Note

For a public domain, put Nginx or Caddy in front of port `8000` and terminate HTTPS there. Ollama is bound to `127.0.0.1:11434` on the host and should not be exposed publicly.
