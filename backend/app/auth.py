"""Keycloak access-token validation and role helpers."""

from collections.abc import Callable
from typing import Annotated, Any

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jwt import PyJWKClient
from jwt.exceptions import PyJWKClientError, PyJWTError
from pydantic import BaseModel

from app.settings import get_settings

settings = get_settings()

oauth2_scheme = OAuth2PasswordBearer(
    tokenUrl=(
        f"{settings.keycloak_issuer}/protocol/openid-connect/token"
    )
)
jwks_client = PyJWKClient(settings.keycloak_jwks_url)


class AuthenticatedUser(BaseModel):
    """The trusted identity and roles read from a valid access token."""

    subject: str
    username: str
    email: str | None = None
    roles: set[str]


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
    """Validate a Keycloak token and return its user information."""

    unauthorized = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="The access token is missing or invalid.",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        signing_key = jwks_client.get_signing_key_from_jwt(token)
        claims: dict[str, Any] = jwt.decode(
            token,
            signing_key.key,
            algorithms=["RS256"],
            audience=settings.keycloak_audience,
            issuer=settings.keycloak_issuer,
            options={"require": ["sub", "exp", "iat", "iss", "aud"]},
        )
    except (PyJWKClientError, PyJWTError) as error:
        raise unauthorized from error

    realm_access = claims.get("realm_access", {})
    roles = set(realm_access.get("roles", []))

    return AuthenticatedUser(
        subject=str(claims["sub"]),
        username=str(claims.get("preferred_username", "unknown")),
        email=claims.get("email"),
        roles=roles,
    )


def require_role(
    role: str,
) -> Callable[[AuthenticatedUser], AuthenticatedUser]:
    """Create a FastAPI dependency that requires one realm role."""

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
