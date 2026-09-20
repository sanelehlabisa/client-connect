"""Protected API routes for deterministic provider recommendations."""

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.auth import AuthenticatedUser, get_current_user
from app.database import get_database_session
from app.provider_matching import match_providers
from app.schemas import ProviderMatchRequest, ProviderRecommendation

router = APIRouter(prefix="/providers", tags=["provider marketplace"])


@router.post("/match", response_model=list[ProviderRecommendation])
def get_provider_matches(
    criteria: ProviderMatchRequest,
    user: Annotated[AuthenticatedUser, Depends(get_current_user)],
    session: Annotated[Session, Depends(get_database_session)],
) -> list[ProviderRecommendation]:
    """Return the best two providers for an authenticated app user."""

    if "client" not in user.roles and "adviser" not in user.roles:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="A ClientConnect role is required.",
        )
    return match_providers(
        session=session,
        provider_type=criteria.provider_type,
        required_service=criteria.required_service,
        location=criteria.location,
        latitude=criteria.latitude,
        longitude=criteria.longitude,
    )
