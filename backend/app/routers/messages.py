"""Protected routes for Client-Adviser chat messages."""

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.auth import AuthenticatedUser, get_current_user, require_email
from app.database import get_database_session
from app.message_repository import create_message, list_messages
from app.schemas import ChatMessage, ChatMessageCreate

router = APIRouter(prefix="/clients", tags=["messages"])


@router.get("/{client_id}/messages", response_model=list[ChatMessage])
def get_messages(
    client_id: str,
    user: Annotated[AuthenticatedUser, Depends(get_current_user)],
    session: Annotated[Session, Depends(get_database_session)],
) -> list[ChatMessage]:
    """List one owned or assigned Client conversation oldest-first."""

    messages = list_messages(
        session=session,
        client_id=client_id,
        user_email=require_email(user),
        is_adviser="adviser" in user.roles,
    )
    if messages is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found.",
        )
    return messages


@router.post(
    "/{client_id}/messages",
    response_model=ChatMessage,
    status_code=status.HTTP_201_CREATED,
)
def send_message(
    client_id: str,
    message_data: ChatMessageCreate,
    user: Annotated[AuthenticatedUser, Depends(get_current_user)],
    session: Annotated[Session, Depends(get_database_session)],
) -> ChatMessage:
    """Send a text message to the other allowed conversation participant."""

    message = create_message(
        session=session,
        client_id=client_id,
        user_email=require_email(user),
        is_adviser="adviser" in user.roles,
        body=message_data.body,
    )
    if message is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found.",
        )
    return message
