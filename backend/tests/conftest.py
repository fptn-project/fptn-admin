import os
import tempfile

import pytest

# Point the stores at throwaway files BEFORE the app package is imported, so the
# module-level singletons in app.deps pick these up.
_TMP = tempfile.mkdtemp(prefix="fptn-admin-tests-")
os.environ["USERS_FILE"] = os.path.join(_TMP, "users.list")
os.environ["ADMINS_FILE"] = os.path.join(_TMP, "admins.json")
os.environ["SERVERS_FILE"] = os.path.join(_TMP, "servers.json")
os.environ["PREMIUM_SERVERS_FILE"] = os.path.join(_TMP, "premium_servers.json")
os.environ["CENSORED_SERVERS_FILE"] = os.path.join(_TMP, "servers_censored_zone.json")
os.environ["JWT_SECRET_FILE"] = os.path.join(_TMP, "jwt_secret")
os.environ["ADMIN_LOGIN"] = "admin"
os.environ["ADMIN_PASSWORD"] = "adminpass"
os.environ["MAX_USER_SPEED_LIMIT"] = "30"
os.environ["SERVICE_NAME"] = "fptn-test"
os.environ["BOT_SETTINGS_FILE"] = os.path.join(_TMP, "bot_settings.json")


@pytest.fixture(scope="session")
def client():
    from fastapi.testclient import TestClient

    from app.main import app

    with TestClient(app) as c:
        yield c


@pytest.fixture
def auth(client):
    resp = client.post("/api/v1/auth/login", json={"username": "admin", "password": "adminpass"})
    assert resp.status_code == 200
    return {"Authorization": f"Bearer {resp.json()['access_token']}"}


@pytest.fixture(autouse=True)
def _clean_state():
    from app.deps import vpn_store
    from app.telegram_bot import bot_runner

    open(vpn_store.path, "w").close()
    for name in ("SERVERS_FILE", "PREMIUM_SERVERS_FILE", "CENSORED_SERVERS_FILE"):
        with open(os.environ[name], "w") as f:
            f.write("[]")
    if os.path.exists(os.environ["BOT_SETTINGS_FILE"]):
        os.remove(os.environ["BOT_SETTINGS_FILE"])
    yield
    bot_runner.stop()
