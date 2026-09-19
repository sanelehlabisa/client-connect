"""Small database helper used by the proof-of-concept API."""

from sqlalchemy import create_engine, text
from sqlalchemy.engine import Engine
from sqlalchemy.exc import SQLAlchemyError

from app.settings import get_settings


def create_database_engine() -> Engine:
    """Create the shared SQLAlchemy engine from application settings."""

    settings = get_settings()
    return create_engine(settings.database_url, pool_pre_ping=True)


engine = create_database_engine()


def database_is_ready() -> bool:
    """Return True when PostgreSQL accepts a simple query."""

    try:
        with engine.connect() as connection:
            connection.execute(text("SELECT 1"))
        return True
    except SQLAlchemyError:
        return False
