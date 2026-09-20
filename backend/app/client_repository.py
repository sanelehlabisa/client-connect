"""Database queries for client financial information."""

import json
from datetime import date
from decimal import Decimal
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


def _product(row: Any) -> Product:
    """Build a typed financial product response from a database row."""

    return Product(
        id=row.id,
        product_type=row.product_type,
        name=row.name,
        provider=row.provider,
        status=row.status,
        details=row.details,
    )


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

    all_products = [_product(row) for row in product_rows]
    products = [
        product for product in all_products if product.status != "Archived"
    ]
    archived_products = [
        product for product in all_products if product.status == "Archived"
    ]

    return ClientOverview(
        id=client_row.id,
        name=client_row.name,
        financial_position=_financial_position(client_row),
        products=products,
        archived_products=archived_products,
    )


def find_own_client_overview(
    session: Session,
    user_email: str,
) -> ClientOverview | None:
    """Return the Client overview linked to the current identity email."""

    client_id = session.execute(
        text(
            """
            SELECT clients.id
            FROM clients
            JOIN users AS client_user ON client_user.id = clients.user_id
            WHERE client_user.email = :user_email
            """
        ),
        {"user_email": user_email},
    ).scalar_one_or_none()
    if client_id is None:
        return None

    return find_client_overview(
        session=session,
        client_id=client_id,
        user_email=user_email,
        is_adviser=False,
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
                COALESCE(product_summary.product_count, 0) AS product_count,
                COALESCE(claim_summary.pending_actions, 0) AS pending_actions,
                latest_activity.occurred_at AS latest_activity_at,
                latest_activity.preview AS latest_activity_preview,
                COALESCE(activity_summary.unread_message_count, 0)
                    AS unread_message_count
            FROM clients
            JOIN users AS client_user ON client_user.id = clients.user_id
            JOIN users AS adviser_user ON adviser_user.id = clients.adviser_id
            JOIN financial_positions
                ON financial_positions.client_id = clients.id
            LEFT JOIN LATERAL (
                SELECT COUNT(*)::INTEGER AS product_count
                FROM products
                WHERE products.client_id = clients.id
                  AND products.status <> 'Archived'
            ) AS product_summary ON TRUE
            LEFT JOIN LATERAL (
                SELECT COUNT(*)::INTEGER AS pending_actions
                FROM insurance_requests
                JOIN products
                    ON products.id = insurance_requests.product_id
                WHERE products.client_id = clients.id
                  AND insurance_requests.status IN (
                      'Submitted',
                      'Under Review'
                  )
            ) AS claim_summary ON TRUE
            LEFT JOIN LATERAL (
                SELECT
                    activities.occurred_at,
                    LEFT(
                        activities.title || ' — ' || activities.body,
                        160
                    ) AS preview
                FROM activities
                JOIN activity_receipts
                    ON activity_receipts.activity_id = activities.id
                WHERE activities.client_id = clients.id
                  AND activity_receipts.user_id = clients.adviser_id
                ORDER BY activities.occurred_at DESC, activities.id DESC
                LIMIT 1
            ) AS latest_activity ON TRUE
            LEFT JOIN LATERAL (
                SELECT COUNT(*)::INTEGER AS unread_message_count
                FROM activities
                JOIN activity_receipts
                    ON activity_receipts.activity_id = activities.id
                WHERE activities.client_id = clients.id
                  AND activities.activity_type = 'Message'
                  AND activity_receipts.user_id = clients.adviser_id
                  AND activity_receipts.read_at IS NULL
            ) AS activity_summary ON TRUE
            WHERE adviser_user.email = :adviser_email
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
            latest_activity_at=row.latest_activity_at,
            latest_activity_preview=row.latest_activity_preview,
            unread_message_count=row.unread_message_count,
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


def create_client_goal(
    session: Session,
    client_id: str,
    user_email: str,
    is_adviser: bool,
    name: str,
    starting_balance: Decimal,
    target_amount: Decimal,
    start_date: date,
    target_date: date,
) -> Product | None:
    """Create a Goal for an owned or assigned Client profile."""

    goal_id = str(uuid4())
    details = json.dumps(
        {
            "starting_balance": str(starting_balance),
            "current_value": str(starting_balance),
            "target_amount": str(target_amount),
            "start_date": start_date.isoformat(),
            "target_date": target_date.isoformat(),
        }
    )
    row = session.execute(
        text(
            """
            INSERT INTO products (
                id,
                client_id,
                product_type,
                name,
                provider,
                status,
                details
            )
            SELECT
                :goal_id,
                clients.id,
                'GOAL',
                :name,
                'Royal Square',
                'Active',
                CAST(:details AS JSONB)
            FROM clients
            JOIN users AS client_user ON client_user.id = clients.user_id
            JOIN users AS adviser_user ON adviser_user.id = clients.adviser_id
            WHERE clients.id = :client_id
              AND (
                    (:is_adviser AND adviser_user.email = :user_email)
                    OR
                    (NOT :is_adviser AND client_user.email = :user_email)
              )
            RETURNING id, product_type, name, provider, status, details
            """
        ),
        {
            "goal_id": goal_id,
            "client_id": client_id,
            "user_email": user_email,
            "is_adviser": is_adviser,
            "name": name,
            "details": details,
        },
    ).one_or_none()
    if row is None:
        session.rollback()
        return None

    session.commit()
    return _product(row)


def create_insurance_product(
    session: Session,
    client_id: str,
    user_email: str,
    is_adviser: bool,
    name: str,
    provider: str,
    insurance_type: str,
    policy_number: str,
    premium: Decimal,
    cover_amount: Decimal,
) -> Product | None:
    """Create an Insurance policy for an owned or assigned Client profile."""

    product_id = str(uuid4())
    details = json.dumps(
        {
            "insurance_type": insurance_type,
            "policy_number": policy_number,
            "premium": str(premium),
            "cover_amount": str(cover_amount),
        }
    )
    row = session.execute(
        text(
            """
            INSERT INTO products (
                id,
                client_id,
                product_type,
                name,
                provider,
                status,
                details
            )
            SELECT
                :product_id,
                clients.id,
                'INSURANCE',
                :name,
                :provider,
                'Active',
                CAST(:details AS JSONB)
            FROM clients
            JOIN users AS client_user ON client_user.id = clients.user_id
            JOIN users AS adviser_user ON adviser_user.id = clients.adviser_id
            WHERE clients.id = :client_id
              AND (
                    (:is_adviser AND adviser_user.email = :user_email)
                    OR
                    (NOT :is_adviser AND client_user.email = :user_email)
              )
            RETURNING id, product_type, name, provider, status, details
            """
        ),
        {
            "product_id": product_id,
            "client_id": client_id,
            "user_email": user_email,
            "is_adviser": is_adviser,
            "name": name,
            "provider": provider,
            "details": details,
        },
    ).one_or_none()
    if row is None:
        session.rollback()
        return None

    session.commit()
    return _product(row)


def create_investment_product(
    session: Session,
    client_id: str,
    user_email: str,
    is_adviser: bool,
    name: str,
    provider: str,
    investment_type: str,
    account_number: str,
    current_value: Decimal,
    monthly_contribution: Decimal,
) -> Product | None:
    """Create an Investment for an owned or assigned Client profile."""

    product_id = str(uuid4())
    details = json.dumps(
        {
            "investment_type": investment_type,
            "account_number": account_number,
            "current_value": str(current_value),
            "monthly_contribution": str(monthly_contribution),
        }
    )
    row = session.execute(
        text(
            """
            INSERT INTO products (
                id,
                client_id,
                product_type,
                name,
                provider,
                status,
                details
            )
            SELECT
                :product_id,
                clients.id,
                'INVESTMENT',
                :name,
                :provider,
                'Active',
                CAST(:details AS JSONB)
            FROM clients
            JOIN users AS client_user ON client_user.id = clients.user_id
            JOIN users AS adviser_user ON adviser_user.id = clients.adviser_id
            WHERE clients.id = :client_id
              AND (
                    (:is_adviser AND adviser_user.email = :user_email)
                    OR
                    (NOT :is_adviser AND client_user.email = :user_email)
              )
            RETURNING id, product_type, name, provider, status, details
            """
        ),
        {
            "product_id": product_id,
            "client_id": client_id,
            "user_email": user_email,
            "is_adviser": is_adviser,
            "name": name,
            "provider": provider,
            "details": details,
        },
    ).one_or_none()
    if row is None:
        session.rollback()
        return None

    session.commit()
    return _product(row)


def remove_client_product(
    session: Session,
    client_id: str,
    product_id: str,
    user_email: str,
    is_adviser: bool,
) -> bool:
    """Remove a Goal or Investment owned by an allowed Client profile."""

    removed_id = session.execute(
        text(
            """
            DELETE FROM products
            USING clients, users AS client_user, users AS adviser_user
            WHERE products.id = :product_id
              AND products.client_id = clients.id
              AND clients.id = :client_id
              AND clients.user_id = client_user.id
              AND clients.adviser_id = adviser_user.id
              AND products.product_type IN ('GOAL', 'INVESTMENT')
              AND (
                    (:is_adviser AND adviser_user.email = :user_email)
                    OR
                    (NOT :is_adviser AND client_user.email = :user_email)
              )
            RETURNING products.id
            """
        ),
        {
            "product_id": product_id,
            "client_id": client_id,
            "user_email": user_email,
            "is_adviser": is_adviser,
        },
    ).scalar_one_or_none()
    if removed_id is None:
        session.rollback()
        return False

    session.commit()
    return True


def archive_insurance_product(
    session: Session,
    client_id: str,
    product_id: str,
    user_email: str,
    is_adviser: bool,
) -> Product | None:
    """Archive an Insurance policy without deleting its related history."""

    row = session.execute(
        text(
            """
            UPDATE products
            SET status = 'Archived'
            FROM clients, users AS client_user, users AS adviser_user
            WHERE products.id = :product_id
              AND products.client_id = clients.id
              AND clients.id = :client_id
              AND clients.user_id = client_user.id
              AND clients.adviser_id = adviser_user.id
              AND products.product_type = 'INSURANCE'
              AND (
                    (:is_adviser AND adviser_user.email = :user_email)
                    OR
                    (NOT :is_adviser AND client_user.email = :user_email)
              )
            RETURNING
                products.id,
                products.product_type,
                products.name,
                products.provider,
                products.status,
                products.details
            """
        ),
        {
            "product_id": product_id,
            "client_id": client_id,
            "user_email": user_email,
            "is_adviser": is_adviser,
        },
    ).one_or_none()
    if row is None:
        session.rollback()
        return None

    session.commit()
    return _product(row)
