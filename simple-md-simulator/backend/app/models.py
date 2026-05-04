from sqlalchemy import (
    Column,
    Integer,
    Float,
    String,
    ForeignKey,
    DateTime,
    Index,
)
from sqlalchemy.orm import relationship, declarative_base
from datetime import datetime

Base = declarative_base()


class Simulation(Base):
    __tablename__ = "simulations"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    num_atoms = Column(Integer, nullable=False)
    box_size = Column(Float, nullable=False)
    density = Column(Float, nullable=False)
    initial_temperature = Column(Float, nullable=False)
    timestep = Column(Float, nullable=False)
    
    frames = relationship("Frame", back_populates="simulation", cascade="all, delete-orphan")
    
    __table_args__ = (
        Index('ix_simulations_created_at', 'created_at'),
    )


class Frame(Base):
    __tablename__ = "frames"

    id = Column(Integer, primary_key=True, autoincrement=True)
    simulation_id = Column(Integer, ForeignKey("simulations.id"), nullable=False)
    frame_number = Column(Integer, nullable=False)
    
    time = Column(Float, nullable=False)
    temperature = Column(Float, nullable=False)
    pressure = Column(Float, nullable=False)
    potential_energy = Column(Float, nullable=False)
    kinetic_energy = Column(Float, nullable=False)
    total_energy = Column(Float, nullable=False)
    
    simulation = relationship("Simulation", back_populates="frames")
    atoms = relationship("AtomState", back_populates="frame", cascade="all, delete-orphan")
    
    __table_args__ = (
        Index('ix_frames_simulation_frame', 'simulation_id', 'frame_number'),
    )


class AtomState(Base):
    __tablename__ = "atom_states"

    id = Column(Integer, primary_key=True, autoincrement=True)
    frame_id = Column(Integer, ForeignKey("frames.id"), nullable=False)
    atom_index = Column(Integer, nullable=False)
    
    px = Column(Float, nullable=False)
    py = Column(Float, nullable=False)
    pz = Column(Float, nullable=False)
    
    vx = Column(Float, nullable=False)
    vy = Column(Float, nullable=False)
    vz = Column(Float, nullable=False)
    
    fx = Column(Float, nullable=False)
    fy = Column(Float, nullable=False)
    fz = Column(Float, nullable=False)
    
    frame = relationship("Frame", back_populates="atoms")
    
    __table_args__ = (
        Index('ix_atom_states_frame_atom', 'frame_id', 'atom_index'),
    )
