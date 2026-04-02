"""
Helpers for safely deciding whether Playwright can run in the current event loop.
"""
import asyncio
import os
from typing import Awaitable, Callable, TypeVar

T = TypeVar("T")


def can_use_playwright() -> tuple[bool, str | None]:
    if os.getenv("DISABLE_PLAYWRIGHT", "false").lower() == "true":
        return False, "DISABLE_PLAYWRIGHT is enabled"

    try:
        loop_name = type(asyncio.get_running_loop()).__name__
    except RuntimeError:
        return True, None

    if os.name == "nt" and "Proactor" not in loop_name:
        return True, f"Windows loop {loop_name} requires threaded Playwright fallback"

    return True, None


def _run_coro_in_proactor_thread(coro_factory: Callable[[], Awaitable[T]]) -> T:
    if os.name == "nt" and hasattr(asyncio, "WindowsProactorEventLoopPolicy"):
        asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())
    return asyncio.run(coro_factory())


async def run_playwright_task(coro_factory: Callable[[], Awaitable[T]]) -> T:
    try:
        loop_name = type(asyncio.get_running_loop()).__name__
    except RuntimeError:
        return await coro_factory()

    if os.name == "nt" and "Proactor" not in loop_name:
        return await asyncio.to_thread(_run_coro_in_proactor_thread, coro_factory)

    return await coro_factory()
