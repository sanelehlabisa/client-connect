"""Protected routes for shared Client and Adviser financial data."""

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.orm import Session

from app.auth import (
    AuthenticatedUser,
    get_current_user,
    require_email,
    require_role,
)
from app.client_repository import (
    ClientEmailAlreadyExistsError,
    archive_insurance_product,
    create_client_profile,
    create_client_goal,
    create_insurance_product,
    create_investment_product,
    find_client_overview,
    find_own_client_overview,
    list_assigned_clients,
    remove_client_product,
)
from app.database import get_database_session
from app.schemas import (
    ClientCreate,
    ClientOverview,
    ClientProfile,
    ClientSummary,
    GoalCreate,
    InsuranceProductCreate,
    InvestmentProductCreate,
    Product,
)

router = APIRouter(prefix="/clients", tags=["clients"])


@router.get("", response_model=list[ClientSummary])
def get_assigned_clients(
    adviser: Annotated[
        AuthenticatedUser,
        Depends(require_role("adviser")),
    ],
    session: Annotated[Session, Depends(get_database_session)],
) -> list[ClientSummary]:
    """List only the clients assigned to the authenticated Adviser."""

    return list_assigned_clients(session, require_email(adviser))


@router.post(
    "",
    response_model=ClientProfile,
    status_code=status.HTTP_201_CREATED,
)
def add_client_profile(
    client_data: ClientCreate,
    adviser: Annotated[
        AuthenticatedUser,
        Depends(require_role("adviser")),
    ],
    session: Annotated[Session, Depends(get_database_session)],
) -> ClientProfile:
    """Create a Client profile assigned to the authenticated Adviser."""

    try:
        client = create_client_profile(
            session=session,
            adviser_email=require_email(adviser),
            client_name=client_data.name,
            client_email=client_data.email,
        )
    except ClientEmailAlreadyExistsError as error:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A user with this email address already exists.",
        ) from error

    if client is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Adviser profile not found.",
        )
    return client


@router.get("/me", response_model=ClientOverview)
def get_own_client_overview(
    user: Annotated[AuthenticatedUser, Depends(get_current_user)],
    session: Annotated[Session, Depends(get_database_session)],
) -> ClientOverview:
    """Return the Client profile linked to the authenticated identity."""

    overview = find_own_client_overview(session, require_email(user))
    if overview is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Client profile not found.",
        )
    return overview


@router.post(
    "/{client_id}/goals",
    response_model=Product,
    status_code=status.HTTP_201_CREATED,
)
def add_client_goal(
    client_id: str,
    goal_data: GoalCreate,
    user: Annotated[AuthenticatedUser, Depends(get_current_user)],
    session: Annotated[Session, Depends(get_database_session)],
) -> Product:
    """Let a Client or assigned Adviser add a financial Goal."""

    is_adviser = "adviser" in user.roles
    if not is_adviser and "client" not in user.roles:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="A ClientConnect role is required.",
        )

    goal = create_client_goal(
        session=session,
        client_id=client_id,
        user_email=require_email(user),
        is_adviser=is_adviser,
        name=goal_data.name,
        starting_balance=goal_data.starting_balance,
        target_amount=goal_data.target_amount,
        start_date=goal_data.start_date,
        target_date=goal_data.target_date,
    )
    if goal is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Client not found.",
        )
    return goal


@router.post(
    "/{client_id}/insurance-products",
    response_model=Product,
    status_code=status.HTTP_201_CREATED,
)
def add_insurance_product(
    client_id: str,
    product_data: InsuranceProductCreate,
    user: Annotated[AuthenticatedUser, Depends(get_current_user)],
    session: Annotated[Session, Depends(get_database_session)],
) -> Product:
    """Let a Client or assigned Adviser add an Insurance policy."""

    is_adviser = "adviser" in user.roles
    if not is_adviser and "client" not in user.roles:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="A ClientConnect role is required.",
        )

    product = create_insurance_product(
        session=session,
        client_id=client_id,
        user_email=require_email(user),
        is_adviser=is_adviser,
        name=product_data.name,
        provider=product_data.provider,
        insurance_type=product_data.insurance_type,
        policy_number=product_data.policy_number,
        premium=product_data.premium,
        cover_amount=product_data.cover_amount,
    )
    if product is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Client not found.",
        )
    return product


@router.post(
    "/{client_id}/investments",
    response_model=Product,
    status_code=status.HTTP_201_CREATED,
)
def add_investment_product(
    client_id: str,
    product_data: InvestmentProductCreate,
    user: Annotated[AuthenticatedUser, Depends(get_current_user)],
    session: Annotated[Session, Depends(get_database_session)],
) -> Product:
    """Let a Client or assigned Adviser add an Investment."""

    is_adviser = "adviser" in user.roles
    if not is_adviser and "client" not in user.roles:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="A ClientConnect role is required.",
        )

    product = create_investment_product(
        session=session,
        client_id=client_id,
        user_email=require_email(user),
        is_adviser=is_adviser,
        name=product_data.name,
        provider=product_data.provider,
        investment_type=product_data.investment_type,
        account_number=product_data.account_number,
        current_value=product_data.current_value,
        monthly_contribution=product_data.monthly_contribution,
    )
    if product is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Client not found.",
        )
    return product


@router.delete(
    "/{client_id}/products/{product_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_client_product(
    client_id: str,
    product_id: str,
    user: Annotated[AuthenticatedUser, Depends(get_current_user)],
    session: Annotated[Session, Depends(get_database_session)],
) -> Response:
    """Let a Client or assigned Adviser remove a Goal or Investment."""

    is_adviser = "adviser" in user.roles
    if not is_adviser and "client" not in user.roles:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="A ClientConnect role is required.",
        )

    removed = remove_client_product(
        session=session,
        client_id=client_id,
        product_id=product_id,
        user_email=require_email(user),
        is_adviser=is_adviser,
    )
    if not removed:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Removable product not found.",
        )
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.patch(
    "/{client_id}/insurance-products/{product_id}/archive",
    response_model=Product,
)
def archive_client_insurance_product(
    client_id: str,
    product_id: str,
    user: Annotated[AuthenticatedUser, Depends(get_current_user)],
    session: Annotated[Session, Depends(get_database_session)],
) -> Product:
    """Let a Client or assigned Adviser archive an Insurance policy."""

    is_adviser = "adviser" in user.roles
    if not is_adviser and "client" not in user.roles:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="A ClientConnect role is required.",
        )

    product = archive_insurance_product(
        session=session,
        client_id=client_id,
        product_id=product_id,
        user_email=require_email(user),
        is_adviser=is_adviser,
    )
    if product is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Insurance policy not found.",
        )
    return product


@router.get("/{client_id}", response_model=ClientOverview)
def get_client_overview(
    client_id: str,
    user: Annotated[AuthenticatedUser, Depends(get_current_user)],
    session: Annotated[Session, Depends(get_database_session)],
) -> ClientOverview:
    """Return an owned or assigned client without revealing other records."""

    overview = find_client_overview(
        session=session,
        client_id=client_id,
        user_email=require_email(user),
        is_adviser="adviser" in user.roles,
    )
    if overview is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Client not found.",
        )
    return overview
