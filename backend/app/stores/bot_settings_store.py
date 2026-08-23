"""Bot/service settings — telegram token, bot on/off, default speed, service
name, welcome messages — persisted as JSON, edited via the Settings API.
Seeded from env once, on first run; the file is authoritative after that.
"""

from __future__ import annotations

import json
import threading
from dataclasses import asdict, dataclass, fields, replace
from pathlib import Path


@dataclass
class BotSettings:
    telegram_token: str = ""
    bot_enabled: bool = False
    max_user_speed_limit: int = 30
    service_name: str = "fptn"
    welcome_message_en: str = ""
    welcome_message_ru: str = ""


_FIELD_NAMES = {f.name for f in fields(BotSettings)}


class BotSettingsStore:
    def __init__(self, path: Path, defaults: BotSettings | None = None):
        self.path = Path(path)
        self.path.parent.mkdir(parents=True, exist_ok=True)
        self._defaults = defaults if defaults is not None else BotSettings()
        self._lock = threading.Lock()
        if not self.path.exists():
            self._write(self._defaults)

    def _write(self, data: BotSettings) -> None:
        self.path.write_text(json.dumps(asdict(data), indent=2), encoding="utf-8")
        self.path.chmod(0o600)

    def get(self) -> BotSettings:
        try:
            raw = json.loads(self.path.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError):
            return self._defaults
        if not isinstance(raw, dict):
            return self._defaults
        return BotSettings(**{k: v for k, v in raw.items() if k in _FIELD_NAMES})

    def update(self, **changes) -> BotSettings:
        with self._lock:
            current = self.get()
            updated = replace(current, **{k: v for k, v in changes.items() if v is not None})
            self._write(updated)
            return updated
