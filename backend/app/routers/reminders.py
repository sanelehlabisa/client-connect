"""Protected routes for role-aware reminders."""

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.auth import (
    AuthenticatedUser,
    get_current_user,
    require_email,
    require_role,
)
from app.database import get_database_session
from app.reminder_repository import create_reminder, list_reminders
from app.schemas import Reminder, ReminderCreate

router = APIRouter(prefix="/reminders", tags=["reminders"])


@router.post(
    "",
    response_model=Reminder,
    status_code=status.HTTP_201_CREATED,
)
def add_reminder(
    reminder_data: ReminderCreate,
    adviser: Annotated[AuthenticatedUser, Depends(require_role("adviser"))],
    session: Annotated[Session, Depends(get_database_session)],
) -> Reminder:
    """Let an Adviser schedule a reminder for an assigned Client."""

    reminder = create_reminder(
        session=session,
        adviser_email=require_email(adviser),
        client_id=reminder_data.client_id,
        title=reminder_data.title,
        due_date=reminder_data.due_date,
        audience=reminder_data.audience,
    )
    if reminder is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Client not found.",
        )
    return reminder


@router.get("", response_model=list[Reminder])
def get_reminders(
    user: Annotated[AuthenticatedUser, Depends(get_current_user)],
    session: Annotated[Session, Depends(get_database_session)],
) -> list[Reminder]:
    """List reminders intended for the current Client or Adviser role."""

    is_adviser = "adviser" in user.roles
    if not is_adviser and "client" not in user.roles:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="A ClientConnect role is required.",
        )
    return list_reminders(
        session=session,
        user_email=require_email(user),
        is_adviser=is_adviser,
    )
