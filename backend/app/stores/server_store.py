from __future__ import annotations

import json
from pathlib import Path


class ServerExists(Exception):
    def __init__(self, name: str):
        self.name = name
        super().__init__(name)


class ServerNotFound(Exception):
    def __init__(self, name: str):
        self.name = name
        super().__init__(name)


class ServerStore:
    def __init__(self, regular_file: Path, premium_file: Path, censored_file: Path):
        self._files = {
            "regular": Path(regular_file),
            "premium": Path(premium_file),
            "censored": Path(censored_file),
        }
        for path in self._files.values():
            path.parent.mkdir(parents=True, exist_ok=True)

    def _read(self, kind: str) -> list[dict]:
        path = self._files[kind]
        if not path.exists():
            return []
        try:
            data = json.loads(path.read_text(encoding="utf-8") or "[]")
        except json.JSONDecodeError:
            return []
        return data if isinstance(data, list) else []

    def _write(self, kind: str, servers: list[dict]) -> None:
        self._files[kind].write_text(json.dumps(servers, indent=4), encoding="utf-8")

    def list(self) -> dict[str, list[dict]]:
        return {kind: self._read(kind) for kind in self._files}

    def add(self, kind: str, server: dict) -> dict:
        servers = self._read(kind)
        if any(s.get("name") == server["name"] for s in servers):
            raise ServerExists(server["name"])
        servers.append(server)
        self._write(kind, servers)
        return server

    def delete(self, kind: str, name: str) -> None:
        servers = self._read(kind)
        remaining = [s for s in servers if s.get("name") != name]
        if len(remaining) == len(servers):
            raise ServerNotFound(name)
        self._write(kind, remaining)
