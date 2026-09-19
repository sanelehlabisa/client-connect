"""Database queries for Client and Adviser reminders."""

from datetime import date
from uuid import uuid4

from sqlalchemy import text
from sqlalchemy.orm import Session

from app.schemas import Reminder


def list_reminders(
    session: Session,
    user_email: str,
    is_adviser: bool,
) -> list[Reminder]:
    """Return due-date ordered reminders visible to the current role."""

    rows = session.execute(
        text(
            """
            SELECT
                reminders.id,
                clients.id AS client_id,
                client_user.name AS client_name,
                reminders.title,
                reminders.due_date,
                reminders.audience,
                reminders.is_completed
            FROM reminders
            JOIN clients ON clients.id = reminders.client_id
            JOIN users AS client_user ON client_user.id = clients.user_id
            JOIN users AS adviser_user ON adviser_user.id = clients.adviser_id
            WHERE (
                    :is_adviser
                    AND adviser_user.email = :user_email
                    AND reminders.audience IN ('Adviser', 'Both')
                  )
               OR (
                    NOT :is_adviser
                    AND client_user.email = :user_email
                    AND reminders.audience IN ('Client', 'Both')
                  )
            ORDER BY reminders.is_completed, reminders.due_date, reminders.title
            """
        ),
        {"user_email": user_email, "is_adviser": is_adviser},
    ).all()
    return [
        Reminder(
            id=row.id,
            client_id=row.client_id,
            client_name=row.client_name,
            title=row.title,
            due_date=row.due_date,
            audience=row.audience,
            is_completed=row.is_completed,
        )
        for row in rows
    ]


def create_reminder(
    session: Session,
    adviser_email: str,
    client_id: str,
    title: str,
    due_date: date,
    audience: str,
) -> Reminder | None:
    """Create a reminder only for a Client assigned to the Adviser."""

    client_name = session.execute(
        text(
            """
            SELECT client_user.name
            FROM clients
            JOIN users AS client_user ON client_user.id = clients.user_id
            JOIN users AS adviser_user ON adviser_user.id = clients.adviser_id
            WHERE clients.id = :client_id
              AND adviser_user.email = :adviser_email
            """
        ),
        {"client_id": client_id, "adviser_email": adviser_email},
    ).scalar_one_or_none()
    if client_name is None:
        return None

    reminder_id = str(uuid4())
    session.execute(
        text(
            """
            INSERT INTO reminders (
                id,
                client_id,
                title,
                due_date,
                audience
            )
            VALUES (
                :reminder_id,
                :client_id,
                :title,
                :due_date,
                :audience
            )
            """
        ),
        {
            "reminder_id": reminder_id,
            "client_id": client_id,
            "title": title,
            "due_date": due_date,
            "audience": audience,
        },
    )
    session.commit()
    return Reminder(
        id=reminder_id,
        client_id=client_id,
        client_name=client_name,
        title=title,
        due_date=due_date,
        audience=audience,
        is_completed=False,
    )
