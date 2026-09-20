"""Focused tests for claim appointment reminders."""

import unittest
from datetime import date, datetime, timezone
from typing import Any

from app.reminder_repository import add_claim_appointment_reminder


class RecordingSession:
    """Record SQL calls made by the reminder helper."""

    def __init__(self) -> None:
        """Start with no captured statements."""

        self.executions: list[tuple[str, dict[str, Any]]] = []

    def execute(
        self,
        statement: Any,
        parameters: dict[str, Any],
    ) -> None:
        """Capture one SQL statement and its bound parameters."""

        self.executions.append((str(statement), parameters))


class ClaimAppointmentReminderTests(unittest.TestCase):
    """Keep selected-provider reminders shared and retry-safe."""

    def test_missing_appointment_skips_sql(self) -> None:
        """Do not create a reminder when no preferred time exists."""

        session = RecordingSession()

        reminder_id = add_claim_appointment_reminder(
            session,  # type: ignore[arg-type]
            request_id="claim-1",
            client_id="client-1",
            provider_type="Assessor",
            provider_name="Jozi Assessors",
            appointment_at=None,
        )

        self.assertIsNone(reminder_id)
        self.assertEqual(session.executions, [])

    def test_utc_time_is_rendered_in_south_africa_time(self) -> None:
        """Use UTC+2 for the reminder date and displayed appointment time."""

        session = RecordingSession()

        add_claim_appointment_reminder(
            session,  # type: ignore[arg-type]
            request_id="claim-1",
            client_id="client-1",
            provider_type="Assessor",
            provider_name="Jozi Assessors",
            appointment_at=datetime(2026, 9, 20, 22, 30, tzinfo=timezone.utc),
        )

        _, parameters = session.executions[0]
        self.assertEqual(parameters["due_date"], date(2026, 9, 21))
        self.assertEqual(
            parameters["title"],
            "Vehicle assessment with Jozi Assessors at 00:30",
        )

    def test_insert_is_shared_and_safe_to_retry(self) -> None:
        """Make the reminder visible to both roles and ignore duplicate IDs."""

        session = RecordingSession()

        add_claim_appointment_reminder(
            session,  # type: ignore[arg-type]
            request_id="claim-1",
            client_id="client-1",
            provider_type="Repairer",
            provider_name="Midrand Motor Works",
            appointment_at=datetime(2026, 9, 22, 8, tzinfo=timezone.utc),
        )

        statement, _ = session.executions[0]
        normalized_statement = " ".join(statement.split())
        self.assertIn("'Both'", normalized_statement)
        self.assertIn("ON CONFLICT (id) DO NOTHING", normalized_statement)

    def test_ids_are_deterministic_per_claim_and_provider_type(self) -> None:
        """Retries reuse an ID while Assessor and Repairer reminders differ."""

        session = RecordingSession()
        appointment_at = datetime(2026, 9, 22, 8, tzinfo=timezone.utc)

        assessor_id = add_claim_appointment_reminder(
            session,  # type: ignore[arg-type]
            request_id="claim-1",
            client_id="client-1",
            provider_type="Assessor",
            provider_name="Jozi Assessors",
            appointment_at=appointment_at,
        )
        repeated_assessor_id = add_claim_appointment_reminder(
            session,  # type: ignore[arg-type]
            request_id="claim-1",
            client_id="client-1",
            provider_type="Assessor",
            provider_name="A Different Display Name",
            appointment_at=appointment_at,
        )
        repairer_id = add_claim_appointment_reminder(
            session,  # type: ignore[arg-type]
            request_id="claim-1",
            client_id="client-1",
            provider_type="Repairer",
            provider_name="Midrand Motor Works",
            appointment_at=appointment_at,
        )

        self.assertEqual(assessor_id, repeated_assessor_id)
        self.assertNotEqual(assessor_id, repairer_id)
        self.assertEqual(
            [parameters["reminder_id"] for _, parameters in session.executions],
            [assessor_id, repeated_assessor_id, repairer_id],
        )


if __name__ == "__main__":
    unittest.main()
