# GlobalSentry Deployment

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
