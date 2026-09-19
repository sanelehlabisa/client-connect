"""Request and response models shared by the API routes."""

from datetime import datetime
from decimal import Decimal
from typing import Any, Literal

from pydantic import BaseModel, Field

InsuranceRequestStatus = Literal[
    "Submitted",
    "Under Review",
    "Approved",
    "Changes Required",
    "Rejected",
]


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


class InsuranceRequestCreate(BaseModel):
    """Information a Client submits for an insurance policy change."""

    product_id: str = Field(min_length=1, max_length=40)
    request_type: str = Field(min_length=2, max_length=80)
    details: str = Field(min_length=2, max_length=2000)


class InsuranceRequestStatusUpdate(BaseModel):
    """A valid review decision selected by an Adviser."""

    status: Literal[
        "Under Review",
        "Approved",
        "Changes Required",
        "Rejected",
    ]


class InsuranceRequest(BaseModel):
    """An insurance change request visible to its Client and Adviser."""

    id: str
    client_id: str
    client_name: str
    product_id: str
    product_name: str
    request_type: str
    details: str
    status: InsuranceRequestStatus
    created_at: datetime
