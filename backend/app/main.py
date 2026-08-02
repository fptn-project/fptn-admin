import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.deps import admin_store
from app.exceptions import register_exception_handlers
from app.routers import auth, dashboard, servers, users
from app.secret import get_jwt_secret

logger = logging.getLogger("fptn_admin")


@asynccontextmanager
async def lifespan(_: FastAPI):
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
    get_jwt_secret()  # load or generate the persisted JWT secret
    admin_store.ensure_seed(
        settings.admin_login,
        settings.admin_password,
        force_change=settings.admin_password == "admin",
    )
    logger.info("fptn-admin API started")
    yield


TAGS_METADATA = [
    {"name": "auth", "description": "Panel-admin login and admin management (JWT)."},
    {"name": "users", "description": "Manage VPN users and issue their fptn access tokens."},
    {"name": "servers", "description": "Manage the VPN servers embedded into access tokens."},
    {"name": "dashboard", "description": "Aggregate stats for the panel."},
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


@app.get("/health")
def health() -> dict:
    return {"status": "ok", "version": app.version}
