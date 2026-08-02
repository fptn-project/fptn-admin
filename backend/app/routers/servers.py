from typing import Literal

from fastapi import APIRouter, Depends, Response, status

from app.deps import server_store
from app.schemas import Server, ServerCreate, ServersList
from app.security import get_current_admin

router = APIRouter(prefix="/servers", tags=["servers"], dependencies=[Depends(get_current_admin)])


@router.get(
    "",
    response_model=ServersList,
    summary="List VPN servers",
    description="All servers grouped into regular, premium and censored-zone lists.",
)
def list_servers() -> ServersList:
    raw = server_store.list()
    return ServersList(
        regular=[Server(**s) for s in raw["regular"]],
        premium=[Server(**s) for s in raw["premium"]],
        censoredZone=[Server(**s) for s in raw["censored"]],
    )


@router.post(
    "",
    response_model=Server,
    status_code=status.HTTP_201_CREATED,
    summary="Add a VPN server",
    description="Add a server to one of the lists (kind: regular | premium | censored). These feed the access token.",
)
def add_server(body: ServerCreate) -> Server:
    server = {"name": body.name, "host": body.host, "md5_fingerprint": body.md5_fingerprint, "port": body.port}
    server_store.add(body.kind, server)
    return Server(**server)


@router.delete(
    "/{kind}/{name}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a VPN server",
    description="Remove a server from the given list by kind and name.",
)
def delete_server(kind: Literal["regular", "premium", "censored"], name: str) -> Response:
    server_store.delete(kind, name)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
