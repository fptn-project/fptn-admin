from typing import Literal, Optional

from fastapi import APIRouter, Depends, Query, status

from app.config import settings
from app.deps import bot_settings_store, server_store, vpn_store
from app.schemas import UserCreate, UserCreated, UsersPage, UserToken, UserUpdate, VpnUser
from app.security import get_current_admin
from app.stores.vpn_user_store import UserNotFound, VpnRecord
from app.vpn_token import build_access_link, build_token, generate_password


router = APIRouter(prefix="/users", tags=["users"], dependencies=[Depends(get_current_admin)])


def _to_user(rec: VpnRecord) -> VpnUser:
    return VpnUser(username=rec.username, blocked=rec.blocked, premiumAccess=rec.is_premium, maxSpeed=rec.speed)


def _issue_token(username: str, password: str, is_premium: bool) -> str:
    servers = server_store.list()
    payload = build_token(
        service_name=bot_settings_store.get().service_name,
        username=username,
        password=password,
        is_premium=is_premium,
        regular=servers["regular"],
        premium=servers["premium"],
        censored=servers["censored"],
    )
    return build_access_link(payload, settings.enable_brotli_compression)


@router.get(
    "",
    response_model=UsersPage,
    summary="List VPN users",
    description="Paginated list. `search` matches a telegramId substring; `filter` is all | blocked | premium.",
)
def list_users(
    page: int = Query(1, ge=1),
    pageSize: int = Query(20, ge=1, le=1000),
    search: Optional[str] = None,
    filter: Literal["all", "blocked", "premium"] = "all",
) -> UsersPage:
    items, total = vpn_store.list(search=search, filter=filter, page=page, page_size=pageSize)
    return UsersPage(users=[_to_user(u) for u in items], total=total)


@router.get(
    "/{username}",
    response_model=VpnUser,
    summary="Get one VPN user",
    description="Return a single user by telegramId, or 404 if not found.",
)
def get_user(username: str) -> VpnUser:
    rec = vpn_store.get(username)
    if rec is None:
        raise UserNotFound(username)
    return _to_user(rec)


@router.put(
    "/{username}",
    response_model=VpnUser,
    summary="Update a VPN user",
    description="Partial update. `blocked=true` forces speed to 0; a positive `maxSpeed` unblocks.",
)
def update_user(username: str, body: UserUpdate) -> VpnUser:
    rec = vpn_store.update(
        username,
        new_username=body.username,
        max_speed=body.maxSpeed,
        blocked=body.blocked,
        premium=body.premiumAccess,
        default_speed=bot_settings_store.get().max_user_speed_limit,
    )
    return _to_user(rec)


@router.post(
    "/{username}/token",
    response_model=UserToken,
    summary="Issue a VPN access token",
    description="Reset the user's password to a new random one and return the fptn: access token.",
)
def issue_token(username: str) -> UserToken:
    rec = vpn_store.get(username)
    if rec is None:
        raise UserNotFound(username)
    password = generate_password()
    vpn_store.set_password(username, password)
    token = _issue_token(username, password, rec.is_premium)
    return UserToken(token=token)


@router.post(
    "",
    response_model=UserCreated,
    status_code=status.HTTP_201_CREATED,
    summary="Create a VPN user",
    description="Create a user with the given password and return the fptn: access token for it.",
)
def create_user(body: UserCreate) -> UserCreated:
    max_speed = body.maxSpeed if body.maxSpeed is not None else bot_settings_store.get().max_user_speed_limit
    rec = vpn_store.create(body.username, body.password, max_speed, body.premiumAccess)
    token = _issue_token(rec.username, body.password, rec.is_premium)
    return UserCreated(
        username=rec.username,
        blocked=rec.blocked,
        premiumAccess=rec.is_premium,
        maxSpeed=rec.speed,
        token=token,
    )
