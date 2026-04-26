# 🧭 SupplySentry Codebase Guide

Welcome to the **SupplySentry** codebase! This document serves as a comprehensive map for any developer, contributor, or AI agent looking to understand the project structure, components, and data flow.

---

## 🏗️ High-Level Architecture

SupplySentry is built as a **decoupled, event-driven platform**. It consists of three primary layers:
1. **The Intelligence Engine (`/Radio`)**: A Python-based, local AI pipeline using LangGraph, Ollama, and Qdrant to ingest, analyze, and correlate supply chain threats.
2. **The Web Backend (`/GlobalSentry-Web`)**: A FastAPI application that serves the frontend, exposes APIs for the dashboard, and triggers autonomous or manual intelligence runs.
3. **The Web Frontend (`/GlobalSentry-Web/frontend`)**: A pure HTML/CSS/JS frontend featuring dashboards, real-time visualizers (conveyor), and a 3D threat globe.

> **Note:** The repository previously housed multi-domain logic (Epidemics, Climate, Supply Chain) under the "GlobalSentry" name but was surgically refactored into "SupplySentry" specifically for the Google Solution Challenge, focusing entirely on **SDG 12 (Responsible Consumption and Production)**.

---

## 📂 Directory Structure Breakdown

### 1. `/GlobalSentry-Web` (Backend & Frontend)
This directory contains the user-facing platform.

#### Backend (`api.py`)
- **`api.py`**: The core FastAPI application. 
  - **Routes**: Serves static files, provides API endpoints (`/api/stats`, `/api/alerts`, `/api/convergence`) for the frontend to poll.
  - **Autonomous Loop**: Contains an `asyncio` background task that continuously polls for new supply chain alerts by executing the AI pipeline in the `/Radio` directory.
  - **Cross-Process Execution**: Uses `subprocess.run` to trigger the heavy LangGraph AI pipeline as a separate process, preventing the web server from blocking.

#### Frontend (`/frontend`)
The UI relies on vanilla web technologies for speed and simplicity.
- **`index.html` & `app.js`**: The main dashboard. Contains key metrics, active threat feeds, and Chart.js analytics for supply chain vulnerabilities.
- **`globe.html`**: A 3D interactive globe built with Three.js. It visualizes geo-located supply chain disruptions worldwide with color-coded severity markers.
- **`conveyor.html` & `conveyor.js`**: A unique, real-time pipeline visualization that shows the user exactly how the AI is processing current headlines (from Profiling to Analyst to Fact-Checking).
- **`style.css`**: The global stylesheet. Utilizes a glassmorphism dark theme with a specific "supply-green" color palette (`--mode-color: #10b981`).

#### Utilities
- **`generate_supply_feed.py`**: A developer utility that generates mock RSS XML feeds simulating supply chain disruptions for testing the AI pipeline without relying on live news.
- **`supply_feed.xml`**: The generated mock data feed.

---

### 2. `/Radio` (The AI Intelligence Engine)
This is the brain of SupplySentry. It operates entirely locally (no external cloud APIs) to ensure privacy and zero-cost scaling.

- **`sentry.py`**: The heart of the intelligence engine. This file defines the **9-node LangGraph pipeline**. 
  - **Nodes include**: Profiler, Triage, RAG Retriever, Analyst, Neural Moat Correlator, Fact-Check Validator, Notify, and Archiver.
  - **Logic**: It orchestrates how an incoming headline is processed. For example, if a headline is triaged as a real threat, the Analyst evaluates it, and the Validator fact-checks it using DuckDuckGo search. If fact-checking fails, it routes back to the Analyst (Reflection loop).
- **`alerts.json`**: The output file. When the pipeline successfully verifies a threat, it writes structured JSON to this file. The FastAPI backend (`api.py`) constantly reads this file to update the web dashboard.
- **`seed_data.py`**: Utility to seed the local Qdrant vector database with historical supply chain events.
- **`user_profile.json`**: Defines the "stakeholder" context (e.g., Logistics Manager) which the Profiler node uses to score the relevance of incoming news.
- **`/qdrant_data`**: Local persistence folder for the Qdrant Vector Database. This database stores historical events to provide the RAG Retriever and Neural Moat Correlator with context to find cascading logistical risks.

---

### 3. Root Level Files
- **`GlobalSentry_PitchSlideDeck.md`**: The official pitch deck outline mapped for the Google Solution Challenge presentation.
- **`README.md`**: The primary entry point documentation with setup instructions and architectural overviews.

---

## 🔄 The Data Flow Lifecycle
If you are debugging or adding a feature, follow how data moves through the system:

1. **Ingestion**: The `autonomous_agent_loop` in `api.py` kicks off the process by polling `supply_feed.xml` or live RSS feeds.
2. **Execution**: `api.py` spawns a subprocess running `Radio/sentry.py` with a specific headline.
3. **Analysis**: Inside `sentry.py`, the LangGraph pipeline is instantiated. The local Ollama LLM (Llama 3) processes the headline through the 9 specialized agent nodes.
4. **Storage & Notification**: If deemed a valid threat, the pipeline saves the event to Qdrant (for future memory) and appends it to `Radio/alerts.json`.
5. **Consumption**: The frontend (`app.js` or `globe.html`) polls the FastAPI endpoint `/api/alerts`, which serves the contents of `alerts.json`. The UI then dynamically updates the DOM and 3D visualizations.

---

## 🛠️ Key Technologies to Know
- **LangGraph**: Used in `/Radio/sentry.py` for stateful agent orchestration.
- **FastAPI**: Used in `api.py` for asynchronous web serving.
- **Ollama**: Used for local LLM inference.
- **Qdrant**: Used for vector embeddings and similarity search (Neural Moat).
- **Three.js**: Used in `globe.html` for 3D rendering.

---

## 📝 Tips for AI Agents & Developers
- **Modifying the UI**: All frontend logic is deeply decoupled from the AI pipeline. To change how threats are displayed, modify `app.js` or `globe.html`.
- **Modifying AI Logic**: To change how threats are analyzed, scored, or fact-checked, modify the specific node functions within `Radio/sentry.py`.
- **Refactoring Note**: The codebase previously supported multi-domain analysis. You may see legacy variables named `mode` (e.g., in `api.py`). These are now hardcoded or defaulted to `"supply"` to ensure strict focus on the Google Solution Challenge SDG 12 objective. Do not attempt to re-enable `epi` or `eco` modes.
