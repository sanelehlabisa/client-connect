"""Focused tests for shared activity events and recipient receipts."""

import unittest
from typing import Any

from app.activity_repository import ActivityRecipient, create_activity


class ScalarResult:
    """Small SQLAlchemy-result stand-in used by the repository tests."""

    def __init__(self, value: str | None) -> None:
        """Store the scalar returned by a simulated query."""

        self.value = value

    def scalar_one_or_none(self) -> str | None:
        """Return the optional simulated scalar."""

        return self.value

    def scalar_one(self) -> str:
        """Return the required simulated scalar."""

        if self.value is None:
            raise AssertionError("Expected one scalar value.")
        return self.value


class RecordingActivitySession:
    """Capture activity SQL without requiring PostgreSQL in unit tests."""

    def __init__(self, inserted_id: str | None) -> None:
        """Choose whether the event insert is new or already exists."""

        self.inserted_id = inserted_id
        self.calls: list[tuple[str, dict[str, Any]]] = []

    def execute(
        self,
        statement: Any,
        parameters: dict[str, Any],
    ) -> ScalarResult:
        """Record each statement and return its expected scalar shape."""

        sql = str(statement)
        self.calls.append((sql, parameters))
        if "INSERT INTO activities" in sql:
            return ScalarResult(self.inserted_id)
        if "SELECT id" in sql and "FROM activities" in sql:
            return ScalarResult("existing-activity")
        return ScalarResult(None)


class ActivityRepositoryTests(unittest.TestCase):
    """Keep one event shared while read state remains user-specific."""

    def test_creates_one_event_with_independent_recipient_read_state(self) -> None:
        """The sender can be read while the other participant stays unread."""

        session = RecordingActivitySession("shared-activity")

        activity_id = create_activity(
            session=session,  # type: ignore[arg-type]
            client_id="client-1",
            product_id="insurance-1",
            actor_user_id="user-client",
            activity_type="Message",
            source_type="message",
            source_id="message-1",
            title="Message from Client",
            body="Please help with this claim.",
            recipients=[
                ActivityRecipient("user-client", is_read=True),
                ActivityRecipient("user-adviser"),
            ],
        )

        receipt_calls = [
            parameters
            for sql, parameters in session.calls
            if "INSERT INTO activity_receipts" in sql
        ]
        self.assertEqual(activity_id, "shared-activity")
        self.assertEqual(len(receipt_calls), 2)
        self.assertEqual(
            [(item["user_id"], item["is_read"]) for item in receipt_calls],
            [("user-client", True), ("user-adviser", False)],
        )
        self.assertTrue(
            all(item["activity_id"] == activity_id for item in receipt_calls)
        )

    def test_reuses_existing_event_for_idempotent_sources(self) -> None:
        """A retry should attach receipts to the existing source event."""

        session = RecordingActivitySession(None)

        activity_id = create_activity(
            session=session,  # type: ignore[arg-type]
            client_id="client-1",
            activity_type="Email",
            source_type="reminder-email",
            source_id="reminder-1",
            title="Reminder email sent",
            body="Annual review reminder sent.",
            recipients=[ActivityRecipient("user-client")],
        )

        self.assertEqual(activity_id, "existing-activity")
        self.assertEqual(
            session.calls[-1][1]["activity_id"],
            "existing-activity",
        )


if __name__ == "__main__":
    unittest.main()
