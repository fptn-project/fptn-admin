from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    users_file: Path = Path("/etc/fptn/users.list")
    admins_file: Path = Path("/etc/fptn/admins.json")

    servers_file: Path = Path("/etc/fptn/servers.json")
    premium_servers_file: Path = Path("/etc/fptn/premium_servers.json")
    censored_servers_file: Path = Path("/etc/fptn/servers_censored_zone.json")

    service_name: str = "fptn"
    enable_brotli_compression: bool = False

    jwt_secret_file: Path = Path("/etc/fptn/jwt_secret")
    jwt_algorithm: str = "HS256"
    jwt_ttl_minutes: int = 60

    max_user_speed_limit: int = 30

    admin_login: str | None = "admin"
    admin_password: str | None = "admin"

    cors_origins: str = "*"

    api_prefix: str = "/api/v1"

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


settings = Settings()
