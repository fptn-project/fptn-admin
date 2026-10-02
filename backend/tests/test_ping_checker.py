import socket

from app.ping_checker import PingChecker, UNREACHABLE_PING, measure_ping_ms
from app.stores.server_store import ServerStore


def test_measure_ping_ms_returns_non_negative_on_success(monkeypatch):
    class FakeSocket:
        def __enter__(self):
            return self

        def __exit__(self, *exc):
            return False

    monkeypatch.setattr(socket, "create_connection", lambda addr, timeout: FakeSocket())

    assert measure_ping_ms("1.2.3.4", 443) >= 0


def test_measure_ping_ms_returns_sentinel_on_failure(monkeypatch):
    def _raise(addr, timeout):
        raise OSError("connection refused")

    monkeypatch.setattr(socket, "create_connection", _raise)

    assert measure_ping_ms("1.2.3.4", 443) == UNREACHABLE_PING


def test_update_pings_writes_only_matching_servers(tmp_path):
    store = ServerStore(
        tmp_path / "servers.json",
        tmp_path / "premium_servers.json",
        tmp_path / "servers_censored_zone.json",
    )
    store.add("regular", {"name": "S1", "host": "1.1.1.1", "md5_fingerprint": "", "port": 443, "ping": 0})
    store.add("regular", {"name": "S2", "host": "2.2.2.2", "md5_fingerprint": "", "port": 443, "ping": 0})
    store.add("premium", {"name": "P1", "host": "3.3.3.3", "md5_fingerprint": "", "port": 443, "ping": 0})

    store.update_pings({"regular": {"S1": 42}, "premium": {}, "censored": {}})

    listed = store.list()
    assert {s["name"]: s["ping"] for s in listed["regular"]} == {"S1": 42, "S2": 0}
    assert {s["name"]: s["ping"] for s in listed["premium"]} == {"P1": 0}


def test_check_once_measures_every_server_and_updates_store(tmp_path, monkeypatch):
    store = ServerStore(
        tmp_path / "servers.json",
        tmp_path / "premium_servers.json",
        tmp_path / "servers_censored_zone.json",
    )
    store.add("regular", {"name": "S1", "host": "1.1.1.1", "md5_fingerprint": "", "port": 443, "ping": 0})

    monkeypatch.setattr("app.ping_checker.measure_ping_ms", lambda host, port: 7)

    checker = PingChecker(store)
    checker.check_once()

    listed = store.list()
    assert listed["regular"][0]["ping"] == 7


def test_start_and_stop_runs_in_background_and_stops_cleanly(tmp_path):
    store = ServerStore(
        tmp_path / "servers.json",
        tmp_path / "premium_servers.json",
        tmp_path / "servers_censored_zone.json",
    )
    checker = PingChecker(store, interval=3600)

    checker.start()
    assert checker.running

    checker.stop()
    assert not checker.running
