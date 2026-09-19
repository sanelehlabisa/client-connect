"""Small SMTP helper for development emails captured by MailHog."""

import logging
import smtplib
from email.message import EmailMessage

from app.settings import get_settings

logger = logging.getLogger(__name__)


def send_email(recipient: str, subject: str, body: str) -> bool:
    """Send a plain-text email, returning False when SMTP is unavailable."""

    settings = get_settings()
    message = EmailMessage()
    message["From"] = settings.mail_from
    message["To"] = recipient
    message["Subject"] = subject
    message.set_content(body)

    try:
        with smtplib.SMTP(
            host=settings.smtp_host,
            port=settings.smtp_port,
            timeout=5,
        ) as smtp:
            smtp.send_message(message)
    except (OSError, smtplib.SMTPException):
        logger.warning(
            "Email delivery failed for recipient %s.",
            recipient,
            exc_info=True,
        )
        return False

    return True
