from sqlalchemy import ForeignKey, Index, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class FollowupTask(Base):
    __tablename__ = "followup_tasks"
    __table_args__ = (
        Index("idx_followup_tasks_due_at", "due_at"),
        Index("idx_followup_tasks_lead_id", "lead_id"),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    lead_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("leads.id", ondelete="CASCADE"), nullable=False
    )
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    due_at: Mapped[str] = mapped_column(String(64), nullable=False)
    completed_at: Mapped[str | None] = mapped_column(String(64))
    created_at: Mapped[str] = mapped_column(String(64), nullable=False)
    updated_at: Mapped[str] = mapped_column(String(64), nullable=False)
