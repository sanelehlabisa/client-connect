"""Database queries for the insurance review workflow."""

from typing import Any
from uuid import uuid4

from sqlalchemy import text
from sqlalchemy.orm import Session

from app.email_service import send_email
from app.schemas import InsuranceRequest, InsuranceRequestStatus

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


class InvalidStatusTransitionError(Exception):
    """Raised when an Adviser attempts an out-of-order review decision."""

    def __init__(self, current_status: str, requested_status: str) -> None:
        """Store both statuses so the API can return a useful error."""

        self.current_status = current_status
        self.requested_status = requested_status
        super().__init__(
            f"Cannot change status from {current_status} to {requested_status}."
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
                insurance_requests.created_at
            FROM insurance_requests
            JOIN products ON products.id = insurance_requests.product_id
            JOIN clients ON clients.id = products.client_id
            JOIN users AS client_user ON client_user.id = clients.user_id
            WHERE insurance_requests.id = :request_id
            """
        ),
        {"request_id": request_id},
    ).one()
    return _insurance_request(row)


def create_insurance_request(
    session: Session,
    client_id: str,
    client_email: str,
    product_id: str,
    request_type: str,
    details: str,
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
                status
            )
            SELECT
                :request_id,
                products.id,
                :request_type,
                :details,
                'Submitted'
            FROM products
            JOIN clients ON clients.id = products.client_id
            JOIN users AS client_user ON client_user.id = clients.user_id
            WHERE products.id = :product_id
              AND products.client_id = :client_id
              AND products.product_type = 'INSURANCE'
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
        },
    ).scalar_one_or_none()

    if inserted_id is None:
        session.rollback()
        return None

    request = _find_request(session, inserted_id)
    adviser_email = session.execute(
        text(
            """
            SELECT adviser_user.email
            FROM products
            JOIN clients ON clients.id = products.client_id
            JOIN users AS adviser_user ON adviser_user.id = clients.adviser_id
            WHERE products.id = :product_id
            """
        ),
        {"product_id": request.product_id},
    ).scalar_one()
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
                f"{request.product_name}."
            ),
        },
    )
    session.commit()
    send_email(
        recipient=adviser_email,
        subject=f"New claim from {request.client_name}",
        body=(
            f"{request.client_name} submitted a claim for "
            f"{request.product_name}.\n\n"
            "Sign in to RSF ClientConnect to review it."
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
                insurance_requests.created_at
            FROM insurance_requests
            JOIN products ON products.id = insurance_requests.product_id
            JOIN clients ON clients.id = products.client_id
            JOIN users AS client_user ON client_user.id = clients.user_id
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
                insurance_requests.created_at
            FROM insurance_requests
            JOIN products ON products.id = insurance_requests.product_id
            JOIN clients ON clients.id = products.client_id
            JOIN users AS client_user ON client_user.id = clients.user_id
            JOIN users AS adviser_user ON adviser_user.id = clients.adviser_id
            WHERE adviser_user.email = :adviser_email
              AND insurance_requests.status IN ('Submitted', 'Under Review')
            ORDER BY insurance_requests.created_at
            """
        ),
        {"adviser_email": adviser_email},
    ).all()
    return [_insurance_request(row) for row in rows]


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

    allowed_statuses = ALLOWED_STATUS_TRANSITIONS.get(current_status, set())
    if requested_status not in allowed_statuses:
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
            "message": notification_message.format(
                product_name=request.product_name,
            ),
        },
    )
    session.commit()
    return request
