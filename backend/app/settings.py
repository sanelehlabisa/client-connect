"""Application settings loaded from environment variables."""

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Configuration shared by the API and its supporting services."""

    app_name: str = "ClientConnect API"
    database_url: str = (
        "postgresql+psycopg://client_connect:client_connect_dev_password"
        "@database:5432/client_connect"
    )
    frontend_url: str
    demo_auth_secret: str = "client-connect-development-only-signing-secret"
    demo_auth_token_minutes: int = 480
    demo_auth_issuer: str = "client-connect-demo-auth"
    demo_auth_audience: str = "client-connect-api"
    smtp_host: str = "mailhog"
    smtp_port: int = 1025
    mail_from: str = "notifications@client-connect.local"
    reminder_check_interval_seconds: int = 60

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


@lru_cache
def get_settings() -> Settings:
    """Return one cached settings object for the running application."""

    return Settings()
