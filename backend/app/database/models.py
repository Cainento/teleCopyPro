"""SQLAlchemy database models for Telegram Copier."""

from datetime import datetime
from typing import Optional

from sqlalchemy import Boolean, Column, DateTime, Enum as SQLEnum, ForeignKey, Integer, String, Text, Float
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.models.user import UserPlan

# Base class for all models
Base = declarative_base()


class User(Base):
    """User model for database persistence."""

    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)

    # Firebase authentication (will be added in Phase 2)
    firebase_uid = Column(String(128), unique=True, nullable=True, index=True)

    # User identification
    email = Column(String(255), unique=True, nullable=False, index=True)
    phone_number = Column(String(50), unique=True, nullable=True, index=True)
    name = Column(String(100), nullable=False)

    # Plan and subscription
    plan = Column(SQLEnum(UserPlan, values_callable=lambda x: [e.value for e in x]), default=UserPlan.FREE, nullable=False, index=True)
    plan_expiry = Column(DateTime, nullable=True)
    activation_key = Column(String(100), nullable=True)

    # Stripe integration (will be populated in Phase 3)
    stripe_customer_id = Column(String(255), unique=True, nullable=True, index=True)
    stripe_subscription_id = Column(String(255), nullable=True)
    subscription_status = Column(String(50), nullable=True)  # active, canceled, past_due, incomplete, incomplete_expired, trialing, unpaid
    subscription_period_end = Column(DateTime, nullable=True)  # When the subscription period ends

    # Usage tracking
    usage_count = Column(Integer, default=0, nullable=False)

    # Email verification
    email_verified = Column(Boolean, default=False, nullable=False)

    # Timestamps (using Python datetime.now for database compatibility)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    telegram_sessions = relationship("TelegramSession", back_populates="user", cascade="all, delete-orphan")
    copy_jobs = relationship("CopyJob", back_populates="user", cascade="all, delete-orphan")
    invoices = relationship("Invoice", back_populates="user", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<User(id={self.id}, email={self.email}, plan={self.plan})>"


class ActivationKey(Base):
    """Activation key model for plan upgrades."""

    __tablename__ = "activation_keys"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)

    # Key details
    key = Column(String(100), unique=True, nullable=False, index=True)
    plan_type = Column(SQLEnum(UserPlan, values_callable=lambda x: [e.value for e in x]), nullable=False)
    days_valid = Column(Integer, default=30, nullable=False)  # How many days the plan is valid for

    # Usage tracking
    is_used = Column(Boolean, default=False, nullable=False, index=True)
    used_by_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    used_at = Column(DateTime, nullable=True)

    # Timestamps (using Python datetime.now for database compatibility)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Optional: link to user who used the key
    used_by = relationship("User", foreign_keys=[used_by_user_id])

    def __repr__(self):
        return f"<ActivationKey(key={self.key}, plan={self.plan_type}, used={self.is_used})>"


class CopyJob(Base):
    """Copy job model for tracking message copying operations."""

    __tablename__ = "copy_jobs"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)

    # Job identification
    job_id = Column(String(100), unique=True, nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)

    # Channel details
    source_channel = Column(String(255), nullable=False)
    destination_channel = Column(String(255), nullable=False)

    # Job configuration
    mode = Column(String(50), nullable=False)  # 'historical' or 'real_time'
    status = Column(String(50), default="pending", nullable=False, index=True)  # pending, running, completed, failed, stopped

    # Progress tracking
    total_messages = Column(Integer, default=0, nullable=False)
    copied_messages = Column(Integer, default=0, nullable=False)
    failed_messages = Column(Integer, default=0, nullable=False)
    progress_percentage = Column(Float, default=0.0, nullable=False)

    # Error tracking
    error_message = Column(Text, nullable=True)

    # Timestamps (using Python datetime.now for database compatibility)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    started_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    stopped_at = Column(DateTime, nullable=True)

    # Relationships
    user = relationship("User", back_populates="copy_jobs")

    def __repr__(self):
        return f"<CopyJob(id={self.job_id}, user={self.user_id}, status={self.status})>"


class TelegramSession(Base):
    """Telegram session model for storing user Telegram connections."""

    __tablename__ = "telegram_sessions"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)

    # User association
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)

    # Telegram credentials
    phone_number = Column(String(50), unique=True, nullable=False, index=True)
    session_file_path = Column(String(500), nullable=False)  # Path to .session file
    api_id = Column(String(100), nullable=False)
    api_hash = Column(String(100), nullable=False)

    # Session status
    is_active = Column(Boolean, default=True, nullable=False, index=True)

    # Timestamps (using Python datetime.now for database compatibility)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    last_used_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    user = relationship("User", back_populates="telegram_sessions")

    def __repr__(self):
        return f"<TelegramSession(id={self.id}, phone={self.phone_number}, active={self.is_active})>"


class Invoice(Base):
    """Invoice model for tracking Stripe payments."""

    __tablename__ = "invoices"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)

    # User association
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)

    # Stripe details
    stripe_invoice_id = Column(String(255), unique=True, nullable=False, index=True)
    stripe_customer_id = Column(String(255), nullable=False)
    stripe_subscription_id = Column(String(255), nullable=True)

    # Payment details
    amount = Column(Float, nullable=False)  # Amount in currency
    currency = Column(String(10), default="BRL", nullable=False)
    status = Column(String(50), nullable=False, index=True)  # draft, open, paid, uncollectible, void

    # Invoice metadata
    invoice_url = Column(String(500), nullable=True)  # Stripe hosted invoice URL
    invoice_pdf = Column(String(500), nullable=True)  # Stripe invoice PDF URL

    # Timestamps (using Python datetime.now for database compatibility)
    paid_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    user = relationship("User", back_populates="invoices")

    def __repr__(self):
        return f"<Invoice(id={self.stripe_invoice_id}, user={self.user_id}, status={self.status})>"
