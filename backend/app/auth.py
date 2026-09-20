"""Development-only JSON authentication and role helpers."""

import hmac
import json
from collections.abc import Callable
from datetime import datetime, timedelta, timezone
from functools import lru_cache
from pathlib import Path
from typing import Annotated, Any, Literal

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jwt.exceptions import PyJWTError
from pydantic import BaseModel

from app.settings import get_settings

settings = get_settings()

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")
demo_users_path = Path(__file__).with_name("demo_users.json")


class AuthenticatedUser(BaseModel):
    """The trusted identity and roles read from a valid access token."""

    subject: str
    username: str
    email: str | None = None
    roles: set[str]


class DemoLoginRequest(BaseModel):
    """Credentials accepted by the development-only login endpoint."""

    email: str
    password: str


class DemoLoginResponse(BaseModel):
    """Bearer token and user profile returned after a successful login."""

    access_token: str
    token_type: Literal["bearer"] = "bearer"
    user: AuthenticatedUser


class DemoUserRecord(BaseModel):
    """One development account loaded from the bundled JSON file."""

    subject: str
    username: str
    email: str
    password: str
    roles: set[str]

    def authenticated_user(self) -> AuthenticatedUser:
        """Return the public identity without exposing the password."""

        return AuthenticatedUser(
            subject=self.subject,
            username=self.username,
            email=self.email,
            roles=self.roles,
        )


@lru_cache
def load_demo_users() -> tuple[DemoUserRecord, ...]:
    """Load the small development user list bundled with the API."""

    try:
        raw_users = json.loads(demo_users_path.read_text(encoding="utf-8"))
        return tuple(DemoUserRecord.model_validate(item) for item in raw_users)
    except (OSError, TypeError, ValueError) as error:
        raise RuntimeError("The development user file could not be loaded.") from error


def authenticate_demo_user(email: str, password: str) -> AuthenticatedUser | None:
    """Return a matching development user for valid credentials."""

    normalized_email = email.strip().casefold()
    for record in load_demo_users():
        email_matches = hmac.compare_digest(
            record.email.casefold(),
            normalized_email,
        )
        password_matches = hmac.compare_digest(record.password, password)
        if email_matches and password_matches:
            return record.authenticated_user()
    return None


def create_demo_access_token(user: AuthenticatedUser) -> str:
    """Create a short-lived signed token for one development user."""

    issued_at = datetime.now(timezone.utc)
    claims: dict[str, Any] = {
        "sub": user.subject,
        "preferred_username": user.username,
        "email": user.email,
        "roles": sorted(user.roles),
        "iat": issued_at,
        "exp": issued_at + timedelta(minutes=settings.demo_auth_token_minutes),
        "iss": settings.demo_auth_issuer,
        "aud": settings.demo_auth_audience,
    }
    return jwt.encode(
        claims,
        settings.demo_auth_secret,
        algorithm="HS256",
    )


def login_with_demo_user(credentials: DemoLoginRequest) -> DemoLoginResponse:
    """Validate development credentials and return a signed bearer token."""

    user = authenticate_demo_user(credentials.email, credentials.password)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="The email address or password is incorrect.",
        )
    return DemoLoginResponse(
        access_token=create_demo_access_token(user),
        user=user,
    )


def require_email(user: AuthenticatedUser) -> str:
    """Return the trusted email claim used to match an application user."""

    if user.email is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="The authenticated account does not have an email address.",
        )
    return user.email


def get_current_user(
    token: Annotated[str, Depends(oauth2_scheme)],
) -> AuthenticatedUser:
    """Validate a development token and return its user information."""

    unauthorized = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="The access token is missing or invalid.",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        claims: dict[str, Any] = jwt.decode(
            token,
            settings.demo_auth_secret,
            algorithms=["HS256"],
            audience=settings.demo_auth_audience,
            issuer=settings.demo_auth_issuer,
            options={
                "require": [
                    "sub",
                    "exp",
                    "iat",
                    "iss",
                    "aud",
                    "preferred_username",
                    "email",
                    "roles",
                ]
            },
        )
        return AuthenticatedUser(
            subject=str(claims["sub"]),
            username=str(claims["preferred_username"]),
            email=str(claims["email"]),
            roles=set(claims["roles"]),
        )
    except (KeyError, TypeError, PyJWTError) as error:
        raise unauthorized from error


def require_role(
    role: str,
) -> Callable[[AuthenticatedUser], AuthenticatedUser]:
    """Create a FastAPI dependency that requires one application role."""

    def role_checker(
        user: Annotated[AuthenticatedUser, Depends(get_current_user)],
    ) -> AuthenticatedUser:
        """Return the user when the required role is present."""

        if role not in user.roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"The {role} role is required.",
            )
        return user

    return role_checker
