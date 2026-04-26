"""
seed_data.py — GlobalSentry Demo Data Seeder

Pre-loads realistic historical events into Qdrant so the Retriever and
Correlator nodes always have context during the hackathon demo.

Run ONCE before the demo:
    python seed_data.py
"""

import uuid
import os
from dotenv import load_dotenv
from langchain_community.vectorstores import Qdrant
from langchain_community.embeddings import SentenceTransformerEmbeddings
from qdrant_client import QdrantClient
from qdrant_client.http.models import Distance, VectorParams

load_dotenv()

QDRANT_PATH     = "./qdrant_data"
COLLECTION_NAME = "global_sentry_memory"
EMBEDDING_MODEL = os.getenv("EMBEDDING_MODEL", "all-MiniLM-L6-v2")
VECTOR_SIZE     = 384

# ─── Demo seed events ─────────────────────────────────────────────────────
# Format: (text, mode, severity)
# Mix of modes so the correlator can find cross-domain connections.

SEED_EVENTS = [
    # ── EPI-SENTRY ─────────────────────────────────────────────────────
    (
        "WHO confirms cluster of unknown respiratory illness in densely populated district of Dhaka, Bangladesh.",
        "epi", 4
    ),
    (
        "Cholera cases rising sharply in flood-affected regions of South Asia, overwhelm local health centres.",
        "epi", 4
    ),
    (
        "Measles outbreak declared in refugee camps along Myanmar-Bangladesh border, vaccination rates low.",
        "epi", 3
    ),
    (
        "ProMED reports unusual uptick in haemorrhagic fever cases in West African rural communities.",
        "epi", 5
    ),
    (
        "Dengue fever season starts earlier than usual across Southeast Asia; Singapore raises alert level.",
        "epi", 3
    ),

    # ── ECO-SENTRY ─────────────────────────────────────────────────────
    (
        "Catastrophic flooding submerges 40% of Bangladesh's Sylhet region after record monsoon rains.",
        "eco", 5
    ),
    (
        "Magnitude 6.8 earthquake strikes Sulawesi, Indonesia; tsunami warning issued for coastal areas.",
        "eco", 4
    ),
    (
        "NOAA warns of above-normal Atlantic hurricane season; Indian Ocean cyclone risk elevated.",
        "eco", 3
    ),
    (
        "Severe drought declared across the Horn of Africa; crop failure projected for next two seasons.",
        "eco", 4
    ),
    (
        "Wildfire season in Australia spreads rapidly amid record heat; air quality index hazardous across Sydney.",
        "eco", 4
    ),

    # ── SUPPLY-SENTRY ──────────────────────────────────────────────────
    (
        "Major semiconductor fabrication plant in Taiwan halts operations following earthquake damage.",
        "supply", 4
    ),
    (
        "Global shipping congestion at Singapore port causes two-week delay in consumer goods across Asia.",
        "supply", 3
    ),
    (
        "Bangladesh garment factory supply disrupted after flash floods shut key road and rail corridors.",
        "supply", 4
    ),
    (
        "ESG audit flags major palm oil supplier in Indonesia for illegal deforestation; EU buyers suspend contracts.",
        "supply", 3
    ),
    (
        "Wheat and rice export bans imposed by India and Vietnam amid drought-induced shortfall, global food prices spike.",
        "supply", 5
    ),

    # ── CROSS-DOMAIN SEEDS (designed to trigger convergence) ────────────
    (
        "Flood waters contaminating drinking water sources in South Asia; waterborne disease risk critical.",
        "eco", 5
    ),
    (
        "Aid shipments to flood-stricken Bangladesh delayed due to port congestion and road damage.",
        "supply", 4
    ),
    (
        "Disease surveillance teams unable to reach outbreak zones due to flood-damaged infrastructure.",
        "epi", 4
    ),
]

# ─── Seeding logic ────────────────────────────────────────────────────────

def seed():
    print("─────────────────────────────────────────")
    print("  GlobalSentry — Demo Data Seeder")
    print("─────────────────────────────────────────")

    embeddings = SentenceTransformerEmbeddings(model_name=EMBEDDING_MODEL)
    qdrant_client = QdrantClient(path=QDRANT_PATH)

    # Ensure collection exists
    existing = qdrant_client.get_collections().collections
    if not any(c.name == COLLECTION_NAME for c in existing):
        qdrant_client.create_collection(
            collection_name=COLLECTION_NAME,
            vectors_config=VectorParams(size=VECTOR_SIZE, distance=Distance.COSINE),
        )
        print(f"Created Qdrant collection: {COLLECTION_NAME}")

    vectorstore = Qdrant(
        client=qdrant_client,
        collection_name=COLLECTION_NAME,
        embeddings=embeddings
    )

    texts     = [e[0] for e in SEED_EVENTS]
    metadatas = [{"mode": e[1], "severity": e[2], "text": e[0]} for e in SEED_EVENTS]
    ids       = [str(uuid.uuid4()) for _ in SEED_EVENTS]

    print(f"Seeding {len(SEED_EVENTS)} events into Qdrant...")
    vectorstore.add_texts(texts=texts, metadatas=metadatas, ids=ids)

    print(f"\n✅ Done! {len(SEED_EVENTS)} events seeded:")
    mode_counts = {}
    for _, mode, _ in SEED_EVENTS:
        mode_counts[mode] = mode_counts.get(mode, 0) + 1
    for mode, count in mode_counts.items():
        icon = {"epi": "🩺", "eco": "🌪️", "supply": "♻️"}.get(mode, "🔵")
        print(f"  {icon} {mode.upper()}-SENTRY : {count} events")

    print("\nThe Retriever and Correlator (Neural Moat) are now ready for the demo.")

if __name__ == "__main__":
    seed()
