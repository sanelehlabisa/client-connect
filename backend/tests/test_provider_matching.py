"""Focused tests for deterministic provider filtering and ranking."""

import unittest
from decimal import Decimal

from app.provider_matching import ProviderCandidate, match_provider_candidates


def candidate(
    provider_id: str,
    name: str,
    rating: str,
    *,
    provider_type: str = "Financial Adviser",
    services: tuple[str, ...] = ("Financial Planning",),
    location: str = "Johannesburg",
    latitude: float | None = -26.2,
    longitude: float | None = 28.05,
    available: bool = True,
) -> ProviderCandidate:
    """Build a compact candidate used by matching tests."""

    return ProviderCandidate(
        id=provider_id,
        name=name,
        provider_type=provider_type,  # type: ignore[arg-type]
        services=services,
        rating=Decimal(rating),
        location=location,
        latitude=latitude,
        longitude=longitude,
        is_available=available,
        adviser_user_id=None,
    )


class ProviderMatchingTests(unittest.TestCase):
    """Verify the matching rules without requiring a database."""

    def test_filters_type_service_availability_and_location(self) -> None:
        """Only candidates meeting every supplied rule should remain."""

        candidates = [
            candidate("eligible", "Eligible", "4.5"),
            candidate("wrong-type", "Institution", "5.0", provider_type="Financial Institution"),
            candidate("wrong-service", "Tax Adviser", "5.0", services=("Tax Advice",)),
            candidate("unavailable", "Unavailable", "5.0", available=False),
            candidate("wrong-location", "Cape Adviser", "5.0", location="Cape Town"),
        ]

        matches = match_provider_candidates(
            candidates,
            provider_type="Financial Adviser",
            required_service="financial planning",
            location="johannesburg",
        )

        self.assertEqual([item.id for item in matches], ["eligible"])

    def test_ranks_by_rating_before_distance(self) -> None:
        """A higher rating wins even when another provider is closer."""

        candidates = [
            candidate("closer", "Closer", "4.7"),
            candidate(
                "higher-rated",
                "Higher Rated",
                "4.9",
                latitude=-25.75,
                longitude=28.23,
            ),
        ]

        matches = match_provider_candidates(
            candidates,
            "Financial Adviser",
            "Financial Planning",
            latitude=-26.2,
            longitude=28.05,
        )

        self.assertEqual(matches[0].id, "higher-rated")

    def test_uses_distance_then_name_as_stable_tie_breakers(self) -> None:
        """Equal ratings use nearest distance and then provider name."""

        candidates = [
            candidate("far", "Far", "4.8", latitude=-25.75, longitude=28.23),
            candidate("zulu", "Zulu", "4.8"),
            candidate("alpha", "Alpha", "4.8"),
        ]

        matches = match_provider_candidates(
            candidates,
            "Financial Adviser",
            "Financial Planning",
            latitude=-26.2,
            longitude=28.05,
        )

        self.assertEqual([item.id for item in matches], ["alpha", "zulu"])

    def test_returns_no_more_than_two_matches(self) -> None:
        """The hackathon API should remain intentionally small."""

        candidates = [
            candidate("first", "First", "5.0"),
            candidate("second", "Second", "4.9"),
            candidate("third", "Third", "4.8"),
        ]

        matches = match_provider_candidates(
            candidates,
            "Financial Adviser",
            "Financial Planning",
        )

        self.assertEqual([item.id for item in matches], ["first", "second"])


if __name__ == "__main__":
    unittest.main()
