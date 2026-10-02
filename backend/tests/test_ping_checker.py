import socket

import app.ping_checker as ping_checker_module
from app.ping_checker import PING_SAMPLES, PingChecker, UNREACHABLE_PING, measure_ping_ms
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


def test_measure_ping_ms_takes_three_samples_and_averages_them(monkeypatch):
    calls = []

    def _fake_measure_once(host, port):
        calls.append((host, port))
        return {0: 10, 1: 20, 2: 30}[len(calls) - 1]

    monkeypatch.setattr(ping_checker_module, "_measure_once", _fake_measure_once)

    assert measure_ping_ms("1.2.3.4", 443) == 20
    assert len(calls) == PING_SAMPLES
    assert all(call == ("1.2.3.4", 443) for call in calls)


def test_measure_ping_ms_ignores_failed_samples_when_averaging(monkeypatch):
    results = iter([10, None, 30])
    monkeypatch.setattr(ping_checker_module, "_measure_once", lambda host, port: next(results))

    assert measure_ping_ms("1.2.3.4", 443) == 20  # average of the two that succeeded


def test_measure_ping_ms_unreachable_only_when_every_sample_fails(monkeypatch):
    monkeypatch.setattr(ping_checker_module, "_measure_once", lambda host, port: None)

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


def test_update_pings_isolates_a_failure_to_one_kind(tmp_path, monkeypatch):
    """A permission error (or any OSError) writing one file — e.g. the host
    file got re-created with the wrong owner — must not stop the other
    kinds from being updated."""
    store = ServerStore(
        tmp_path / "servers.json",
        tmp_path / "premium_servers.json",
        tmp_path / "servers_censored_zone.json",
    )
    store.add("regular", {"name": "S1", "host": "1.1.1.1", "md5_fingerprint": "", "port": 443, "ping": 0})
    store.add("premium", {"name": "P1", "host": "2.2.2.2", "md5_fingerprint": "", "port": 443, "ping": 0})

    real_write = store._write  # pylint: disable=protected-access

    def _write_with_permission_error(kind, servers):
        if kind == "regular":
            raise PermissionError("Permission denied")
        real_write(kind, servers)

    monkeypatch.setattr(store, "_write", _write_with_permission_error)

    store.update_pings({"regular": {"S1": 99}, "premium": {"P1": 42}, "censored": {}})

    listed = store.list()
    assert listed["regular"][0]["ping"] == 0  # write failed, left untouched
    assert listed["premium"][0]["ping"] == 42  # other kind still updated


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
