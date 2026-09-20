"""Focused tests for development-only JSON authentication."""

import unittest

import jwt
from fastapi import HTTPException

from app.auth import (
    DemoLoginRequest,
    authenticate_demo_user,
    get_current_user,
    login_with_demo_user,
    require_role,
    settings,
)


class DemoAuthenticationTests(unittest.TestCase):
    """Verify login, signed tokens, and unchanged role boundaries."""

    def test_client_can_log_in_and_read_signed_identity(self) -> None:
        """Valid client credentials should round-trip through a bearer token."""

        response = login_with_demo_user(
            DemoLoginRequest(
                email="  HLABISASANELE730@GMAIL.COM ",
                password="Password123!",
            )
        )

        user = get_current_user(response.access_token)

        self.assertEqual(response.token_type, "bearer")
        self.assertEqual(user.username, "Sanele Hlabisa")
        self.assertEqual(user.email, "hlabisasanele730@gmail.com")
        self.assertEqual(user.roles, {"client"})

    def test_adviser_account_has_only_the_adviser_role(self) -> None:
        """The Adviser demo account should pass the existing role helper."""

        adviser = authenticate_demo_user(
            "lozaicmasuku@gmail.com",
            "Password123!",
        )

        self.assertIsNotNone(adviser)
        assert adviser is not None
        self.assertIs(require_role("adviser")(adviser), adviser)
        self.assertEqual(adviser.roles, {"adviser"})

    def test_wrong_password_is_rejected(self) -> None:
        """Invalid credentials should not reveal which value was incorrect."""

        with self.assertRaises(HTTPException) as raised:
            login_with_demo_user(
                DemoLoginRequest(
                    email="hlabisasanele730@gmail.com",
                    password="wrong-password",
                )
            )

        self.assertEqual(raised.exception.status_code, 401)
        self.assertEqual(
            raised.exception.detail,
            "The email address or password is incorrect.",
        )

    def test_tampered_token_is_rejected(self) -> None:
        """A token signed with another secret must not authenticate."""

        response = login_with_demo_user(
            DemoLoginRequest(
                email="hlabisasanele730@gmail.com",
                password="Password123!",
            )
        )
        claims = jwt.decode(
            response.access_token,
            settings.demo_auth_secret,
            algorithms=["HS256"],
            audience=settings.demo_auth_audience,
            issuer=settings.demo_auth_issuer,
        )
        tampered_token = jwt.encode(
            claims,
            "a-different-demo-secret-that-is-long-enough",
            algorithm="HS256",
        )

        with self.assertRaises(HTTPException) as raised:
            get_current_user(tampered_token)

        self.assertEqual(raised.exception.status_code, 401)

    def test_client_cannot_pass_adviser_role_check(self) -> None:
        """Existing role dependencies should still reject the wrong role."""

        client = authenticate_demo_user(
            "hlabisasanele730@gmail.com",
            "Password123!",
        )

        self.assertIsNotNone(client)
        assert client is not None
        with self.assertRaises(HTTPException) as raised:
            require_role("adviser")(client)

        self.assertEqual(raised.exception.status_code, 403)


if __name__ == "__main__":
    unittest.main()
