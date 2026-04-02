"""
Proxy rotation manager.
Supports free proxies and paid proxy services (BrightData, Oxylabs, SmartProxy).
"""
import os
import random
import asyncio
import httpx
from typing import Optional
from dotenv import load_dotenv

load_dotenv()

# Load proxy list from env or file
RAW_PROXIES = os.getenv("PROXY_LIST", "").split(",")
PROXY_FILE = os.getenv("PROXY_FILE", "proxies/proxy_list.txt")

class ProxyManager:
    def __init__(self):
        self.proxies: list[str] = []
        self.bad_proxies: set[str] = set()
        self.use_proxy = os.getenv("USE_PROXY", "false").lower() == "true"
        self._load_proxies()

    def _load_proxies(self):
        """Load proxies from env variable or file."""
        # From environment variable
        if RAW_PROXIES and RAW_PROXIES[0]:
            self.proxies = [p.strip() for p in RAW_PROXIES if p.strip()]

        # From proxy file
        try:
            with open(PROXY_FILE, "r") as f:
                file_proxies = [line.strip() for line in f if line.strip()]
                self.proxies.extend(file_proxies)
        except FileNotFoundError:
            pass

        # Remove duplicates
        self.proxies = list(set(self.proxies))
        print(f"[ProxyManager] Loaded {len(self.proxies)} proxies")

    def get_proxy(self) -> Optional[str]:
        """Return a random working proxy URL."""
        if not self.use_proxy or not self.proxies:
            return None

        available = [p for p in self.proxies if p not in self.bad_proxies]
        if not available:
            # Reset bad proxies and try again
            self.bad_proxies.clear()
            available = self.proxies

        return random.choice(available) if available else None

    def mark_bad(self, proxy: str):
        """Mark a proxy as non-working."""
        self.bad_proxies.add(proxy)
        print(f"[ProxyManager] Marked bad proxy: {proxy}")

    async def test_proxy(self, proxy: str) -> bool:
        """Test if a proxy is working."""
        try:
            async with httpx.AsyncClient(proxy=proxy, timeout=10) as client:
                resp = await client.get("https://httpbin.org/ip")
                return resp.status_code == 200
        except Exception:
            return False

    async def validate_all(self):
        """Validate all proxies and remove bad ones."""
        print("[ProxyManager] Validating proxies...")
        tasks = [self.test_proxy(p) for p in self.proxies]
        results = await asyncio.gather(*tasks, return_exceptions=True)
        self.proxies = [p for p, ok in zip(self.proxies, results) if ok is True]
        print(f"[ProxyManager] {len(self.proxies)} valid proxies remaining")


# Global singleton
proxy_manager = ProxyManager()
