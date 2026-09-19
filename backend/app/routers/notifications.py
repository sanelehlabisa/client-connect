"""Protected routes for the current user's notifications."""

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.auth import AuthenticatedUser, get_current_user, require_email
from app.database import get_database_session
from app.notification_repository import list_notifications, mark_notification_read
from app.schemas import NotificationItem

router = APIRouter(prefix="/notifications", tags=["notifications"])


@router.get("", response_model=list[NotificationItem])
def get_notifications(
    user: Annotated[AuthenticatedUser, Depends(get_current_user)],
    session: Annotated[Session, Depends(get_database_session)],
) -> list[NotificationItem]:
    """List notifications belonging to the authenticated Client or Adviser."""

    return list_notifications(session, require_email(user))


@router.patch("/{notification_id}/read", response_model=NotificationItem)
def read_notification(
    notification_id: str,
    user: Annotated[AuthenticatedUser, Depends(get_current_user)],
    session: Annotated[Session, Depends(get_database_session)],
) -> NotificationItem:
    """Mark one owned notification as read."""

    notification = mark_notification_read(
        session=session,
        notification_id=notification_id,
        user_email=require_email(user),
    )
    if notification is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification not found.",
        )
    return notification
