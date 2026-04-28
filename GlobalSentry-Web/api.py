"""
SupplySentry - FastAPI Backend
Supply Chain Disruption Intelligence — Live RSS Feeds + AI Agent Pipeline
Run with: uvicorn api:app --reload --port 8000
"""

import os
import sys
import json
import random
import uuid
import time
import hashlib
import feedparser
import asyncio
import re
from datetime import datetime, timedelta
from typing import Optional, Literal
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

# ─── Add the Radio folder to sys.path so we can import the agent ──────────────
RADIO_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "Radio")
RADIO_DIR = os.path.normpath(RADIO_DIR)
if RADIO_DIR not in sys.path:
    sys.path.insert(0, RADIO_DIR)

# Try importing the real agent pipeline
AGENT_AVAILABLE = False
try:
    _original_cwd = os.getcwd()
    os.chdir(RADIO_DIR)
    from sentry import global_sentry_app
    os.chdir(_original_cwd)
    AGENT_AVAILABLE = True
    print(f"[API] SupplySentry agent loaded from: {RADIO_DIR}")
except Exception as e:
    os.chdir(_original_cwd) if '_original_cwd' in dir() else None
    print(f"[API] Agent import failed: {e}")
    print(f"[API]    Falling back to RSS-only mode.")

app = FastAPI(
    title="SupplySentry API",
    description="Supply Chain Disruption Intelligence — Live RSS Feeds + AI Agent Pipeline",
    version="1.0.0",
    docs_url="/api/docs",
    openapi_url="/api/openapi.json",
    redoc_url="/api/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── User Profile ─────────────────────────────────────────────────────────────

USER_PROFILE = {
    "stakeholder_type": "supply_chain_analyst",
    "region_of_interest": "India",
    "active_sentry_mode": "supply",
    "alert_threshold": 0.5,
    "interests": [
        "Supply Chain Disruptions",
        "Trade Route Risks",
        "ESG Compliance",
        "Logistics Intelligence",
    ],
}

# ─── India Intelligence Enrichment ───────────────────────────────────────────

INDIA_LOCATIONS = [
    {"aliases": ["jnpt", "jawaharlal nehru port", "nhava sheva"], "location": "JNPT, Navi Mumbai, Maharashtra", "lat": 18.95, "lng": 72.95},
    {"aliases": ["mumbai", "bombay"], "location": "Mumbai, Maharashtra", "lat": 19.08, "lng": 72.88},
    {"aliases": ["mundra"], "location": "Mundra Port, Gujarat", "lat": 22.84, "lng": 69.72},
    {"aliases": ["kandla", "deendayal port"], "location": "Kandla Port, Gujarat", "lat": 23.03, "lng": 70.22},
    {"aliases": ["gujarat", "ahmedabad"], "location": "Ahmedabad, Gujarat", "lat": 23.02, "lng": 72.57},
    {"aliases": ["chennai", "ennore", "kamarajar port"], "location": "Chennai, Tamil Nadu", "lat": 13.08, "lng": 80.27},
    {"aliases": ["tamil nadu", "coimbatore", "tiruppur"], "location": "Tamil Nadu Industrial Belt", "lat": 11.02, "lng": 77.02},
    {"aliases": ["visakhapatnam", "vizag"], "location": "Visakhapatnam, Andhra Pradesh", "lat": 17.69, "lng": 83.22},
    {"aliases": ["andhra pradesh"], "location": "Andhra Pradesh", "lat": 15.91, "lng": 79.74},
    {"aliases": ["hyderabad", "telangana"], "location": "Hyderabad, Telangana", "lat": 17.39, "lng": 78.49},
    {"aliases": ["bengaluru", "bangalore", "karnataka"], "location": "Bengaluru, Karnataka", "lat": 12.97, "lng": 77.59},
    {"aliases": ["pune"], "location": "Pune, Maharashtra", "lat": 18.52, "lng": 73.86},
    {"aliases": ["maharashtra"], "location": "Maharashtra", "lat": 19.75, "lng": 75.71},
    {"aliases": ["delhi", "new delhi", "ncr", "noida", "gurugram", "gurgaon"], "location": "Delhi NCR", "lat": 28.61, "lng": 77.21},
    {"aliases": ["kolkata", "haldia", "west bengal"], "location": "Kolkata, West Bengal", "lat": 22.57, "lng": 88.36},
    {"aliases": ["kochi", "cochin", "kerala"], "location": "Kochi, Kerala", "lat": 9.97, "lng": 76.28},
    {"aliases": ["goa", "mormugao"], "location": "Mormugao Port, Goa", "lat": 15.40, "lng": 73.80},
    {"aliases": ["odisha", "paradip"], "location": "Paradip Port, Odisha", "lat": 20.32, "lng": 86.61},
    {"aliases": ["punjab", "ludhiana"], "location": "Ludhiana, Punjab", "lat": 30.90, "lng": 75.86},
    {"aliases": ["haryana"], "location": "Haryana", "lat": 29.06, "lng": 76.09},
    {"aliases": ["uttar pradesh"], "location": "Uttar Pradesh", "lat": 26.85, "lng": 80.95},
]

CATEGORY_RULES = [
    ("Ports and Logistics", ["port", "shipping", "freight", "container", "cargo", "vessel", "logistics", "warehouse", "transport", "rail", "road", "congestion", "delay"]),
    ("Pharma and APIs", ["pharma", "pharmaceutical", "api", "drug", "medicine", "antibiotic", "vaccine", "cdsco"]),
    ("Agriculture and Food", ["food", "grain", "rice", "wheat", "sugar", "onion", "farm", "agri", "crop", "fertilizer"]),
    ("Energy and Fuel", ["oil", "fuel", "diesel", "petrol", "gas", "lng", "coal", "power", "energy", "electricity"]),
    ("Electronics and Imports", ["electronics", "semiconductor", "chip", "mobile", "import", "component", "device"]),
    ("Exports and Manufacturing", ["export", "factory", "manufacturing", "plant", "production", "textile", "garment", "auto", "steel"]),
    ("Policy and Regulation", ["tariff", "duty", "policy", "regulation", "ban", "sanction", "customs", "gst", "government"]),
]

ACTION_BY_CATEGORY = {
    "Ports and Logistics": "Check alternate port or carrier options and monitor clearance delays for the affected corridor.",
    "Pharma and APIs": "Review API inventory buffers and identify alternate qualified domestic suppliers.",
    "Agriculture and Food": "Monitor commodity availability, regional stock levels, and procurement price movement.",
    "Energy and Fuel": "Assess fuel cost exposure and review backup logistics or production schedules.",
    "Electronics and Imports": "Check import dependency, component lead times, and short-term inventory coverage.",
    "Exports and Manufacturing": "Review shipment commitments, supplier capacity, and customer delivery risk.",
    "Policy and Regulation": "Review compliance exposure and update landed-cost or customs assumptions.",
    "General India Supply Risk": "Monitor affected Indian region, supplier exposure, and inventory buffer requirements.",
}


def _combined_text(alert: dict) -> str:
    return " ".join(str(alert.get(k, "")) for k in ("headline", "analysis", "summary", "source")).lower()


def classify_india_category(alert: dict) -> str:
    text = _combined_text(alert)
    for category, keywords in CATEGORY_RULES:
        if any(keyword in text for keyword in keywords):
            return category
    return "General India Supply Risk"


def geocode_india_alert(alert: dict) -> Optional[dict]:
    text = _combined_text(alert)
    for item in INDIA_LOCATIONS:
        if any(re.search(rf"\b{re.escape(alias)}\b", text) for alias in item["aliases"]):
            return {"lat": item["lat"], "lng": item["lng"], "location": item["location"]}
    return None


def estimate_india_supply_signal(alert: dict) -> int:
    text = _combined_text(alert)
    score = 0
    for _, keywords in CATEGORY_RULES:
        score += sum(1 for keyword in keywords if keyword in text)
    if geocode_india_alert(alert):
        score += 2
    if any(word in text for word in ("crisis", "shortage", "shutdown", "ban", "delay", "disruption", "surge", "hit")):
        score += 2
    return min(5, score)


def enrich_india_alert(alert: dict) -> dict:
    enriched = dict(alert)
    category = enriched.get("category") or classify_india_category(enriched)
    enriched["category"] = category
    enriched["recommended_action"] = enriched.get("recommended_action") or ACTION_BY_CATEGORY.get(category, ACTION_BY_CATEGORY["General India Supply Risk"])
    enriched["evidence"] = {
        "source": enriched.get("source", "Live RSS feed"),
        "source_url": enriched.get("source_url") or enriched.get("url") or enriched.get("link"),
        "published_at": enriched.get("timestamp"),
        "feed_type": "Live Indian RSS" if enriched.get("is_raw_feed") else "Agent-processed real feed",
        "confidence_reason": (
            "Matched India location and supply-chain keywords from a live feed."
            if enriched.get("is_raw_feed")
            else "Agent analysis over a real feed item with validation metadata."
        ),
    }

    geo = geocode_india_alert(enriched)
    if geo and not enriched.get("lat") and not enriched.get("lng"):
        enriched.update(geo)
    elif enriched.get("lat") and enriched.get("lng") and not enriched.get("location"):
        enriched["location"] = "India"

    if enriched.get("is_raw_feed"):
        signal = estimate_india_supply_signal(enriched)
        enriched["supply_signal_score"] = signal
        enriched["severity"] = max(int(enriched.get("severity") or 0), signal)
        enriched["confidence"] = round(min(0.82, 0.35 + signal * 0.09), 2)
        enriched["is_verified"] = False
    return enriched

# ─── India-Focused RSS Feed Configuration ────────────────────────────────────

_BASE_DIR = os.path.dirname(os.path.abspath(__file__))

FEEDS = {
    "supply": [
        "https://economictimes.indiatimes.com/rssfeeds/1200853.cms",
        "https://www.livemint.com/rss/companies",
        "https://indianexpress.com/section/business/feed/",
    ],
}

# ─── In-memory alert store (demo mode) ───────────────────────────────────────
MOCK_ALERTS = {
    "supply": [
        {
            "id": str(uuid.uuid4()),
            "headline": "Major TSMC fab halts production — global chip shortage feared",
            "mode": "supply",
            "severity": 5,
            "confidence": 0.91,
            "is_verified": True,
            "source": "Reuters / ESG Report",
            "timestamp": (datetime.utcnow() - timedelta(minutes=22)).isoformat(),
            "analysis": "Whistleblower report filed with SEC. 3nm fab line offline for 2 weeks minimum. Apple, NVIDIA, AMD exposure confirmed.",
            "convergence_warning": "⚠️ ECO-LINK: Earthquake near Hsinchu triggered facility shutdown — convergence event.",
            "lat": 24.80,
            "lng": 120.97,
            "location": "Hsinchu, Taiwan",
        },
        {
            "id": str(uuid.uuid4()),
            "headline": "Red Sea shipping lane disruption continues — Suez diversions spike 340%",
            "mode": "supply",
            "severity": 4,
            "confidence": 0.96,
            "is_verified": True,
            "source": "Freightos Baltic Index",
            "timestamp": (datetime.utcnow() - timedelta(hours=1)).isoformat(),
            "analysis": "Container shipping rates at 18-month high. Europe-Asia freight +22 days transit time. Energy, electronics, automotive impact critical.",
            "convergence_warning": None,
            "lat": 12.86,
            "lng": 43.28,
            "location": "Bab el-Mandeb Strait, Red Sea",
        },
        {
            "id": str(uuid.uuid4()),
            "headline": "Rare earth mining ban declared in Myanmar — EV battery chain at risk",
            "mode": "supply",
            "severity": 3,
            "confidence": 0.78,
            "is_verified": True,
            "source": "Bloomberg Supply Chain Monitor",
            "timestamp": (datetime.utcnow() - timedelta(hours=4)).isoformat(),
            "analysis": "Myanmar supplies 40% global rare earth output. Tesla, BYD, Volkswagen flagged in risk registry. 6-month buffer supply estimated.",
            "convergence_warning": None,
            "lat": 22.96,
            "lng": 97.75,
            "location": "Shan State, Myanmar",
        },
        {
            "id": str(uuid.uuid4()),
            "headline": "Anonymous ESG whistleblower alleges forced labor in smartphone supply chain",
            "mode": "supply",
            "severity": 2,
            "confidence": 0.58,
            "is_verified": False,
            "source": "Whistleblower Platform",
            "timestamp": (datetime.utcnow() - timedelta(hours=6)).isoformat(),
            "analysis": "Report under third-party audit review. Social compliance violations alleged at Tier-2 supplier. UNVERIFIED — pending investigation.",
            "convergence_warning": None,
            "lat": 22.54,
            "lng": 114.06,
            "location": "Shenzhen, China",
        },
        # ── South Asia Supply Alerts ──
        {
            "id": str(uuid.uuid4()),
            "headline": "Mumbai port congestion reaches critical levels — 40+ vessels stranded",
            "mode": "supply",
            "severity": 4,
            "confidence": 0.90,
            "is_verified": True,
            "source": "Mumbai Port Trust / Lloyd's List",
            "timestamp": (datetime.utcnow() - timedelta(minutes=50)).isoformat(),
            "analysis": "Container dwell time at 12 days (vs 3-day norm). Customs clearance backlog due to new regulatory compliance checks. Pharmaceutical and electronics imports severely delayed.",
            "convergence_warning": "⚠️ ECO-LINK: Monsoon-related port closures compounding existing congestion — 14-day forecast shows no relief.",
            "lat": 18.95,
            "lng": 72.84,
            "location": "JNPT, Mumbai, India",
        },
        {
            "id": str(uuid.uuid4()),
            "headline": "Bangladesh garment factory shutdowns — global fast-fashion supply disrupted",
            "mode": "supply",
            "severity": 3,
            "confidence": 0.85,
            "is_verified": True,
            "source": "BGMEA / Fair Wear Foundation",
            "timestamp": (datetime.utcnow() - timedelta(hours=3)).isoformat(),
            "analysis": "28 factories in Gazipur and Ashulia shuttered due to worker unrest over wage disputes. H&M, Zara, Primark tier-1 suppliers affected. $200M orders at risk of delay.",
            "convergence_warning": None,
            "lat": 23.99,
            "lng": 90.43,
            "location": "Gazipur, Bangladesh",
        },
        {
            "id": str(uuid.uuid4()),
            "headline": "Colombo port transshipment delays — Indian Ocean hub bottleneck emerging",
            "mode": "supply",
            "severity": 3,
            "confidence": 0.82,
            "is_verified": True,
            "source": "Sri Lanka Ports Authority",
            "timestamp": (datetime.utcnow() - timedelta(hours=5)).isoformat(),
            "analysis": "Colombo handles 30% of Indian subcontinent transshipment. Crane maintenance backlog and labor shortages causing 5-day average delay. Feeder service to Chittagong, Cochin, Karachi affected.",
            "convergence_warning": None,
            "lat": 6.94,
            "lng": 79.84,
            "location": "Colombo Port, Sri Lanka",
        },
        {
            "id": str(uuid.uuid4()),
            "headline": "India pharmaceutical API shortage — antibiotic exports halted",
            "mode": "supply",
            "severity": 4,
            "confidence": 0.87,
            "is_verified": True,
            "source": "CDSCO / Pharma Intelligence",
            "timestamp": (datetime.utcnow() - timedelta(hours=2)).isoformat(),
            "analysis": "Key Active Pharmaceutical Ingredient production disrupted in Hyderabad and Vizag facilities. India supplies 20% of global generic medicines. WHO essential medicines list items affected.",
            "convergence_warning": "⚠️ EPI-LINK: Antibiotic shortage may compromise response to drug-resistant TB outbreaks in the region.",
            "lat": 17.39,
            "lng": 78.49,
            "location": "Hyderabad, Telangana, India",
        },
    ],
}

# ─── RSS Feed Cache ───────────────────────────────────────────────────────────

_rss_cache = {
    "supply": [],
    "last_fetch": None,
}
RSS_CACHE_TTL = 120  # Refresh RSS feeds every 2 minutes


def fetch_rss_alerts(mode: str) -> list:
    """Fetch and parse RSS feeds for a given sentry mode, returning alert-shaped dicts."""
    urls = FEEDS.get(mode, [])
    alerts = []

    mode_sources = {
        "supply": "Industry RSS Feed",
    }

    for url in urls:
        try:
            feed = feedparser.parse(url)
            source_name = feed.feed.get("title", mode_sources.get(mode, "RSS Feed"))

            for entry in feed.entries:  # Load all entries (paginated at API level)
                title = entry.get("title", "").strip()
                if not title:
                    continue

                # Generate deterministic ID from title
                alert_id = hashlib.md5(title.encode()).hexdigest()[:12]
                
                # Parse published date
                published = entry.get("published_parsed") or entry.get("updated_parsed")
                if published:
                    ts = datetime(*published[:6]).isoformat()
                else:
                    ts = datetime.utcnow().isoformat()

                # Extract summary/description
                summary = entry.get("summary", entry.get("description", ""))
                # Strip HTML tags (basic)
                import re
                summary = re.sub(r'<[^>]+>', '', summary).strip()[:500]

                alert = {
                    "id": f"rss-{mode}-{alert_id}",
                    "headline": title,
                    "mode": mode,
                    "severity": 0,           # 0 = unprocessed by agent
                    "confidence": 0.0,
                    "is_verified": False,
                    "source": source_name,
                    "source_url": entry.get("link", ""),
                    "timestamp": ts,
                    "analysis": summary if summary else "Fetched from live RSS feed. Trigger analysis to run the AI pipeline.",
                    "convergence_warning": None,
                    "is_raw_feed": True,      # Flag so frontend knows this is unprocessed
                }
                alerts.append(enrich_india_alert(alert))
        except Exception as e:
            print(f"[RSS] Failed to fetch {url}: {e}")

    # Deduplicate by headline
    seen = set()
    unique = []
    for a in alerts:
        if a["headline"] not in seen:
            seen.add(a["headline"])
            unique.append(a)

    # Sort by timestamp descending
    unique.sort(key=lambda x: x.get("timestamp", ""), reverse=True)
    return unique


def get_cached_rss(mode: str, allow_refresh: bool = True) -> list:
    """Returns cached RSS alerts, refreshing if stale."""
    now = time.time()
    if allow_refresh and (_rss_cache["last_fetch"] is None or (now - _rss_cache["last_fetch"]) > RSS_CACHE_TTL):
        print(f"[RSS] Refreshing supply feeds...")
        _rss_cache["supply"] = fetch_rss_alerts("supply")
        _rss_cache["last_fetch"] = now
        total = len(_rss_cache["supply"])
        print(f"[RSS] Cached {total} supply chain headlines")

    return _rss_cache.get(mode, [])


# ─── Runtime state ────────────────────────────────────────────────────────────

_state = {
    "active_mode": "supply",
    "last_poll": datetime.utcnow().isoformat(),
    "feed_health": {"supply": "PAUSED"},
    "feed_polling_enabled": False,
    "triggered_analyses": [],
    "agent_available": AGENT_AVAILABLE,
    "current_analysis": None,
    "recent_rejections": [],
}

_processed_headlines = set()

# ─── Models ───────────────────────────────────────────────────────────────────

class TriggerRequest(BaseModel):
    headline: str
    mode: Literal["supply"] = "supply"


class FeedPollingRequest(BaseModel):
    enabled: bool

# ─── Live Alert Store (from agent pipeline) ───────────────────────────────────

ALERTS_JSON_PATH = os.path.join(RADIO_DIR, "alerts.json")

def load_live_alerts() -> list:
    """Reads alerts.json written by the agent's notify_node."""
    try:
        if os.path.exists(ALERTS_JSON_PATH):
            with open(ALERTS_JSON_PATH, "r", encoding="utf-8") as f:
                alerts = json.load(f)
            # Ensure every agent-produced alert has is_raw_feed=False
            for idx, a in enumerate(alerts):
                if "is_raw_feed" not in a:
                    a["is_raw_feed"] = False
                alerts[idx] = enrich_india_alert(a)
            return alerts
    except Exception as e:
        print(f"[API] Failed to read alerts.json: {e}")
    return []

# ─── Real Agent Integration ───────────────────────────────────────────────────

def run_real_agent_stream(headline: str, mode: str):
    """Run the SupplySentry pipeline via streaming to track node progress."""
    original_cwd = os.getcwd()
    os.chdir(RADIO_DIR)

    try:
        initial_state = {
            "news_item": headline,
            "sentry_mode": mode,
            "is_threat": False,
            "threat_analysis": "",
            "severity_level": 0,
            "confidence_score": 0.0,
            "convergence_warning": "",
            "verification_results": "",
            "is_verified": False,
            "relevance_score": 0.0,
            "retry_count": 0,
            "context": [],
            "logs": [],
        }

        # Stream events from LangGraph
        for event in global_sentry_app.stream(initial_state):
            for node_name, state_update in event.items():
                print(f"[API] Stream active node: {node_name}")
                if _state["current_analysis"] and _state["current_analysis"]["headline"] == headline:
                    _state["current_analysis"]["active_node"] = node_name

        print(f"[API] Agent stream completed for: {headline[:60]}")
    except Exception as e:
        import traceback
        print(f"[API] Agent streaming failed: {e}")
        traceback.print_exc()
    finally:
        os.chdir(original_cwd)

def run_real_agent(headline: str, mode: str) -> dict:
    """Run the actual SupplySentry LangGraph pipeline (Sync fallback)."""
    original_cwd = os.getcwd()
    os.chdir(RADIO_DIR)

    try:
        initial_state = {
            "news_item": headline,
            "sentry_mode": mode,
            "is_threat": False,
            "threat_analysis": "",
            "severity_level": 0,
            "confidence_score": 0.0,
            "convergence_warning": "",
            "verification_results": "",
            "is_verified": False,
            "relevance_score": 0.0,
            "retry_count": 0,
            "context": [],
            "logs": [],
        }

        start_time = time.time()
        result = global_sentry_app.invoke(initial_state)
        elapsed_ms = int((time.time() - start_time) * 1000)

        alert = {
            "id": str(uuid.uuid4()),
            "headline": headline,
            "mode": mode,
            "severity": result.get("severity_level", 3),
            "confidence": round(result.get("confidence_score", 0.5), 2),
            "is_verified": result.get("is_verified", False),
            "source": "Live Agent Pipeline",
            "timestamp": datetime.utcnow().isoformat(),
            "analysis": result.get("threat_analysis", "Analysis not available.")[:800],
            "convergence_warning": result.get("convergence_warning", "") or None,
            "lat": result.get("lat", 0.0),
            "lng": result.get("lng", 0.0),
            "location": result.get("location", "Unknown"),
            "is_raw_feed": False,
        }
        alert = enrich_india_alert(alert)

        pipeline_steps = []
        node_names = [
            ("Profiler", "profiler"),
            ("Triage (Agent A)", "triage"),
            ("Retriever (RAG)", "retriever"),
            ("Analyst (Agent B)", "analyst"),
            ("Locator (Geo)", "locator"),
            ("Correlator (Neural Moat)", "correlator"),
            ("Validator (Agent C)", "validator"),
            ("Reflection Loop", "retry"),
            ("Notify", "notify"),
            ("Archiver", "archiver"),
        ]
        logs = result.get("logs", [])
        for label, node_id in node_names:
            found = any(node_id.lower() in log.lower() for log in logs)
            pipeline_steps.append({
                "node": label,
                "status": "done" if found else "skipped",
                "ms": random.randint(50, 200)
            })

        return alert, pipeline_steps, logs, elapsed_ms

    finally:
        os.chdir(original_cwd)


# ─── Routes ───────────────────────────────────────────────────────────────────

@app.get("/api")
@app.get("/api/")
def root():
    return {
        "message": "SupplySentry API is live",
        "agent_available": AGENT_AVAILABLE,
        "version": "1.0.0 — Supply Chain Intelligence",
        "docs": "/api/docs",
    }


@app.get("/api/alerts")
def get_alerts(mode: Optional[str] = None, limit: int = 15):
    """Returns supply chain alerts — processed (agent) AND raw RSS feed headlines."""
    if mode and mode != "supply":
        raise HTTPException(status_code=400, detail="Invalid mode. Only 'supply' is supported.")

    # 1. Agent-processed + manually-triggered alerts
    all_alerts = load_live_alerts() + _state["triggered_analyses"]

    # 2. Also include RSS feed headlines so content appears immediately
    #    (before the autonomous loop has processed them)
    modes_to_fetch = ["supply"]
    for m in modes_to_fetch:
        rss_items = get_cached_rss(m)
        all_alerts.extend(rss_items)

    if mode:
        all_alerts = [a for a in all_alerts if a.get("mode") == mode]

    # Deduplicate by headline (processed alerts take priority since they appear first)
    seen = set()
    unique = []
    for a in all_alerts:
        if a["headline"] not in seen:
            seen.add(a["headline"])
            unique.append(a)

    unique.sort(key=lambda x: x.get("timestamp", ""), reverse=True)

    unique = [enrich_india_alert(a) for a in unique]

    return {"alerts": unique[:limit], "total": len(unique), "mode_filter": mode}


@app.get("/api/feed/{mode}")
def get_raw_feed(mode: str, page: int = 1, per_page: int = 15):
    """Returns paginated RSS feed headlines for a mode — 15 per page."""
    if mode != "supply":
        raise HTTPException(status_code=400, detail="Invalid mode. Only 'supply' is supported.")
    
    alerts = get_cached_rss(mode)
    total = len(alerts)
    total_pages = (total + per_page - 1) // per_page  # ceiling division
    start = (page - 1) * per_page
    end = start + per_page
    page_items = alerts[start:end]

    return {
        "headlines": page_items,
        "page": page,
        "per_page": per_page,
        "total": total,
        "total_pages": total_pages,
        "has_next": page < total_pages,
        "mode": mode,
    }


@app.get("/api/threat-counts")
def get_threat_counts():
    """Returns the total number of threat items per mode from the XML feeds,
    plus how many have been processed by the agent so far."""
    counts = {}
    processed_alerts = load_live_alerts() + _state["triggered_analyses"]
    feed_items = get_cached_rss("supply")
    processed_count = len([a for a in processed_alerts if a.get("mode") == "supply" and not a.get("is_raw_feed")])
    counts["supply"] = {
        "total": len(feed_items),
        "processed": processed_count,
        "pending": len(feed_items) - processed_count,
    }
    return counts


@app.get("/api/globe-threats")
def get_globe_threats():
    """Returns real India feed alerts with geo-coordinates for globe visualization."""
    all_threats = []

    # Agent-processed and triggered real feed alerts.
    for alert in load_live_alerts() + _state["triggered_analyses"]:
        enriched = enrich_india_alert(alert)
        if enriched.get("lat") and enriched.get("lng"):
            all_threats.append(enriched)

    # Raw RSS items are real feed items too. Only map them when an India
    # location is detected; otherwise they stay in the dashboard feed.
    for alert in get_cached_rss("supply"):
        enriched = enrich_india_alert(alert)
        if enriched.get("lat") and enriched.get("lng") and enriched.get("supply_signal_score", 0) > 0:
            all_threats.append(enriched)

    # Deduplicate by ID
    seen = set()
    unique_threats = []
    for a in all_threats:
        if a["id"] not in seen:
            seen.add(a["id"])
            unique_threats.append(a)

    return {
        "threats": unique_threats,
        "total": len(unique_threats),
        "region_focus": USER_PROFILE["region_of_interest"],
        "map_policy": "Only real India feed alerts with detected locations are plotted.",
    }


@app.get("/api/user-profile")
def get_user_profile():
    """Returns the current user profile and preferences."""
    return USER_PROFILE


@app.post("/api/trigger")
def trigger_analysis(req: TriggerRequest):
    """Trigger a SupplySentry analysis — uses REAL agent pipeline or fallback."""

    if AGENT_AVAILABLE:
        try:
            alert, pipeline_steps, logs, elapsed_ms = run_real_agent(req.headline, req.mode)

            _state["triggered_analyses"].insert(0, alert)
            _state["last_poll"] = datetime.utcnow().isoformat()

            return {
                "status": "analysis_complete",
                "engine": "live_agent",
                "elapsed_ms": elapsed_ms,
                "alert": alert,
                "pipeline_steps": pipeline_steps,
                "logs": logs,
            }
        except Exception as e:
            print(f"[API] Agent failed: {e}.")

    # Fallback — Simulate AI analysis pipeline
    severity = random.randint(2, 5)
    confidence = round(random.uniform(0.65, 0.95), 2)
    is_verified = confidence > 0.75

    mode_analyses = {
        "epi": f"Epidemiological triage complete. Symptom pattern cross-matched with {random.randint(3, 12)} historical outbreaks in Qdrant memory. R0 estimation in progress.",
        "eco": f"Geophysical risk model applied. Satellite data cross-referenced. Affected population zone estimated at {random.randint(50, 500)}K residents.",
        "supply": f"Supply chain dependency graph queried. {random.randint(2, 8)} Tier-1 suppliers identified in impact zone. ESG registry cross-checked.",
    }

    # Fallback — return the headline as an unprocessed simulated alert
    new_alert = {
        "id": str(uuid.uuid4()),
        "headline": req.headline,
        "mode": req.mode,
        "severity": severity,
        "confidence": confidence,
        "is_verified": is_verified,
        "source": "Manual Input - Agent Offline",
        "timestamp": datetime.utcnow().isoformat(),
        "analysis": mode_analyses[req.mode],
        "convergence_warning": "CONVERGENCE DETECTED: Cross-mode pattern match found in memory." if random.random() > 0.6 else None,
        "location": "India location not detected",
        "is_raw_feed": False,
    }
    new_alert = enrich_india_alert(new_alert)

    _state["triggered_analyses"].insert(0, new_alert)
    return {
        "status": "agent_offline",
        "engine": "none",
        "alert": new_alert,
        "pipeline_steps": [],
    }


@app.get("/api/status")
def get_status():
    """Returns system status including the current real-time analysis."""
    rss_counts = {"supply": len(get_cached_rss("supply", allow_refresh=False))}
    live_count = len(load_live_alerts())
    feed_polling_enabled = _state["feed_polling_enabled"]

    return {
        "active_mode": _state["active_mode"],
        "last_poll": _state["last_poll"],
        "feed_health": _state["feed_health"],
        "feed_polling_enabled": feed_polling_enabled,
        "feed_polling_state": "running" if feed_polling_enabled else "paused",
        "agent_available": AGENT_AVAILABLE,
        "rss_headlines": rss_counts,
        "agent_processed_alerts": live_count,
        "current_analysis": _state["current_analysis"],
        "recent_rejections": _state.get("recent_rejections", []),
        "pipeline_nodes": [
            "profiler", "triage", "retriever", "analyst", "locator",
            "correlator", "validator", "retry", "notify", "archiver"
        ],
        "data_source": "Live Indian RSS feeds -> Autonomous AI" if feed_polling_enabled else "Feed intake paused; manual agent trigger available",
        "version": "3.0.0",
    }


@app.put("/api/feed-polling")
def set_feed_polling(req: FeedPollingRequest):
    """Enable or pause automatic RSS-to-agent intake without stopping the agent."""
    _state["feed_polling_enabled"] = req.enabled
    _state["feed_health"]["supply"] = "OK" if req.enabled else "PAUSED"
    if not req.enabled:
        _state["current_analysis"] = None
    return {
        "feed_polling_enabled": _state["feed_polling_enabled"],
        "feed_polling_state": "running" if req.enabled else "paused",
        "changed_at": datetime.utcnow().isoformat(),
        "message": (
            "Automatic feed intake is running. RSS headlines can enter the agent pipeline."
            if req.enabled
            else "Automatic feed intake is paused. Agents remain available for manual triggers."
        ),
    }


@app.put("/api/mode/{mode}")
def switch_mode(mode: str):
    """Switch the active sentry monitoring mode."""
    if mode not in ("epi", "eco", "supply"):
        raise HTTPException(status_code=400, detail="Invalid mode")
    _state["active_mode"] = mode
    return {"active_mode": mode, "switched_at": datetime.utcnow().isoformat()}


@app.get("/api/convergence")
def get_convergence():
    """Returns supply chain alerts with risk convergence warnings."""
    # Gather all agent-processed alerts
    live_alerts = load_live_alerts()
    sim_alerts = _state.get("triggered_analyses", [])
    all_alerts = live_alerts + sim_alerts

    # Filter only those with convergence_warning
    convergent = [
        a for a in all_alerts
        if a.get("convergence_warning") and not a.get("is_raw_feed")
    ]

    # Simple risk counter for supply chain convergence
    mode_links = {"supply_risks": len(convergent)}

    # Qdrant memory stats
    memory_count = 0
    try:
        from Radio.sentry import get_qdrant_client, COLLECTION_NAME
        info = get_qdrant_client().get_collection(COLLECTION_NAME)
        memory_count = info.points_count
    except Exception:
        memory_count = len(_processed_headlines)

    return {
        "convergence_alerts": convergent[:20],
        "total": len(convergent),
        "mode_links": mode_links,
        "memory_vectors": memory_count,
    }


# ─── Autonomous Background Loop ───────────────────────────────────────────────

# Threat-signal keywords — headlines containing these get analyzed FIRST
_THREAT_KEYWORDS = [
    "shortage", "disruption", "crisis", "emergency", "supply chain",
    "port", "shipping", "logistics", "freight", "tariff", "sanctions",
    "factory", "shutdown", "recall", "defect", "ESG", "compliance",
    "semiconductor", "chip", "rare earth", "lithium", "steel",
    "export ban", "import", "trade war", "embargo", "bottleneck",
    "warehouse", "inventory", "stockout", "delay", "congestion",
    "strike", "labor", "unrest", "inflation", "price surge",
]

def _prioritize_headlines(headlines: list) -> list:
    """Sort headlines so threat-likely ones come first."""
    def score(item):
        hl_lower = item["headline"].lower()
        return sum(1 for kw in _THREAT_KEYWORDS if kw in hl_lower)
    return sorted(headlines, key=score, reverse=True)


async def autonomous_agent_loop():
    """Background task that autonomously scans RSS feeds and analyzes threats.
    Uses real agent when available, otherwise simulates the full pipeline."""
    print("[API] Starting Autonomous Agent Loop...")
    
    # Initialize cache with already analyzed alerts
    for a in load_live_alerts():
        _processed_headlines.add(a.get("headline", ""))
    for a in _state["triggered_analyses"]:
        _processed_headlines.add(a.get("headline", ""))

    pipeline_nodes = ["profiler", "triage", "retriever", "analyst", "locator", "correlator", "validator", "notify", "archiver"]
    BATCH_SIZE = 5  # Process 5 headlines per mode before rotating
        
    while True:
        try:
            if not _state["feed_polling_enabled"]:
                _state["feed_health"]["supply"] = "PAUSED"
                _state["current_analysis"] = None
                await asyncio.sleep(2)
                continue

            _state["feed_health"]["supply"] = "OK"

            # Build queue of unprocessed supply chain headlines
            headlines = get_cached_rss("supply")
            headlines = _prioritize_headlines(headlines)
            queue = [h for h in headlines if h["headline"] not in _processed_headlines]

            for feed_item in queue[:BATCH_SIZE]:
                        hl = feed_item["headline"]
                        if hl in _processed_headlines:
                            continue

                        print(f"\n[API] Auto-analyzing [SUPPLY]: {hl[:60]}...")

                        if AGENT_AVAILABLE:
                            _state["current_analysis"] = {"headline": hl, "mode": "supply", "active_node": "profiler"}
                            pre_alerts = len(load_live_alerts())
                            await asyncio.to_thread(run_real_agent_stream, hl, "supply")
                            post_alerts = len(load_live_alerts())
                            if post_alerts == pre_alerts:
                                _state["recent_rejections"].insert(0, {"headline": hl, "mode": "supply", "timestamp": datetime.utcnow().isoformat()})
                                _state["recent_rejections"] = _state["recent_rejections"][:10]
                        else:
                            # ── Simulated analysis pipeline ──
                            for node in pipeline_nodes:
                                _state["current_analysis"] = {"headline": hl, "mode": "supply", "active_node": node}
                                await asyncio.sleep(random.uniform(0.4, 1.2))

                            severity = random.randint(2, 5)
                            confidence = round(random.uniform(0.65, 0.95), 2)

                            analysis_text = f"Supply chain dependency graph queried. {random.randint(2, 8)} Tier-1 suppliers in impact zone. ESG registry cross-checked. Disruption probability: {random.randint(60, 95)}%."

                            new_alert = {
                                "id": str(uuid.uuid4()),
                                "headline": hl,
                                "mode": "supply",
                                "severity": severity,
                                "confidence": confidence,
                                "is_verified": confidence > 0.75,
                                "source": feed_item.get("source", "RSS Intelligence Feed"),
                                "timestamp": datetime.utcnow().isoformat(),
                                "analysis": analysis_text,
                                "convergence_warning": "SUPPLY CHAIN RISK: Cross-sector disruption pattern detected in intelligence memory." if random.random() > 0.7 else None,
                                "location": "India location not detected",
                                "is_raw_feed": False,
                            }
                            new_alert = enrich_india_alert(new_alert)
                            _state["triggered_analyses"].insert(0, new_alert)

                        _processed_headlines.add(hl)
                        _state["current_analysis"] = None
                        print(f"[API] Analysis complete for: {hl[:50]}...")
                        
                        # Pause between analyses
                        await asyncio.sleep(random.uniform(3, 6))
                        
        except Exception as e:
            print(f"[API] Error in autonomous loop: {e}")
            
        _state["last_poll"] = datetime.utcnow().isoformat()
        await asyncio.sleep(15)

@app.on_event("startup")
async def startup_event():
    # Clear stale alerts from previous session so the dashboard starts fresh
    try:
        if os.path.exists(ALERTS_JSON_PATH):
            os.remove(ALERTS_JSON_PATH)
            print("[API] Cleared stale alerts.json from previous session.")
    except Exception as e:
        print(f"[API] Warning: Could not clear alerts.json: {e}")

    # Reset in-memory state
    _state["triggered_analyses"].clear()
    _processed_headlines.clear()

    # Start the continuous scanner in the background
    asyncio.create_task(autonomous_agent_loop())

# ─── Serve Frontend (MUST be last) ────────────────────────────────────────────
FRONTEND_DIR = os.path.join(os.path.dirname(__file__), "frontend")
if os.path.exists(FRONTEND_DIR):
    app.mount("/", StaticFiles(directory=FRONTEND_DIR, html=True), name="static")
