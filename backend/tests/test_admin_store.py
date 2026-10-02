import pytest

from app.stores.admin_store import AdminExists, AdminStore


def test_default_seed_forces_password_change(tmp_path):
    store = AdminStore(tmp_path / "admins.json")
    store.ensure_seed("admin", "admin", force_change=True)

    assert store.must_change_password("admin") is True
    assert store.change_password("admin", "admin", "newpass12") is True
    assert store.must_change_password("admin") is False
    assert store.authenticate("admin", "newpass12") is True


def test_custom_seed_does_not_force_change(tmp_path):
    store = AdminStore(tmp_path / "admins.json")
    store.ensure_seed("admin", "s3cret-strong", force_change=False)
    assert store.must_change_password("admin") is False


def test_change_password_rejects_wrong_current(tmp_path):
    store = AdminStore(tmp_path / "admins.json")
    store.ensure_seed("admin", "secret", force_change=False)
    assert store.change_password("admin", "wrong", "newpass12") is False


def test_update_profile_renames_login_and_changes_password(tmp_path):
    store = AdminStore(tmp_path / "admins.json")
    store.ensure_seed("admin", "secret", force_change=False)

    new_login = store.update_profile("admin", "secret", "newlogin", "newpass12")
    assert new_login == "newlogin"
    assert store.authenticate("newlogin", "newpass12") is True
    assert store.authenticate("admin", "secret") is False


def test_update_profile_rejects_wrong_current_password(tmp_path):
    store = AdminStore(tmp_path / "admins.json")
    store.ensure_seed("admin", "secret", force_change=False)

    assert store.update_profile("admin", "wrong", "newlogin", None) is None
    assert store.authenticate("admin", "secret") is True


def test_update_profile_rejects_duplicate_login(tmp_path):
    store = AdminStore(tmp_path / "admins.json")
    store.ensure_seed("admin", "secret", force_change=False)
    store.create("other", "otherpass")

    with pytest.raises(AdminExists):
        store.update_profile("admin", "secret", "other", None)
    assert store.authenticate("admin", "secret") is True
