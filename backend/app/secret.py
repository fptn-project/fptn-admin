import logging
import secrets
from functools import cache
from pathlib import Path

from app.config import settings

logger = logging.getLogger("fptn_admin")


def load_or_create_secret(secret_file: Path) -> str:
    """Read the persisted JWT secret, or generate and persist a new random one
    so tokens survive restarts."""
    if secret_file.exists():
        stored = secret_file.read_text(encoding="utf-8").strip()
        if stored:
            return stored
    value = secrets.token_urlsafe(64)
    secret_file.parent.mkdir(parents=True, exist_ok=True)
    secret_file.write_text(value, encoding="utf-8")
    try:
        secret_file.chmod(0o600)
    except OSError:
        pass
    logger.info("Generated a new JWT secret at %s", secret_file)
    return value


@cache
def get_jwt_secret() -> str:
    return load_or_create_secret(settings.jwt_secret_file)
