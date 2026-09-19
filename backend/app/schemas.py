"""Request and response models shared by the API routes."""

from datetime import date, datetime
from decimal import Decimal
from typing import Any, Literal

from pydantic import BaseModel, Field, field_validator, model_validator

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
    product_type: Literal["GOAL", "INSURANCE", "INVESTMENT"]
    name: str
    provider: str
    status: str
    details: dict[str, Any]


class GoalCreate(BaseModel):
    """A financial Goal created by a Client for their own dashboard."""

    name: str = Field(min_length=2, max_length=120)
    starting_balance: Decimal = Field(ge=0, max_digits=14, decimal_places=2)
    target_amount: Decimal = Field(gt=0, max_digits=14, decimal_places=2)
    start_date: date
    target_date: date

    @field_validator("name", mode="before")
    @classmethod
    def strip_name(cls, value: object) -> object:
        """Remove accidental spaces around the Goal name."""

        return value.strip() if isinstance(value, str) else value

    @model_validator(mode="after")
    def validate_goal_progress(self) -> "GoalCreate":
        """Require a future target date and room for the Goal to grow."""

        if self.target_date <= self.start_date:
            raise ValueError("Target date must be after the start date.")
        if self.target_amount <= self.starting_balance:
            raise ValueError("Target amount must exceed the starting balance.")
        return self


class InsuranceProductCreate(BaseModel):
    """An Insurance policy added to an owned or assigned Client dashboard."""

    name: str = Field(min_length=2, max_length=120)
    provider: str = Field(min_length=2, max_length=120)
    insurance_type: str = Field(min_length=2, max_length=80)
    policy_number: str = Field(min_length=2, max_length=80)
    premium: Decimal = Field(ge=0, max_digits=14, decimal_places=2)
    cover_amount: Decimal = Field(gt=0, max_digits=14, decimal_places=2)

    @field_validator(
        "name",
        "provider",
        "insurance_type",
        "policy_number",
        mode="before",
    )
    @classmethod
    def strip_insurance_text(cls, value: object) -> object:
        """Remove accidental spaces around Insurance policy fields."""

        return value.strip() if isinstance(value, str) else value


class InvestmentProductCreate(BaseModel):
    """An Investment added to an owned or assigned Client dashboard."""

    name: str = Field(min_length=2, max_length=120)
    provider: str = Field(min_length=2, max_length=120)
    investment_type: str = Field(min_length=2, max_length=80)
    account_number: str = Field(min_length=2, max_length=80)
    current_value: Decimal = Field(ge=0, max_digits=14, decimal_places=2)
    monthly_contribution: Decimal = Field(ge=0, max_digits=14, decimal_places=2)

    @field_validator(
        "name",
        "provider",
        "investment_type",
        "account_number",
        mode="before",
    )
    @classmethod
    def strip_investment_text(cls, value: object) -> object:
        """Remove accidental spaces around Investment fields."""

        return value.strip() if isinstance(value, str) else value


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


class ClientCreate(BaseModel):
    """The small Client profile an Adviser creates before account signup."""

    name: str = Field(min_length=2, max_length=120)
    email: str = Field(
        min_length=5,
        max_length=255,
        pattern=r"^[^@\s]+@[^@\s]+\.[^@\s]+$",
    )

    @field_validator("name", "email", mode="before")
    @classmethod
    def strip_text(cls, value: object) -> object:
        """Remove accidental surrounding spaces before validation."""

        return value.strip() if isinstance(value, str) else value

    @field_validator("email")
    @classmethod
    def normalize_email(cls, value: str) -> str:
        """Store emails consistently because identity matching uses them."""

        return value.lower()


class ClientProfile(BaseModel):
    """A Client profile linked to its Adviser by email identity."""

    id: str
    name: str
    email: str


class ChatMessageCreate(BaseModel):
    """One text message sent between a Client and assigned Adviser."""

    body: str = Field(min_length=1, max_length=2000)

    @field_validator("body", mode="before")
    @classmethod
    def strip_body(cls, value: object) -> object:
        """Reject messages that contain only spaces."""

        return value.strip() if isinstance(value, str) else value


class ChatMessage(BaseModel):
    """A persistent message in one Client-Adviser conversation."""

    id: str
    client_id: str
    sender_name: str
    sender_role: Literal["Client", "Adviser"]
    body: str
    sent_by_me: bool
    created_at: datetime


class NotificationItem(BaseModel):
    """One notification belonging to the authenticated application user."""

    id: str
    title: str
    message: str
    is_read: bool
    client_id: str | None
    client_name: str | None
    product_id: str | None
    product_name: str | None
    created_at: datetime


class InsuranceRequestCreate(BaseModel):
    """Information a Client submits for an insurance policy change."""

    product_id: str = Field(min_length=1, max_length=40)
    request_type: str = Field(min_length=2, max_length=80)
    details: str = Field(min_length=2, max_length=10000)


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
