# fptn-admin

Admin panel for an [fptn](https://github.com/batchar2/fptn) deployment: a
backend API for managing VPN users + a frontend (SPA) that consumes it.

```
fptn-admin/
  backend/     FastAPI service (Poetry, Docker)
  frontend/    admin panel SPA (React + TypeScript + Vite)
  docker-compose.yml
```

## How VPN users are stored

There is **one** source of truth: the fptn `users.list` file, shared with the
fptn C++ server and the telegram-bot. One line per user:

```
<telegramId> <sha256_hex_password> <speed_MB> <is_premium(0|1)>
```

- passwords are SHA-256 hex (so the C++ server accepts them);
- `maxSpeed` maps to the speed column (MB);
- `premiumAccess` maps to `is_premium`;
- **`blocked` is derived, not stored:** a user is blocked when `speed == 0`.
  Blocking sets speed to 0 (the fptn server then throttles the tunnel to a
  standstill). Unblocking restores speed from the request's `maxSpeed`, or
  `MAX_USER_SPEED_LIMIT` if none is given.

Panel admins (JWT login) are unrelated to VPN users and live in a separate
`admins.json` (bcrypt-hashed passwords). On an empty store the first admin is
seeded from `ADMIN_LOGIN` / `ADMIN_PASSWORD` (default `admin` / `admin`,
Grafana-style). While the default password is in use, `login` returns
`mustChangePassword: true` — the frontend should force the change-password form
before letting the admin in.

## API

Every route except `/api/v1/auth/login` requires `Authorization: Bearer <token>`.

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/v1/auth/login` | admin login → JWT (+ `mustChangePassword`) |
| POST | `/api/v1/auth/change-password` | change own password (needs current password) |
| POST | `/api/v1/auth/register` | create a panel (service) user |
| GET  | `/api/v1/users?page=&pageSize=&search=&filter=` | list (filter: all\|blocked\|premium) |
| GET  | `/api/v1/users/{username}` | one user (404 `{"message":"User not found"}`) |
| PUT  | `/api/v1/users/{username}` | partial update (username, maxSpeed, blocked, premiumAccess) |
| POST | `/api/v1/users` | create a VPN user → returns the `token` |
| POST | `/api/v1/users/{username}/token` | (re)issue token — resets the password to a new random one |
| GET  | `/api/v1/servers` | list servers (`regular` / `premium` / `censoredZone`) |
| POST | `/api/v1/servers` | add a server (`kind`: regular\|premium\|censored) |
| DELETE | `/api/v1/servers/{kind}/{name}` | remove a server |
| GET  | `/api/v1/dashboard/highlights` | `{ totalUsers, premiumUsers }` |

### VPN access token

`token` is the string you paste into the fptn client. It is built exactly like
the telegram-bot: a JSON `{version, service_name, username, password, servers,
censored_zone_servers}` base64-encoded behind a `fptn:` prefix (`fptnb:` +
brotli when `ENABLE_BROTLI_COMPRESSION=true`). `servers` = premium + regular for
premium users, regular only otherwise — read from the shared `servers.json` /
`premium_servers.json` / `servers_censored_zone.json`.

The token embeds the **plaintext** password (only its hash is stored), so it can
only be produced when the password is known: on create (returned in the
response) or via `.../token`, which generates a fresh password and updates the
stored hash — same behaviour as the bot's `/token`.

## Run

```bash
cp .env.demo .env    # optionally set ADMIN_PASSWORD, FPTN_CONFIGS_FOLDER, ...
docker compose up --build fptn-admin-backend
```

Defaults work out of the box: admin `admin`/`admin` (forced to change on first
login); the JWT signing secret is generated automatically and persisted in the
data folder.

Docs at `http://localhost:8000/docs`.

### Local dev (without Docker)

```bash
cd backend
poetry install
poetry run uvicorn app.main:app --reload
```
