from sqlalchemy import Column, Integer, Float, String, Text, JSON, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime
from .database import Base


class SimulationRecord(Base):
    __tablename__ = "simulation_records"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    n_atoms = Column(Integer, nullable=False)
    box_size = Column(Float, nullable=False)
    density = Column(Float, nullable=False)
    initial_temperature = Column(Float, nullable=False)
    timestep = Column(Float, nullable=False)
    mass = Column(Float, nullable=False)
    epsilon = Column(Float, nullable=False)
    sigma = Column(Float, nullable=False)
    cutoff = Column(Float, nullable=False)
    
    total_steps = Column(Integer, default=0)
    total_time = Column(Float, default=0.0)
    
    frames = relationship("SimulationFrame", back_populates="simulation", 
                          cascade="all, delete-orphan")


class SimulationFrame(Base):
    __tablename__ = "simulation_frames"

    id = Column(Integer, primary_key=True, index=True)
    simulation_id = Column(Integer, ForeignKey("simulation_records.id"), nullable=False)
    frame_number = Column(Integer, nullable=False)
    time = Column(Float, nullable=False)
    
    temperature = Column(Float, nullable=False)
    pressure = Column(Float, nullable=False)
    potential_energy = Column(Float, nullable=False)
    kinetic_energy = Column(Float, nullable=False)
    total_energy = Column(Float, nullable=False)
    
    positions = Column(JSON, nullable=False)
    velocities = Column(JSON, nullable=True)
    forces = Column(JSON, nullable=True)
    
    simulation = relationship("SimulationRecord", back_populates="frames")


class GameExample(Base):
    __tablename__ = "game_examples"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False, unique=True)
    description = Column(Text, nullable=True)
    
    player1_strategies = Column(JSON, nullable=False)
    player2_strategies = Column(JSON, nullable=False)
    payoff_matrix_player1 = Column(JSON, nullable=False)
    payoff_matrix_player2 = Column(JSON, nullable=False)
    
    category = Column(String(50), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class GameHistory(Base):
    __tablename__ = "game_history"

    id = Column(Integer, primary_key=True, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    player1_strategies = Column(JSON, nullable=False)
    player2_strategies = Column(JSON, nullable=False)
    payoff_matrix_player1 = Column(JSON, nullable=False)
    payoff_matrix_player2 = Column(JSON, nullable=False)
    
    pure_equilibria = Column(JSON, nullable=True)
    mixed_equilibria = Column(JSON, nullable=True)
