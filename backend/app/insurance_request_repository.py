"""Database queries for the insurance review workflow."""

from dataclasses import dataclass
from datetime import datetime
from typing import Any
from uuid import uuid4

from sqlalchemy import text
from sqlalchemy.orm import Session

from app.activity_repository import ActivityRecipient, create_activity
from app.email_service import send_email
from app.provider_gateway import submit_claim
from app.provider_matching import match_claim_providers
from app.reminder_repository import add_claim_appointment_reminder
from app.schemas import (
    ClaimProviderShortlist,
    ClaimProviderType,
    InsuranceRequest,
    InsuranceRequestProgressStage,
    InsuranceRequestStatus,
)

ALLOWED_STATUS_TRANSITIONS: dict[str, set[str]] = {
    "Submitted": {"Under Review"},
    "Under Review": {"Approved", "Changes Required", "Rejected"},
}

STATUS_NOTIFICATION_CONTENT: dict[str, tuple[str, str]] = {
    "Under Review": (
        "Claim review started",
        "Your claim for {product_name} is now under review.",
    ),
    "Approved": (
        "Claim approved",
        "Your claim for {product_name} has been approved.",
    ),
    "Changes Required": (
        "Claim changes required",
        "Your adviser needs more information for your {product_name} claim.",
    ),
    "Rejected": (
        "Claim not approved",
        "Your claim for {product_name} was not approved.",
    ),
}

PROGRESS_TRANSITIONS: dict[str, str] = {
    "Provider Acknowledged": "Assessment Scheduled",
    "Assessment Scheduled": "Assessment Complete",
    "Assessment Complete": "Repairs Authorized",
    "Repairs Authorized": "Repair In Progress",
    "Repair In Progress": "Car Hire Arranged",
    "Car Hire Arranged": "Ready for Collection",
}


@dataclass(frozen=True)
class ClaimParticipants:
    """Application identities involved in one Client claim."""

    client_user_id: str
    client_email: str
    adviser_user_id: str
    adviser_email: str


class InvalidStatusTransitionError(Exception):
    """Raised when an Adviser attempts an out-of-order review decision."""

    def __init__(self, current_status: str, requested_status: str) -> None:
        """Store both statuses so the API can return a useful error."""

        self.current_status = current_status
        self.requested_status = requested_status
        super().__init__(
            f"Cannot change status from {current_status} to {requested_status}."
        )


class InvalidProgressTransitionError(Exception):
    """Raised when claim progress is changed out of sequence."""

    def __init__(
        self,
        review_status: str,
        current_stage: str,
        requested_stage: str,
    ) -> None:
        """Store workflow values so the API can return a useful error."""

        if review_status != "Approved":
            message = "A claim must be approved before progress can advance."
        else:
            message = (
                f"Cannot change progress from {current_stage} "
                f"to {requested_stage}."
            )
        self.review_status = review_status
        self.current_stage = current_stage
        self.requested_stage = requested_stage
        super().__init__(message)


class ClaimNotReadyToCloseError(Exception):
    """Raised when a Client tries to close an unfinished claim."""

    def __init__(self) -> None:
        """Return one clear rule for the Client-facing API."""

        super().__init__(
            "The claim must be approved and ready for collection before closing."
        )


class InvalidClaimProviderSelectionError(Exception):
    """Raised when the mock claim-provider sequence cannot continue."""


def is_status_transition_allowed(
    current_status: str,
    requested_status: str,
) -> bool:
    """Return whether the requested claim decision follows the demo workflow."""

    return requested_status in ALLOWED_STATUS_TRANSITIONS.get(
        current_status,
        set(),
    )


def _insurance_request(row: Any) -> InsuranceRequest:
    """Build an insurance request response from a database row."""

    return InsuranceRequest(
        id=row.id,
        client_id=row.client_id,
        client_name=row.client_name,
        product_id=row.product_id,
        product_name=row.product_name,
        request_type=row.request_type,
        details=row.details,
        status=row.status,
        provider_claim_number=row.provider_claim_number,
        claims_handler=row.claims_handler,
        preferred_assessment_at=row.preferred_assessment_at,
        preferred_repair_at=row.preferred_repair_at,
        selected_assessor_id=row.selected_assessor_id,
        selected_assessor_name=row.selected_assessor_name,
        assessor_selected_at=row.assessor_selected_at,
        selected_repairer_id=row.selected_repairer_id,
        selected_repairer_name=row.selected_repairer_name,
        repairer_selected_at=row.repairer_selected_at,
        progress_stage=row.progress_stage,
        progress_updated_at=row.progress_updated_at,
        client_review=row.client_review,
        provider_rating=row.provider_rating,
        closed_at=row.closed_at,
        created_at=row.created_at,
    )


def _find_request(session: Session, request_id: str) -> InsuranceRequest:
    """Return one request that was already checked for access."""

    row = session.execute(
        text(
            """
            SELECT
                insurance_requests.id,
                clients.id AS client_id,
                client_user.name AS client_name,
                products.id AS product_id,
                products.name AS product_name,
                insurance_requests.request_type,
                insurance_requests.details,
                insurance_requests.status,
                insurance_requests.provider_claim_number,
                insurance_requests.claims_handler,
                insurance_requests.preferred_assessment_at,
                insurance_requests.preferred_repair_at,
                insurance_requests.selected_assessor_id,
                assessor.name AS selected_assessor_name,
                insurance_requests.assessor_selected_at,
                insurance_requests.selected_repairer_id,
                repairer.name AS selected_repairer_name,
                insurance_requests.repairer_selected_at,
                insurance_requests.progress_stage,
                insurance_requests.progress_updated_at,
                insurance_requests.client_review,
                insurance_requests.provider_rating,
                insurance_requests.closed_at,
                insurance_requests.created_at
            FROM insurance_requests
            JOIN products ON products.id = insurance_requests.product_id
            JOIN clients ON clients.id = products.client_id
            JOIN users AS client_user ON client_user.id = clients.user_id
            LEFT JOIN marketplace_providers AS assessor
                ON assessor.id = insurance_requests.selected_assessor_id
            LEFT JOIN marketplace_providers AS repairer
                ON repairer.id = insurance_requests.selected_repairer_id
            WHERE insurance_requests.id = :request_id
            """
        ),
        {"request_id": request_id},
    ).one()
    return _insurance_request(row)


def _find_claim_participants(
    session: Session,
    request_id: str,
) -> ClaimParticipants:
    """Return the Client and assigned Adviser for an accessible claim."""

    row = session.execute(
        text(
            """
            SELECT
                client_user.id AS client_user_id,
                client_user.email AS client_email,
                adviser_user.id AS adviser_user_id,
                adviser_user.email AS adviser_email
            FROM insurance_requests
            JOIN products ON products.id = insurance_requests.product_id
            JOIN clients ON clients.id = products.client_id
            JOIN users AS client_user ON client_user.id = clients.user_id
            JOIN users AS adviser_user ON adviser_user.id = clients.adviser_id
            WHERE insurance_requests.id = :request_id
            """
        ),
        {"request_id": request_id},
    ).one()
    return ClaimParticipants(
        client_user_id=row.client_user_id,
        client_email=row.client_email,
        adviser_user_id=row.adviser_user_id,
        adviser_email=row.adviser_email,
    )


def _ensure_selected_provider_reminders(
    session: Session,
    request: InsuranceRequest,
) -> None:
    """Keep both selected claim appointments in the shared reminders."""

    if request.selected_assessor_id and request.selected_assessor_name:
        add_claim_appointment_reminder(
            session,
            request_id=request.id,
            client_id=request.client_id,
            provider_type="Assessor",
            provider_name=request.selected_assessor_name,
            appointment_at=request.preferred_assessment_at,
        )
    if request.selected_repairer_id and request.selected_repairer_name:
        add_claim_appointment_reminder(
            session,
            request_id=request.id,
            client_id=request.client_id,
            provider_type="Repairer",
            provider_name=request.selected_repairer_name,
            appointment_at=request.preferred_repair_at,
        )


def create_insurance_request(
    session: Session,
    client_id: str,
    client_email: str,
    product_id: str,
    request_type: str,
    details: str,
    preferred_assessment_at: datetime,
    preferred_repair_at: datetime,
) -> InsuranceRequest | None:
    """Create a request only for an Insurance product owned by the Client."""

    request_id = str(uuid4())
    inserted_id = session.execute(
        text(
            """
            INSERT INTO insurance_requests (
                id,
                product_id,
                request_type,
                details,
                preferred_assessment_at,
                preferred_repair_at,
                status
            )
            SELECT
                :request_id,
                products.id,
                :request_type,
                :details,
                :preferred_assessment_at,
                :preferred_repair_at,
                'Submitted'
            FROM products
            JOIN clients ON clients.id = products.client_id
            JOIN users AS client_user ON client_user.id = clients.user_id
            WHERE products.id = :product_id
              AND products.client_id = :client_id
              AND products.product_type = 'INSURANCE'
              AND products.status <> 'Archived'
              AND client_user.email = :client_email
            RETURNING id
            """
        ),
        {
            "request_id": request_id,
            "product_id": product_id,
            "client_id": client_id,
            "client_email": client_email,
            "request_type": request_type,
            "details": details,
            "preferred_assessment_at": preferred_assessment_at,
            "preferred_repair_at": preferred_repair_at,
        },
    ).scalar_one_or_none()

    if inserted_id is None:
        session.rollback()
        return None

    provider = session.execute(
        text("SELECT provider FROM products WHERE id = :product_id"),
        {"product_id": product_id},
    ).scalar_one()
    acknowledgement = submit_claim(provider, inserted_id)
    session.execute(
        text(
            """
            UPDATE insurance_requests
            SET
                provider_claim_number = :provider_claim_number,
                claims_handler = :claims_handler
            WHERE id = :request_id
            """
        ),
        {
            "request_id": inserted_id,
            "provider_claim_number": acknowledgement.claim_number,
            "claims_handler": acknowledgement.claims_handler,
        },
    )
    request = _find_request(session, inserted_id)
    participants = _find_claim_participants(session, request.id)
    session.execute(
        text(
            """
            INSERT INTO notifications (
                id,
                user_id,
                title,
                message,
                is_read,
                product_id
            )
            SELECT
                :notification_id,
                clients.adviser_id,
                :title,
                :message,
                FALSE,
                products.id
            FROM products
            JOIN clients ON clients.id = products.client_id
            WHERE products.id = :product_id
            """
        ),
        {
            "notification_id": str(uuid4()),
            "product_id": request.product_id,
            "title": f"New claim from {request.client_name}",
            "message": (
                f"{request.client_name} submitted a claim for "
                f"{request.product_name}. Provider reference: "
                f"{request.provider_claim_number}."
            ),
        },
    )
    create_activity(
        session,
        client_id=request.client_id,
        product_id=request.product_id,
        actor_user_id=participants.client_user_id,
        activity_type="Claim",
        source_type="claim-submitted",
        source_id=request.id,
        title="Claim submitted",
        body=(
            f"{request.client_name} submitted a claim for "
            f"{request.product_name}. Provider reference: "
            f"{request.provider_claim_number}."
        ),
        recipients=[
            ActivityRecipient(participants.client_user_id, is_read=True),
            ActivityRecipient(participants.adviser_user_id),
        ],
    )
    session.commit()
    send_email(
        recipient=participants.adviser_email,
        subject=f"New claim from {request.client_name}",
        body=(
            f"{request.client_name} submitted a claim for "
            f"{request.product_name}.\n"
            f"Provider reference: {request.provider_claim_number}.\n\n"
            "Sign in to ClientConnect to review it."
        ),
    )
    return request


def list_client_insurance_requests(
    session: Session,
    client_id: str,
    user_email: str,
    is_adviser: bool,
) -> list[InsuranceRequest] | None:
    """List requests when the user owns or is assigned to the Client."""

    has_access = session.execute(
        text(
            """
            SELECT 1
            FROM clients
            JOIN users AS client_user ON client_user.id = clients.user_id
            JOIN users AS adviser_user ON adviser_user.id = clients.adviser_id
            WHERE clients.id = :client_id
              AND (
                    (:is_adviser AND adviser_user.email = :user_email)
                    OR
                    (NOT :is_adviser AND client_user.email = :user_email)
              )
            """
        ),
        {
            "client_id": client_id,
            "user_email": user_email,
            "is_adviser": is_adviser,
        },
    ).one_or_none()
    if has_access is None:
        return None

    rows = session.execute(
        text(
            """
            SELECT
                insurance_requests.id,
                clients.id AS client_id,
                client_user.name AS client_name,
                products.id AS product_id,
                products.name AS product_name,
                insurance_requests.request_type,
                insurance_requests.details,
                insurance_requests.status,
                insurance_requests.provider_claim_number,
                insurance_requests.claims_handler,
                insurance_requests.preferred_assessment_at,
                insurance_requests.preferred_repair_at,
                insurance_requests.selected_assessor_id,
                assessor.name AS selected_assessor_name,
                insurance_requests.assessor_selected_at,
                insurance_requests.selected_repairer_id,
                repairer.name AS selected_repairer_name,
                insurance_requests.repairer_selected_at,
                insurance_requests.progress_stage,
                insurance_requests.progress_updated_at,
                insurance_requests.client_review,
                insurance_requests.provider_rating,
                insurance_requests.closed_at,
                insurance_requests.created_at
            FROM insurance_requests
            JOIN products ON products.id = insurance_requests.product_id
            JOIN clients ON clients.id = products.client_id
            JOIN users AS client_user ON client_user.id = clients.user_id
            LEFT JOIN marketplace_providers AS assessor
                ON assessor.id = insurance_requests.selected_assessor_id
            LEFT JOIN marketplace_providers AS repairer
                ON repairer.id = insurance_requests.selected_repairer_id
            WHERE clients.id = :client_id
            ORDER BY insurance_requests.created_at DESC
            """
        ),
        {"client_id": client_id},
    ).all()
    return [_insurance_request(row) for row in rows]


def list_adviser_review_queue(
    session: Session,
    adviser_email: str,
) -> list[InsuranceRequest]:
    """Return active requests for Clients assigned to one Adviser."""

    rows = session.execute(
        text(
            """
            SELECT
                insurance_requests.id,
                clients.id AS client_id,
                client_user.name AS client_name,
                products.id AS product_id,
                products.name AS product_name,
                insurance_requests.request_type,
                insurance_requests.details,
                insurance_requests.status,
                insurance_requests.provider_claim_number,
                insurance_requests.claims_handler,
                insurance_requests.preferred_assessment_at,
                insurance_requests.preferred_repair_at,
                insurance_requests.selected_assessor_id,
                assessor.name AS selected_assessor_name,
                insurance_requests.assessor_selected_at,
                insurance_requests.selected_repairer_id,
                repairer.name AS selected_repairer_name,
                insurance_requests.repairer_selected_at,
                insurance_requests.progress_stage,
                insurance_requests.progress_updated_at,
                insurance_requests.client_review,
                insurance_requests.provider_rating,
                insurance_requests.closed_at,
                insurance_requests.created_at
            FROM insurance_requests
            JOIN products ON products.id = insurance_requests.product_id
            JOIN clients ON clients.id = products.client_id
            JOIN users AS client_user ON client_user.id = clients.user_id
            JOIN users AS adviser_user ON adviser_user.id = clients.adviser_id
            LEFT JOIN marketplace_providers AS assessor
                ON assessor.id = insurance_requests.selected_assessor_id
            LEFT JOIN marketplace_providers AS repairer
                ON repairer.id = insurance_requests.selected_repairer_id
            WHERE adviser_user.email = :adviser_email
              AND insurance_requests.status IN ('Submitted', 'Under Review')
            ORDER BY insurance_requests.created_at
            """
        ),
        {"adviser_email": adviser_email},
    ).all()
    return [_insurance_request(row) for row in rows]


def get_next_claim_provider_shortlist(
    session: Session,
    request_id: str,
    adviser_email: str,
) -> ClaimProviderShortlist | None:
    """Return the next three mock providers for an assigned approved claim."""

    row = session.execute(
        text(
            """
            SELECT
                insurance_requests.status,
                insurance_requests.selected_assessor_id,
                insurance_requests.selected_repairer_id
            FROM insurance_requests
            JOIN products ON products.id = insurance_requests.product_id
            JOIN clients ON clients.id = products.client_id
            JOIN users AS adviser_user ON adviser_user.id = clients.adviser_id
            WHERE insurance_requests.id = :request_id
              AND adviser_user.email = :adviser_email
            """
        ),
        {"request_id": request_id, "adviser_email": adviser_email},
    ).one_or_none()
    if row is None:
        return None
    if row.status != "Approved":
        raise InvalidClaimProviderSelectionError(
            "Approve the claim before selecting service providers."
        )

    provider_type: ClaimProviderType | None
    if row.selected_assessor_id is None:
        provider_type = "Assessor"
    elif row.selected_repairer_id is None:
        provider_type = "Repairer"
    else:
        provider_type = None

    if provider_type is None:
        return ClaimProviderShortlist(
            provider_type=None,
            providers=[],
            complete=True,
        )

    return ClaimProviderShortlist(
        provider_type=provider_type,
        providers=match_claim_providers(session, provider_type),
        complete=False,
    )


def select_next_claim_provider(
    session: Session,
    request_id: str,
    adviser_email: str,
    provider_id: str,
) -> InsuranceRequest | None:
    """Select and immediately accept the next mock claim provider."""

    row = session.execute(
        text(
            """
            SELECT
                insurance_requests.status,
                insurance_requests.selected_assessor_id,
                insurance_requests.selected_repairer_id
            FROM insurance_requests
            JOIN products ON products.id = insurance_requests.product_id
            JOIN clients ON clients.id = products.client_id
            JOIN users AS adviser_user ON adviser_user.id = clients.adviser_id
            WHERE insurance_requests.id = :request_id
              AND adviser_user.email = :adviser_email
            FOR UPDATE OF insurance_requests
            """
        ),
        {"request_id": request_id, "adviser_email": adviser_email},
    ).one_or_none()
    if row is None:
        return None
    if row.status != "Approved":
        raise InvalidClaimProviderSelectionError(
            "Approve the claim before selecting service providers."
        )

    if provider_id in {
        row.selected_assessor_id,
        row.selected_repairer_id,
    }:
        request = _find_request(session, request_id)
        _ensure_selected_provider_reminders(session, request)
        session.commit()
        return request

    provider_type: ClaimProviderType
    if row.selected_assessor_id is None:
        provider_type = "Assessor"
    elif row.selected_repairer_id is None:
        provider_type = "Repairer"
    else:
        raise InvalidClaimProviderSelectionError(
            "The Assessor and Repairer are already selected."
        )

    matches = match_claim_providers(session, provider_type)
    selected_provider = next(
        (provider for provider in matches if provider.id == provider_id),
        None,
    )
    if selected_provider is None:
        raise InvalidClaimProviderSelectionError(
            f"Select one of the recommended {provider_type}s."
        )

    if provider_type == "Assessor":
        session.execute(
            text(
                """
                UPDATE insurance_requests
                SET
                    selected_assessor_id = :provider_id,
                    assessor_selected_at = CURRENT_TIMESTAMP,
                    progress_stage = 'Assessment Scheduled',
                    progress_updated_at = CURRENT_TIMESTAMP
                WHERE id = :request_id
                """
            ),
            {"provider_id": provider_id, "request_id": request_id},
        )
    else:
        session.execute(
            text(
                """
                UPDATE insurance_requests
                SET
                    selected_repairer_id = :provider_id,
                    repairer_selected_at = CURRENT_TIMESTAMP,
                    progress_stage = 'Repair In Progress',
                    progress_updated_at = CURRENT_TIMESTAMP
                WHERE id = :request_id
                """
            ),
            {"provider_id": provider_id, "request_id": request_id},
        )

    request = _find_request(session, request_id)
    participants = _find_claim_participants(session, request_id)
    _ensure_selected_provider_reminders(session, request)
    appointment_at = (
        request.preferred_assessment_at
        if provider_type == "Assessor"
        else request.preferred_repair_at
    )
    title = f"{provider_type} selected"
    message = (
        f"{selected_provider.name} was selected and accepted immediately for "
        "the demo. The preferred appointment is recorded on the claim."
    )
    if appointment_at is not None:
        message += " It was also added to reminders for both users."
    session.execute(
        text(
            """
            INSERT INTO notifications (
                id,
                user_id,
                title,
                message,
                is_read,
                product_id
            )
            VALUES (
                :notification_id,
                :user_id,
                :title,
                :message,
                FALSE,
                :product_id
            )
            """
        ),
        {
            "notification_id": str(uuid4()),
            "user_id": participants.client_user_id,
            "title": title,
            "message": message,
            "product_id": request.product_id,
        },
    )
    create_activity(
        session,
        client_id=request.client_id,
        product_id=request.product_id,
        actor_user_id=participants.adviser_user_id,
        activity_type="Service",
        source_type="claim-provider-selection",
        source_id=f"{request_id}:{provider_type}",
        title=title,
        body=message,
        recipients=[
            ActivityRecipient(participants.adviser_user_id, is_read=True),
            ActivityRecipient(participants.client_user_id),
        ],
    )
    session.commit()
    return request


def update_insurance_request_status(
    session: Session,
    request_id: str,
    adviser_email: str,
    requested_status: InsuranceRequestStatus,
) -> InsuranceRequest | None:
    """Apply a valid transition to a request assigned to the Adviser."""

    current_status = session.execute(
        text(
            """
            SELECT insurance_requests.status
            FROM insurance_requests
            JOIN products ON products.id = insurance_requests.product_id
            JOIN clients ON clients.id = products.client_id
            JOIN users AS adviser_user ON adviser_user.id = clients.adviser_id
            WHERE insurance_requests.id = :request_id
              AND adviser_user.email = :adviser_email
            FOR UPDATE OF insurance_requests
            """
        ),
        {"request_id": request_id, "adviser_email": adviser_email},
    ).scalar_one_or_none()
    if current_status is None:
        return None

    if not is_status_transition_allowed(current_status, requested_status):
        raise InvalidStatusTransitionError(current_status, requested_status)

    session.execute(
        text(
            """
            UPDATE insurance_requests
            SET status = :requested_status
            WHERE id = :request_id
            """
        ),
        {"request_id": request_id, "requested_status": requested_status},
    )
    request = _find_request(session, request_id)
    notification_title, notification_message = STATUS_NOTIFICATION_CONTENT[
        requested_status
    ]
    formatted_message = notification_message.format(
        product_name=request.product_name,
    )
    adviser_activity_title = f"Claim status updated: {requested_status}"
    adviser_activity_message = (
        f"{request.client_name}'s claim for {request.product_name} is now "
        f"{requested_status.lower()}."
    )
    session.execute(
        text(
            """
            INSERT INTO notifications (
                id,
                user_id,
                title,
                message,
                is_read,
                product_id
            )
            SELECT
                :notification_id,
                clients.user_id,
                :title,
                :message,
                FALSE,
                products.id
            FROM insurance_requests
            JOIN products ON products.id = insurance_requests.product_id
            JOIN clients ON clients.id = products.client_id
            WHERE insurance_requests.id = :request_id
            """
        ),
        {
            "notification_id": str(uuid4()),
            "request_id": request_id,
            "title": notification_title,
            "message": formatted_message,
        },
    )
    session.execute(
        text(
            """
            INSERT INTO notifications (
                id,
                user_id,
                title,
                message,
                is_read,
                product_id
            )
            SELECT
                :notification_id,
                clients.adviser_id,
                :title,
                :message,
                TRUE,
                products.id
            FROM insurance_requests
            JOIN products ON products.id = insurance_requests.product_id
            JOIN clients ON clients.id = products.client_id
            WHERE insurance_requests.id = :request_id
            """
        ),
        {
            "notification_id": str(uuid4()),
            "request_id": request_id,
            "title": adviser_activity_title,
            "message": adviser_activity_message,
        },
    )
    participants = _find_claim_participants(session, request_id)
    create_activity(
        session,
        client_id=request.client_id,
        product_id=request.product_id,
        actor_user_id=participants.adviser_user_id,
        activity_type="Claim",
        source_type="claim-status",
        source_id=f"{request_id}:{requested_status}",
        title=f"Claim status: {requested_status}",
        body=adviser_activity_message,
        recipients=[
            ActivityRecipient(participants.adviser_user_id, is_read=True),
            ActivityRecipient(participants.client_user_id),
        ],
    )

    session.commit()
    if requested_status != "Under Review":
        send_email(
            recipient=participants.client_email,
            subject=notification_title,
            body=(
                f"{formatted_message}\n\n"
                "Sign in to ClientConnect to view your claim."
            ),
        )
    return request


def update_insurance_request_progress(
    session: Session,
    request_id: str,
    adviser_email: str,
    requested_stage: InsuranceRequestProgressStage,
) -> InsuranceRequest | None:
    """Advance one approved claim through the operational workflow."""

    row = session.execute(
        text(
            """
            SELECT
                insurance_requests.status,
                insurance_requests.progress_stage
            FROM insurance_requests
            JOIN products ON products.id = insurance_requests.product_id
            JOIN clients ON clients.id = products.client_id
            JOIN users AS adviser_user ON adviser_user.id = clients.adviser_id
            WHERE insurance_requests.id = :request_id
              AND adviser_user.email = :adviser_email
            FOR UPDATE OF insurance_requests
            """
        ),
        {"request_id": request_id, "adviser_email": adviser_email},
    ).one_or_none()
    if row is None:
        return None

    expected_stage = PROGRESS_TRANSITIONS.get(row.progress_stage)
    if row.status != "Approved" or requested_stage != expected_stage:
        raise InvalidProgressTransitionError(
            review_status=row.status,
            current_stage=row.progress_stage,
            requested_stage=requested_stage,
        )

    session.execute(
        text(
            """
            UPDATE insurance_requests
            SET
                progress_stage = :requested_stage,
                progress_updated_at = CURRENT_TIMESTAMP
            WHERE id = :request_id
            """
        ),
        {"request_id": request_id, "requested_stage": requested_stage},
    )
    request = _find_request(session, request_id)
    session.execute(
        text(
            """
            INSERT INTO notifications (
                id,
                user_id,
                title,
                message,
                is_read,
                product_id
            )
            SELECT
                :notification_id,
                clients.user_id,
                'Claim progress updated',
                :message,
                FALSE,
                products.id
            FROM insurance_requests
            JOIN products ON products.id = insurance_requests.product_id
            JOIN clients ON clients.id = products.client_id
            WHERE insurance_requests.id = :request_id
            """
        ),
        {
            "notification_id": str(uuid4()),
            "request_id": request_id,
            "message": (
                f"Your {request.product_name} claim is now: "
                f"{requested_stage}."
            ),
        },
    )
    participants = _find_claim_participants(session, request_id)
    create_activity(
        session,
        client_id=request.client_id,
        product_id=request.product_id,
        actor_user_id=participants.adviser_user_id,
        activity_type="Claim",
        source_type="claim-progress",
        source_id=f"{request_id}:{requested_stage}",
        title=f"Claim progress: {requested_stage}",
        body=(
            f"{request.client_name}'s {request.product_name} claim is now "
            f"{requested_stage}."
        ),
        recipients=[
            ActivityRecipient(participants.adviser_user_id, is_read=True),
            ActivityRecipient(participants.client_user_id),
        ],
    )
    session.commit()
    return request


def close_insurance_request(
    session: Session,
    request_id: str,
    client_email: str,
    review: str,
    provider_rating: int,
) -> InsuranceRequest | None:
    """Close a ready claim only when it belongs to the authenticated Client."""

    row = session.execute(
        text(
            """
            SELECT
                insurance_requests.status,
                insurance_requests.progress_stage
            FROM insurance_requests
            JOIN products ON products.id = insurance_requests.product_id
            JOIN clients ON clients.id = products.client_id
            JOIN users AS client_user ON client_user.id = clients.user_id
            WHERE insurance_requests.id = :request_id
              AND client_user.email = :client_email
            FOR UPDATE OF insurance_requests
            """
        ),
        {"request_id": request_id, "client_email": client_email},
    ).one_or_none()
    if row is None:
        return None
    if row.status != "Approved" or row.progress_stage != "Ready for Collection":
        raise ClaimNotReadyToCloseError()

    session.execute(
        text(
            """
            UPDATE insurance_requests
            SET
                progress_stage = 'Closed',
                progress_updated_at = CURRENT_TIMESTAMP,
                client_review = :review,
                provider_rating = :provider_rating,
                closed_at = CURRENT_TIMESTAMP
            WHERE id = :request_id
            """
        ),
        {
            "request_id": request_id,
            "review": review,
            "provider_rating": provider_rating,
        },
    )
    request = _find_request(session, request_id)
    session.execute(
        text(
            """
            INSERT INTO notifications (
                id,
                user_id,
                title,
                message,
                is_read,
                product_id
            )
            SELECT
                :notification_id,
                clients.adviser_id,
                :title,
                :message,
                FALSE,
                products.id
            FROM insurance_requests
            JOIN products ON products.id = insurance_requests.product_id
            JOIN clients ON clients.id = products.client_id
            WHERE insurance_requests.id = :request_id
            """
        ),
        {
            "notification_id": str(uuid4()),
            "request_id": request_id,
            "title": f"Claim closed by {request.client_name}",
            "message": (
                f"{request.client_name} closed the {request.product_name} claim. "
                f"Provider rating: {provider_rating}/5. "
                f'Review: "{review}"'
            ),
        },
    )
    participants = _find_claim_participants(session, request_id)
    create_activity(
        session,
        client_id=request.client_id,
        product_id=request.product_id,
        actor_user_id=participants.client_user_id,
        activity_type="Claim",
        source_type="claim-closed",
        source_id=request_id,
        title="Claim closed",
        body=(
            f"{request.client_name} closed the {request.product_name} claim "
            f"with a {provider_rating}/5 provider rating."
        ),
        recipients=[
            ActivityRecipient(participants.client_user_id, is_read=True),
            ActivityRecipient(participants.adviser_user_id),
        ],
    )
    session.commit()
    return request
