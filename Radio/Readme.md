# 🛡️ GlobalSentry

**GlobalSentry** is a unified, multi-agent RAG threat intelligence platform — built for the HackExtreme hackathon.

It monitors three global threat domains in real-time, cross-references them for cascading risks via the **Neural Moat**, and alerts stakeholders before crises hit mainstream news. The system features a **self-correcting reflection loop** — when the Validator flags an analysis as unverified, control returns to the Analyst with new evidence, making the pipeline genuinely agentic.

> *"From watching, to acting, to remembering."*

---

## 🧠 Architecture — 9-Node LangGraph Pipeline

```
1. profiler       → Relevance scorer (The Personalizer)
2. triage         → Fast YES/NO threat classifier (Agent A)
3. retriever      → Qdrant same-mode RAG lookup (The Historian)
4. analyst        → Deep domain expert analysis (Agent B)
5. correlator     → 🧠 Cross-mode Neural Moat (The Connector)
6. validator      → DuckDuckGo fact-checker (Agent C)
7. retry_counter  → 🔁 Reflection loop trigger (sends unverified back to analyst)
8. notify         → Telegram alert sender (The Messenger)
9. archiver       → Qdrant storage with mode + severity metadata (The Memory)
```

### Routing Logic

```
triage   ──[no threat]──────────────────────────────────────▶ archiver
         ──[threat]──▶ retriever → analyst → correlator → validator
                                                              │
                                              ┌──[verified]──▶ notify → archiver
                                              ├──[unverified, retry=0]──▶ retry_counter → analyst (reflection)
                                              └──[unverified, retry=1]──▶ archiver
```

### Node Reference

| # | Node | Agent | Key Output |
|---|---|---|---|
| 1 | Profiler | Triage LLM | `relevance_score` |
| 2 | Triage | Agent A | `is_threat` (YES/NO gate) |
| 3 | Retriever | Qdrant | `context[]` (same-mode historical events) |
| 4 | **Analyst** | Agent B | `threat_analysis`, `severity_level` (1–5), `confidence_score` |
| 5 | **Correlator** | Qdrant cross-mode | `convergence_warning` ⚠️ (Neural Moat) |
| 6 | Validator | Agent C + DDG | `is_verified`, `verification_results` |
| 7 | Retry Counter | — | `retry_count += 1` → loops back to Analyst |
| 8 | Notify | Telegram API | Alert sent to stakeholder |
| 9 | Archiver | Qdrant | Stored with `mode` + `severity` metadata |

---

## 🌍 Three Sentry Modes (SDG Aligned)

| Mode | SDG | Focus |
|---|---|---|
| 🩺 **Epi-Sentry** | SDG 3 | Disease outbreaks, epidemics, public health emergencies |
| 🌪️ **Eco-Sentry** | SDG 11 / 13 | Climate disasters, extreme weather, ecological collapse |
| ♻️ **Supply-Sentry** | SDG 12 | Supply chain disruptions, ESG violations, resource shortages |

---

## 🔁 Reflection Loop (Self-Correcting Agents)

What makes GlobalSentry **genuinely agentic** (not just a pipeline):

1. **Validator says UNVERIFIED** → Instead of silently archiving...
2. **Retry Counter** bumps `retry_count` and routes back to the **Analyst**
3. **Analyst receives** the Validator's DuckDuckGo search results as new context
4. **Analyst revises** its analysis — lowering severity if evidence contradicts, maintaining if it confirms
5. Events go through **correlator → validator** again with the revised analysis
6. After **1 retry**, unverified events are archived silently (no infinite loops)

---

## 📂 Project Structure

```
HackExtreme/
├── Radio/                         ← Agent Engine (this folder)
│   ├── sentry.py                  ← Core LangGraph engine — all 9 nodes + graph wiring
│   ├── ingest.py                  ← Mode-aware RSS polling daemon — triggers pipeline
│   ├── seed_data.py               ← Pre-loads 18 demo events into Qdrant
│   ├── user_profile.json          ← Stakeholder profile (role, region, mode, threshold)
│   ├── requirements.txt           ← Python dependencies
│   ├── .env.template              ← Environment config template
│   └── qdrant_data/               ← Local Qdrant vector database (auto-created)
│
├── GlobalSentry-Web/              ← Web Dashboard + API
│   ├── api.py                     ← FastAPI backend — imports & runs the real agent
│   ├── requirements.txt           ← Web + agent dependencies
│   └── frontend/
│       ├── index.html             ← Dashboard UI
│       ├── style.css              ← Styling
│       └── app.js                 ← Frontend logic + 9-node pipeline visualizer
│
└── GlobalSentry_PitchSlideDeck.md ← Hackathon pitch deck
```

---

## 🚀 Setup

### Prerequisites
- Python 3.9+
- [Ollama](https://ollama.ai/) running locally with a model pulled (e.g. `llama3`)
- Telegram Bot token (optional, for alerts)

### 1. Pull Ollama model
```bash
ollama pull llama3
ollama serve
```

### 2. Install dependencies
```bash
# Agent engine
cd Radio
pip install -r requirements.txt

# Web dashboard (same venv is fine)
cd ../GlobalSentry-Web
pip install -r requirements.txt
```

### 3. Configure environment
```bash
cd Radio
cp .env.template .env
# Edit .env — set SENTRY_MODE, RSS feeds, Telegram token
```

### 4. Customise stakeholder profile
Edit `Radio/user_profile.json`:
```json
{
  "stakeholder_type": "government_planner",
  "region_of_interest": "South Asia",
  "active_sentry_mode": "eco",
  "alert_threshold": 0.5
}
```

**Stakeholder types:** `government_planner`, `health_ngo`, `supply_chain_auditor`, `journalist`, `first_responder`, `researcher`

### 5. Seed demo data (run once)
```bash
cd Radio
python seed_data.py
```

### 6. Run the monitoring daemon
```bash
cd Radio
python ingest.py
```

### 7. Run the Web Dashboard
```bash
cd GlobalSentry-Web
uvicorn api:app --reload --port 8000
```
Open `http://localhost:8000` — the dashboard auto-detects whether the agent is available (`🟢 LIVE AGENT` vs `🟡 MOCK`).

---

## 🎮 Demo Inputs (Hackathon)

Use these headlines to trigger the full pipeline during the live demo:

| Mode | Headline |
|---|---|
| 🩺 Epi | `New respiratory illness cluster confirmed in Southeast Asia — WHO monitoring` |
| 🌪️ Eco | `Magnitude 7.1 earthquake strikes coastal Peru — tsunami watch issued` |
| ♻️ Supply | `Major semiconductor factory halts operations — global chip shortage feared` |

---

## ⚙️ Tech Stack

GlobalSentry runs **100% locally** — no cloud AI costs:

| Component | Default | Config |
|---|---|---|
| LLM (all agents) | `llama3` via Ollama | `OLLAMA_MODEL` in `.env` |
| Embeddings | `all-MiniLM-L6-v2` (sentence-transformers) | `EMBEDDING_MODEL` in `.env` |
| Vector DB | Qdrant (local file) | `./qdrant_data/` |
| Web Framework | FastAPI + Uvicorn | `GlobalSentry-Web/api.py` |
| Frontend | Vanilla HTML/CSS/JS + Chart.js | `GlobalSentry-Web/frontend/` |
| Graph Engine | LangGraph (LangChain) | `Radio/sentry.py` |
| Search/Validation | DuckDuckGo (no API key needed) | Built into Validator node |

---

## 🏗️ What Makes This Different

| Feature | Description |
|---|---|
| **Multi-Agent** | 9 specialized LangGraph nodes, not a single monolithic prompt |
| **Neural Moat** | Cross-mode correlation catches threats that single-domain systems miss |
| **Reflection Loop** | Self-correcting — validator can send control back to analyst with new evidence |
| **RAG Memory** | Every event is archived and used as context for future analysis |
| **Mode-Aware** | Each sentry mode has its own prompts, RSS feeds, and triage logic |
| **Stakeholder Profiles** | Results are personalised to the user's role and region |
| **Fully Local** | Runs on Ollama — no API keys, no cloud costs, no data leaving your machine |
