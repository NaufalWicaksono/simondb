from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from app.models.base import Base


class UserTableAccess(Base):
    __tablename__ = "user_table_access"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    schema_name = Column(String(50), nullable=False, default="main")
    table_name = Column(String(100), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="table_access")

    __table_args__ = (
        UniqueConstraint("user_id", "schema_name", "table_name", name="uq_user_schema_table"),
    )
