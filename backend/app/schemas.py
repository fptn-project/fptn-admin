from typing import Literal, Optional

from pydantic import BaseModel, Field, field_validator


class AdminLogin(BaseModel):
    username: str
    password: str


class AdminCreate(BaseModel):
    username: str = Field(min_length=1)
    password: str = Field(min_length=4)


class AdminOut(BaseModel):
    username: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    mustChangePassword: bool = False


class ChangePassword(BaseModel):
    currentPassword: str
    newPassword: str = Field(min_length=8)


class VpnUser(BaseModel):
    username: str
    blocked: bool
    premiumAccess: bool
    maxSpeed: int


class UsersPage(BaseModel):
    users: list[VpnUser]
    total: int


class UserUpdate(BaseModel):
    username: Optional[str] = None
    maxSpeed: Optional[int] = Field(default=None, ge=0)
    blocked: Optional[bool] = None
    premiumAccess: Optional[bool] = None

    @field_validator("username")
    @classmethod
    def _alnum(cls, value: Optional[str]) -> Optional[str]:
        if value is not None and not value.isalnum():
            raise ValueError("username must be alphanumeric")
        return value


class UserCreate(BaseModel):
    username: str
    password: str
    maxSpeed: Optional[int] = Field(default=None, ge=0)
    premiumAccess: bool = False

    @field_validator("username")
    @classmethod
    def _alnum(cls, value: str) -> str:
        if not value.isalnum():
            raise ValueError("username must be alphanumeric")
        return value


class UserCreated(VpnUser):
    token: str


class UserToken(BaseModel):
    token: str


class Server(BaseModel):
    name: str
    host: str
    md5_fingerprint: str = ""
    port: int = 443
    ping: int = 0


class ServerCreate(Server):
    kind: Literal["regular", "premium", "censored"] = "regular"


class ServerUpdate(BaseModel):
    name: Optional[str] = None
    host: Optional[str] = None
    md5_fingerprint: Optional[str] = None
    port: Optional[int] = None
    ping: Optional[int] = None


class ServersList(BaseModel):
    regular: list[Server]
    premium: list[Server]
    censoredZone: list[Server]


class Highlights(BaseModel):
    totalUsers: int
    premiumUsers: int
    blockedUsers: int


class BotSettingsOut(BaseModel):
    telegramToken: str
    botEnabled: bool
    botRunning: bool
    maxUserSpeedLimit: int
    serviceName: str
    welcomeMessageEn: str
    welcomeMessageRu: str


class BotSettingsUpdate(BaseModel):
    telegramToken: Optional[str] = None
    maxUserSpeedLimit: Optional[int] = Field(default=None, ge=0)
    serviceName: Optional[str] = None
    welcomeMessageEn: Optional[str] = None
    welcomeMessageRu: Optional[str] = None


class BotEnabledUpdate(BaseModel):
    enabled: bool
