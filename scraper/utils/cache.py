import json
import os
import time

import redis


_redis_client = None
_memory_cache = {}

redis_url = os.getenv("REDIS_URL")
if redis_url:
    try:
        _redis_client = redis.Redis.from_url(redis_url, decode_responses=True)
    except Exception as e:
        print(f"[Cache] Redis init failed, using memory cache: {e}")


def get_cache(key):
    if _redis_client is not None:
        try:
            data = _redis_client.get(key)
            return json.loads(data) if data else None
        except Exception as e:
            print(f"[Cache] Redis read failed, using memory cache: {e}")

    cached = _memory_cache.get(key)
    if not cached:
        return None

    expires_at, value = cached
    if expires_at is not None and expires_at <= time.time():
        _memory_cache.pop(key, None)
        return None

    return value


def set_cache(key, value, ttl=1800):
    if _redis_client is not None:
        try:
            _redis_client.setex(key, ttl, json.dumps(value))
            return
        except Exception as e:
            print(f"[Cache] Redis write failed, using memory cache: {e}")

    expires_at = time.time() + ttl if ttl else None
    _memory_cache[key] = (expires_at, value)
