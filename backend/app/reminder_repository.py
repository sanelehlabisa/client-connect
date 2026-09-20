"""Database queries for Client and Adviser reminders."""

from datetime import date, datetime, timedelta, timezone
from uuid import NAMESPACE_URL, uuid4, uuid5

from sqlalchemy import text
from sqlalchemy.orm import Session

from app.schemas import ClaimProviderType, Reminder

SOUTH_AFRICA_TIME = timezone(timedelta(hours=2))


def add_claim_appointment_reminder(
    session: Session,
    *,
    request_id: str,
    client_id: str,
    provider_type: ClaimProviderType,
    provider_name: str,
    appointment_at: datetime | None,
) -> str | None:
    """Add one shared, retry-safe reminder for a selected claim provider."""

    if appointment_at is None:
        return None

    stored_time = appointment_at
    if stored_time.tzinfo is None:
        stored_time = stored_time.replace(tzinfo=timezone.utc)
    local_time = stored_time.astimezone(SOUTH_AFRICA_TIME)
    appointment_label = (
        "Vehicle assessment" if provider_type == "Assessor" else "Vehicle repair"
    )
    time_suffix = f" at {local_time:%H:%M}"
    title_prefix = f"{appointment_label} with "
    provider_length = 160 - len(title_prefix) - len(time_suffix)
    title = f"{title_prefix}{provider_name[:provider_length]}{time_suffix}"
    reminder_id = str(
        uuid5(
            NAMESPACE_URL,
            f"client-connect:{request_id}:{provider_type}",
        )
    )
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
                'Both'
            )
            ON CONFLICT (id) DO NOTHING
            """
        ),
        {
            "reminder_id": reminder_id,
            "client_id": client_id,
            "title": title,
            "due_date": local_time.date(),
        },
    )
    return reminder_id


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


def complete_reminder(
    session: Session,
    reminder_id: str,
    user_email: str,
    is_adviser: bool,
) -> Reminder | None:
    """Complete a reminder only when it is visible to the current user."""

    reminder = session.execute(
        text(
            """
            SELECT
                reminders.id,
                clients.id AS client_id,
                client_user.name AS client_name,
                reminders.title,
                reminders.due_date,
                reminders.audience
            FROM reminders
            JOIN clients ON clients.id = reminders.client_id
            JOIN users AS client_user ON client_user.id = clients.user_id
            JOIN users AS adviser_user ON adviser_user.id = clients.adviser_id
            WHERE reminders.id = :reminder_id
              AND (
                    (
                        :is_adviser
                        AND adviser_user.email = :user_email
                        AND reminders.audience IN ('Adviser', 'Both')
                    )
                    OR (
                        NOT :is_adviser
                        AND client_user.email = :user_email
                        AND reminders.audience IN ('Client', 'Both')
                    )
                  )
            """
        ),
        {
            "reminder_id": reminder_id,
            "user_email": user_email,
            "is_adviser": is_adviser,
        },
    ).one_or_none()
    if reminder is None:
        return None

    session.execute(
        text(
            """
            UPDATE reminders
            SET is_completed = TRUE
            WHERE id = :reminder_id
            """
        ),
        {"reminder_id": reminder_id},
    )
    session.commit()
    return Reminder(
        id=reminder.id,
        client_id=reminder.client_id,
        client_name=reminder.client_name,
        title=reminder.title,
        due_date=reminder.due_date,
        audience=reminder.audience,
        is_completed=True,
    )
