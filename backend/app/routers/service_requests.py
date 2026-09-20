"""Protected routes for Client document and consultation requests."""

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.auth import AuthenticatedUser, get_current_user, require_email, require_role
from app.database import get_database_session
from app.schemas import (
    ServiceRequest,
    ServiceRequestCreate,
    ServiceRequestStatusUpdate,
)
from app.service_request_repository import (
    InvalidServiceRequestTransitionError,
    create_service_request,
    list_service_requests,
    update_service_request_status,
)

router = APIRouter(prefix="/clients", tags=["service requests"])


@router.post(
    "/{client_id}/service-requests",
    response_model=ServiceRequest,
    status_code=status.HTTP_201_CREATED,
)
def submit_service_request(
    client_id: str,
    request_data: ServiceRequestCreate,
    client: Annotated[AuthenticatedUser, Depends(require_role("client"))],
    session: Annotated[Session, Depends(get_database_session)],
) -> ServiceRequest:
    """Let a Client submit a service request for their own profile."""

    if "adviser" in client.roles:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Adviser accounts cannot submit Client requests.",
        )

    request = create_service_request(
        session=session,
        client_id=client_id,
        client_email=require_email(client),
        request_type=request_data.request_type,
        details=request_data.details,
    )
    if request is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Client not found.",
        )
    return request


@router.get(
    "/{client_id}/service-requests",
    response_model=list[ServiceRequest],
)
def get_service_requests(
    client_id: str,
    user: Annotated[AuthenticatedUser, Depends(get_current_user)],
    session: Annotated[Session, Depends(get_database_session)],
) -> list[ServiceRequest]:
    """List service requests for the owning Client or assigned Adviser."""

    is_adviser = "adviser" in user.roles
    if not is_adviser and "client" not in user.roles:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="A ClientConnect role is required.",
        )
    requests = list_service_requests(
        session=session,
        client_id=client_id,
        user_email=require_email(user),
        is_adviser=is_adviser,
    )
    if requests is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Client not found.",
        )
    return requests


@router.patch(
    "/{client_id}/service-requests/{request_id}",
    response_model=ServiceRequest,
)
def change_service_request_status(
    client_id: str,
    request_id: str,
    update: ServiceRequestStatusUpdate,
    adviser: Annotated[AuthenticatedUser, Depends(require_role("adviser"))],
    session: Annotated[Session, Depends(get_database_session)],
) -> ServiceRequest:
    """Move an assigned Client request through its status workflow."""

    try:
        request = update_service_request_status(
            session=session,
            client_id=client_id,
            request_id=request_id,
            adviser_email=require_email(adviser),
            requested_status=update.status,
        )
    except InvalidServiceRequestTransitionError as error:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(error),
        ) from error

    if request is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Service request not found.",
        )
    return request
