"""Database queries for protected Client-Adviser conversations."""

from dataclasses import dataclass
from typing import Any
from uuid import uuid4

from sqlalchemy import text
from sqlalchemy.orm import Session

from app.activity_repository import ActivityRecipient, create_activity
from app.schemas import ChatMessage


@dataclass(frozen=True)
class ConversationAccess:
    """The two application users allowed to use one Client conversation."""

    client_user_id: str
    client_name: str
    adviser_user_id: str
    adviser_name: str


def _find_access(
    session: Session,
    client_id: str,
    user_email: str,
    is_adviser: bool,
) -> ConversationAccess | None:
    """Return both participants only when the current user has access."""

    row = session.execute(
        text(
            """
            SELECT
                client_user.id AS client_user_id,
                client_user.name AS client_name,
                adviser_user.id AS adviser_user_id,
                adviser_user.name AS adviser_name
            FROM clients
            JOIN users AS client_user ON client_user.id = clients.user_id
            JOIN users AS adviser_user ON adviser_user.id = clients.adviser_id
            WHERE clients.id = :client_id
              AND (
                    (:is_adviser AND adviser_user.email = :user_email)
                    OR
                    (NOT :is_adviser AND client_user.email = :user_email)
              )
            """
        ),
        {
            "client_id": client_id,
            "user_email": user_email,
            "is_adviser": is_adviser,
        },
    ).one_or_none()
    if row is None:
        return None

    return ConversationAccess(
        client_user_id=row.client_user_id,
        client_name=row.client_name,
        adviser_user_id=row.adviser_user_id,
        adviser_name=row.adviser_name,
    )


def _chat_message(row: Any) -> ChatMessage:
    """Build a typed chat response from a database row."""

    return ChatMessage(
        id=row.id,
        client_id=row.client_id,
        sender_name=row.sender_name,
        sender_role=row.sender_role,
        body=row.body,
        sent_by_me=row.sent_by_me,
        created_at=row.created_at,
    )


def list_messages(
    session: Session,
    client_id: str,
    user_email: str,
    is_adviser: bool,
) -> list[ChatMessage] | None:
    """Return oldest-first messages for an allowed conversation participant."""

    access = _find_access(session, client_id, user_email, is_adviser)
    if access is None:
        return None

    rows = session.execute(
        text(
            """
            SELECT
                messages.id,
                messages.client_id,
                sender.name AS sender_name,
                CASE
                    WHEN sender.id = :client_user_id THEN 'Client'
                    ELSE 'Adviser'
                END AS sender_role,
                messages.body,
                sender.email = :user_email AS sent_by_me,
                messages.created_at
            FROM messages
            JOIN users AS sender ON sender.id = messages.sender_user_id
            WHERE messages.client_id = :client_id
            ORDER BY messages.created_at, messages.id
            """
        ),
        {
            "client_id": client_id,
            "client_user_id": access.client_user_id,
            "user_email": user_email,
        },
    ).all()
    return [_chat_message(row) for row in rows]


def create_message(
    session: Session,
    client_id: str,
    user_email: str,
    is_adviser: bool,
    body: str,
) -> ChatMessage | None:
    """Store a message and notify the other conversation participant."""

    access = _find_access(session, client_id, user_email, is_adviser)
    if access is None:
        return None

    if is_adviser:
        sender_user_id = access.adviser_user_id
        sender_name = access.adviser_name
        sender_role = "Adviser"
        recipient_user_id = access.client_user_id
    else:
        sender_user_id = access.client_user_id
        sender_name = access.client_name
        sender_role = "Client"
        recipient_user_id = access.adviser_user_id

    message_id = str(uuid4())
    row = session.execute(
        text(
            """
            INSERT INTO messages (id, client_id, sender_user_id, body)
            VALUES (:message_id, :client_id, :sender_user_id, :body)
            RETURNING id, client_id, body, created_at
            """
        ),
        {
            "message_id": message_id,
            "client_id": client_id,
            "sender_user_id": sender_user_id,
            "body": body,
        },
    ).one()
    session.execute(
        text(
            """
            INSERT INTO notifications (
                id,
                user_id,
                title,
                message,
                is_read
            )
            VALUES (
                :notification_id,
                :recipient_user_id,
                :title,
                :message,
                FALSE
            )
            """
        ),
        {
            "notification_id": str(uuid4()),
            "recipient_user_id": recipient_user_id,
            "title": f"New message from {sender_name}",
            "message": body,
        },
    )
    create_activity(
        session,
        client_id=client_id,
        activity_type="Message",
        source_type="message",
        source_id=message_id,
        title=f"Message from {sender_name}",
        body=body,
        actor_user_id=sender_user_id,
        occurred_at=row.created_at,
        recipients=[
            ActivityRecipient(user_id=sender_user_id, is_read=True),
            ActivityRecipient(user_id=recipient_user_id),
        ],
    )
    session.commit()

    return ChatMessage(
        id=row.id,
        client_id=row.client_id,
        sender_name=sender_name,
        sender_role=sender_role,
        body=row.body,
        sent_by_me=True,
        created_at=row.created_at,
    )
