"""Create due-reminder notifications and development emails."""

from dataclasses import dataclass
from uuid import uuid4

from sqlalchemy import text
from sqlalchemy.orm import Session

from app.database import engine
from app.email_service import send_email


@dataclass(frozen=True)
class ReminderDeliverySummary:
    """Counts produced by one idempotent delivery pass."""

    reminders_checked: int
    notifications_created: int
    emails_sent: int


def deliver_due_reminders(session: Session) -> ReminderDeliverySummary:
    """Deliver every incomplete reminder due today or earlier once."""

    rows = session.execute(
        text(
            """
            SELECT
                reminders.id,
                reminders.title,
                reminders.due_date,
                reminders.audience,
                reminders.notification_sent_at,
                reminders.email_sent_at,
                client_user.id AS client_user_id,
                client_user.name AS client_name,
                client_user.email AS client_email,
                adviser_user.id AS adviser_user_id,
                adviser_user.name AS adviser_name,
                adviser_user.email AS adviser_email
            FROM reminders
            JOIN clients ON clients.id = reminders.client_id
            JOIN users AS client_user ON client_user.id = clients.user_id
            JOIN users AS adviser_user ON adviser_user.id = clients.adviser_id
            WHERE reminders.is_completed = FALSE
              AND reminders.due_date <= CURRENT_DATE
              AND (
                    reminders.notification_sent_at IS NULL
                    OR reminders.email_sent_at IS NULL
              )
            ORDER BY reminders.due_date, reminders.id
            """
        )
    ).all()

    notifications_created = 0
    emails_sent = 0
    for row in rows:
        recipients: list[tuple[str, str, str]] = []
        if row.audience in ("Client", "Both"):
            recipients.append(
                (row.client_user_id, row.client_name, row.client_email)
            )
        if row.audience in ("Adviser", "Both"):
            recipients.append(
                (row.adviser_user_id, row.adviser_name, row.adviser_email)
            )

        formatted_date = row.due_date.strftime("%d %B %Y")
        if row.notification_sent_at is None:
            for user_id, _recipient_name, _recipient_email in recipients:
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
                            :user_id,
                            :title,
                            :message,
                            FALSE
                        )
                        """
                    ),
                    {
                        "notification_id": str(uuid4()),
                        "user_id": user_id,
                        "title": f"Reminder due: {row.title}",
                        "message": (
                            f"{row.title} for {row.client_name} is due on "
                            f"{formatted_date}."
                        ),
                    },
                )
                notifications_created += 1
            session.execute(
                text(
                    """
                    UPDATE reminders
                    SET notification_sent_at = CURRENT_TIMESTAMP
                    WHERE id = :reminder_id
                    """
                ),
                {"reminder_id": row.id},
            )
            session.commit()

        if row.email_sent_at is None:
            delivery_results = [
                send_email(
                    recipient=recipient_email,
                    subject=f"Reminder due: {row.title}",
                    body=(
                        f"Hello {recipient_name},\n\n"
                        f"{row.title} for {row.client_name} is due on "
                        f"{formatted_date}.\n\n"
                        "Sign in to ClientConnect to view your reminders."
                    ),
                )
                for _user_id, recipient_name, recipient_email in recipients
            ]
            emails_sent += sum(delivery_results)
            if all(delivery_results):
                session.execute(
                    text(
                        """
                        UPDATE reminders
                        SET email_sent_at = CURRENT_TIMESTAMP
                        WHERE id = :reminder_id
                        """
                    ),
                    {"reminder_id": row.id},
                )
                session.commit()

    return ReminderDeliverySummary(
        reminders_checked=len(rows),
        notifications_created=notifications_created,
        emails_sent=emails_sent,
    )


def run_due_reminder_delivery() -> ReminderDeliverySummary:
    """Open a short database session and run one delivery pass."""

    with Session(engine) as session:
        return deliver_due_reminders(session)
