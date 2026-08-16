def test_login_bad_credentials(client):
    resp = client.post("/api/v1/auth/login", json={"username": "admin", "password": "wrong"})
    assert resp.status_code == 401


def test_protected_route_requires_token(client):
    assert client.get("/api/v1/users").status_code == 401


def test_create_get_and_404(client, auth):
    resp = client.post(
        "/api/v1/users",
        headers=auth,
        json={"username": "184672951", "password": "secret", "maxSpeed": 250, "premiumAccess": True},
    )
    assert resp.status_code == 201
    body = resp.json()
    assert body["username"] == "184672951" and body["premiumAccess"] is True
    assert body["maxSpeed"] == 250 and body["blocked"] is False
    assert body["token"].startswith("fptn:")

    got = client.get("/api/v1/users/184672951", headers=auth)
    assert got.status_code == 200 and got.json()["maxSpeed"] == 250

    missing = client.get("/api/v1/users/000", headers=auth)
    assert missing.status_code == 404 and missing.json() == {"message": "User not found"}


def test_create_defaults_and_duplicate(client, auth):
    resp = client.post(
        "/api/v1/users",
        headers=auth,
        json={"username": "100", "password": "pw"},
    )
    assert resp.status_code == 201
    assert resp.json()["maxSpeed"] == 30 and resp.json()["premiumAccess"] is False

    dup = client.post(
        "/api/v1/users",
        headers=auth,
        json={"username": "100", "password": "pw"},
    )
    assert dup.status_code == 409


def test_block_then_unblock(client, auth):
    client.post("/api/v1/users", headers=auth, json={"username": "100", "password": "pw", "maxSpeed": 100})

    blocked = client.put("/api/v1/users/100", headers=auth, json={"blocked": True})
    assert blocked.json() == {"username": "100", "blocked": True, "premiumAccess": False, "maxSpeed": 0}

    unblocked = client.put("/api/v1/users/100", headers=auth, json={"blocked": False, "maxSpeed": 200})
    assert unblocked.json()["blocked"] is False
    assert unblocked.json()["maxSpeed"] == 200


def test_list_filter_search_total(client, auth):
    for name, speed, premium in [("100", 100, False), ("184672951", 250, True), ("184600000", 0, False)]:
        client.post(
            "/api/v1/users",
            headers=auth,
            json={"username": name, "password": "pw", "maxSpeed": speed, "premiumAccess": premium},
        )

    allr = client.get("/api/v1/users?page=1&pageSize=20", headers=auth).json()
    assert allr["total"] == 3 and len(allr["users"]) == 3

    prem = client.get("/api/v1/users?filter=premium", headers=auth).json()
    assert prem["total"] == 1 and prem["users"][0]["username"] == "184672951"

    blk = client.get("/api/v1/users?filter=blocked", headers=auth).json()
    assert blk["total"] == 1 and blk["users"][0]["username"] == "184600000"

    srch = client.get("/api/v1/users?search=1846", headers=auth).json()
    assert srch["total"] == 2


def test_register_service_user_requires_auth(client):
    resp = client.post("/api/v1/auth/register", json={"username": "op1", "password": "secret"})
    assert resp.status_code == 401


def test_register_service_user_and_login(client, auth):
    created = client.post("/api/v1/auth/register", headers=auth, json={"username": "op2", "password": "secret"})
    assert created.status_code == 201 and created.json() == {"username": "op2"}

    logged_in = client.post("/api/v1/auth/login", json={"username": "op2", "password": "secret"})
    assert logged_in.status_code == 200 and "access_token" in logged_in.json()

    dup = client.post("/api/v1/auth/register", headers=auth, json={"username": "op2", "password": "secret"})
    assert dup.status_code == 409


def test_change_password_flow(client, auth):
    client.post("/api/v1/auth/register", headers=auth, json={"username": "chp", "password": "origpass"})
    token = client.post("/api/v1/auth/login", json={"username": "chp", "password": "origpass"}).json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    wrong = client.post(
        "/api/v1/auth/change-password",
        headers=headers,
        json={"currentPassword": "nope", "newPassword": "brandnew1"},
    )
    assert wrong.status_code == 401

    same = client.post(
        "/api/v1/auth/change-password",
        headers=headers,
        json={"currentPassword": "origpass", "newPassword": "origpass"},
    )
    assert same.status_code == 400

    ok = client.post(
        "/api/v1/auth/change-password",
        headers=headers,
        json={"currentPassword": "origpass", "newPassword": "brandnew1"},
    )
    assert ok.status_code == 204

    assert client.post("/api/v1/auth/login", json={"username": "chp", "password": "origpass"}).status_code == 401
    assert client.post("/api/v1/auth/login", json={"username": "chp", "password": "brandnew1"}).status_code == 200


def test_change_password_requires_auth(client):
    resp = client.post(
        "/api/v1/auth/change-password",
        json={"currentPassword": "x", "newPassword": "brandnew1"},
    )
    assert resp.status_code == 401


def test_dashboard_highlights(client, auth):
    client.post("/api/v1/users", headers=auth, json={"username": "100", "password": "pw"})
    client.post("/api/v1/users", headers=auth, json={"username": "200", "password": "pw", "premiumAccess": True})

    resp = client.get("/api/v1/dashboard/highlights", headers=auth)
    assert resp.status_code == 200
    assert resp.json() == {"totalUsers": 2, "premiumUsers": 1, "blockedUsers": 0}
