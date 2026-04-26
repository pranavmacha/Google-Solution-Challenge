# 🗺️ GlobalSentry — Hackathon Execution Plan

> **Goal:** Transform the existing Neural Sentry codebase into the full GlobalSentry multi-mode threat intelligence platform for the HackExtreme hackathon demo.

---

## 🏁 Phase Overview

```
Phase 1: Foundation Refactor  →  Phase 2: Mode Engine  →  Phase 3: Web Dashboard  →  Phase 4: Demo Polish
```

---

## Phase 1 — Foundation Refactor *(~2 hours)*

These are low-effort, high-impact changes to align the codebase with the GlobalSentry brand and architecture.

### 1.1 — Rename & Rebrand
- [ ] Rename `sentry.py` → `global_sentry.py`
- [ ] Rename the LangGraph app `sentry_app` → `global_sentry_app`
- [ ] Rename Qdrant collection `neural_sentry_memory` → `global_sentry_memory`
- [ ] Update `Readme.md` to reflect GlobalSentry branding and 3-mode concept

### 1.2 — Harden the Relevance Score Parser
- [ ] In `profiler_node()`, replace `float(response)` with a regex-based parser to prevent crashes on unexpected LLM output.
```python
import re
match = re.search(r'\d+\.?\d*', response)
relevance_score = float(match.group()) if match else 0.5
```

### 1.3 — Update `user_profile.json` Schema
- [ ] Replace the personal profile with a **stakeholder-focused** schema:
```json
{
  "stakeholder_type": "government_planner",
  "region_of_interest": "South Asia",
  "active_sentry_mode": "eco",
  "alert_threshold": 0.6
}
```
- [ ] Update `profiler_node()` to read the new fields.

### 1.4 — Add Confidence Score to State
- [ ] Add `severity_level: int` (1–5) and `confidence_score: float` to `AgentState`.
- [ ] Have `analyst_node()` output these fields in a structured format (e.g., last line of response: `SEVERITY: 4 | CONFIDENCE: 0.82`).

### 1.5 — SQLite Cleanup
- [ ] Add `cleanup_old_hashes()` in `ingest.py` to delete hashes older than 7 days, called at startup.

---

## Phase 2 — Multi-Mode Engine *(~3 hours)*

This is the core GlobalSentry feature — the 3-mode system that maps to the 3 SDG pillars.

### 2.1 — Add `sentry_mode` to Agent State
- [ ] Add `sentry_mode: Literal["epi", "eco", "supply"]` to `AgentState` in `global_sentry.py`.
- [ ] Pass `sentry_mode` from `ingest.py` when invoking the graph (read from profile or .env).

### 2.2 — Mode-Aware Triage Prompts
- [ ] Create a `TRIAGE_PROMPTS` dict and a `ANALYST_PROMPTS` dict keyed by mode:

**Triage Prompts:**
```python
TRIAGE_PROMPTS = {
    "epi":    "Is this news about a disease outbreak, epidemic, virus spread, or public health emergency? Reply ONLY YES or NO.",
    "eco":    "Is this news about climate disaster, extreme weather, flood, earthquake, wildfire, or ecological collapse? Reply ONLY YES or NO.",
    "supply": "Is this news about supply chain disruption, logistics failure, ESG violation, corporate fraud, or critical resource shortage? Reply ONLY YES or NO."
}
```

**Analyst Prompts:** Each prompt instructs the analyst to act as a domain expert (WHO epidemiologist, climate scientist, or supply chain auditor).

### 2.3 — Mode-Specific RSS Feed Sets
- [ ] In `.env.template`, define feed sets per mode:
```
EPI_FEEDS=https://www.who.int/rss-feeds/news-english.xml,https://promed.isid.org/rss/...
ECO_FEEDS=https://www.noaa.gov/rss,...
SUPPLY_FEEDS=https://feeds.reuters.com/reuters/businessNews,...
```
- [ ] In `ingest.py`, read the appropriate feed set based on the active mode.

### 2.4 — Cross-Mode Threat Correlator Node *(Neural Moat)*
- [ ] Add a new `correlator_node()` after `analyst_node()`:
  - Query Qdrant with the current event, **filtering for OTHER modes** (e.g., if current event is eco, check if there's a related epi or supply event in memory).
  - If a cross-mode correlation is found (similarity > 0.8), append a `CONVERGENCE WARNING` to the threat analysis.
- [ ] Add conditional edge: `analyst → correlator → validator`.

### 2.5 — Tag Qdrant Events with Mode
- [ ] In `archiver_node()`, store events with a `mode` metadata tag in Qdrant payload so correlator can filter cross-mode.

---

## Phase 3 — Web Dashboard *(~4 hours)*

A visual frontend is essential for demo impact. Build a minimal but polished dashboard.

### 3.1 — Choose Stack
- **Option A (Fast):** Plain HTML + Vanilla JS + a Python Flask/FastAPI backend serving a `/alerts` endpoint. Best for hackathon speed.
- **Option B (Polished):** Next.js React frontend + FastAPI backend. Best for judge impressiveness.
- **Recommendation:** Go with **Option A** for the demo unless you have extra time.

### 3.2 — Backend API (FastAPI)
- [ ] Create `api.py` with FastAPI.
- [ ] `GET /alerts` — returns last N alerts from Qdrant (with mode, severity, confidence, and timestamp).
- [ ] `POST /trigger` — manually trigger a sentry run with a custom headline (for live demo).
- [ ] `GET /status` — returns current mode, feed health, and last poll time.

### 3.3 — Frontend Dashboard
- [ ] **Header:** GlobalSentry logo + tagline: *"From watching to acting and remembering."*
- [ ] **Mode Toggle:** Three large buttons: 🩺 Epi-Sentry | 🌪️ Eco-Sentry | ♻️ Supply-Sentry. Clicking switches active mode.
- [ ] **Alert Feed:** Cards showing:
  - Threat headline
  - Mode badge (color-coded: red/amber/green)
  - Severity level (🔴🔴🔴🔴⚫ = 4/5)
  - Verified / Unverified badge
  - Timestamp
- [ ] **Cross-Mode Convergence Panel:** Highlighted box that lights up when the correlator fires a convergence warning.
- [ ] **Live Demo Input:** Text box + "Trigger Analysis" button to manually submit a headline.

### 3.4 — Telegram Alert Redesign
- [ ] Update `notify_node()` to format alerts with mode icon, severity indicator, confidence %, and a "View Dashboard" link.

---

## Phase 4 — Demo Polish *(~1 hour)*

### 4.1 — Preload Demo Data
- [ ] Pre-populate Qdrant with 10–15 realistic historical events (WHO outbreak report, NOAA storm alert, Reuters supply chain story) so the RAG Retriever always has something to find during the live demo.
- [ ] Create a `seed_data.py` script for this.

### 4.2 — Architecture Diagram
- [ ] Create `ARCHITECTURE.md` (rename `GEMINI.md`) with a clean ASCII or Mermaid flowchart of the LangGraph nodes matching the pitch deck slide.

### 4.3 — Demo Script
- [ ] Prepare 3 demo inputs (one per mode) that are guaranteed to trigger a VERIFIED alert:
  - **Epi:** "New respiratory illness cluster confirmed in Southeast Asia — WHO monitoring"
  - **Eco:** "Magnitude 7.1 earthquake strikes coastal Peru — tsunami watch issued"
  - **Supply:** "Major semiconductor factory shutting down amid ESG audit — chip shortage feared"

### 4.4 — `.env.template` Completion
- [ ] Add all new env vars: `SENTRY_MODE`, `EPI_FEEDS`, `ECO_FEEDS`, `SUPPLY_FEEDS`, `ALERT_THRESHOLD`, `DASHBOARD_URL`.

---

## 📅 Suggested Timeline

| Phase | Tasks | Time Estimate |
|---|---|---|
| Phase 1 | Foundation Refactor | 2 hrs |
| Phase 2 | Multi-Mode Engine | 3 hrs |
| Phase 3 | Web Dashboard | 4 hrs |
| Phase 4 | Demo Polish | 1 hr |
| **Total** | | **~10 hrs** |

---

## 📦 Final File Structure (Target)

```
Radio/
├── global_sentry.py       # Core LangGraph engine (renamed + upgraded)
├── ingest.py              # Mode-aware polling daemon (upgraded)
├── api.py                 # [NEW] FastAPI backend
├── seed_data.py           # [NEW] Pre-load demo data into Qdrant
├── user_profile.json      # Stakeholder-schema profile (updated)
├── requirements.txt       # Updated with fastapi, uvicorn
├── .env                   # With all new mode + feed vars
├── .env.template          # Updated template
├── ARCHITECTURE.md        # [NEW] LangGraph flowchart for judges
├── Readme.md              # Updated with GlobalSentry branding
├── qdrant_data/           # Local vector DB
├── frontend/              # [NEW] HTML dashboard (or Next.js)
│   ├── index.html
│   ├── style.css
│   └── app.js
├── docs/
└── tests/
```

---

## ⚠️ Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Gemini API rate limits during live demo | Pre-run all demo inputs beforehand, cache results in Qdrant |
| DuckDuckGo search rate limiting | Add 2-second sleep between validator calls; have mock results ready |
| Ollama too slow on hackathon machine | Default to Gemini Flash for all nodes during demo |
| Cross-mode correlator returns false positives | Set correlation similarity threshold to 0.85 (high bar) |
| Next.js setup takes too long | Fall back to plain HTML dashboard (Option A) |
