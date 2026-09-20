"""Database queries for Client document and consultation requests."""

from uuid import uuid4

from sqlalchemy import text
from sqlalchemy.orm import Session

from app.schemas import ServiceRequest, ServiceRequestType


def list_service_requests(
    session: Session,
    client_id: str,
    user_email: str,
    is_adviser: bool,
) -> list[ServiceRequest] | None:
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
                service_requests.id,
                clients.id AS client_id,
                client_user.name AS client_name,
                service_requests.request_type,
                service_requests.details,
                service_requests.status,
                service_requests.created_at
            FROM service_requests
            JOIN clients ON clients.id = service_requests.client_id
            JOIN users AS client_user ON client_user.id = clients.user_id
            WHERE clients.id = :client_id
            ORDER BY service_requests.created_at DESC
            """
        ),
        {"client_id": client_id},
    ).all()
    return [
        ServiceRequest(
            id=row.id,
            client_id=row.client_id,
            client_name=row.client_name,
            request_type=row.request_type,
            details=row.details,
            status=row.status,
            created_at=row.created_at,
        )
        for row in rows
    ]


def create_service_request(
    session: Session,
    client_id: str,
    client_email: str,
    request_type: ServiceRequestType,
    details: str,
) -> ServiceRequest | None:
    """Create a service request only for the authenticated Client."""

    request_id = str(uuid4())
    row = session.execute(
        text(
            """
            INSERT INTO service_requests (
                id,
                client_id,
                request_type,
                details
            )
            SELECT
                :request_id,
                clients.id,
                :request_type,
                :details
            FROM clients
            JOIN users AS client_user ON client_user.id = clients.user_id
            WHERE clients.id = :client_id
              AND client_user.email = :client_email
            RETURNING id, request_type, details, status, created_at
            """
        ),
        {
            "request_id": request_id,
            "client_id": client_id,
            "client_email": client_email,
            "request_type": request_type,
            "details": details,
        },
    ).one_or_none()
    if row is None:
        session.rollback()
        return None

    client_name = session.execute(
        text(
            """
            SELECT client_user.name
            FROM clients
            JOIN users AS client_user ON client_user.id = clients.user_id
            WHERE clients.id = :client_id
            """
        ),
        {"client_id": client_id},
    ).scalar_one()
    session.execute(
        text(
            """
            INSERT INTO notifications (
                id,
                user_id,
                title,
                message,
                is_read
            )
            SELECT
                :notification_id,
                clients.adviser_id,
                :title,
                :message,
                FALSE
            FROM clients
            WHERE clients.id = :client_id
            """
        ),
        {
            "notification_id": str(uuid4()),
            "client_id": client_id,
            "title": f"New {request_type} request",
            "message": f"{client_name} submitted: {details}",
        },
    )
    session.commit()
    return ServiceRequest(
        id=row.id,
        client_id=client_id,
        client_name=client_name,
        request_type=row.request_type,
        details=row.details,
        status=row.status,
        created_at=row.created_at,
    )
