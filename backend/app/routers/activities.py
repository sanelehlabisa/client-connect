"""Protected routes for shared Client activity and recipient read state."""

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.activity_repository import list_activities, mark_activity_read
from app.auth import AuthenticatedUser, get_current_user, require_email
from app.database import get_database_session
from app.schemas import ActivityItem

router = APIRouter(prefix="/clients", tags=["activities"])


@router.get("/{client_id}/activities", response_model=list[ActivityItem])
def get_activities(
    client_id: str,
    user: Annotated[AuthenticatedUser, Depends(get_current_user)],
    session: Annotated[Session, Depends(get_database_session)],
) -> list[ActivityItem]:
    """List shared events intended for the current Client or Adviser."""

    activities = list_activities(
        session=session,
        client_id=client_id,
        user_email=require_email(user),
    )
    if activities is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Client activity not found.",
        )
    return activities


@router.patch(
    "/{client_id}/activities/{activity_id}/read",
    response_model=ActivityItem,
)
def read_activity(
    client_id: str,
    activity_id: str,
    user: Annotated[AuthenticatedUser, Depends(get_current_user)],
    session: Annotated[Session, Depends(get_database_session)],
) -> ActivityItem:
    """Mark one event read only for the authenticated recipient."""

    activity = mark_activity_read(
        session=session,
        client_id=client_id,
        activity_id=activity_id,
        user_email=require_email(user),
    )
    if activity is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Client activity not found.",
        )
    return activity
