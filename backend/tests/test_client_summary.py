"""Focused tests for Adviser Client activity summaries."""

import unittest
from datetime import UTC, datetime
from decimal import Decimal
from types import SimpleNamespace
from typing import Any

from app.client_repository import list_assigned_clients


class SummaryResult:
    """Return prepared rows through the SQLAlchemy result interface."""

    def __init__(self, rows: list[SimpleNamespace]) -> None:
        """Store rows returned by the fake query."""

        self.rows = rows

    def all(self) -> list[SimpleNamespace]:
        """Return every prepared summary row."""

        return self.rows


class SummarySession:
    """Capture the assigned-Client query while returning prepared rows."""

    def __init__(self, rows: list[SimpleNamespace]) -> None:
        """Start with prepared rows and no captured query."""

        self.rows = rows
        self.statement = ""
        self.parameters: dict[str, Any] = {}

    def execute(
        self,
        statement: Any,
        parameters: dict[str, Any],
    ) -> SummaryResult:
        """Capture the query and return the prepared rows."""

        self.statement = str(statement)
        self.parameters = parameters
        return SummaryResult(self.rows)


def summary_row(
    *,
    client_id: str,
    name: str,
    latest_activity_at: datetime | None,
    latest_activity_preview: str | None,
    unread_message_count: int,
) -> SimpleNamespace:
    """Build one compact database row for a Client summary test."""

    return SimpleNamespace(
        id=client_id,
        name=name,
        assets=Decimal("100000"),
        liabilities=Decimal("25000"),
        monthly_income=Decimal("30000"),
        monthly_expenses=Decimal("18000"),
        product_count=2,
        pending_actions=1,
        latest_activity_at=latest_activity_at,
        latest_activity_preview=latest_activity_preview,
        unread_message_count=unread_message_count,
    )


class ClientSummaryTests(unittest.TestCase):
    """Expose latest activity and Adviser-specific unread message counts."""

    def test_maps_activity_fields_and_allows_clients_without_history(self) -> None:
        """Activity metadata is optional while its unread count starts at zero."""

        occurred_at = datetime(2026, 9, 20, 10, 30, tzinfo=UTC)
        session = SummarySession(
            [
                summary_row(
                    client_id="client-1",
                    name="Active Client",
                    latest_activity_at=occurred_at,
                    latest_activity_preview="Message from Client — Please call me.",
                    unread_message_count=2,
                ),
                summary_row(
                    client_id="client-2",
                    name="New Client",
                    latest_activity_at=None,
                    latest_activity_preview=None,
                    unread_message_count=0,
                ),
            ]
        )

        summaries = list_assigned_clients(
            session=session,  # type: ignore[arg-type]
            adviser_email="adviser@example.test",
        )

        self.assertEqual(summaries[0].latest_activity_at, occurred_at)
        self.assertEqual(summaries[0].unread_message_count, 2)
        self.assertIsNone(summaries[1].latest_activity_at)
        self.assertIsNone(summaries[1].latest_activity_preview)
        self.assertEqual(summaries[1].unread_message_count, 0)
        self.assertEqual(
            session.parameters,
            {"adviser_email": "adviser@example.test"},
        )

    def test_counts_only_unread_messages_intended_for_the_adviser(self) -> None:
        """Claim and email activities must not inflate unread message badges."""

        session = SummarySession([])

        list_assigned_clients(
            session=session,  # type: ignore[arg-type]
            adviser_email="adviser@example.test",
        )

        self.assertIn("activities.activity_type = 'Message'", session.statement)
        self.assertIn(
            "activity_receipts.user_id = clients.adviser_id",
            session.statement,
        )
        self.assertIn(
            "activity_receipts.read_at IS NULL",
            session.statement,
        )
        self.assertIn("ORDER BY client_user.name", session.statement)


if __name__ == "__main__":
    unittest.main()
