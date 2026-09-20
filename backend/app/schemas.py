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

InsuranceRequestProgressStage = Literal[
    "Provider Acknowledged",
    "Assessment Scheduled",
    "Assessment Complete",
    "Repairs Authorized",
    "Repair In Progress",
    "Car Hire Arranged",
    "Ready for Collection",
    "Closed",
]

ServiceRequestType = Literal[
    "Policy Document",
    "Border Letter",
    "Investment IRP5",
    "Consultation",
]
ServiceRequestStatus = Literal["Submitted", "In Progress", "Completed"]
ProviderType = Literal[
    "Financial Adviser",
    "Financial Institution",
    "Assessor",
    "Repairer",
]


class ProviderMatchRequest(BaseModel):
    """Criteria used by the reusable provider-matching service."""

    provider_type: ProviderType
    required_service: str = Field(min_length=2, max_length=80)
    location: str | None = Field(default=None, max_length=120)
    latitude: float | None = Field(default=None, ge=-90, le=90)
    longitude: float | None = Field(default=None, ge=-180, le=180)

    @field_validator("required_service", mode="before")
    @classmethod
    def strip_required_service(cls, value: object) -> object:
        """Normalize service text before matching."""

        return value.strip() if isinstance(value, str) else value

    @field_validator("location", mode="before")
    @classmethod
    def normalize_location(cls, value: object) -> object:
        """Treat an empty optional location as no location filter."""

        if isinstance(value, str):
            return value.strip() or None
        return value

    @model_validator(mode="after")
    def validate_coordinates(self) -> "ProviderMatchRequest":
        """Require latitude and longitude together when distance is relevant."""

        if (self.latitude is None) != (self.longitude is None):
            raise ValueError("Latitude and longitude must be provided together.")
        return self


class ProviderRecommendation(BaseModel):
    """One eligible provider returned by deterministic matching."""

    id: str
    name: str
    provider_type: ProviderType
    services: list[str]
    rating: Decimal
    location: str
    is_available: bool
    adviser_user_id: str | None
    distance_km: float | None


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


class Reminder(BaseModel):
    """A dated task visible to a Client, Adviser, or both roles."""

    id: str
    client_id: str
    client_name: str
    title: str
    due_date: date
    audience: Literal["Client", "Adviser", "Both"]
    is_completed: bool


class ReminderCreate(BaseModel):
    """A dated reminder scheduled by an Adviser for an assigned Client."""

    client_id: str = Field(min_length=1, max_length=40)
    title: str = Field(min_length=2, max_length=160)
    due_date: date
    audience: Literal["Client", "Adviser", "Both"]

    @field_validator("title", mode="before")
    @classmethod
    def strip_reminder_title(cls, value: object) -> object:
        """Remove accidental surrounding spaces from the title."""

        return value.strip() if isinstance(value, str) else value

    @model_validator(mode="after")
    def validate_due_date(self) -> "ReminderCreate":
        """Prevent newly scheduled reminders from starting overdue."""

        if self.due_date < date.today():
            raise ValueError("Due date cannot be in the past.")
        return self


class ServiceRequestCreate(BaseModel):
    """A document or consultation request submitted by a Client."""

    request_type: ServiceRequestType
    details: str = Field(min_length=2, max_length=2000)

    @field_validator("details", mode="before")
    @classmethod
    def strip_details(cls, value: object) -> object:
        """Reject request details that only contain spaces."""

        return value.strip() if isinstance(value, str) else value


class ServiceRequest(BaseModel):
    """One service request visible to a Client and assigned Adviser."""

    id: str
    client_id: str
    client_name: str
    request_type: ServiceRequestType
    details: str
    status: ServiceRequestStatus
    created_at: datetime
    updated_at: datetime


class ServiceRequestStatusUpdate(BaseModel):
    """The next service-request status selected by an Adviser."""

    status: Literal["In Progress", "Completed"]


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


class InsuranceRequestProgressUpdate(BaseModel):
    """The next operational milestone selected by an Adviser."""

    stage: InsuranceRequestProgressStage


class InsuranceRequestClose(BaseModel):
    """The short review a Client leaves when closing a completed claim."""

    review: str = Field(min_length=2, max_length=500)
    provider_rating: int = Field(ge=1, le=5)

    @field_validator("review", mode="before")
    @classmethod
    def strip_review(cls, value: object) -> object:
        """Reject reviews that only contain spaces."""

        return value.strip() if isinstance(value, str) else value


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
    provider_claim_number: str | None
    claims_handler: str | None
    progress_stage: InsuranceRequestProgressStage
    progress_updated_at: datetime
    client_review: str | None
    provider_rating: int | None
    closed_at: datetime | None
    created_at: datetime
