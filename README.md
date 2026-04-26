<div align="center">

# 🛡️ SupplySentry

**Real-time global threat detection across supply chain disruptions — powered by a self-correcting AI pipeline running 100% locally.**

[![Python](https://img.shields.io/badge/Python-3.11+-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![LangGraph](https://img.shields.io/badge/LangGraph-Agent_Orchestration-FF6F00?style=for-the-badge)](https://github.com/langchain-ai/langgraph)
[![Ollama](https://img.shields.io/badge/Ollama-Llama3_Local-000000?style=for-the-badge&logo=llama)](https://ollama.com)
[![Qdrant](https://img.shields.io/badge/Qdrant-Vector_DB-DC382D?style=for-the-badge)](https://qdrant.tech)

🏆 **Built for Google Solution Challenge** 🏆

[Architecture](#%EF%B8%8F-architecture) • [Features](#-key-features) • [Quick Start](#-quick-start) • [Tech Stack](#%EF%B8%8F-tech-stack) • [SDG Alignment](#-sdg-alignment)

</div>

---

## 🧠 What is SupplySentry?

SupplySentry is an **autonomous threat intelligence platform** that ingests live RSS feeds and news sources regarding global trade, runs them through a **9-node multi-agent AI pipeline**, and surfaces actionable alerts across the supply chain domain.

| Domain | SDG Focus | Example Threats |
|:---|:---:|:---|
| Supply Chain | SDG 12 | Port congestion, chip shortages, logistics disruptions, ESG violations |

> [!IMPORTANT]  
> **💡 Key Innovation: The Neural Moat**  
> SupplySentry's correlator detects **cascading logistical risks** that manual analysis might miss.  
> *Example: A minor port strike → triggers delayed raw material shipments → disrupts downstream manufacturing.*  
> This convergence detection is powered by vector similarity search in Qdrant, making it the platform's core differentiator.

---

## 🏗️ Architecture

```mermaid
graph TD
    A[📡 Supply Chain Feeds<br>Global Trade Data] -->|Ingest| B{🧠 9-Node LangGraph Pipeline}
    
    subgraph AI Pipeline
    B1(Profiler) --> B2(Triage)
    B2 --> B3(RAG Retriever)
    B3 --> B4(Analyst)
    B4 --> B5(Neural Moat Correlator)
    B5 --> B6(Fact-Check Validator)
    B6 -.->|Reflection Loop| B4
    B6 --> B7(Notify)
    B7 --> B8(Archiver)
    end
    
    B -->|Logs & Context| C[(Qdrant Vector DB<br>Historical Disruptions)]
    C -.->|RAG| B
    B -->|Saves| D[alerts.json]
    
    D --> E[⚡ FastAPI Backend]
    E --> F[🌐 Web Dashboard]
    E --> H[🌍 3D Threat Globe]
    E --> I[🎞️ Conveyor Viewer]
```

### The 9-Node Pipeline

| # | Node | Role | Details |
|---|------|------|---------|
| 1 | Profiler | Relevance scoring | Scores news against stakeholder profile (logistics managers, auditors). |
| 2 | Triage | Threat classifier | Supply-chain-aware YES/NO filter — drops irrelevant noise fast. |
| 3 | Retriever | RAG context | Queries Qdrant for historical supply chain events. |
| 4 | Analyst | Deep analysis | Domain expert analysis — outputs severity (1–5) + confidence (0–1). |
| 5 | Correlator | 🧠 Neural Moat | Vector search — finds cascading supply chain risks and logistics correlations. |
| 6 | Validator | Fact-checker | Verifies claims via live DuckDuckGo search. |
| 7 | Retry Counter | Reflection loop | If unverified, routes back to Analyst with new evidence (max 1 retry). |
| 8 | Notify | Alert dispatcher | Saves structured alert to alerts.json for the web dashboard. |
| 9 | Archiver | Memory builder | Stores event + metadata in Qdrant for future RAG. |

---

## ✨ Key Features
- **🤖 Autonomous Scanning**: Background loop continuously ingests RSS feeds and runs them through the AI pipeline.
- **🧠 Logistics Correlation**: Neural Moat detects cascading risks within complex supply networks.
- **🔄 Self-Correcting Reflection Loop**: Validator can reject an analysis and send it back to the Analyst with new evidence.
- **🌍 3D Threat Globe**: Interactive Three.js globe showing geo-located supply chain disruptions with severity-colored markers.
- **🎞️ Live Conveyor View**: Real-time pipeline visualization showing each headline flowing through AI nodes.
- **🔒 100% Local**: Runs entirely on local hardware — Ollama (Llama 3), local embeddings, local Qdrant — zero cloud APIs.

---

## 🚀 Quick Start

> [!NOTE]
> Prerequisites: Make sure you have Python 3.11+ and Ollama (with Llama 3) installed.

### 1. Start Ollama
```bash
ollama pull llama3
ollama serve
```

### 2. Setup the Agent Engine
```bash
cd Radio
pip install -r requirements.txt
cp .env.template .env # Edit if needed
python seed_data.py   # Seeds demo supply chain events into Qdrant
```

### 3. Start the Web Dashboard
```bash
cd GlobalSentry-Web
pip install -r requirements.txt
uvicorn api:app --port 8000
```

### 4. Access the Platform
- 🌐 Dashboard: http://localhost:8000
- 🌍 3D Globe: http://localhost:8000/globe.html
- 🎞️ Conveyor: http://localhost:8000/conveyor.html
- 📄 API Docs: http://localhost:8000/api/docs

---

## 🖼️ Gallery
*(Replace the placeholder links below with actual paths to your screenshots, e.g., ./docs/dashboard.png)*
<div align="center">
<img src="https://via.placeholder.com/400x250?text=Web+Dashboard" width="32%" alt="Dashboard" />
<img src="https://via.placeholder.com/400x250?text=3D+Threat+Globe" width="32%" alt="3D Globe" />
<img src="https://via.placeholder.com/400x250?text=Pipeline+Conveyor" width="32%" alt="Conveyor" />
</div>

---

## 🛠️ Tech Stack

| Layer | Technology | Why We Chose It |
|-------|------------|-----------------|
| LLM | Ollama + Llama 3 | 100% local, no API keys, fast inference. |
| Agent Orchestration | LangGraph + LangChain | Stateful multi-agent DAG with conditional routing. |
| Vector Database | Qdrant (local) | Cosine similarity search, disruption correlation. |
| Embeddings | all-MiniLM-L6-v2 | Local sentence embeddings (384 dim), completely offline. |
| Backend API | FastAPI + Uvicorn | Async, auto-docs, serves both API and static frontend. |
| Web Frontend | Vanilla HTML/CSS/JS | Lightweight, no build step, glassmorphism dark theme. |
| 3D Globe | Three.js + WebGL | Interactive geo-visualization of supply routes and threats. |
| Web Search | DuckDuckGo (DDGS) | Free, no API key — used by Validator for fact-checking. |

---

## 🌍 SDG Alignment
SupplySentry directly addresses key UN Sustainable Development Goals:
- ♻️ **SDG 12 (Responsible Consumption and Production)**: SupplySentry tracks supply chain disruptions and logistics vulnerabilities to ensure resilient and responsible global trade networks. By providing early warnings, it minimizes waste caused by logistics failures and promotes transparent, sustainable supply chains.

<br>
<div align="center">
<p>Built with ❤️ for <b>Google Solution Challenge</b>.</p>
<p><i>Because global trade shouldn't break without warning.</i></p>
</div>
