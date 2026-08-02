"""Read/write access to the fptn ``users.list`` file — the single source of
truth for VPN users.

File format (one user per line), shared with the fptn C++ server and the
telegram-bot::

    <telegramId> <sha256_hex_password> <speed_MB> <is_premium(0|1)>

Conventions used by this service:
  * ``blocked`` is derived, not stored: a user is blocked when ``speed == 0``.
  * writes are atomic (temp file + ``os.replace``) and guarded by an exclusive
    file lock so we never clash with the bot writing the same file.
"""

from __future__ import annotations

import fcntl
import hashlib
import os
import tempfile
from contextlib import contextmanager
from dataclasses import dataclass
from pathlib import Path


class UserNotFound(Exception):
    def __init__(self, username: str):
        self.username = username
        super().__init__(username)


class UserExists(Exception):
    def __init__(self, username: str):
        self.username = username
        super().__init__(username)


@dataclass
class VpnRecord:
    username: str
    password_hash: str
    speed: int
    is_premium: bool

    @property
    def blocked(self) -> bool:
        return self.speed == 0


def hash_password(password: str) -> str:
    """SHA-256 hex — must match the fptn C++ server's hashing."""
    return hashlib.sha256(password.encode("utf-8")).hexdigest()


class VpnUserStore:
    def __init__(self, path: Path):
        self.path = Path(path)
        self.path.parent.mkdir(parents=True, exist_ok=True)
        if not self.path.exists():
            self.path.touch()

    def _read_all(self) -> dict[str, VpnRecord]:
        users: dict[str, VpnRecord] = {}
        if not self.path.exists():
            return users
        with self.path.open("r", encoding="utf-8") as f:
            for line in f:
                parts = line.split()
                if len(parts) < 3:
                    continue
                username, password_hash, speed = parts[0], parts[1], parts[2]
                try:
                    speed_int = int(speed)
                except ValueError:
                    continue
                is_premium = len(parts) >= 4 and parts[3] == "1"
                users[username] = VpnRecord(username, password_hash, speed_int, is_premium)
        return users

    def _write_all(self, users: dict[str, VpnRecord]) -> None:
        directory = self.path.parent
        fd, tmp = tempfile.mkstemp(dir=directory, prefix=".users.", suffix=".tmp")
        try:
            with os.fdopen(fd, "w") as f:
                for rec in users.values():
                    premium = "1" if rec.is_premium else "0"
                    f.write(f"{rec.username} {rec.password_hash} {rec.speed} {premium}\n")
                f.flush()
                os.fsync(f.fileno())
            os.replace(tmp, self.path)
        finally:
            if os.path.exists(tmp):
                os.unlink(tmp)

    @contextmanager
    def _locked(self):
        lock_path = str(self.path) + ".lock"
        with open(lock_path, "w", encoding="utf-8") as lf:
            fcntl.flock(lf, fcntl.LOCK_EX)
            try:
                yield
            finally:
                fcntl.flock(lf, fcntl.LOCK_UN)

    def list(
        self,
        *,
        search: str | None,
        filter: str,
        page: int,
        page_size: int,
    ) -> tuple[list[VpnRecord], int]:
        users = list(self._read_all().values())
        if search:
            users = [u for u in users if search in u.username]
        if filter == "blocked":
            users = [u for u in users if u.blocked]
        elif filter == "premium":
            users = [u for u in users if u.is_premium]
        users.sort(key=lambda u: u.username)
        total = len(users)
        start = (page - 1) * page_size
        return users[start : start + page_size], total

    def get(self, username: str) -> VpnRecord | None:
        return self._read_all().get(username)

    def set_password(self, username: str, password: str) -> VpnRecord:
        with self._locked():
            users = self._read_all()
            rec = users.get(username)
            if rec is None:
                raise UserNotFound(username)
            rec.password_hash = hash_password(password)
            self._write_all(users)
            return rec

    def stats(self) -> tuple[int, int]:
        users = list(self._read_all().values())
        return len(users), sum(1 for u in users if u.is_premium)

    def create(self, username: str, password: str, max_speed: int, is_premium: bool) -> VpnRecord:
        with self._locked():
            users = self._read_all()
            if username in users:
                raise UserExists(username)
            rec = VpnRecord(username, hash_password(password), max_speed, is_premium)
            users[username] = rec
            self._write_all(users)
            return rec

    def update(
        self,
        username: str,
        *,
        new_username: str | None,
        max_speed: int | None,
        blocked: bool | None,
        premium: bool | None,
        default_speed: int,
    ) -> VpnRecord:
        with self._locked():
            users = self._read_all()
            rec = users.get(username)
            if rec is None:
                raise UserNotFound(username)

            if premium is not None:
                rec.is_premium = premium

            new_speed = rec.speed
            if max_speed is not None:
                new_speed = max_speed
            if blocked is not None:
                if blocked:
                    new_speed = 0
                elif new_speed == 0:
                    new_speed = max_speed if max_speed is not None else default_speed
            rec.speed = new_speed

            if new_username and new_username != username:
                if new_username in users:
                    raise UserExists(new_username)
                rec.username = new_username
                users[new_username] = rec
                del users[username]

            self._write_all(users)
            return rec
