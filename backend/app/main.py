"""FastAPI entry point for RSF ClientConnect."""

from typing import Annotated, Literal

from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from app.auth import AuthenticatedUser, get_current_user, require_role
from app.database import database_is_ready
from app.settings import get_settings

settings = get_settings()

app = FastAPI(title=settings.app_name)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_url],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class HealthResponse(BaseModel):
    """Response returned by the API health endpoint."""

    status: Literal["ok", "degraded"]
    database: Literal["connected", "unavailable"]


class RootResponse(BaseModel):
    """Small welcome response used to identify the API."""

    message: str


@app.get("/", response_model=RootResponse)
def read_root() -> RootResponse:
    """Return a friendly message from the API root."""

    return RootResponse(message="RSF ClientConnect API is running.")


@app.get("/health", response_model=HealthResponse)
def health_check() -> HealthResponse:
    """Report whether the API can connect to PostgreSQL."""

    is_ready = database_is_ready()
    return HealthResponse(
        status="ok" if is_ready else "degraded",
        database="connected" if is_ready else "unavailable",
    )


@app.get("/auth/me", response_model=AuthenticatedUser)
def read_current_user(
    user: Annotated[AuthenticatedUser, Depends(get_current_user)],
) -> AuthenticatedUser:
    """Return the current identity after validating its bearer token."""

    return user


@app.get("/auth/adviser-check", response_model=AuthenticatedUser)
def check_adviser_access(
    user: Annotated[AuthenticatedUser, Depends(require_role("adviser"))],
) -> AuthenticatedUser:
    """Confirm that the current identity has the Adviser role."""

    return user
