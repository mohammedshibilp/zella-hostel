import logging
from typing import Generator
from sqlalchemy import create_engine, text
from sqlalchemy.orm import declarative_base, sessionmaker
from app.core.config import settings

logger = logging.getLogger(__name__)

# Determine database engine
db_url = settings.DATABASE_URL
connect_args = {}

if db_url.startswith("sqlite"):
    connect_args = {"check_same_thread": False}
    engine = create_engine(db_url, connect_args=connect_args, pool_pre_ping=True)
else:
    try:
        # Try connecting to PostgreSQL with 2s timeout
        test_engine = create_engine(
            db_url,
            connect_args={"connect_timeout": 2},
            pool_pre_ping=True
        )
        with test_engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        engine = test_engine
        logger.info(f"Connected successfully to PostgreSQL: {db_url.split('@')[-1]}")
    except Exception as e:
        logger.warning(
            f"PostgreSQL connection failed ({e}). Falling back to local SQLite: {settings.SQLITE_FALLBACK_URL}"
        )
        engine = create_engine(
            settings.SQLITE_FALLBACK_URL,
            connect_args={"check_same_thread": False},
            pool_pre_ping=True
        )

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db() -> Generator:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
