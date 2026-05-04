from sqlalchemy import Column, Integer, String, Float, DateTime, JSON
from sqlalchemy.sql import func
from app.core.database import Base

class Snapshot(Base):
    __tablename__ = "snapshots"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False, default="")
    description = Column(String(1000), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    signal_params = Column(JSON, nullable=False)
    filter_params = Column(JSON, nullable=True)
    
    time_data = Column(JSON, nullable=False)
    original_signal = Column(JSON, nullable=False)
    filtered_signal = Column(JSON, nullable=True)
    
    frequency = Column(JSON, nullable=False)
    magnitude = Column(JSON, nullable=False)
    
    stft_data = Column(JSON, nullable=True)

    @property
    def signal_type(self) -> str:
        if self.signal_params and "signal_type" in self.signal_params:
            return self.signal_params["signal_type"]
        return "unknown"
