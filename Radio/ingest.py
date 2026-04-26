import os
import time
import sqlite3
import hashlib
import feedparser
from datetime import datetime, timedelta
from dotenv import load_dotenv
from sentry import global_sentry_app

load_dotenv()

# ─── Configuration ────────────────────────────────────────────────────────

SENTRY_MODE = os.getenv("SENTRY_MODE", "general")
POLL_INTERVAL = int(os.getenv("POLL_INTERVAL", "300"))
HASH_EXPIRY_DAYS = 7
DB_PATH = "ingestion_history.db"

# Pick the correct feed set based on the active sentry mode
FEED_MAP = {
    "epi":     os.getenv("EPI_FEEDS", ""),
    "eco":     os.getenv("ECO_FEEDS", ""),
    "supply":  os.getenv("SUPPLY_FEEDS", ""),
    "general": os.getenv("RSS_FEEDS", ""),
}
RSS_FEEDS = [f.strip() for f in FEED_MAP.get(SENTRY_MODE, FEED_MAP["general"]).split(",") if f.strip()]

# ─── SQLite helpers ───────────────────────────────────────────────────────

def init_db():
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute('''
        CREATE TABLE IF NOT EXISTS processed_items (
            hash      TEXT PRIMARY KEY,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    conn.commit()
    conn.close()

def cleanup_old_hashes():
    """Remove hashes older than HASH_EXPIRY_DAYS to keep the DB lean."""
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    cutoff = (datetime.utcnow() - timedelta(days=HASH_EXPIRY_DAYS)).strftime("%Y-%m-%d %H:%M:%S")
    c.execute("DELETE FROM processed_items WHERE timestamp < ?", (cutoff,))
    deleted = c.rowcount
    conn.commit()
    conn.close()
    if deleted:
        print(f"[DB] Cleaned up {deleted} expired hash(es).")

def is_processed(item_hash: str) -> bool:
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute("SELECT 1 FROM processed_items WHERE hash=?", (item_hash,))
    result = c.fetchone()
    conn.close()
    return result is not None

def mark_as_processed(item_hash: str):
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute("INSERT OR IGNORE INTO processed_items (hash) VALUES (?)", (item_hash,))
    conn.commit()
    conn.close()

def get_item_hash(item) -> str:
    content = f"{item.get('title', '')}|{item.get('link', '')}"
    return hashlib.sha256(content.encode()).hexdigest()

# ─── Feed processing ──────────────────────────────────────────────────────

def process_feed(url: str):
    print(f"\n[Ingest] Checking feed ({SENTRY_MODE}): {url}")
    try:
        feed = feedparser.parse(url)
        new_items = 0

        for entry in feed.entries:
            item_hash = get_item_hash(entry)
            if is_processed(item_hash):
                continue

            headline = entry.get('title', 'No Title')
            print(f"  > New Headline: {headline}")

            initial_state = {
                "news_item": headline,
                "sentry_mode": SENTRY_MODE,
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

            try:
                result = global_sentry_app.invoke(initial_state)
                print(f"  [Done] Severity={result.get('severity_level',0)} "
                      f"Verified={result.get('is_verified', False)}")
            except Exception as e:
                print(f"  [Error] GlobalSentry pipeline failed: {e}")

            mark_as_processed(item_hash)
            new_items += 1

        print(f"[Ingest] Finished. Processed {new_items} new item(s).")
    except Exception as e:
        print(f"[Error] Failed to parse feed {url}: {e}")

# ─── Main loop ────────────────────────────────────────────────────────────

def main():
    print("─────────────────────────────────────────────")
    print(f"  GlobalSentry Ingestion Engine")
    print(f"  Mode : {SENTRY_MODE.upper()}-SENTRY")
    print(f"  Feeds: {len(RSS_FEEDS)}")
    print(f"  Poll : every {POLL_INTERVAL}s")
    print("─────────────────────────────────────────────")

    init_db()
    cleanup_old_hashes()

    if not RSS_FEEDS:
        print("[Warning] No RSS feeds configured. Check your .env file.")
        return

    while True:
        for url in RSS_FEEDS:
            process_feed(url)
        print(f"\n[Sleep] Next poll in {POLL_INTERVAL}s...")
        time.sleep(POLL_INTERVAL)

if __name__ == "__main__":
    main()
