from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.core.database import Base


class CryptoHistory(Base):
    __tablename__ = "crypto_history"

    id = Column(Integer, primary_key=True, index=True)
    
    operation_type = Column(String(20), nullable=False)
    key_pair_id = Column(Integer, ForeignKey("key_pair_history.id"), nullable=True)
    
    plain_text = Column(Text, nullable=True)
    cipher_text = Column(Text, nullable=True)
    
    public_key = Column(Text, nullable=True)
    private_key = Column(Text, nullable=True)
    
    key_size = Column(Integer, nullable=False, default=2048)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    
    key_pair = relationship("KeyPairHistory", backref="crypto_operations")

    def __repr__(self):
        return f"<CryptoHistory(id={self.id}, operation_type={self.operation_type}, created_at={self.created_at})>"
