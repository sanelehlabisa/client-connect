"""Application settings loaded from environment variables."""

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Configuration shared by the API and its supporting services."""

    app_name: str = "ClientConnect API"
    database_url: str = (
        "postgresql+psycopg://rsf:rsf_dev_password@database:5432/rsf"
    )
    frontend_url: str
    keycloak_url: str
    keycloak_internal_url: str = "http://keycloak:8080"
    keycloak_realm: str = "rsf-clientconnect"
    keycloak_audience: str = "rsf-api"
    smtp_host: str = "mailhog"
    smtp_port: int = 1025
    mail_from: str = "notifications@rsf.local"
    reminder_check_interval_seconds: int = 60

    @property
    def keycloak_issuer(self) -> str:
        """Return the public issuer expected in Keycloak access tokens."""

        return f"{self.keycloak_url}/realms/{self.keycloak_realm}"

    @property
    def keycloak_jwks_url(self) -> str:
        """Return the internal URL used to download Keycloak signing keys."""

        return (
            f"{self.keycloak_internal_url}/realms/{self.keycloak_realm}"
            "/protocol/openid-connect/certs"
        )

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


@lru_cache
def get_settings() -> Settings:
    """Return one cached settings object for the running application."""

    return Settings()
