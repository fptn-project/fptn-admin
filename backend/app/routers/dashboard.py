from fastapi import APIRouter, Depends

from app.deps import vpn_store
from app.schemas import Highlights
from app.security import get_current_admin


router = APIRouter(prefix="/dashboard", tags=["dashboard"], dependencies=[Depends(get_current_admin)])


@router.get(
    "/highlights",
    response_model=Highlights,
    summary="Dashboard highlights",
    description="Total number of VPN users and how many of them are premium.",
)
def highlights() -> Highlights:
    total, premium, blocked = vpn_store.stats()
    return Highlights(totalUsers=total, premiumUsers=premium, blockedUsers=blocked)
