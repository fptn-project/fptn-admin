import base64
import json


def _decode(token: str) -> dict:
    payload = token[len("fptn:") :]
    payload += "=" * (-len(payload) % 4)
    return json.loads(base64.b64decode(payload))


def test_get_settings_requires_auth(client):
    assert client.get("/api/v1/settings").status_code == 401


def test_get_settings_defaults(client, auth):
    resp = client.get("/api/v1/settings", headers=auth)
    assert resp.status_code == 200
    body = resp.json()
    assert body["telegramToken"] == ""
    assert body["botEnabled"] is False
    assert body["botRunning"] is False
    assert body["serviceName"] == "fptn-test"
    assert body["maxUserSpeedLimit"] == 30
    assert body["welcomeMessageEn"] == ""
    assert body["welcomeMessageRu"] == ""


def test_update_settings_partial(client, auth):
    resp = client.put(
        "/api/v1/settings",
        headers=auth,
        json={"welcomeMessageEn": "hi", "welcomeMessageRu": "привет", "maxUserSpeedLimit": 50},
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["welcomeMessageEn"] == "hi"
    assert body["welcomeMessageRu"] == "привет"
    assert body["maxUserSpeedLimit"] == 50
    # untouched fields survive the partial update
    assert body["serviceName"] == "fptn-test"
    assert body["botEnabled"] is False


def test_telegram_token_is_masked(client, auth):
    resp = client.put("/api/v1/settings", headers=auth, json={"telegramToken": "1234567:ABCDEFGHIJKLMNOPQ"})
    assert resp.status_code == 200
    assert resp.json()["telegramToken"] == "*" * (len("1234567:ABCDEFGHIJKLMNOPQ") - 4) + "NOPQ"

    listed = client.get("/api/v1/settings", headers=auth).json()
    assert listed["telegramToken"].endswith("NOPQ")
    assert "1234567" not in listed["telegramToken"]


def test_bot_enabled_requires_auth(client):
    assert client.put("/api/v1/settings/bot-enabled", json={"enabled": True}).status_code == 401


def test_enabling_bot_without_token_does_not_start_it(client, auth):
    resp = client.put("/api/v1/settings/bot-enabled", headers=auth, json={"enabled": True})
    assert resp.status_code == 200
    body = resp.json()
    assert body["botEnabled"] is True
    assert body["botRunning"] is False


def test_general_update_no_longer_toggles_bot_enabled(client, auth):
    resp = client.put("/api/v1/settings", headers=auth, json={"botEnabled": True})
    assert resp.status_code == 200
    assert resp.json()["botEnabled"] is False

    client.put("/api/v1/settings/bot-enabled", headers=auth, json={"enabled": True})
    resp = client.put("/api/v1/settings", headers=auth, json={"serviceName": "renamed"})
    assert resp.json()["botEnabled"] is True


def test_service_name_change_applies_to_new_tokens(client, auth):
    client.put("/api/v1/settings", headers=auth, json={"serviceName": "renamed"})
    client.post("/api/v1/servers", headers=auth, json={"name": "S1", "host": "1.2.3.4", "port": 443})

    resp = client.post("/api/v1/users", headers=auth, json={"username": "100", "password": "pw"})
    assert _decode(resp.json()["token"])["service_name"] == "renamed"
