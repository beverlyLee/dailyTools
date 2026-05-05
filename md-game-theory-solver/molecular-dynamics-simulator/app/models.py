from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from datetime import datetime
from .database import Base
import json


class Simulation(Base):
    __tablename__ = "simulations"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=True)
    num_atoms = Column(Integer, nullable=False)
    box_size = Column(Float, nullable=False)
    density = Column(Float, nullable=False)
    initial_temperature = Column(Float, nullable=False)
    timestep = Column(Float, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    frame_count = Column(Integer, default=0)
    
    frames = relationship("Frame", back_populates="simulation", cascade="all, delete-orphan")


class Frame(Base):
    __tablename__ = "frames"
    
    id = Column(Integer, primary_key=True, index=True)
    simulation_id = Column(Integer, ForeignKey("simulations.id"), nullable=False)
    frame_number = Column(Integer, nullable=False)
    time = Column(Float, nullable=False)
    temperature = Column(Float, nullable=False)
    pressure = Column(Float, nullable=False)
    potential_energy = Column(Float, nullable=False)
    kinetic_energy = Column(Float, nullable=False)
    total_energy = Column(Float, nullable=False)
    
    positions_json = Column(Text, nullable=False)
    velocities_json = Column(Text, nullable=False)
    forces_json = Column(Text, nullable=False)
    
    simulation = relationship("Simulation", back_populates="frames")
    
    @property
    def positions(self):
        return json.loads(self.positions_json)
    
    @positions.setter
    def positions(self, value):
        self.positions_json = json.dumps(value)
    
    @property
    def velocities(self):
        return json.loads(self.velocities_json)
    
    @velocities.setter
    def velocities(self, value):
        self.velocities_json = json.dumps(value)
    
    @property
    def forces(self):
        return json.loads(self.forces_json)
    
    @forces.setter
    def forces(self, value):
        self.forces_json = json.dumps(value)
