"""Database queries for client financial information."""

from typing import Any
from uuid import uuid4

from sqlalchemy import text
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.schemas import (
    ClientOverview,
    ClientProfile,
    ClientSummary,
    FinancialPosition,
    Product,
)


class ClientEmailAlreadyExistsError(Exception):
    """Raised when an Adviser tries to reuse an application-user email."""


def _financial_position(row: Any) -> FinancialPosition:
    """Build the shared financial-position response from a query row."""

    return FinancialPosition(
        assets=row.assets,
        liabilities=row.liabilities,
        net_worth=row.assets - row.liabilities,
        monthly_income=row.monthly_income,
        monthly_expenses=row.monthly_expenses,
    )


def find_client_overview(
    session: Session,
    client_id: str,
    user_email: str,
    is_adviser: bool,
) -> ClientOverview | None:
    """Return a client only when the current user is allowed to view it."""

    client_row = session.execute(
        text(
            """
            SELECT
                clients.id,
                client_user.name,
                financial_positions.assets,
                financial_positions.liabilities,
                financial_positions.monthly_income,
                financial_positions.monthly_expenses
            FROM clients
            JOIN users AS client_user ON client_user.id = clients.user_id
            JOIN users AS adviser_user ON adviser_user.id = clients.adviser_id
            JOIN financial_positions
                ON financial_positions.client_id = clients.id
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

    if client_row is None:
        return None

    product_rows = session.execute(
        text(
            """
            SELECT id, product_type, name, provider, status, details
            FROM products
            WHERE client_id = :client_id
            ORDER BY product_type, name
            """
        ),
        {"client_id": client_id},
    ).all()

    products = [
        Product(
            id=row.id,
            product_type=row.product_type,
            name=row.name,
            provider=row.provider,
            status=row.status,
            details=row.details,
        )
        for row in product_rows
    ]

    return ClientOverview(
        id=client_row.id,
        name=client_row.name,
        financial_position=_financial_position(client_row),
        products=products,
    )


def list_assigned_clients(
    session: Session,
    adviser_email: str,
) -> list[ClientSummary]:
    """Return summary rows for clients assigned to one Adviser."""

    rows = session.execute(
        text(
            """
            SELECT
                clients.id,
                client_user.name,
                financial_positions.assets,
                financial_positions.liabilities,
                financial_positions.monthly_income,
                financial_positions.monthly_expenses,
                COUNT(DISTINCT products.id) AS product_count,
                COUNT(DISTINCT insurance_requests.id) FILTER (
                    WHERE insurance_requests.status IN ('Submitted', 'Under Review')
                ) AS pending_actions
            FROM clients
            JOIN users AS client_user ON client_user.id = clients.user_id
            JOIN users AS adviser_user ON adviser_user.id = clients.adviser_id
            JOIN financial_positions
                ON financial_positions.client_id = clients.id
            LEFT JOIN products ON products.client_id = clients.id
            LEFT JOIN insurance_requests
                ON insurance_requests.product_id = products.id
            WHERE adviser_user.email = :adviser_email
            GROUP BY
                clients.id,
                client_user.name,
                financial_positions.assets,
                financial_positions.liabilities,
                financial_positions.monthly_income,
                financial_positions.monthly_expenses
            ORDER BY client_user.name
            """
        ),
        {"adviser_email": adviser_email},
    ).all()

    return [
        ClientSummary(
            id=row.id,
            name=row.name,
            financial_position=_financial_position(row),
            product_count=row.product_count,
            pending_actions=row.pending_actions,
        )
        for row in rows
    ]


def create_client_profile(
    session: Session,
    adviser_email: str,
    client_name: str,
    client_email: str,
) -> ClientProfile | None:
    """Create and assign a zero-balance Client profile to one Adviser."""

    adviser_id = session.execute(
        text("SELECT id FROM users WHERE email = :adviser_email"),
        {"adviser_email": adviser_email},
    ).scalar_one_or_none()
    if adviser_id is None:
        return None

    user_id = str(uuid4())
    client_id = str(uuid4())

    try:
        session.execute(
            text(
                """
                INSERT INTO users (id, name, email)
                VALUES (:user_id, :client_name, :client_email)
                """
            ),
            {
                "user_id": user_id,
                "client_name": client_name,
                "client_email": client_email,
            },
        )
        session.execute(
            text(
                """
                INSERT INTO clients (id, user_id, adviser_id)
                VALUES (:client_id, :user_id, :adviser_id)
                """
            ),
            {
                "client_id": client_id,
                "user_id": user_id,
                "adviser_id": adviser_id,
            },
        )
        session.execute(
            text(
                """
                INSERT INTO financial_positions (
                    client_id,
                    assets,
                    liabilities,
                    monthly_income,
                    monthly_expenses
                )
                VALUES (:client_id, 0, 0, 0, 0)
                """
            ),
            {"client_id": client_id},
        )
        session.commit()
    except IntegrityError as error:
        session.rollback()
        if getattr(error.orig, "sqlstate", None) == "23505":
            raise ClientEmailAlreadyExistsError from error
        raise

    return ClientProfile(id=client_id, name=client_name, email=client_email)
