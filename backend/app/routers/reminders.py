"""Protected routes for role-aware reminders."""

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.auth import AuthenticatedUser, get_current_user, require_email
from app.database import get_database_session
from app.reminder_repository import list_reminders
from app.schemas import Reminder

router = APIRouter(prefix="/reminders", tags=["reminders"])


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
