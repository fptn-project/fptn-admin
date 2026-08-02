"""Shared singletons for stores."""

from app.config import settings
from app.stores.admin_store import AdminStore
from app.stores.server_store import ServerStore
from app.stores.vpn_user_store import VpnUserStore

vpn_store = VpnUserStore(settings.users_file)
admin_store = AdminStore(settings.admins_file)
server_store = ServerStore(settings.servers_file, settings.premium_servers_file, settings.censored_servers_file)
