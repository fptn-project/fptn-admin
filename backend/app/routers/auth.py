from fastapi import APIRouter, Depends, HTTPException, Response, status

from app.deps import admin_store
from app.schemas import AdminCreate, AdminLogin, AdminOut, ChangePassword, TokenResponse
from app.security import create_access_token, get_current_admin


router = APIRouter(tags=["auth"])


@router.post(
    "/auth/login",
    response_model=TokenResponse,
    summary="Admin login",
    description="Exchange admin credentials for a JWT. `mustChangePassword` is true while the default password stands.",
)
def login(body: AdminLogin) -> TokenResponse:
    if not admin_store.authenticate(body.username, body.password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    return TokenResponse(
        access_token=create_access_token(body.username),
        mustChangePassword=admin_store.must_change_password(body.username),
    )


@router.post(
    "/auth/change-password",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Change admin password",
    description="Change the current admin's own password. Requires the current password; new one must be 8+ chars.",
)
def change_password(body: ChangePassword, admin: str = Depends(get_current_admin)) -> Response:
    if body.newPassword == body.currentPassword:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="New password must differ from the current one"
        )
    if not admin_store.change_password(admin, body.currentPassword, body.newPassword):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Current password is incorrect")
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post(
    "/auth/register",
    response_model=AdminOut,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(get_current_admin)],
    summary="Create panel admin",
    description="Register a new panel (service) user. Requires an existing admin token.",
)
def register(body: AdminCreate) -> AdminOut:
    admin_store.create(body.username, body.password)
    return AdminOut(username=body.username)
