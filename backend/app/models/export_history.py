from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from app.models.base import Base


class ExportHistory(Base):
    __tablename__ = "export_history"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    table_name = Column(String(100), nullable=False)
    format = Column(String(20), nullable=False, default="xlsx")
    row_count = Column(Integer, nullable=True)
    file_name = Column(String(255), nullable=True)
    filters_applied = Column(Text, nullable=True)
    columns_exported = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="export_history")
