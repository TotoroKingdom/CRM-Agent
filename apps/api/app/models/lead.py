from sqlalchemy import CheckConstraint, Index, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class Lead(Base):
    __tablename__ = "leads"
    __table_args__ = (
        CheckConstraint(
            "channel IN ('WEBSITE', 'SHOPIFY', 'AMAZON', 'TIKTOK', 'REFERRAL', 'OTHER')",
            name="ck_leads_channel",
        ),
        CheckConstraint(
            "status IN ('NEW', 'CONTACTED', 'QUALIFIED', 'DISQUALIFIED')",
            name="ck_leads_status",
        ),
        CheckConstraint("priority IN ('HIGH', 'MEDIUM', 'LOW')", name="ck_leads_priority"),
        Index("idx_leads_updated_at", "updated_at"),
        Index("idx_leads_status", "status"),
        Index("idx_leads_channel", "channel"),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    name: Mapped[str] = mapped_column(String(80), nullable=False)
    company: Mapped[str] = mapped_column(String(120), nullable=False)
    email: Mapped[str | None] = mapped_column(String(160))
    phone: Mapped[str | None] = mapped_column(String(50))
    channel: Mapped[str] = mapped_column(String(20), nullable=False)
    status: Mapped[str] = mapped_column(String(20), nullable=False)
    priority: Mapped[str] = mapped_column(String(10), nullable=False)
    country: Mapped[str | None] = mapped_column(String(80))
    note: Mapped[str | None] = mapped_column(String(500))
    created_at: Mapped[str] = mapped_column(String(64), nullable=False)
    updated_at: Mapped[str] = mapped_column(String(64), nullable=False)
