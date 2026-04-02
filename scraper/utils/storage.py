"""
MongoDB storage layer for ShopSense.
"""
import asyncio
import os
from datetime import datetime, timedelta, timezone
from typing import List, Optional

from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient
from pymongo.errors import DuplicateKeyError, OperationFailure

from utils.schema import normalize_product

load_dotenv()

MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017/shopsense")
MONGO_DB_NAME = os.getenv("MONGO_DB_NAME", "shopsense")

client = AsyncIOMotorClient(MONGO_URI)
db = client[MONGO_DB_NAME]

products_col = db["products"]
price_history_col = db["price_history"]
scrape_log_col = db["scrape_logs"]


async def _ensure_index(collection, keys, **options):
    """
    Create an index unless an equivalent one already exists with the same name.
    This keeps app startup idempotent across older local databases.
    """
    try:
        await collection.create_index(keys, **options)
    except OperationFailure as exc:
        index_name = options.get("name")
        if exc.code != 86 or not index_name:
            raise

        existing_indexes = await collection.index_information()
        existing = existing_indexes.get(index_name)
        if not existing:
            raise

        requested_unique = bool(options.get("unique", False))
        existing_unique = bool(existing.get("unique", False))
        requested_sparse = bool(options.get("sparse", False))
        existing_sparse = bool(existing.get("sparse", False))
        existing_keys = existing.get("key")

        if existing_keys == keys and existing_unique == requested_unique and existing_sparse == requested_sparse:
            print(f"[Storage] Reusing existing index {index_name}")
            return index_name

        raise


def _build_history_doc(product: dict, price: float, old_price, timestamp: datetime, product_ref) -> dict:
    return {
        "product_id": product["product_id"],
        "productId": product_ref,
        "source": product.get("source"),
        "source_id": product.get("source_id"),
        "sourceId": product.get("sourceId"),
        "price": price,
        "old_price": old_price,
        "oldPrice": old_price,
        "currency": product.get("currency", "INR"),
        "timestamp": timestamp,
    }


async def upsert_product(product: dict) -> Optional[str]:
    """
    Normalize and upsert a product document.
    """
    source_name = product.get("source") or "unknown"
    normalized = {**product, **normalize_product(product, source_name)}

    if not normalized.get("source_id"):
        print(f"[Storage] Skipping product with missing source_id: {normalized.get('name')}")
        return None

    now = datetime.now(timezone.utc)
    normalized["updated_at"] = now
    normalized["updatedAt"] = now

    product_id = normalized["product_id"]
    existing = await products_col.find_one({"product_id": product_id})

    if existing:
        update_fields = dict(normalized)
        update_fields.pop("created_at", None)
        update_fields.pop("createdAt", None)

        old_price = existing.get("current_price") if existing.get("current_price") is not None else existing.get("currentPrice")
        new_price = update_fields.get("current_price")

        if old_price is not None and new_price is not None and old_price != new_price:
            await price_history_col.insert_one(
                _build_history_doc(update_fields, new_price, old_price, now, existing["_id"])
            )

        await products_col.update_one(
            {"product_id": product_id},
            {
                "$set": update_fields,
                "$setOnInsert": {"created_at": existing.get("created_at", now), "createdAt": existing.get("createdAt", now)},
            },
        )
        return str(existing["_id"])

    normalized["created_at"] = now
    normalized["createdAt"] = now

    try:
        result = await products_col.insert_one(normalized)
    except DuplicateKeyError:
        update_fields = dict(normalized)
        update_fields.pop("created_at", None)
        update_fields.pop("createdAt", None)
        await products_col.update_one(
            {"product_id": product_id},
            {"$set": update_fields, "$setOnInsert": {"created_at": now, "createdAt": now}},
            upsert=True,
        )
        existing = await products_col.find_one({"product_id": product_id}, {"_id": 1})
        return str(existing["_id"]) if existing else None

    if normalized.get("current_price") is not None:
        await price_history_col.insert_one(
            _build_history_doc(normalized, normalized["current_price"], None, now, result.inserted_id)
        )

    return str(result.inserted_id)


async def upsert_products(products: List[dict], concurrency: int = 8) -> List[Optional[str]]:
    if not products:
        return []

    semaphore = asyncio.Semaphore(max(1, concurrency))

    async def _run(product: dict) -> Optional[str]:
        async with semaphore:
            try:
                return await upsert_product(product)
            except Exception as exc:
                print(f"[Storage] Bulk upsert error for {product.get('source')}:{product.get('source_id')}: {exc}")
                return None

    return await asyncio.gather(*[_run(product) for product in products])


async def get_products_by_query(
    query: str,
    source: Optional[str] = None,
    limit: int = 20,
) -> List[dict]:
    filter_q = {"$text": {"$search": query}}
    if source:
        filter_q["source"] = source

    cursor = products_col.find(filter_q).sort("updated_at", -1).limit(limit)
    return [doc async for doc in cursor]


async def get_price_history(source: str, source_id: str, days: int = 90) -> List[dict]:
    since = datetime.now(timezone.utc) - timedelta(days=days)
    product_id = f"{source}_{source_id}"

    cursor = price_history_col.find(
        {
            "$or": [
                {"product_id": product_id},
                {"source": source, "source_id": source_id},
                {"source": source, "sourceId": source_id},
            ],
            "timestamp": {"$gte": since},
        }
    ).sort("timestamp", 1)

    return [doc async for doc in cursor]


async def log_scrape(source: str, query: str, count: int, error: Optional[str] = None):
    await scrape_log_col.insert_one(
        {
            "source": source,
            "query": query,
            "count": count,
            "error": error,
            "timestamp": datetime.now(timezone.utc),
        }
    )


async def ensure_indexes():
    await _ensure_index(products_col, "product_id", unique=True, name="product_id_1")
    await _ensure_index(products_col, [("source", 1), ("source_id", 1)], unique=True, name="source_1_source_id_1")
    await _ensure_index(products_col, [("source", 1), ("sourceId", 1)], unique=True, name="source_1_sourceId_1")
    await _ensure_index(products_col, [("updated_at", -1)], name="updated_at_-1")
    await _ensure_index(products_col, [("updatedAt", -1)], name="updatedAt_-1")
    await _ensure_index(products_col, [("category", 1), ("updated_at", -1)], name="category_1_updated_at_-1")

    existing_indexes = await products_col.index_information()
    has_text_index = any(index.get("key") == [("_fts", "text"), ("_ftsx", 1)] for index in existing_indexes.values())
    if not has_text_index:
        try:
            await products_col.create_index(
                [("name", "text"), ("brand", "text"), ("category", "text")],
                name="products_text_search",
            )
        except OperationFailure as e:
            if e.code != 85:
                raise
            print("[Storage] Reusing existing text index")

    await _ensure_index(
        price_history_col,
        [("product_id", 1), ("timestamp", -1)],
        name="product_id_1_timestamp_-1",
    )
    await _ensure_index(
        price_history_col,
        [("productId", 1), ("timestamp", -1)],
        name="productId_1_timestamp_-1",
    )
    await _ensure_index(
        price_history_col,
        [("source", 1), ("source_id", 1), ("timestamp", -1)],
        name="source_1_source_id_1_timestamp_-1",
    )

    print("[Storage] Indexes ensured")
