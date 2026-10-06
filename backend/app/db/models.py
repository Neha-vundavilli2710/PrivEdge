"""ORM models. Core tables per the PDF: users, conversations, messages,
routing_logs, human_reviews. knowledge_documents is a project extension (RAG)."""
from datetime import datetime, timezone

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.types import TypeDecorator
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.database import Base


class UTCDateTime(TypeDecorator):
    """Always returns timezone-aware UTC datetimes (SQLite drops tzinfo otherwise)."""
    impl = DateTime(timezone=True)
    cache_ok = True

    def process_bind_param(self, value, dialect):
        if value is not None and value.tzinfo is not None:
            return value.astimezone(timezone.utc)
        return value

    def process_result_value(self, value, dialect):
        if value is not None and value.tzinfo is None:
            return value.replace(tzinfo=timezone.utc)
        return value


def now():
    return datetime.now(timezone.utc)


class User(Base):
    __tablename__ = "users"
    user_id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(120))
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    role: Mapped[str] = mapped_column(String(20), default="USER")  # USER|REVIEWER|ADMIN
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(UTCDateTime(), default=now)
    last_active_at: Mapped[datetime | None] = mapped_column(UTCDateTime(), nullable=True)


class Conversation(Base):
    __tablename__ = "conversations"
    conversation_id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.user_id"), index=True)
    title: Mapped[str] = mapped_column(String(255), default="New conversation")
    created_at: Mapped[datetime] = mapped_column(UTCDateTime(), default=now)
    updated_at: Mapped[datetime] = mapped_column(UTCDateTime(), default=now, onupdate=now)
    messages: Mapped[list["Message"]] = relationship(back_populates="conversation", cascade="all, delete-orphan", order_by="Message.message_id")


class Message(Base):
    __tablename__ = "messages"
    message_id: Mapped[int] = mapped_column(Integer, primary_key=True)
    conversation_id: Mapped[int] = mapped_column(ForeignKey("conversations.conversation_id"), index=True)
    message: Mapped[str] = mapped_column(Text)          # encrypted at rest - full text sent to analysis/LLM (incl. attachment content)
    caption: Mapped[str] = mapped_column(Text, default="")  # encrypted at rest - just what the user typed/sees in the chat bubble
    attachment_name: Mapped[str | None] = mapped_column(String(255), nullable=True)  # filename only, not encrypted
    response: Mapped[str] = mapped_column(Text, default="")  # encrypted at rest
    route: Mapped[str] = mapped_column(String(10), default="cloud")
    status: Mapped[str] = mapped_column(String(20), default="COMPLETED")  # COMPLETED|PENDING_REVIEW|REVIEWED
    timestamp: Mapped[datetime] = mapped_column(UTCDateTime(), default=now)
    conversation: Mapped[Conversation] = relationship(back_populates="messages")
    routing_log: Mapped["RoutingLog"] = relationship(back_populates="message", uselist=False)
    review: Mapped["HumanReview"] = relationship(back_populates="message", uselist=False)


class RoutingLog(Base):
    __tablename__ = "routing_logs"
    routing_id: Mapped[int] = mapped_column(Integer, primary_key=True)
    message_id: Mapped[int] = mapped_column(ForeignKey("messages.message_id"), unique=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.user_id"), index=True)
    privacy_score: Mapped[float] = mapped_column(Float)
    sensitivity_score: Mapped[float] = mapped_column(Float)
    complexity_score: Mapped[float] = mapped_column(Float)
    risk_score: Mapped[float] = mapped_column(Float)
    latency_score: Mapped[float] = mapped_column(Float)
    human_required: Mapped[bool] = mapped_column(Boolean, default=False)
    domain: Mapped[str] = mapped_column(String(30), default="general")
    selected_route: Mapped[str] = mapped_column(String(10))
    router_used: Mapped[str] = mapped_column(String(10), default="rule")
    reason: Mapped[str] = mapped_column(Text, default="")
    processing_time: Mapped[float | None] = mapped_column(Float, nullable=True)  # seconds
    timestamp: Mapped[datetime] = mapped_column(UTCDateTime(), default=now)
    message: Mapped[Message] = relationship(back_populates="routing_log")


class HumanReview(Base):
    __tablename__ = "human_reviews"
    review_id: Mapped[int] = mapped_column(Integer, primary_key=True)
    message_id: Mapped[int] = mapped_column(ForeignKey("messages.message_id"), unique=True, index=True)
    reviewer_id: Mapped[int | None] = mapped_column(ForeignKey("users.user_id"), nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="PENDING")  # PENDING|IN_REVIEW|APPROVED|MODIFIED|REJECTED
    review_comment: Mapped[str] = mapped_column(Text, default="")
    ai_draft: Mapped[str] = mapped_column(Text, default="")       # encrypted at rest
    final_response: Mapped[str] = mapped_column(Text, default="")  # encrypted at rest
    created_at: Mapped[datetime] = mapped_column(UTCDateTime(), default=now)
    completed_at: Mapped[datetime | None] = mapped_column(UTCDateTime(), nullable=True)
    message: Mapped[Message] = relationship(back_populates="review")


class KnowledgeDocument(Base):  # EXTENSION (not in original PDF)
    __tablename__ = "knowledge_documents"
    doc_id: Mapped[int] = mapped_column(Integer, primary_key=True)
    title: Mapped[str] = mapped_column(String(255))
    doc_type: Mapped[str] = mapped_column(String(30), default="Guide")
    description: Mapped[str] = mapped_column(Text, default="")
    content: Mapped[str] = mapped_column(Text, default="")
    version: Mapped[str] = mapped_column(String(20), default="1.0.0")
    status: Mapped[str] = mapped_column(String(20), default="Published")  # Published|Draft|Archived
    updated_at: Mapped[datetime] = mapped_column(UTCDateTime(), default=now, onupdate=now)


class AuditLog(Base):
    __tablename__ = "audit_logs"
    audit_id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    action: Mapped[str] = mapped_column(String(60))
    detail: Mapped[str] = mapped_column(Text, default="")
    timestamp: Mapped[datetime] = mapped_column(UTCDateTime(), default=now)


class SystemSetting(Base):  # EXTENSION: admin settings page
    __tablename__ = "system_settings"
    key: Mapped[str] = mapped_column(String(60), primary_key=True)
    value: Mapped[str] = mapped_column(Text, default="")


class Notification(Base):  # EXTENSION: makes the Admin "Notification Preferences" settings functional
    """Either user_id (sent to one specific person) or roles (broadcast, e.g. 'reviewer,admin') is set."""
    __tablename__ = "notifications"
    notification_id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int | None] = mapped_column(ForeignKey("users.user_id"), nullable=True, index=True)
    roles: Mapped[str | None] = mapped_column(String(40), nullable=True)
    type: Mapped[str] = mapped_column(String(30))  # review_completed | high_risk | system_alert | review_backlog
    title: Mapped[str] = mapped_column(String(120))
    message: Mapped[str] = mapped_column(String(500))
    read: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(UTCDateTime(), default=now)
