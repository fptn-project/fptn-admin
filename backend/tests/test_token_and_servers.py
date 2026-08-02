import base64
import json


def _decode(token: str) -> dict:
    assert token.startswith("fptn:")
    payload = token[len("fptn:") :]
    payload += "=" * (-len(payload) % 4)
    return json.loads(base64.b64decode(payload))


def test_add_list_and_delete_server(client, auth):
    created = client.post("/api/v1/servers", headers=auth, json={"name": "S1", "host": "1.2.3.4", "port": 443})
    assert created.status_code == 201

    listed = client.get("/api/v1/servers", headers=auth).json()
    assert [s["name"] for s in listed["regular"]] == ["S1"]

    dup = client.post("/api/v1/servers", headers=auth, json={"name": "S1", "host": "1.2.3.4", "port": 443})
    assert dup.status_code == 409

    deleted = client.delete("/api/v1/servers/regular/S1", headers=auth)
    assert deleted.status_code == 204
    assert client.delete("/api/v1/servers/regular/S1", headers=auth).status_code == 404


def test_create_user_returns_token_with_servers(client, auth):
    client.post("/api/v1/servers", headers=auth, json={"name": "S1", "host": "1.2.3.4", "port": 443})

    resp = client.post("/api/v1/users", headers=auth, json={"username": "100", "password": "pw"})
    assert resp.status_code == 201
    data = _decode(resp.json()["token"])
    assert data["username"] == "100" and data["password"] == "pw"
    assert data["service_name"] == "fptn-test" and data["version"] == 1
    assert [s["name"] for s in data["servers"]] == ["S1"]


def test_premium_user_token_includes_premium_servers(client, auth):
    client.post("/api/v1/servers", headers=auth, json={"name": "R", "host": "1.1.1.1", "port": 443})
    client.post("/api/v1/servers", headers=auth, json={"name": "P", "host": "2.2.2.2", "port": 443, "kind": "premium"})

    resp = client.post("/api/v1/users", headers=auth, json={"username": "200", "password": "pw", "premiumAccess": True})
    data = _decode(resp.json()["token"])
    assert {s["name"] for s in data["servers"]} == {"R", "P"}


def test_issue_token_resets_password(client, auth):
    client.post("/api/v1/servers", headers=auth, json={"name": "S1", "host": "1.2.3.4", "port": 443})
    client.post("/api/v1/users", headers=auth, json={"username": "100", "password": "pw"})

    resp = client.post("/api/v1/users/100/token", headers=auth)
    assert resp.status_code == 200
    data = _decode(resp.json()["token"])
    assert data["username"] == "100" and data["password"] != "pw"


def test_issue_token_missing_user(client, auth):
    assert client.post("/api/v1/users/nope/token", headers=auth).status_code == 404
