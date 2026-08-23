"""Panel admins used for JWT login. Stored separately from VPN users as a JSON
file with bcrypt-hashed passwords::

    { "<login>": { "password_hash": "<bcrypt>", "must_change_password": bool } }
"""

from __future__ import annotations

import json
from pathlib import Path

import bcrypt


class AdminExists(Exception):
    def __init__(self, login: str):
        self.login = login
        super().__init__(login)


class AdminStore:
    def __init__(self, path: Path):
        self.path = Path(path)
        self.path.parent.mkdir(parents=True, exist_ok=True)

    def _load(self) -> dict:
        if not self.path.exists():
            return {}
        try:
            data = json.loads(self.path.read_text(encoding="utf-8") or "{}")
        except json.JSONDecodeError:
            return {}
        return data if isinstance(data, dict) else {}

    def _save(self, data: dict) -> None:
        self.path.write_text(json.dumps(data, indent=2), encoding="utf-8")
        self.path.chmod(0o600)

    @staticmethod
    def _hash(password: str) -> str:
        return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode()

    def authenticate(self, login: str, password: str) -> bool:
        entry = self._load().get(login)
        if not entry:
            return False
        try:
            return bcrypt.checkpw(password.encode("utf-8"), entry["password_hash"].encode("utf-8"))
        except (ValueError, KeyError):
            return False

    def must_change_password(self, login: str) -> bool:
        entry = self._load().get(login)
        return bool(entry and entry.get("must_change_password"))

    def create(self, login: str, password: str) -> None:
        data = self._load()
        if login in data:
            raise AdminExists(login)
        data[login] = {"password_hash": self._hash(password), "must_change_password": False}
        self._save(data)

    def change_password(self, login: str, current: str, new: str) -> bool:
        data = self._load()
        entry = data.get(login)
        if not entry or not bcrypt.checkpw(current.encode("utf-8"), entry["password_hash"].encode("utf-8")):
            return False
        entry["password_hash"] = self._hash(new)
        entry["must_change_password"] = False
        self._save(data)
        return True

    def ensure_seed(self, login: str | None, password: str | None, force_change: bool = False) -> None:
        """Seed the first admin when the store is empty (Grafana-style bootstrap)."""
        if self._load():
            return
        if login and password:
            self._save({login: {"password_hash": self._hash(password), "must_change_password": force_change}})
