"""Background thread that measures real TCP-connect latency to every server
and writes it back into the server store, so the panel's "ping" column
reflects reality instead of the static default.
"""

from __future__ import annotations

import logging
import socket
import threading
import time

from app.stores.server_store import ServerStore

logger = logging.getLogger("fptn_admin.ping_checker")

CHECK_INTERVAL_SECONDS = 10
CONNECT_TIMEOUT_SECONDS = 2
UNREACHABLE_PING = -1


def measure_ping_ms(host: str, port: int) -> int:
    start = time.monotonic()
    try:
        with socket.create_connection((host, port), timeout=CONNECT_TIMEOUT_SECONDS):
            pass
    except OSError:
        return UNREACHABLE_PING
    return round((time.monotonic() - start) * 1000)


class PingChecker:
    """Starts/stops its own polling loop in a background thread."""

    def __init__(self, server_store: ServerStore, interval: int = CHECK_INTERVAL_SECONDS) -> None:
        self._server_store = server_store
        self._interval = interval
        self._thread: threading.Thread | None = None
        self._stop_event = threading.Event()

    @property
    def running(self) -> bool:
        return self._thread is not None and self._thread.is_alive()

    def start(self) -> None:
        if self.running:
            return
        self._stop_event.clear()
        self._thread = threading.Thread(target=self._run, daemon=True)
        self._thread.start()

    def stop(self) -> None:
        self._stop_event.set()
        if self._thread is not None:
            self._thread.join(timeout=5)
        self._thread = None

    def _run(self) -> None:
        while not self._stop_event.is_set():
            try:
                self.check_once()
            except Exception:  # pylint: disable=broad-exception-caught
                # One bad cycle (e.g. a transient socket error) shouldn't kill the loop.
                logger.exception("Ping check cycle failed")
            self._stop_event.wait(self._interval)

    def check_once(self) -> None:
        servers = self._server_store.list()
        pings = {
            kind: {server["name"]: measure_ping_ms(server["host"], server["port"]) for server in items}
            for kind, items in servers.items()
        }
        self._server_store.update_pings(pings)
