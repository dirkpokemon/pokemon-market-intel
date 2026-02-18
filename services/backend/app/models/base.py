"""
Base Model with Common Fields
"""

from datetime import datetime
from sqlalchemy import Column, DateTime, Integer
from sqlalchemy.sql import func

from app.database import Base


class BaseModel(Base):
    """
    Abstract base model with common fields
    """

    __abstract__ = True

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )
