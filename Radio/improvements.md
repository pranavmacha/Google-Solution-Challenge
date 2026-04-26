# 🔍 GlobalSentry — Code Alignment & Improvement Analysis

---

## ✅ How the Existing Code Already Aligns with GlobalSentry

The **Radio / Neural Sentry** codebase is a near-perfect foundation for GlobalSentry. The architecture is almost 1:1 with the pitch deck.

| GlobalSentry Pitch Concept | Existing Code | Status |
|---|---|---|
| **Ingest & Profiler** node | `ingest.py` (RSS polling + dedup) + `profiler_node()` in `sentry.py` | ✅ Already exists |
| **Retriever** (The Historian) | `retriever_node()` with Qdrant vector DB | ✅ Already exists |
| **Agent A — Triage** (The Sentry) | `triage_node()` using Gemini Flash | ✅ Already exists |
| **Agent B — Analyst** (The Brain) | `analyst_node()` using Gemini Pro | ✅ Already exists |
| **Agent C — Validator** (Fact-Checker) | `validator_node()` using DuckDuckGo search | ✅ Already exists |
| **Notify & Archive** | `notify_node()` (Telegram) + `archiver_node()` (Qdrant) | ✅ Already exists |
| **LangGraph orchestration** | Full LangGraph `StateGraph` with conditional routing | ✅ Already exists |
| **Local LLM via Ollama** | `get_llm()` supports Ollama with fallback | ✅ Already exists |
| **Multi-provider LLM** | Gemini / Grok / Ollama support | ✅ Already exists |

**Conclusion:** This code IS the GlobalSentry engine — it just needs to be rebranded, extended to 3 Sentry Modes, and given a web frontend.

---

## 🚨 Critical Issues (Must Fix for Demo)

### 1. No Sentry Mode Switching
**Problem:** The current system has a single generic "threat" focus. GlobalSentry needs 3 distinct modes:
- 🩺 **Epi-Sentry** — Health/epidemic monitoring (WHO, ProMED RSS feeds)
- 🌪️ **Eco-Sentry** — Climate/disaster monitoring (NOAA, USGS, Copernicus feeds)
- ♻️ **Supply-Sentry** — ESG/supply chain alerts (Reuters, SEC, whistleblower feeds)

**Fix:** Add a `sentry_mode` field to `AgentState` and `user_profile.json`. Each mode gets its own triage prompt, set of RSS feeds, and alert formatting.

---

### 2. Triage Prompt is Too Generic
**Problem:** The triage prompt only checks for "physical threats to life or safety" — it will MISS epidemics, supply chain failures, and ESG violations entirely.

**Fix:** Make the triage prompt mode-aware:
```python
TRIAGE_PROMPTS = {
    "epi": "Is this news related to a new disease outbreak, epidemic, or public health emergency?",
    "eco": "Is this news related to climate disaster, extreme weather, flood, earthquake, or ecological threat?",
    "supply": "Is this news related to supply chain disruption, ESG violation, corporate fraud, or resource shortage?"
}
```

---

### 3. Analyst Prompt Has No Global / Cross-Domain Context
**Problem:** The analyst acts as a "personal safety" advisor. GlobalSentry's "Neural Moat" should detect **converging threats** (e.g. flood → supply chain → food scarcity).

**Fix:** Upgrade the analyst prompt to cross-reference modes and historical patterns:
```
"Cross-reference this event with historical patterns. Could this event cascade into another domain (health → supply, climate → epidemic)?"
```

---

### 4. No Web Frontend / Dashboard
**Problem:** The pitch promises a `React / Next.js` web dashboard. Currently the system only runs in the terminal with Telegram alerts.

**Fix:** Build a minimal Next.js or plain HTML dashboard with:
- Mode toggle (Epi / Eco / Supply)
- Live feed of processed alerts
- Threat risk card with confidence score
- Verified / Unverified badge

---

### 5. user_profile.json is Too Personal/Narrow
**Problem:** The profile is tuned for a "Security Researcher in New York" — not for GlobalSentry's target audience (governments, NGOs, supply chain auditors).

**Fix:** Change the profile schema to support **stakeholder type** and **region of interest**:
```json
{
  "stakeholder": "government_planner",
  "region": "South Asia",
  "sentry_mode": "eco",
  "alert_threshold": 0.6
}
```

---

### 6. No Cross-Sentry Threat Correlation (The Core "Neural Moat")
**Problem:** This is the key differentiator in the pitch — the ability to **cross-reference threats across modes**. Currently, each news item is processed in total isolation.

**Fix:** After analysis, store events with a `mode` tag in Qdrant. The Retriever should query across modes to surface cross-domain correlations. A new `correlator_node` can flag when an event in one mode echoes patterns from another.

---

## 🟡 Improvements (Nice to Have for Demo Polish)

### 7. Replace `ingestion_history.db` with Timestamps
The current SQLite DB keeps hashes forever with no expiry. Old hashes accumulate. Add a `cleanup_old_hashes()` that removes entries older than 7 days to keep the DB lean.

### 8. Relevance Score is a Float from LLM — Fragile
`float(response)` on raw LLM output will crash if the model returns "0.75 (high relevance)". Wrap with a robust parser:
```python
import re
match = re.search(r'\d+\.?\d*', response)
relevance_score = float(match.group()) if match else 0.5
```

### 9. Telegram Alert Format is Too Noisy
The current alert dumps raw text. For a hackathon demo, format it with:
- 🚨 Mode icon (🩺/🌪️/♻️)
- Threat level indicator (🔴 Critical / 🟠 High / 🟡 Medium)
- Short summary + "View Dashboard" link

### 10. No Confidence Score in Output State
The analyst produces a text analysis but no structured **confidence score** or **severity level** (1–5). Add this to `AgentState` and use it to drive notification thresholds and dashboard UI coloring.

### 11. Ollama Setup is Under-documented
The `.env.template` mentions Ollama but there are no instructions for pulling models. For a hackathon, add a `setup.sh` or note in README: `ollama pull llama3`.

### 12. GEMINI.md Should Become GlobalSentry Architecture Doc
The existing `GEMINI.md` has development context. Rename/repurpose this as a proper `ARCHITECTURE.md` explaining the LangGraph flow visually for judges.

---

## 📊 Summary Table

| Priority | Issue | Effort | Impact |
|---|---|---|---|
| 🔴 Critical | Sentry Mode switching | Medium | Very High |
| 🔴 Critical | Mode-aware triage prompts | Low | Very High |
| 🔴 Critical | Web Dashboard (even basic) | High | Very High |
| 🔴 Critical | Cross-mode threat correlation | Medium | High |
| 🟠 High | Stakeholder profile schema | Low | High |
| 🟠 High | Analyst cross-domain prompt upgrade | Low | High |
| 🟡 Medium | Telegram alert formatting | Low | Medium |
| 🟡 Medium | Confidence score in output state | Low | Medium |
| 🟡 Medium | Relevance score parser hardening | Low | Low |
| 🟢 Low | SQLite hash expiry cleanup | Low | Low |
| 🟢 Low | Ollama setup docs | Very Low | Low |
| 🟢 Low | GEMINI.md → ARCHITECTURE.md | Very Low | Medium |
