from sqlalchemy import CheckConstraint, ForeignKey, Index, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class Deal(Base):
    __tablename__ = "deals"
    __table_args__ = (
        CheckConstraint("amount_cents >= 0", name="ck_deals_amount_cents"),
        CheckConstraint(
            "stage IN ('DISCOVERY', 'QUALIFICATION', 'PROPOSAL', 'NEGOTIATION', 'WON', 'LOST')",
            name="ck_deals_stage",
        ),
        Index("idx_deals_stage", "stage"),
        Index("idx_deals_lead_id", "lead_id"),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    lead_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("leads.id", ondelete="CASCADE"), nullable=False
    )
    title: Mapped[str] = mapped_column(String(160), nullable=False)
    amount_cents: Mapped[int] = mapped_column(Integer, nullable=False)
    stage: Mapped[str] = mapped_column(String(20), nullable=False)
    expected_close_at: Mapped[str | None] = mapped_column(String(64))
    created_at: Mapped[str] = mapped_column(String(64), nullable=False)
    updated_at: Mapped[str] = mapped_column(String(64), nullable=False)
