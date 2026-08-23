"""Shared singletons for stores."""

from app.config import settings
from app.stores.admin_store import AdminStore
from app.stores.bot_settings_store import BotSettings, BotSettingsStore
from app.stores.server_store import ServerStore
from app.stores.vpn_user_store import VpnUserStore

vpn_store = VpnUserStore(settings.users_file)
admin_store = AdminStore(settings.admins_file)
server_store = ServerStore(settings.servers_file, settings.premium_servers_file, settings.censored_servers_file)
bot_settings_store = BotSettingsStore(
    settings.bot_settings_file,
    BotSettings(
        telegram_token=settings.telegram_token,
        bot_enabled=settings.bot_enabled,
        max_user_speed_limit=settings.max_user_speed_limit,
        service_name=settings.service_name,
        welcome_message_en=settings.welcome_message_en,
        welcome_message_ru=settings.welcome_message_ru,
    ),
)
