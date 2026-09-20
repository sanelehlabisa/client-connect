"""Reusable deterministic matching for seeded marketplace providers."""

from dataclasses import dataclass
from decimal import Decimal
from math import asin, cos, inf, radians, sin, sqrt
from typing import cast

from sqlalchemy import text
from sqlalchemy.orm import Session

from app.schemas import ProviderRecommendation, ProviderType


@dataclass(frozen=True)
class ProviderCandidate:
    """Provider data needed by the pure filtering and ranking rules."""

    id: str
    name: str
    provider_type: ProviderType
    services: tuple[str, ...]
    rating: Decimal
    location: str
    latitude: float | None
    longitude: float | None
    is_available: bool
    adviser_user_id: str | None


def _distance_km(
    first_latitude: float,
    first_longitude: float,
    second_latitude: float,
    second_longitude: float,
) -> float:
    """Return the great-circle distance between two coordinate pairs."""

    earth_radius_km = 6371.0
    latitude_delta = radians(second_latitude - first_latitude)
    longitude_delta = radians(second_longitude - first_longitude)
    first_latitude_radians = radians(first_latitude)
    second_latitude_radians = radians(second_latitude)
    calculation = (
        sin(latitude_delta / 2) ** 2
        + cos(first_latitude_radians)
        * cos(second_latitude_radians)
        * sin(longitude_delta / 2) ** 2
    )
    return 2 * earth_radius_km * asin(sqrt(calculation))


def match_provider_candidates(
    candidates: list[ProviderCandidate],
    provider_type: ProviderType,
    required_service: str,
    location: str | None = None,
    latitude: float | None = None,
    longitude: float | None = None,
    limit: int = 2,
) -> list[ProviderRecommendation]:
    """Filter and rank candidates with small, deterministic business rules."""

    normalized_service = required_service.casefold()
    normalized_location = location.casefold() if location else None
    matches: list[tuple[ProviderCandidate, float | None]] = []

    for candidate in candidates:
        offered_services = {service.casefold() for service in candidate.services}
        if candidate.provider_type != provider_type:
            continue
        if not candidate.is_available or normalized_service not in offered_services:
            continue
        if (
            normalized_location is not None
            and candidate.location.casefold() != normalized_location
        ):
            continue

        distance: float | None = None
        if (
            latitude is not None
            and longitude is not None
            and candidate.latitude is not None
            and candidate.longitude is not None
        ):
            distance = _distance_km(
                latitude,
                longitude,
                candidate.latitude,
                candidate.longitude,
            )
        matches.append((candidate, distance))

    matches.sort(
        key=lambda item: (
            -item[0].rating,
            item[1] if item[1] is not None else inf,
            item[0].name.casefold(),
            item[0].id,
        )
    )
    return [
        ProviderRecommendation(
            id=candidate.id,
            name=candidate.name,
            provider_type=candidate.provider_type,
            services=list(candidate.services),
            rating=candidate.rating,
            location=candidate.location,
            is_available=candidate.is_available,
            adviser_user_id=candidate.adviser_user_id,
            distance_km=round(distance, 1) if distance is not None else None,
        )
        for candidate, distance in matches[:limit]
    ]


def load_provider_candidates(session: Session) -> list[ProviderCandidate]:
    """Load the small seeded provider directory from PostgreSQL."""

    rows = session.execute(
        text(
            """
            SELECT
                id,
                name,
                provider_type,
                services,
                rating,
                location,
                latitude,
                longitude,
                is_available,
                adviser_user_id
            FROM marketplace_providers
            """
        )
    ).all()
    return [
        ProviderCandidate(
            id=row.id,
            name=row.name,
            provider_type=cast(ProviderType, row.provider_type),
            services=tuple(row.services),
            rating=row.rating,
            location=row.location,
            latitude=float(row.latitude) if row.latitude is not None else None,
            longitude=float(row.longitude) if row.longitude is not None else None,
            is_available=row.is_available,
            adviser_user_id=row.adviser_user_id,
        )
        for row in rows
    ]


def match_providers(
    session: Session,
    provider_type: ProviderType,
    required_service: str,
    location: str | None = None,
    latitude: float | None = None,
    longitude: float | None = None,
) -> list[ProviderRecommendation]:
    """Return at most two database-backed provider recommendations."""

    return match_provider_candidates(
        candidates=load_provider_candidates(session),
        provider_type=provider_type,
        required_service=required_service,
        location=location,
        latitude=latitude,
        longitude=longitude,
        limit=2,
    )
