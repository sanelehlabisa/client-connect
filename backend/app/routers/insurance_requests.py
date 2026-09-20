"""Protected routes for Client submissions and Adviser reviews."""

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.auth import (
    AuthenticatedUser,
    get_current_user,
    require_email,
    require_role,
)
from app.database import get_database_session
from app.insurance_request_repository import (
    ClaimNotReadyToCloseError,
    InvalidProgressTransitionError,
    InvalidStatusTransitionError,
    close_insurance_request,
    create_insurance_request,
    list_adviser_review_queue,
    list_client_insurance_requests,
    update_insurance_request_status,
    update_insurance_request_progress,
)
from app.schemas import (
    InsuranceRequest,
    InsuranceRequestClose,
    InsuranceRequestCreate,
    InsuranceRequestProgressUpdate,
    InsuranceRequestStatusUpdate,
)

client_router = APIRouter(prefix="/clients", tags=["insurance requests"])
review_router = APIRouter(prefix="/insurance-requests", tags=["insurance reviews"])


@client_router.post(
    "/{client_id}/insurance-requests",
    response_model=InsuranceRequest,
    status_code=status.HTTP_201_CREATED,
)
def submit_insurance_request(
    client_id: str,
    request_data: InsuranceRequestCreate,
    client: Annotated[AuthenticatedUser, Depends(require_role("client"))],
    session: Annotated[Session, Depends(get_database_session)],
) -> InsuranceRequest:
    """Let a Client submit a request for their own Insurance product."""

    if "adviser" in client.roles:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Adviser accounts cannot submit Client requests.",
        )

    request = create_insurance_request(
        session=session,
        client_id=client_id,
        client_email=require_email(client),
        product_id=request_data.product_id,
        request_type=request_data.request_type,
        details=request_data.details,
    )
    if request is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Insurance product not found.",
        )
    return request


@client_router.get(
    "/{client_id}/insurance-requests",
    response_model=list[InsuranceRequest],
)
def get_client_insurance_requests(
    client_id: str,
    user: Annotated[AuthenticatedUser, Depends(get_current_user)],
    session: Annotated[Session, Depends(get_database_session)],
) -> list[InsuranceRequest]:
    """List requests for the owning Client or their assigned Adviser."""

    requests = list_client_insurance_requests(
        session=session,
        client_id=client_id,
        user_email=require_email(user),
        is_adviser="adviser" in user.roles,
    )
    if requests is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Client not found.",
        )
    return requests


@review_router.get("", response_model=list[InsuranceRequest])
def get_adviser_review_queue(
    adviser: Annotated[AuthenticatedUser, Depends(require_role("adviser"))],
    session: Annotated[Session, Depends(get_database_session)],
) -> list[InsuranceRequest]:
    """List active requests for Clients assigned to the Adviser."""

    return list_adviser_review_queue(session, require_email(adviser))


@review_router.patch("/{request_id}", response_model=InsuranceRequest)
def review_insurance_request(
    request_id: str,
    update: InsuranceRequestStatusUpdate,
    adviser: Annotated[AuthenticatedUser, Depends(require_role("adviser"))],
    session: Annotated[Session, Depends(get_database_session)],
) -> InsuranceRequest:
    """Move an assigned request through the controlled review workflow."""

    try:
        request = update_insurance_request_status(
            session=session,
            request_id=request_id,
            adviser_email=require_email(adviser),
            requested_status=update.status,
        )
    except InvalidStatusTransitionError as error:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(error),
        ) from error

    if request is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Insurance request not found.",
        )
    return request


@review_router.patch(
    "/{request_id}/progress",
    response_model=InsuranceRequest,
)
def advance_insurance_request_progress(
    request_id: str,
    update: InsuranceRequestProgressUpdate,
    adviser: Annotated[AuthenticatedUser, Depends(require_role("adviser"))],
    session: Annotated[Session, Depends(get_database_session)],
) -> InsuranceRequest:
    """Advance one approved claim to its next operational milestone."""

    try:
        request = update_insurance_request_progress(
            session=session,
            request_id=request_id,
            adviser_email=require_email(adviser),
            requested_stage=update.stage,
        )
    except InvalidProgressTransitionError as error:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(error),
        ) from error

    if request is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Insurance request not found.",
        )
    return request


@review_router.patch(
    "/{request_id}/close",
    response_model=InsuranceRequest,
)
def close_client_insurance_request(
    request_id: str,
    close_data: InsuranceRequestClose,
    client: Annotated[AuthenticatedUser, Depends(require_role("client"))],
    session: Annotated[Session, Depends(get_database_session)],
) -> InsuranceRequest:
    """Let the owning Client review and close a ready claim."""

    if "adviser" in client.roles:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Adviser accounts cannot close Client claims.",
        )

    try:
        request = close_insurance_request(
            session=session,
            request_id=request_id,
            client_email=require_email(client),
            review=close_data.review,
            provider_rating=close_data.provider_rating,
        )
    except ClaimNotReadyToCloseError as error:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(error),
        ) from error

    if request is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Insurance request not found.",
        )
    return request
