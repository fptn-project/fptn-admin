import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.deps import admin_store, bot_settings_store
from app.exceptions import register_exception_handlers
from app.routers import auth, dashboard, servers, settings as settings_router, users
from app.secret import get_jwt_secret
from app.telegram_bot import bot_runner

logger = logging.getLogger("fptn_admin")


@asynccontextmanager
async def lifespan(_: FastAPI):
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
    # httpx logs the full request URL at INFO — for Telegram's API that URL embeds the bot token.
    logging.getLogger("httpx").setLevel(logging.WARNING)
    get_jwt_secret()  # load or generate the persisted JWT secret
    admin_store.ensure_seed(
        settings.admin_login,
        settings.admin_password,
        force_change=settings.admin_password == "admin",
    )
    if bot_settings_store.get().bot_enabled:
        bot_runner.start()
    logger.info("fptn-admin API started")
    yield
    bot_runner.stop()


TAGS_METADATA = [
    {"name": "auth", "description": "Panel-admin login and admin management (JWT)."},
    {"name": "users", "description": "Manage VPN users and issue their fptn access tokens."},
    {"name": "servers", "description": "Manage the VPN servers embedded into access tokens."},
    {"name": "dashboard", "description": "Aggregate stats for the panel."},
    {"name": "settings", "description": "Bot/service settings: telegram token, bot on/off, welcome messages."},
]

app = FastAPI(
    title="fptn-admin API",
    version="0.1.0",
    description="Admin API for managing fptn VPN users, servers and access tokens.",
    openapi_tags=TAGS_METADATA,
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_methods=["*"],
    allow_headers=["*"],
)

register_exception_handlers(app)

app.include_router(auth.router, prefix=settings.api_prefix)
app.include_router(users.router, prefix=settings.api_prefix)
app.include_router(servers.router, prefix=settings.api_prefix)
app.include_router(dashboard.router, prefix=settings.api_prefix)
app.include_router(settings_router.router, prefix=settings.api_prefix)


@app.get("/health")
def health() -> dict:
    return {"status": "ok", "version": app.version}
