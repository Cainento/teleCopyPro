"""Configuration management using Pydantic Settings."""

import json
import os
from pathlib import Path
from typing import Any, Optional, Union

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # Telegram API Configuration
    api_id: int = Field(default=0, description="Telegram API ID")
    api_hash: str = Field(default="", description="Telegram API Hash")

    # Application Configuration
    app_name: str = Field(default="TeleCopy Pro Backend", description="Application name")
    debug: bool = Field(default=False, description="Debug mode")
    environment: str = Field(default="development", description="Environment (development/production)")

    # Server Configuration
    host: str = Field(default="0.0.0.0", description="Server host")
    port: int = Field(default=8000, description="Server port")

    # Session Configuration
    session_folder: str = Field(default="sessions", description="Folder for storing Telegram sessions")
    session_timeout: int = Field(default=3600, description="Session timeout in seconds")

    # CORS Configuration
    # Store as string to avoid JSON parsing issues, converted to list via properties
    cors_origins_str: str = Field(
        default="http://localhost:8000,http://127.0.0.1:8000",
        alias="cors_origins",
        description="Allowed CORS origins (comma-separated or JSON array)"
    )
    cors_allow_credentials: bool = Field(default=True, description="Allow CORS credentials")
    cors_allow_methods_str: str = Field(
        default="*",
        alias="cors_allow_methods",
        description="Allowed CORS methods (comma-separated or JSON array)"
    )
    cors_allow_headers_str: str = Field(
        default="*",
        alias="cors_allow_headers",
        description="Allowed CORS headers (comma-separated or JSON array)"
    )

    # Security Configuration
    jwt_secret_key: str = Field(
        default="",
        description="JWT secret key (generate with: openssl rand -hex 32)"
    )
    encryption_key: str = Field(
        default="",
        description="Encryption key for sensitive data (generate with: Fernet.generate_key())"
    )

    # Database Configuration
    database_url: str = Field(
        default="postgresql+asyncpg://telecopy:password@localhost:5432/telecopy_db",
        description="Database URL (postgresql+asyncpg://user:pass@host:port/dbname)"
    )
    database_pool_size: int = Field(default=20, description="Database connection pool size")
    database_max_overflow: int = Field(default=10, description="Database max overflow connections")

    # Logging Configuration
    log_level: str = Field(default="INFO", description="Logging level")
    log_file: str = Field(default="logs/app.log", description="Log file path")
    log_max_bytes: int = Field(default=10485760, description="Maximum log file size in bytes")
    log_backup_count: int = Field(default=5, description="Number of backup log files")

    # Stripe Configuration
    stripe_secret_key: str = Field(default="", description="Stripe secret key (sk_test_... or sk_live_...)")
    stripe_webhook_secret: str = Field(default="", description="Stripe webhook signing secret (whsec_...)")
    stripe_premium_monthly_price_id: str = Field(default="", description="Stripe Price ID for Premium Monthly plan")
    stripe_premium_annual_price_id: str = Field(default="", description="Stripe Price ID for Premium Annual plan")
    stripe_enterprise_monthly_price_id: str = Field(default="", description="Stripe Price ID for Enterprise Monthly plan")
    stripe_enterprise_annual_price_id: str = Field(default="", description="Stripe Price ID for Enterprise Annual plan")

    @field_validator("api_id")
    @classmethod
    def validate_api_id(cls, v: int) -> int:
        """Validate API ID is set."""
        if v == 0:
            raise ValueError("API_ID must be set in environment variables or .env file")
        return v

    @field_validator("api_hash")
    @classmethod
    def validate_api_hash(cls, v: str) -> str:
        """Validate API Hash is set."""
        if not v or v == "":
            raise ValueError("API_HASH must be set in environment variables or .env file")
        return v

    @field_validator("session_folder")
    @classmethod
    def validate_session_folder(cls, v: str) -> str:
        """Ensure session folder exists."""
        session_path = Path(v)
        session_path.mkdir(parents=True, exist_ok=True)
        return str(session_path.absolute())

    @field_validator("log_file")
    @classmethod
    def validate_log_file(cls, v: str) -> str:
        """Ensure log directory exists."""
        log_path = Path(v)
        log_path.parent.mkdir(parents=True, exist_ok=True)
        return str(log_path.absolute())

    @field_validator("cors_origins_str", mode="before")
    @classmethod
    def parse_cors_origins(cls, v: Any) -> str:
        """Parse CORS origins from string, list, or empty value."""
        # Handle environment variable name mapping
        if isinstance(v, dict) and "cors_origins" in v:
            v = v["cors_origins"]
        if v is None:
            return "http://localhost:8000,http://127.0.0.1:8000"
        if isinstance(v, list):
            return ",".join(str(item) for item in v)
        if isinstance(v, str):
            if not v.strip():
                return "http://localhost:8000,http://127.0.0.1:8000"
            return v
        return "http://localhost:8000,http://127.0.0.1:8000"
    
    @field_validator("cors_allow_methods_str", mode="before")
    @classmethod
    def parse_cors_methods(cls, v: Any) -> str:
        """Parse CORS methods from string, list, or empty value."""
        if isinstance(v, dict) and "cors_allow_methods" in v:
            v = v["cors_allow_methods"]
        if v is None:
            return "*"
        if isinstance(v, list):
            return ",".join(str(item) for item in v)
        if isinstance(v, str):
            if not v.strip():
                return "*"
            return v
        return "*"
    
    @field_validator("cors_allow_headers_str", mode="before")
    @classmethod
    def parse_cors_headers(cls, v: Any) -> str:
        """Parse CORS headers from string, list, or empty value."""
        if isinstance(v, dict) and "cors_allow_headers" in v:
            v = v["cors_allow_headers"]
        if v is None:
            return "*"
        if isinstance(v, list):
            return ",".join(str(item) for item in v)
        if isinstance(v, str):
            if not v.strip():
                return "*"
            return v
        return "*"

    @field_validator("jwt_secret_key")
    @classmethod
    def validate_jwt_secret_key(cls, v: str) -> str:
        """Validate JWT secret key."""
        if not v or len(v) < 32:
            import warnings
            warnings.warn(
                "JWT_SECRET_KEY is not set or too short. Generate one with: openssl rand -hex 32"
            )
            # For development, generate a temporary key
            import secrets
            return secrets.token_hex(32)
        return v

    @field_validator("encryption_key")
    @classmethod
    def validate_encryption_key(cls, v: str) -> str:
        """Validate encryption key."""
        if not v:
            import warnings
            from cryptography.fernet import Fernet
            warnings.warn(
                "ENCRYPTION_KEY is not set. Generate one with: python -c \"from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())\""
            )
            # For development, generate a temporary key
            return Fernet.generate_key().decode()

        # Validate it's a valid Fernet key
        try:
            from cryptography.fernet import Fernet
            Fernet(v.encode())
        except Exception:
            raise ValueError("ENCRYPTION_KEY must be a valid Fernet key")
        return v

    @field_validator("database_url", mode="before")
    @classmethod
    def convert_postgres_url(cls, v: str) -> str:
        """Convert postgres:// to postgresql+asyncpg:// for SQLAlchemy."""
        if v and v.startswith("postgres://"):
            return v.replace("postgres://", "postgresql+asyncpg://", 1)
        return v

    @property
    def cors_origins(self) -> list[str]:
        """Get CORS origins as a list."""
        value = self.cors_origins_str
        if not value.strip():
            return ["http://localhost:8000", "http://127.0.0.1:8000"]
        # Try to parse as JSON first
        try:
            parsed = json.loads(value)
            if isinstance(parsed, list):
                return [str(item) for item in parsed]
        except (json.JSONDecodeError, ValueError):
            pass
        # Treat as comma-separated string
        return [origin.strip() for origin in value.split(",") if origin.strip()]
    
    @property
    def cors_allow_methods(self) -> list[str]:
        """Get CORS methods as a list."""
        value = self.cors_allow_methods_str
        if not value.strip():
            return ["*"]
        try:
            parsed = json.loads(value)
            if isinstance(parsed, list):
                return [str(item) for item in parsed]
        except (json.JSONDecodeError, ValueError):
            pass
        return [method.strip() for method in value.split(",") if method.strip()]
    
    @property
    def cors_allow_headers(self) -> list[str]:
        """Get CORS headers as a list."""
        value = self.cors_allow_headers_str
        if not value.strip():
            return ["*"]
        try:
            parsed = json.loads(value)
            if isinstance(parsed, list):
                return [str(item) for item in parsed]
        except (json.JSONDecodeError, ValueError):
            pass
        return [header.strip() for header in value.split(",") if header.strip()]

    @property
    def is_production(self) -> bool:
        """Check if running in production environment."""
        return self.environment.lower() == "production"

    @property
    def is_development(self) -> bool:
        """Check if running in development environment."""
        return self.environment.lower() == "development"


# Global settings instance
settings = Settings()

