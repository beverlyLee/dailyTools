from sqlalchemy import Column, Integer, String, Float, DateTime, JSON, Text
from sqlalchemy.sql import func
import json

from .database import Base


class ParameterScanRecord(Base):
    __tablename__ = "parameter_scan_records"
    
    id = Column(Integer, primary_key=True, index=True)
    equation_name = Column(String(255), nullable=False)
    equation_expression = Column(Text, nullable=False)
    parameter_name = Column(String(100), nullable=False)
    parameter_start = Column(Float, nullable=False)
    parameter_end = Column(Float, nullable=False)
    parameter_steps = Column(Integer, nullable=False)
    initial_conditions = Column(JSON, nullable=False)
    solver_method = Column(String(50), default="rk4")
    t_start = Column(Float, default=0.0)
    t_end = Column(Float, default=100.0)
    num_points = Column(Integer, default=1000)
    
    results_summary = Column(JSON, nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    def to_dict(self):
        return {
            "id": self.id,
            "equation_name": self.equation_name,
            "parameter_name": self.parameter_name,
            "parameter_start": self.parameter_start,
            "parameter_end": self.parameter_end,
            "parameter_steps": self.parameter_steps,
            "initial_conditions": self.initial_conditions,
            "solver_method": self.solver_method,
            "t_start": self.t_start,
            "t_end": self.t_end,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class SavedSimulation(Base):
    __tablename__ = "saved_simulations"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    equation_expression = Column(Text, nullable=False)
    initial_conditions = Column(JSON, nullable=False)
    parameters = Column(JSON, nullable=True)
    solver_method = Column(String(50), default="rk4")
    t_start = Column(Float, default=0.0)
    t_end = Column(Float, default=100.0)
    num_points = Column(Integer, default=1000)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "description": self.description,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
