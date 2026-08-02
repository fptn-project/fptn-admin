from fastapi import FastAPI, Request
from fastapi.encoders import jsonable_encoder
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.stores.admin_store import AdminExists
from app.stores.server_store import ServerExists, ServerNotFound
from app.stores.vpn_user_store import UserExists, UserNotFound


def register_exception_handlers(app: FastAPI) -> None:
    @app.exception_handler(UserNotFound)
    async def _user_not_found(_: Request, __: UserNotFound) -> JSONResponse:
        return JSONResponse(status_code=404, content={"message": "User not found"})

    @app.exception_handler(UserExists)
    async def _user_exists(_: Request, exc: UserExists) -> JSONResponse:
        return JSONResponse(status_code=409, content={"message": f"User {exc.username} already exists"})

    @app.exception_handler(ServerNotFound)
    async def _server_not_found(_: Request, __: ServerNotFound) -> JSONResponse:
        return JSONResponse(status_code=404, content={"message": "Server not found"})

    @app.exception_handler(ServerExists)
    async def _server_exists(_: Request, exc: ServerExists) -> JSONResponse:
        return JSONResponse(status_code=409, content={"message": f"Server {exc.name} already exists"})

    @app.exception_handler(AdminExists)
    async def _admin_exists(_: Request, exc: AdminExists) -> JSONResponse:
        return JSONResponse(status_code=409, content={"message": f"Admin {exc.login} already exists"})

    @app.exception_handler(StarletteHTTPException)
    async def _http_exception(_: Request, exc: StarletteHTTPException) -> JSONResponse:
        return JSONResponse(
            status_code=exc.status_code,
            content={"message": exc.detail},
            headers=getattr(exc, "headers", None),
        )

    @app.exception_handler(RequestValidationError)
    async def _validation_error(_: Request, exc: RequestValidationError) -> JSONResponse:
        return JSONResponse(
            status_code=422,
            content={"message": "Validation error", "errors": jsonable_encoder(exc.errors())},
        )
