#!/usr/bin/env python3
"""Check database for scraped products."""
from pymongo import MongoClient
from dotenv import load_dotenv
import os

load_dotenv()
MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017/shopsense")

client = MongoClient(MONGO_URI)
db = client.shopsense

total = db.products.count_documents({})
print(f"Total products in DB: {total}")

# Get some sample products
products = list(db.products.find({}).limit(3))
for p in products:
    source_id = p.get("source_id") or p.get("sourceId") or "NULL"
    name = p.get("name", "N/A")[:50]
    source = p.get("source", "unknown")
    print(f"  - {source}: {name} (ID: {source_id})")

# Check for null sourceIds
null_count1 = db.products.count_documents({"sourceId": None})
null_count2 = db.products.count_documents({"source_id": None})
print(f"Products with null sourceId: {null_count1 + null_count2}")

# Count by source
amazon = db.products.count_documents({"source": "amazon"})
flipkart = db.products.count_documents({"source": "flipkart"})
myntra = db.products.count_documents({"source": "myntra"})
apollo = db.products.count_documents({"source": "apollo_pharmacy"})

print(f"\nBy source:")
print(f"  Amazon: {amazon}")
print(f"  Flipkart: {flipkart}")
print(f"  Myntra: {myntra}")
print(f"  Apollo: {apollo}")

client.close()
