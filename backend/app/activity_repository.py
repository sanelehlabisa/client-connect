"""Database queries for the shared Client activity stream and read state."""

from dataclasses import dataclass
from datetime import datetime
from typing import Any
from uuid import uuid4

from sqlalchemy import text
from sqlalchemy.orm import Session

from app.schemas import ActivityItem, ActivityType


@dataclass(frozen=True)
class ActivityRecipient:
    """One application user who should receive a shared activity."""

    user_id: str
    is_read: bool = False


def create_activity(
    session: Session,
    *,
    client_id: str,
    activity_type: ActivityType,
    source_type: str,
    source_id: str,
    title: str,
    body: str,
    recipients: list[ActivityRecipient],
    product_id: str | None = None,
    actor_user_id: str | None = None,
    occurred_at: datetime | None = None,
) -> str:
    """Store one idempotent event and an independent receipt per recipient.

    The caller owns the surrounding transaction so the event is committed with
    the message, claim update, or reminder that caused it.
    """

    activity_id = str(uuid4())
    inserted_id = session.execute(
        text(
            """
            INSERT INTO activities (
                id,
                client_id,
                product_id,
                actor_user_id,
                activity_type,
                source_type,
                source_id,
                title,
                body,
                occurred_at
            )
            VALUES (
                :activity_id,
                :client_id,
                :product_id,
                :actor_user_id,
                :activity_type,
                :source_type,
                :source_id,
                :title,
                :body,
                COALESCE(:occurred_at, CURRENT_TIMESTAMP)
            )
            ON CONFLICT (source_type, source_id) DO NOTHING
            RETURNING id
            """
        ),
        {
            "activity_id": activity_id,
            "client_id": client_id,
            "product_id": product_id,
            "actor_user_id": actor_user_id,
            "activity_type": activity_type,
            "source_type": source_type,
            "source_id": source_id,
            "title": title,
            "body": body,
            "occurred_at": occurred_at,
        },
    ).scalar_one_or_none()

    if inserted_id is None:
        activity_id = session.execute(
            text(
                """
                SELECT id
                FROM activities
                WHERE source_type = :source_type
                  AND source_id = :source_id
                """
            ),
            {"source_type": source_type, "source_id": source_id},
        ).scalar_one()
    else:
        activity_id = inserted_id

    for recipient in recipients:
        session.execute(
            text(
                """
                INSERT INTO activity_receipts (activity_id, user_id, read_at)
                VALUES (
                    :activity_id,
                    :user_id,
                    CASE WHEN :is_read THEN CURRENT_TIMESTAMP ELSE NULL END
                )
                ON CONFLICT (activity_id, user_id) DO UPDATE
                SET read_at = COALESCE(
                    activity_receipts.read_at,
                    EXCLUDED.read_at
                )
                """
            ),
            {
                "activity_id": activity_id,
                "user_id": recipient.user_id,
                "is_read": recipient.is_read,
            },
        )

    return activity_id


def _find_participant_user_id(
    session: Session,
    client_id: str,
    user_email: str,
) -> str | None:
    """Resolve an owning Client or assigned Adviser to an application user."""

    return session.execute(
        text(
            """
            SELECT viewer.id
            FROM clients
            JOIN users AS client_user ON client_user.id = clients.user_id
            JOIN users AS adviser_user ON adviser_user.id = clients.adviser_id
            JOIN users AS viewer
              ON viewer.id IN (clients.user_id, clients.adviser_id)
            WHERE clients.id = :client_id
              AND viewer.email = :user_email
            """
        ),
        {"client_id": client_id, "user_email": user_email},
    ).scalar_one_or_none()


def _activity_item(row: Any) -> ActivityItem:
    """Build one typed activity response from a database row."""

    return ActivityItem(
        id=row.id,
        client_id=row.client_id,
        product_id=row.product_id,
        activity_type=row.activity_type,
        title=row.title,
        body=row.body,
        actor_name=row.actor_name,
        is_read=row.read_at is not None,
        read_at=row.read_at,
        occurred_at=row.occurred_at,
    )


def _find_activity_for_user(
    session: Session,
    client_id: str,
    activity_id: str,
    user_id: str,
) -> ActivityItem | None:
    """Return one activity only when it was intended for this user."""

    row = session.execute(
        text(
            """
            SELECT
                activities.id,
                activities.client_id,
                activities.product_id,
                activities.activity_type,
                activities.title,
                activities.body,
                actor.name AS actor_name,
                activity_receipts.read_at,
                activities.occurred_at
            FROM activities
            JOIN activity_receipts
              ON activity_receipts.activity_id = activities.id
            LEFT JOIN users AS actor ON actor.id = activities.actor_user_id
            WHERE activities.id = :activity_id
              AND activities.client_id = :client_id
              AND activity_receipts.user_id = :user_id
            """
        ),
        {
            "activity_id": activity_id,
            "client_id": client_id,
            "user_id": user_id,
        },
    ).one_or_none()
    return None if row is None else _activity_item(row)


def list_activities(
    session: Session,
    client_id: str,
    user_email: str,
) -> list[ActivityItem] | None:
    """List intended activities oldest-first for an allowed participant."""

    user_id = _find_participant_user_id(session, client_id, user_email)
    if user_id is None:
        return None

    rows = session.execute(
        text(
            """
            SELECT
                activities.id,
                activities.client_id,
                activities.product_id,
                activities.activity_type,
                activities.title,
                activities.body,
                actor.name AS actor_name,
                activity_receipts.read_at,
                activities.occurred_at
            FROM activities
            JOIN activity_receipts
              ON activity_receipts.activity_id = activities.id
            LEFT JOIN users AS actor ON actor.id = activities.actor_user_id
            WHERE activities.client_id = :client_id
              AND activity_receipts.user_id = :user_id
            ORDER BY activities.occurred_at, activities.id
            """
        ),
        {"client_id": client_id, "user_id": user_id},
    ).all()
    return [_activity_item(row) for row in rows]


def mark_activity_read(
    session: Session,
    client_id: str,
    activity_id: str,
    user_email: str,
) -> ActivityItem | None:
    """Mark only the current recipient's receipt as read."""

    user_id = _find_participant_user_id(session, client_id, user_email)
    if user_id is None:
        return None

    updated_id = session.execute(
        text(
            """
            UPDATE activity_receipts
            SET read_at = COALESCE(read_at, CURRENT_TIMESTAMP)
            FROM activities
            WHERE activity_receipts.activity_id = activities.id
              AND activity_receipts.activity_id = :activity_id
              AND activity_receipts.user_id = :user_id
              AND activities.client_id = :client_id
            RETURNING activity_receipts.activity_id
            """
        ),
        {
            "activity_id": activity_id,
            "user_id": user_id,
            "client_id": client_id,
        },
    ).scalar_one_or_none()
    if updated_id is None:
        return None

    session.commit()
    return _find_activity_for_user(session, client_id, activity_id, user_id)
