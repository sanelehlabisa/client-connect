"""FastAPI entry point for ClientConnect."""

import asyncio
import logging
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager, suppress
from typing import Annotated, Literal

from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from app.auth import (
    AuthenticatedUser,
    DemoLoginRequest,
    DemoLoginResponse,
    get_current_user,
    login_with_demo_user,
    require_role,
)
from app.database import database_is_ready
from app.reminder_delivery import run_due_reminder_delivery
from app.routers.activities import router as activities_router
from app.routers.clients import router as clients_router
from app.routers.insurance_requests import client_router, review_router
from app.routers.messages import router as messages_router
from app.routers.notifications import router as notifications_router
from app.routers.providers import router as providers_router
from app.routers.reminders import router as reminders_router
from app.routers.service_requests import router as service_requests_router
from app.settings import get_settings

settings = get_settings()
logger = logging.getLogger(__name__)


async def reminder_delivery_loop() -> None:
    """Run due-reminder delivery periodically without blocking the API."""

    while True:
        try:
            await asyncio.to_thread(run_due_reminder_delivery)
        except Exception:
            logger.exception("The due-reminder delivery pass failed.")
        await asyncio.sleep(settings.reminder_check_interval_seconds)


@asynccontextmanager
async def lifespan(_: FastAPI) -> AsyncIterator[None]:
    """Start and stop the small development reminder worker."""

    reminder_task = asyncio.create_task(reminder_delivery_loop())
    try:
        yield
    finally:
        reminder_task.cancel()
        with suppress(asyncio.CancelledError):
            await reminder_task


app = FastAPI(title=settings.app_name, lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_url],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(clients_router)
app.include_router(activities_router)
app.include_router(client_router)
app.include_router(review_router)
app.include_router(messages_router)
app.include_router(notifications_router)
app.include_router(providers_router)
app.include_router(reminders_router)
app.include_router(service_requests_router)


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

    return RootResponse(message="ClientConnect API is running.")


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


@app.post("/auth/login", response_model=DemoLoginResponse)
def login(credentials: DemoLoginRequest) -> DemoLoginResponse:
    """Log in with one of the development-only JSON accounts."""

    return login_with_demo_user(credentials)


@app.get("/auth/adviser-check", response_model=AuthenticatedUser)
def check_adviser_access(
    user: Annotated[AuthenticatedUser, Depends(require_role("adviser"))],
) -> AuthenticatedUser:
    """Confirm that the current identity has the Adviser role."""

    return user
