from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    users_file: Path = Path("/etc/fptn/users.list")
    admins_file: Path = Path("/etc/fptn/admins.json")

    servers_file: Path = Path("/etc/fptn/servers.json")
    premium_servers_file: Path = Path("/etc/fptn/premium_servers.json")
    censored_servers_file: Path = Path("/etc/fptn/servers_censored_zone.json")

    enable_brotli_compression: bool = False

    # First-run seed for bot_settings.json, same as admin_login/password below.
    telegram_token: str = ""
    bot_enabled: bool = False
    max_user_speed_limit: int = 30
    service_name: str = "fptn"
    welcome_message_en: str = ""
    welcome_message_ru: str = ""
    bot_settings_file: Path = Path("/etc/fptn/bot_settings.json")

    jwt_secret_file: Path = Path("/etc/fptn/jwt_secret")
    jwt_algorithm: str = "HS256"
    jwt_ttl_minutes: int = 60

    admin_login: str | None = "admin"
    admin_password: str | None = "admin"

    cors_origins: str = "*"

    api_prefix: str = "/api/v1"

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


settings = Settings()
