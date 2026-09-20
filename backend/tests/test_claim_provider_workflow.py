"""Focused tests for the simplified claim-provider workflow."""

import unittest
from datetime import datetime, timedelta, timezone
from decimal import Decimal
from types import SimpleNamespace
from typing import Any
from unittest.mock import patch

from pydantic import ValidationError

from app.insurance_request_repository import (
    InvalidClaimProviderSelectionError,
    get_next_claim_provider_shortlist,
    select_next_claim_provider,
)
from app.provider_matching import (
    ProviderCandidate,
    match_claim_providers,
    match_providers,
)
from app.schemas import InsuranceRequestCreate, ProviderRecommendation


class SingleRowResult:
    """Return one configured row through SQLAlchemy's result interface."""

    def __init__(self, row: Any) -> None:
        """Store the row returned by ``one_or_none``."""

        self.row = row

    def one_or_none(self) -> Any:
        """Return the configured row."""

        return self.row


class SingleRowSession:
    """Capture one access-controlled workflow query."""

    def __init__(self, row: Any) -> None:
        """Configure the result returned by the fake session."""

        self.row = row
        self.statement = ""
        self.parameters: dict[str, Any] = {}
        self.execute_count = 0

    def execute(
        self,
        statement: Any,
        parameters: dict[str, Any],
    ) -> SingleRowResult:
        """Capture the query and return its configured result."""

        self.statement = str(statement)
        self.parameters = parameters
        self.execute_count += 1
        return SingleRowResult(self.row)


def recommendation(
    provider_id: str,
    provider_type: str,
) -> ProviderRecommendation:
    """Build one provider response for repository tests."""

    return ProviderRecommendation(
        id=provider_id,
        name=f"Provider {provider_id}",
        provider_type=provider_type,  # type: ignore[arg-type]
        services=[
            "Motor Assessment" if provider_type == "Assessor" else "Motor Repair"
        ],
        rating=Decimal("4.8"),
        location="Johannesburg",
        is_available=True,
        adviser_user_id=None,
        distance_km=None,
    )


def candidate(
    provider_id: str,
    provider_type: str,
    rating: str,
) -> ProviderCandidate:
    """Build one available provider candidate for matching tests."""

    return ProviderCandidate(
        id=provider_id,
        name=f"Provider {provider_id}",
        provider_type=provider_type,  # type: ignore[arg-type]
        services=(
            "Motor Assessment" if provider_type == "Assessor" else "Motor Repair",
        ),
        rating=Decimal(rating),
        location="Johannesburg",
        latitude=None,
        longitude=None,
        is_available=True,
        adviser_user_id=None,
    )


class ClaimProviderWorkflowTests(unittest.TestCase):
    """Keep the claim demo ordered, small, and assignment-scoped."""

    def test_claim_submission_requires_repair_after_assessment(self) -> None:
        """Reject an initial form whose repair time is not later."""

        assessment_at = datetime(2026, 9, 22, 9, tzinfo=timezone.utc)
        with self.assertRaises(ValidationError):
            InsuranceRequestCreate(
                product_id="insurance-1",
                request_type="Motor accident claim",
                details="Structured accident details",
                preferred_assessment_at=assessment_at,
                preferred_repair_at=assessment_at,
            )

        accepted = InsuranceRequestCreate(
            product_id="insurance-1",
            request_type="Motor accident claim",
            details="Structured accident details",
            preferred_assessment_at=assessment_at,
            preferred_repair_at=assessment_at + timedelta(days=1),
        )
        self.assertGreater(
            accepted.preferred_repair_at,
            accepted.preferred_assessment_at,
        )

    def test_claim_matcher_returns_three_but_general_matcher_returns_two(
        self,
    ) -> None:
        """Keep the three-result exception limited to claim workflows."""

        candidates = [
            candidate("assessor-1", "Assessor", "4.9"),
            candidate("assessor-2", "Assessor", "4.8"),
            candidate("assessor-3", "Assessor", "4.7"),
            candidate("assessor-4", "Assessor", "4.6"),
        ]
        with patch(
            "app.provider_matching.load_provider_candidates",
            return_value=candidates,
        ):
            claim_matches = match_claim_providers(
                object(),  # type: ignore[arg-type]
                "Assessor",
            )
            general_matches = match_providers(
                object(),  # type: ignore[arg-type]
                "Assessor",
                "Motor Assessment",
            )

        self.assertEqual(len(claim_matches), 3)
        self.assertEqual(len(general_matches), 2)

    def test_shortlist_moves_from_assessor_to_repairer_then_complete(self) -> None:
        """The Adviser must choose an Assessor before a Repairer."""

        states = [
            (None, None, "Assessor", False),
            ("assessor-1", None, "Repairer", False),
            ("assessor-1", "repairer-1", None, True),
        ]
        for assessor_id, repairer_id, expected_type, complete in states:
            with self.subTest(
                assessor_id=assessor_id,
                repairer_id=repairer_id,
            ):
                session = SingleRowSession(
                    SimpleNamespace(
                        status="Approved",
                        selected_assessor_id=assessor_id,
                        selected_repairer_id=repairer_id,
                    )
                )
                matches = (
                    []
                    if expected_type is None
                    else [recommendation("provider-1", expected_type)]
                )
                with patch(
                    "app.insurance_request_repository.match_claim_providers",
                    return_value=matches,
                ):
                    shortlist = get_next_claim_provider_shortlist(
                        session,  # type: ignore[arg-type]
                        "claim-1",
                        "assigned@example.test",
                    )

                self.assertIsNotNone(shortlist)
                assert shortlist is not None
                self.assertEqual(shortlist.provider_type, expected_type)
                self.assertEqual(shortlist.complete, complete)

    def test_shortlist_is_scoped_to_the_assigned_adviser(self) -> None:
        """An Adviser who is not assigned cannot inspect provider choices."""

        session = SingleRowSession(None)
        shortlist = get_next_claim_provider_shortlist(
            session,  # type: ignore[arg-type]
            "claim-1",
            "other-adviser@example.test",
        )

        self.assertIsNone(shortlist)
        self.assertIn("adviser_user.email = :adviser_email", session.statement)
        self.assertEqual(
            session.parameters["adviser_email"],
            "other-adviser@example.test",
        )

    def test_provider_must_belong_to_the_current_shortlist(self) -> None:
        """Reject a provider that is not one of the recommended three."""

        session = SingleRowSession(
            SimpleNamespace(
                status="Approved",
                selected_assessor_id=None,
                selected_repairer_id=None,
            )
        )
        with patch(
            "app.insurance_request_repository.match_claim_providers",
            return_value=[recommendation("assessor-1", "Assessor")],
        ):
            with self.assertRaises(InvalidClaimProviderSelectionError):
                select_next_claim_provider(
                    session,  # type: ignore[arg-type]
                    "claim-1",
                    "assigned@example.test",
                    "outside-shortlist",
                )

        self.assertEqual(session.execute_count, 1)

    def test_repeating_the_same_selection_is_idempotent(self) -> None:
        """A retry returns the claim without writing another selection."""

        session = SingleRowSession(
            SimpleNamespace(
                status="Approved",
                selected_assessor_id="assessor-1",
                selected_repairer_id=None,
            )
        )
        existing_request = object()
        with patch(
            "app.insurance_request_repository._find_request",
            return_value=existing_request,
        ) as find_request:
            result = select_next_claim_provider(
                session,  # type: ignore[arg-type]
                "claim-1",
                "assigned@example.test",
                "assessor-1",
            )

        self.assertIs(result, existing_request)
        self.assertEqual(session.execute_count, 1)
        find_request.assert_called_once_with(session, "claim-1")

    def test_completed_selections_cannot_be_replaced(self) -> None:
        """Once both providers are stored, a different choice is rejected."""

        session = SingleRowSession(
            SimpleNamespace(
                status="Approved",
                selected_assessor_id="assessor-1",
                selected_repairer_id="repairer-1",
            )
        )
        with self.assertRaises(InvalidClaimProviderSelectionError):
            select_next_claim_provider(
                session,  # type: ignore[arg-type]
                "claim-1",
                "assigned@example.test",
                "repairer-2",
            )

        self.assertEqual(session.execute_count, 1)


if __name__ == "__main__":
    unittest.main()
