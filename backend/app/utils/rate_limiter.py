"""
In-Memory Sliding Window Rate Limiter for Authentication & Biometric Endpoints.
Prevents brute force, credential stuffing, and replay/denial attacks.
"""

import time
import threading
from typing import Dict, List, Tuple, Optional
from fastapi import Request, HTTPException, status


class SlidingWindowRateLimiter:
    """
    Thread-safe in-memory rate limiter using a sliding time window.
    Tracks timestamped hits per client key (e.g. client IP or username).
    """

    def __init__(self):
        self._lock = threading.Lock()
        self._hits: Dict[str, List[float]] = {}

    def is_allowed(
        self,
        key: str,
        max_requests: int = 20,
        window_seconds: int = 60
    ) -> Tuple[bool, int]:
        """
        Determines if a request from 'key' is allowed.
        Returns:
            (allowed: bool, retry_after_seconds: int)
        """
        now = time.time()
        window_start = now - window_seconds

        with self._lock:
            # Get existing timestamps and clean expired ones
            timestamps = self._hits.get(key, [])
            valid_timestamps = [t for t in timestamps if t > window_start]

            if len(valid_timestamps) >= max_requests:
                # Oldest timestamp in window determines when slot frees up
                oldest = valid_timestamps[0]
                retry_after = max(1, int(oldest + window_seconds - now))
                self._hits[key] = valid_timestamps
                return False, retry_after

            # Allow request and record timestamp
            valid_timestamps.append(now)
            self._hits[key] = valid_timestamps
            return True, 0

    def reset(self, key: Optional[str] = None):
        """Clears hit history (for specific key or all)."""
        with self._lock:
            if key:
                self._hits.pop(key, None)
            else:
                self._hits.clear()


rate_limiter = SlidingWindowRateLimiter()


def rate_limit_check(
    request: Request,
    max_requests: int = 20,
    window_seconds: int = 60
):
    """
    FastAPI dependency to enforce rate limiting on sensitive endpoints.
    Uses client host or X-Forwarded-For header.
    """
    client_ip = (
        request.headers.get("x-forwarded-for", "").split(",")[0].strip()
        or (request.client.host if request.client else "unknown")
    )
    endpoint = request.url.path
    key = f"{client_ip}:{endpoint}"

    allowed, retry_after = rate_limiter.is_allowed(
        key=key,
        max_requests=max_requests,
        window_seconds=window_seconds
    )

    if not allowed:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Límite de peticiones excedido ({max_requests} por {window_seconds}s). Reintente en {retry_after} segundos.",
            headers={"Retry-After": str(retry_after)}
        )
