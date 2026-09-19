"""Response models shared by the financial API routes."""

from decimal import Decimal
from typing import Any, Literal

from pydantic import BaseModel


class FinancialPosition(BaseModel):
    """A client's current high-level financial position."""

    assets: Decimal
    liabilities: Decimal
    net_worth: Decimal
    monthly_income: Decimal
    monthly_expenses: Decimal


class Product(BaseModel):
    """One Goal or Insurance product shown in the shared product table."""

    id: str
    product_type: Literal["GOAL", "INSURANCE"]
    name: str
    provider: str
    status: str
    details: dict[str, Any]


class ClientOverview(BaseModel):
    """Financial position and products shared by Client and Adviser views."""

    id: str
    name: str
    financial_position: FinancialPosition
    products: list[Product]


class ClientSummary(BaseModel):
    """One row in the Adviser's assigned-clients table."""

    id: str
    name: str
    financial_position: FinancialPosition
    product_count: int
    pending_actions: int
