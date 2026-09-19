"""Database queries for notifications owned by the current user."""

from typing import Any

from sqlalchemy import text
from sqlalchemy.orm import Session

from app.schemas import NotificationItem


def _notification(row: Any) -> NotificationItem:
    """Build a typed notification response from a database row."""

    return NotificationItem(
        id=row.id,
        title=row.title,
        message=row.message,
        is_read=row.is_read,
        client_id=row.client_id,
        client_name=row.client_name,
        product_id=row.product_id,
        product_name=row.product_name,
        created_at=row.created_at,
    )


def list_notifications(session: Session, user_email: str) -> list[NotificationItem]:
    """Return newest-first notifications for one authenticated user."""

    rows = session.execute(
        text(
            """
            SELECT
                notifications.id,
                notifications.title,
                notifications.message,
                notifications.is_read,
                clients.id AS client_id,
                client_user.name AS client_name,
                products.id AS product_id,
                products.name AS product_name,
                notifications.created_at
            FROM notifications
            JOIN users AS recipient ON recipient.id = notifications.user_id
            LEFT JOIN products ON products.id = notifications.product_id
            LEFT JOIN clients ON clients.id = products.client_id
            LEFT JOIN users AS client_user ON client_user.id = clients.user_id
            WHERE recipient.email = :user_email
            ORDER BY notifications.created_at DESC, notifications.id DESC
            """
        ),
        {"user_email": user_email},
    ).all()
    return [_notification(row) for row in rows]


def mark_notification_read(
    session: Session,
    notification_id: str,
    user_email: str,
) -> NotificationItem | None:
    """Mark one notification as read only when it belongs to the user."""

    updated_id = session.execute(
        text(
            """
            UPDATE notifications
            SET is_read = TRUE
            WHERE id = :notification_id
              AND user_id = (
                  SELECT id
                  FROM users
                  WHERE email = :user_email
              )
            RETURNING id
            """
        ),
        {"notification_id": notification_id, "user_email": user_email},
    ).scalar_one_or_none()
    if updated_id is None:
        session.rollback()
        return None

    notification = next(
        (
            item
            for item in list_notifications(session, user_email)
            if item.id == updated_id
        ),
        None,
    )
    session.commit()
    return notification
