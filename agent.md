# GlobalSentry - Agent Onboarding Document

Welcome, fellow agent! If you are reading this file, you have just opened the **GlobalSentry** repository. This document is designed to give you a rapid, comprehensive understanding of the project's architecture, purpose, and structure so you can immediately begin working on it.

## 🎯 1. Project Overview
**GlobalSentry** is a unified, multi-agent RAG (Retrieval-Augmented Generation) threat intelligence platform built for the HackExtreme hackathon. It monitors global threat domains in real-time using RSS feeds, cross-references them for cascading risks, and alerts stakeholders. 

**Key Innovation:** A **self-correcting reflection loop**. If the system’s "Validator" agent flags an analysis as unverified (using DuckDuckGo search), control returns to the "Analyst" agent with new evidence to try again.

### The 3 Sentry Modes (SDG Aligned)
- 🩺 **Epi-Sentry (SDG 3):** Disease outbreaks, public health emergencies.
- 🌪️ **Eco-Sentry (SDG 11/13):** Climate disasters, extreme weather.
- ♻️ **Supply-Sentry (SDG 12):** Supply chain disruptions, resource shortages.

---

## 📂 2. Project Structure
The project is divided into two main components: the Agent Engine (`Radio/`) and the Web Dashboard (`GlobalSentry-Web/`).

```text
HackExtreme/
├── Radio/                         ← The AI Agent Engine (Python)
│   ├── sentry.py                  ← Core LangGraph engine (9 nodes + graph wiring)
│   ├── ingest.py                  ← RSS polling daemon (triggers pipeline)
│   ├── seed_data.py               ← Pre-loads demo events into Qdrant
│   ├── user_profile.json          ← Stakeholder profile config
│   └── qdrant_data/               ← Local Qdrant vector database (auto-created)
│
├── GlobalSentry-Web/              ← Web Dashboard & API (Python + Vanilla JS)
│   ├── api.py                     ← FastAPI backend (imports & runs `Radio/sentry.py`)
│   └── frontend/                  ← Vanilla HTML/CSS/JS frontend
│       ├── index.html
│       ├── style.css
│       └── app.js
│
└── agent.md                       ← This file
```

---

## 🤖 3. The LangGraph Architecture
The core "brain" lives in `Radio/sentry.py`. It is a 9-node LangGraph pipeline:

1. **Profiler:** Relevance scorer.
2. **Triage (Agent A):** Fast YES/NO threat classifier to ignore noise.
3. **Retriever:** Qdrant RAG lookup for historical context.
4. **Analyst (Agent B):** Deep domain expert analysis (outputs severity 1-5 & confidence).
5. **Correlator:** Cross-mode "Neural Moat" to find cascading risks between modes.
6. **Validator (Agent C):** Fact-checks the analyst using DuckDuckGo.
7. **Retry Counter:** The reflection loop trigger (routes back to Analyst if unverified).
8. **Notify:** Telegram alert sender.
9. **Archiver:** Saves the final analyzed event into Qdrant to act as future RAG memory.

---

## 🛠️ 4. Tech Stack
- **AI/LLM:** Local `llama3` running via Ollama. No cloud APIs used.
- **Agent Orchestration:** `langgraph` / `langchain`.
- **Vector Database:** Local Qdrant (`qdrant_client`).
- **Embeddings:** `all-MiniLM-L6-v2` (`sentence-transformers`).
- **Backend API:** `FastAPI` + `Uvicorn` (`api.py`).
- **Frontend:** Vanilla HTML/JS + Chart.js.

---

## 🚀 5. How to Run the Project
If you need to test the project, follow these steps:

1. **Start Ollama** (must have `llama3` installed):
   ```bash
   ollama serve
   ```
2. **Setup Envs & Seed Data**:
   ```bash
   cd Radio
   pip install -r requirements.txt
   cp .env.template .env
   python seed_data.py
   ```
3. **Run the API / Web Dashboard**:
   ```bash
   cd GlobalSentry-Web
   pip install -r requirements.txt
   uvicorn api:app --reload --port 8000
   ```
   *The FastAPI app (`api.py`) runs an autonomous background loop every 20s to fetch RSS feeds and push them through the local LangGraph agent.*

4. **Access the UI**:
   Open `http://localhost:8000` in the browser.

---

## 📝 6. Notes for Future Agents
- **`api.py`** modifies the python path `sys.path.insert` to import the `sentry.py` agent from the `Radio` folder. Be careful if you refactor folder structures.
- **Local Everything:** Do not add requirements for paid APIs (like OpenAI) unless requested. The project is designed to run 100% locally.
- **Alerts storage:** Agent-processed alerts are written to `Radio/alerts.json` and read by the API.

Good luck!
