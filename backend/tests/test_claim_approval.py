"""Focused tests for the Adviser claim-decision sequence."""

import unittest
from typing import Any

from fastapi import HTTPException

from app.auth import AuthenticatedUser, require_role
from app.insurance_request_repository import (
    is_status_transition_allowed,
    update_insurance_request_status,
)


class MissingAssignmentSession:
    """Record the access query while behaving like an unassigned request."""

    def __init__(self) -> None:
        """Start without a captured SQL call."""

        self.statement = ""
        self.parameters: dict[str, Any] = {}

    def execute(
        self,
        statement: Any,
        parameters: dict[str, Any],
    ) -> "MissingAssignmentSession":
        """Capture the first query and return the scalar-result interface."""

        self.statement = str(statement)
        self.parameters = parameters
        return self

    def scalar_one_or_none(self) -> None:
        """Represent a claim that is not assigned to this Adviser."""

        return None


class ClaimApprovalTests(unittest.TestCase):
    """Keep claim review decisions ordered and final for the demo."""

    def test_submitted_claim_must_start_review_first(self) -> None:
        """A newly submitted claim cannot skip directly to a decision."""

        self.assertTrue(
            is_status_transition_allowed("Submitted", "Under Review")
        )
        self.assertFalse(is_status_transition_allowed("Submitted", "Approved"))
        self.assertFalse(is_status_transition_allowed("Submitted", "Rejected"))

    def test_under_review_claim_accepts_each_adviser_decision(self) -> None:
        """The Adviser can approve, request changes, or reject during review."""

        for decision in ("Approved", "Changes Required", "Rejected"):
            with self.subTest(decision=decision):
                self.assertTrue(
                    is_status_transition_allowed("Under Review", decision)
                )

    def test_final_decision_cannot_be_changed(self) -> None:
        """Recorded demo decisions remain final instead of looping states."""

        for final_status in ("Approved", "Changes Required", "Rejected"):
            with self.subTest(final_status=final_status):
                self.assertFalse(
                    is_status_transition_allowed(final_status, "Under Review")
                )

    def test_client_role_cannot_use_adviser_decisions(self) -> None:
        """The existing role boundary protects every decision endpoint."""

        client = AuthenticatedUser(
            subject="demo-client",
            username="Demo Client",
            email="client@example.test",
            roles={"client"},
        )

        with self.assertRaises(HTTPException) as raised:
            require_role("adviser")(client)

        self.assertEqual(raised.exception.status_code, 403)

    def test_status_update_is_scoped_to_assigned_adviser(self) -> None:
        """An unassigned Adviser receives no claim from the guarded query."""

        session = MissingAssignmentSession()

        result = update_insurance_request_status(
            session=session,  # type: ignore[arg-type]
            request_id="claim-1",
            adviser_email="other-adviser@example.test",
            requested_status="Under Review",
        )

        self.assertIsNone(result)
        self.assertIn("adviser_user.email = :adviser_email", session.statement)
        self.assertEqual(session.parameters["request_id"], "claim-1")
        self.assertEqual(
            session.parameters["adviser_email"],
            "other-adviser@example.test",
        )


if __name__ == "__main__":
    unittest.main()
