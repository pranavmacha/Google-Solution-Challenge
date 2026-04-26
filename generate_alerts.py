import json
import random
import uuid
from datetime import datetime, timedelta

def generate_dataset(num_entries=500, filename="threat_dataset.json"):
    modes = ["epi", "eco", "supply"]
    
    # Templates for headlines
    templates = {
        "epi": [
            "Unusual {disease} cluster detected in {region} — WHO investigating",
            "New drug-resistant {disease} strain reported across {region}",
            "Severe {disease} outbreak in {region} — {number} hospitalizations",
            "Unconfirmed {disease} reports emerging from {region}",
            "Cases of {disease} surge in flood-affected {region}",
            "Warning issued for {disease} transmission in {region}",
            "Local health officials monitor potential {disease} epidemic in {region}"
        ],
        "eco": [
            "Magnitude {magnitude} earthquake strikes {region} — tsunami advisory active",
            "Category {category} cyclone forming near {region} — landfall predicted",
            "Catastrophic flooding in {region} — {number} people affected",
            "Extreme heatwave grips {region} — temperatures exceed 48°C",
            "Wildfire season begins early in {region} — red alert issued",
            "Mega-drought declaration issued for {region}",
            "Coastal erosion accelerating in {region} — families displaced",
            "Glacial lake outburst flood warning issued for {region}"
        ],
        "supply": [
            "Major {facility} halts production in {region} — global shortage feared",
            "{region} shipping lane disruption continues — diversions spike",
            "Rare earth mining ban declared in {region} — supply chain at risk",
            "Anonymous ESG whistleblower alleges violations in {region} {facility}",
            "Port congestion reaches critical levels in {region} — 40+ vessels stranded",
            "Garment factory shutdowns in {region} — fast-fashion supply disrupted",
            "Pharmaceutical API shortage from {region} — exports halted",
            "Labor strike shuts down main {facility} hub in {region}"
        ]
    }
    
    # Fillers for templates
    disease = ["pneumonia", "TB", "dengue fever", "hemorrhagic fever", "Nipah virus", "cholera", "measles", "malaria", "Ebola", "Zika"]
    region_coords = [
        ("Southeast Asia", 15.0, 105.0), ("Central Africa", 0.0, 20.0), ("South America", -15.0, -60.0),
        ("Northern India", 28.0, 77.0), ("Coastal Peru", -10.0, -76.0), ("Southern Europe", 40.0, 10.0),
        ("Western US", 38.0, -115.0), ("Bangladesh", 24.0, 90.0), ("Sindh, Pakistan", 26.0, 68.0),
        ("Kozhikode, Kerala", 11.2, 75.7), ("Taiwan", 23.5, 121.0), ("Red Sea", 20.0, 38.0),
        ("Mumbai, India", 19.0, 72.8), ("Colombo, Sri Lanka", 6.9, 79.8), ("Shenzhen, China", 22.5, 114.0),
        ("Jakarta, Indonesia", -6.2, 106.8), ("Manila, Philippines", 14.5, 120.9), ("Cairo, Egypt", 30.0, 31.2)
    ]
    facility = ["semiconductor fab", "container port", "assembly plant", "refinery", "logistics", "manufacturing"]
    
    dataset = []
    
    for _ in range(num_entries):
        mode = "eco"
        template = random.choice(templates[mode])
        
        reg_name, base_lat, base_lng = random.choice(region_coords)
        # add some jitter
        lat = base_lat + random.uniform(-2.0, 2.0)
        lng = base_lng + random.uniform(-2.0, 2.0)
        
        # Populate template
        if mode == "epi":
            headline = template.format(disease=random.choice(disease), region=reg_name, number=random.randint(500, 15000))
            analysis = f"Epidemiological triage complete. Symptom pattern cross-matched in {reg_name}."
        elif mode == "eco":
            headline = template.format(magnitude=round(random.uniform(5.0, 8.5), 1), category=random.randint(3, 5), region=reg_name, number=f"{random.randint(10, 500)}K")
            analysis = f"Geophysical/Climate risk model applied. Satellite data cross-referenced for {reg_name}."
        else:
            headline = template.format(facility=random.choice(facility), region=reg_name)
            analysis = f"Supply chain dependency graph queried. Tier-1 suppliers identified in {reg_name}."
            
        severity = random.randint(2, 5)
        confidence = round(random.uniform(0.60, 0.99), 2)
        
        days_ago = random.randint(0, 14)
        hours_ago = random.randint(0, 23)
        timestamp = (datetime.utcnow() - timedelta(days=days_ago, hours=hours_ago)).isoformat()
        
        entry = {
            "id": str(uuid.uuid4()),
            "headline": headline,
            "mode": mode,
            "severity": severity,
            "confidence": confidence,
            "is_verified": confidence > 0.75,
            "source": random.choice(["WHO Situation Report", "USGS", "ProMED-mail", "IMD", "Bloomberg Supply Chain", "Social Media Signals", "Reuters"]),
            "timestamp": timestamp,
            "analysis": analysis,
            "convergence_warning": "⚠️ CONVERGENCE DETECTED" if random.random() > 0.8 else None,
            "lat": round(lat, 4),
            "lng": round(lng, 4),
            "location": reg_name
        }
        dataset.append(entry)
        
    with open(filename, 'w', encoding='utf-8') as f:
        json.dump(dataset, f, indent=4)
        
    print(f"Generated {num_entries} entries and saved to {filename}")

if __name__ == "__main__":
    generate_dataset(500)
