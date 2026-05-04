from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, DateTime
from app.core.database import Base


class KeyPairHistory(Base):
    __tablename__ = "key_pair_history"

    id = Column(Integer, primary_key=True, index=True)
    
    p = Column(String, nullable=False)
    q = Column(String, nullable=False)
    n = Column(String, nullable=False)
    phi_n = Column(String, nullable=False)
    e = Column(String, nullable=False)
    d = Column(String, nullable=False)
    
    public_key = Column(Text, nullable=False)
    private_key = Column(Text, nullable=False)
    
    key_size = Column(Integer, nullable=False, default=2048)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def __repr__(self):
        return f"<KeyPairHistory(id={self.id}, created_at={self.created_at})>"
