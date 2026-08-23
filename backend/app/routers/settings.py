from fastapi import APIRouter, Depends

from app.deps import bot_settings_store
from app.schemas import BotEnabledUpdate, BotSettingsOut, BotSettingsUpdate
from app.security import get_current_admin
from app.stores.bot_settings_store import BotSettings
from app.telegram_bot import bot_runner

router = APIRouter(prefix="/settings", tags=["settings"], dependencies=[Depends(get_current_admin)])


def _mask_token(token: str) -> str:
    if not token:
        return ""
    if len(token) <= 4:
        return "*" * len(token)
    return "*" * (len(token) - 4) + token[-4:]


def _restart_bot(data: BotSettings) -> None:
    bot_runner.stop()
    if data.bot_enabled and data.telegram_token:
        bot_runner.start()


def _to_out(data: BotSettings) -> BotSettingsOut:
    return BotSettingsOut(
        telegramToken=_mask_token(data.telegram_token),
        botEnabled=data.bot_enabled,
        botRunning=bot_runner.running,
        maxUserSpeedLimit=data.max_user_speed_limit,
        serviceName=data.service_name,
        welcomeMessageEn=data.welcome_message_en,
        welcomeMessageRu=data.welcome_message_ru,
    )


@router.get(
    "",
    response_model=BotSettingsOut,
    summary="Get bot/service settings",
    description="The telegram token is masked; only its last 4 characters are shown.",
)
def get_settings() -> BotSettingsOut:
    return _to_out(bot_settings_store.get())


@router.put(
    "",
    response_model=BotSettingsOut,
    summary="Update bot/service settings",
    description="Partial update. Changing telegramToken restarts the bot's polling thread. "
    "Use PUT /settings/bot-enabled to toggle the bot on/off.",
)
def update_settings(body: BotSettingsUpdate) -> BotSettingsOut:
    data = bot_settings_store.update(
        telegram_token=body.telegramToken,
        max_user_speed_limit=body.maxUserSpeedLimit,
        service_name=body.serviceName,
        welcome_message_en=body.welcomeMessageEn,
        welcome_message_ru=body.welcomeMessageRu,
    )
    if body.telegramToken is not None:
        _restart_bot(data)
    return _to_out(data)


@router.put(
    "/bot-enabled",
    response_model=BotSettingsOut,
    summary="Turn the bot on/off",
    description="Restarts the bot's polling thread immediately.",
)
def update_bot_enabled(body: BotEnabledUpdate) -> BotSettingsOut:
    data = bot_settings_store.update(bot_enabled=body.enabled)
    _restart_bot(data)
    return _to_out(data)
