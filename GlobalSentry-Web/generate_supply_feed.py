import random
import uuid
from datetime import datetime, timedelta
import xml.etree.ElementTree as ET
from xml.dom import minidom

TOPICS = [
    "Port congestion and shipping delays",
    "Factory shutdowns and manufacturing halts",
    "Commodity shortages",
    "Trade sanctions and export bans",
    "Logistics and freight disruptions",
    "Warehouse and cold-chain failures",
    "Raw material price spikes",
    "Labor strikes in industrial zones",
    "Energy supply disruptions affecting production",
    "Natural disaster impact on supply routes"
]

LOCATIONS = ["Shanghai", "Los Angeles", "Rotterdam", "Singapore", "Suez Canal", "Panama Canal", "Shenzhen", "Antwerp", "Hamburg", "Dubai", "Mumbai", "Tokyo", "Busan"]

COMPANIES = ["Maersk", "MSC", "CMA CGM", "Evergreen", "Hapag-Lloyd", "COSCO", "ONE", "Foxconn", "TSMC", "Intel", "Samsung", "Toyota", "Ford", "Nike", "Apple supply chain"]

def generate_headline():
    topic = random.choice(TOPICS)
    loc = random.choice(LOCATIONS)
    comp = random.choice(COMPANIES)
    templates = [
        f"Severe {topic.lower()} reported near {loc}, impacting {comp} operations.",
        f"{comp} issues warning over {topic.lower()} originating from {loc}.",
        f"Global supply chains brace for impact as {topic.lower()} hits {loc}.",
        f"Update: {topic} at {loc} causes ripple effects for {comp}.",
        f"Critical alert: {comp} faces delays due to {topic.lower()} in {loc}."
    ]
    return random.choice(templates)

def generate_description():
    return "This is a simulated threat intelligence report for the SupplySentry dashboard. The incident describes ongoing supply chain volatility and its projected impact on global trade networks and logistics timelines."

rss = ET.Element("rss", version="2.0")
channel = ET.SubElement(rss, "channel")

title = ET.SubElement(channel, "title")
title.text = "SupplySentry Supply Chain Threat Feed"
link = ET.SubElement(channel, "link")
link.text = "http://supplysentry.local/supply-feed"
desc = ET.SubElement(channel, "description")
desc.text = "Real-time simulated supply chain disruptions and threats."

now = datetime.utcnow()

for i in range(500):
    item = ET.SubElement(channel, "item")
    
    item_title = ET.SubElement(item, "title")
    item_title.text = generate_headline()
    
    item_link = ET.SubElement(item, "link")
    item_link.text = f"http://supplysentry.local/alert/{uuid.uuid4()}"
    
    item_desc = ET.SubElement(item, "description")
    item_desc.text = generate_description()
    
    pub_date = ET.SubElement(item, "pubDate")
    item_time = now - timedelta(minutes=random.randint(1, 10000))
    pub_date.text = item_time.strftime("%a, %d %b %Y %H:%M:%S GMT")
    
    guid = ET.SubElement(item, "guid")
    guid.text = str(uuid.uuid4())

xmlstr = minidom.parseString(ET.tostring(rss)).toprettyxml(indent="  ")

with open("supply_feed.xml", "w", encoding="utf-8") as f:
    f.write(xmlstr)

print("Successfully generated supply_feed.xml with 500 items.")
