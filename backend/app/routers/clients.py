"""Protected routes for shared Client and Adviser financial data."""

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.auth import AuthenticatedUser, get_current_user, require_role
from app.client_repository import find_client_overview, list_assigned_clients
from app.database import get_database_session
from app.schemas import ClientOverview, ClientSummary

router = APIRouter(prefix="/clients", tags=["clients"])


def _require_email(user: AuthenticatedUser) -> str:
    """Return the trusted email claim required to match application users."""

    if user.email is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="The authenticated account does not have an email address.",
        )
    return user.email


@router.get("", response_model=list[ClientSummary])
def get_assigned_clients(
    adviser: Annotated[
        AuthenticatedUser,
        Depends(require_role("adviser")),
    ],
    session: Annotated[Session, Depends(get_database_session)],
) -> list[ClientSummary]:
    """List only the clients assigned to the authenticated Adviser."""

    return list_assigned_clients(session, _require_email(adviser))


@router.get("/{client_id}", response_model=ClientOverview)
def get_client_overview(
    client_id: str,
    user: Annotated[AuthenticatedUser, Depends(get_current_user)],
    session: Annotated[Session, Depends(get_database_session)],
) -> ClientOverview:
    """Return an owned or assigned client without revealing other records."""

    overview = find_client_overview(
        session=session,
        client_id=client_id,
        user_email=_require_email(user),
        is_adviser="adviser" in user.roles,
    )
    if overview is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Client not found.",
        )
    return overview
