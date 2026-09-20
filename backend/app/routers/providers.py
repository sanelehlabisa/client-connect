"""Protected API routes for deterministic provider recommendations."""

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.auth import AuthenticatedUser, get_current_user, require_email, require_role
from app.database import get_database_session
from app.provider_matching import match_providers, select_chat_adviser
from app.schemas import (
    ProviderMatchRequest,
    ProviderRecommendation,
    ProviderSelectionRequest,
    ProviderSelectionResult,
)

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


@router.post("/{provider_id}/select", response_model=ProviderSelectionResult)
def select_provider_adviser(
    provider_id: str,
    selection: ProviderSelectionRequest,
    client: Annotated[AuthenticatedUser, Depends(require_role("client"))],
    session: Annotated[Session, Depends(get_database_session)],
) -> ProviderSelectionResult:
    """Link a Client to a matched Adviser with an existing safe chat."""

    if "adviser" in client.roles:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Adviser accounts cannot select an Adviser for a Client.",
        )
    result = select_chat_adviser(
        session=session,
        client_id=selection.client_id,
        client_email=require_email(client),
        provider_id=provider_id,
    )
    if result is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Chat-enabled Adviser not found.",
        )
    return result
