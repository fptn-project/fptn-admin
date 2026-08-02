import pytest

from app.stores.vpn_user_store import (
    UserExists,
    UserNotFound,
    VpnUserStore,
    hash_password,
)


@pytest.fixture
def store(tmp_path):
    return VpnUserStore(tmp_path / "users.list")


def _update(store, username, **kw):
    kw.setdefault("new_username", None)
    kw.setdefault("max_speed", None)
    kw.setdefault("blocked", None)
    kw.setdefault("premium", None)
    kw.setdefault("default_speed", 30)
    return store.update(username, **kw)


def test_create_writes_fptn_format(store):
    store.create("184672951", "secret", 250, True)
    line = store.path.read_text().splitlines()[0].split()
    assert line == ["184672951", hash_password("secret"), "250", "1"]


def test_create_duplicate_raises(store):
    store.create("100", "pw", 100, False)
    with pytest.raises(UserExists):
        store.create("100", "pw2", 50, False)


def test_blocked_is_derived_from_speed(store):
    store.create("100", "pw", 100, False)
    assert store.get("100").blocked is False
    _update(store, "100", blocked=True)
    rec = store.get("100")
    assert rec.blocked is True and rec.speed == 0


def test_unblock_without_maxspeed_uses_default(store):
    store.create("100", "pw", 100, False)
    _update(store, "100", blocked=True)
    _update(store, "100", blocked=False)
    assert store.get("100").speed == 30


def test_maxspeed_zero_blocks_and_positive_unblocks(store):
    store.create("100", "pw", 100, False)
    _update(store, "100", max_speed=0)
    assert store.get("100").blocked is True
    _update(store, "100", max_speed=150)
    assert store.get("100").blocked is False and store.get("100").speed == 150


def test_blocked_wins_over_maxspeed(store):
    store.create("100", "pw", 100, False)
    _update(store, "100", max_speed=150, blocked=True)
    assert store.get("100").speed == 0


def test_premium_toggle(store):
    store.create("100", "pw", 100, False)
    _update(store, "100", premium=True)
    assert store.get("100").is_premium is True


def test_rename(store):
    store.create("100", "pw", 100, False)
    _update(store, "100", new_username="200")
    assert store.get("100") is None
    assert store.get("200").username == "200"


def test_rename_collision_raises(store):
    store.create("100", "pw", 100, False)
    store.create("200", "pw", 100, False)
    with pytest.raises(UserExists):
        _update(store, "100", new_username="200")


def test_update_missing_raises(store):
    with pytest.raises(UserNotFound):
        _update(store, "999", blocked=True)


def test_list_filters_search_pagination(store):
    store.create("100", "pw", 100, False)
    store.create("184672951", "pw", 250, True)
    store.create("184600000", "pw", 0, False)  # blocked

    _, total = store.list(search=None, filter="all", page=1, page_size=20)
    assert total == 3

    items, total = store.list(search=None, filter="premium", page=1, page_size=20)
    assert total == 1 and items[0].username == "184672951"

    items, total = store.list(search=None, filter="blocked", page=1, page_size=20)
    assert total == 1 and items[0].username == "184600000"

    items, total = store.list(search="1846", filter="all", page=1, page_size=20)
    assert total == 2

    # pagination: page 2 of size 1 over 3 sorted users
    page1, _ = store.list(search=None, filter="all", page=1, page_size=1)
    page2, _ = store.list(search=None, filter="all", page=2, page_size=1)
    assert page1[0].username != page2[0].username


def test_stats(store):
    store.create("100", "pw", 100, False)
    store.create("200", "pw", 250, True)
    assert store.stats() == (2, 1)
