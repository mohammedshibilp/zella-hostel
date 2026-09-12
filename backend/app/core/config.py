import os
from typing import List, Union
from pydantic import AnyHttpUrl, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    PROJECT_NAME: str = "Zella Hostel Management System"
    API_V1_STR: str = "/api/v1"
    
    # Security
    SECRET_KEY: str = "zella_hostel_super_secret_jwt_key_production_2026_purple_orange"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours
    
    # Database
    # Default to PostgreSQL, with flexible SQLite fallback if Postgres is not running
    DATABASE_URL: str = "postgresql+psycopg://hostel_admin:hostel_secure_password_2026@localhost:5432/hostel_management"
    SQLITE_FALLBACK_URL: str = "sqlite:///./hostel.db"
    
    # CORS
    CORS_ORIGINS: Union[str, List[str]] = "http://localhost:5173,http://127.0.0.1:5173,http://localhost:3000"

    @property
    def cors_origins_list(self) -> List[str]:
        if isinstance(self.CORS_ORIGINS, str):
            return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]
        return self.CORS_ORIGINS

    # Default Seed Users
    ADMIN_EMAIL: str = "admin@zellahostel.com"
    ADMIN_PASSWORD: str = "Admin@12345"
    STAFF_EMAIL: str = "staff@zellahostel.com"
    STAFF_PASSWORD: str = "Staff@12345"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore"
    )


settings = Settings()
