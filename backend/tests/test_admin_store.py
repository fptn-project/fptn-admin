from app.stores.admin_store import AdminStore


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
