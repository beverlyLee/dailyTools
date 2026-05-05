from sqlalchemy import create_engine, Column, Integer, Float, DateTime, LargeBinary, String, ForeignKey
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship
from datetime import datetime
import os
import numpy as np
from typing import Dict, Any, Optional, List

Base = declarative_base()

class Simulation(Base):
    __tablename__ = 'simulations'
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=True)
    reynolds_number = Column(Float, nullable=False)
    inlet_velocity = Column(Float, nullable=False)
    grid_width = Column(Integer, nullable=False)
    grid_height = Column(Integer, nullable=False)
    obstacle_type = Column(String(50), nullable=False)
    obstacle_params = Column(String(500), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    snapshots = relationship("Snapshot", back_populates="simulation", cascade="all, delete-orphan")


class Snapshot(Base):
    __tablename__ = 'snapshots'
    
    id = Column(Integer, primary_key=True, index=True)
    simulation_id = Column(Integer, ForeignKey('simulations.id'), nullable=False)
    step = Column(Integer, nullable=False)
    time_stamp = Column(DateTime, default=datetime.utcnow)
    
    velocity_data = Column(LargeBinary, nullable=True)
    vorticity_data = Column(LargeBinary, nullable=True)
    density_data = Column(LargeBinary, nullable=True)
    
    simulation = relationship("Simulation", back_populates="snapshots")


class DatabaseManager:
    def __init__(self, db_path: str = None):
        if db_path is None:
            db_dir = os.path.join(os.path.dirname(__file__), '..', '..', 'data')
            os.makedirs(db_dir, exist_ok=True)
            db_path = os.path.join(db_dir, 'cfd_simulations.db')
        
        self.db_path = db_path
        self.engine = create_engine(f'sqlite:///{db_path}')
        Base.metadata.create_all(self.engine)
        self.SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=self.engine)
    
    def get_session(self):
        return self.SessionLocal()
    
    def create_simulation(self, params: Dict[str, Any]) -> int:
        session = self.get_session()
        try:
            simulation = Simulation(
                name=params.get('name'),
                reynolds_number=params['reynolds_number'],
                inlet_velocity=params['inlet_velocity'],
                grid_width=params['grid_width'],
                grid_height=params['grid_height'],
                obstacle_type=params['obstacle_type'],
                obstacle_params=params.get('obstacle_params', '')
            )
            session.add(simulation)
            session.commit()
            simulation_id = simulation.id
            return simulation_id
        finally:
            session.close()
    
    def get_simulation(self, simulation_id: int) -> Optional[Dict[str, Any]]:
        session = self.get_session()
        try:
            simulation = session.query(Simulation).filter(Simulation.id == simulation_id).first()
            if simulation:
                return {
                    'id': simulation.id,
                    'name': simulation.name,
                    'reynolds_number': simulation.reynolds_number,
                    'inlet_velocity': simulation.inlet_velocity,
                    'grid_width': simulation.grid_width,
                    'grid_height': simulation.grid_height,
                    'obstacle_type': simulation.obstacle_type,
                    'obstacle_params': simulation.obstacle_params,
                    'created_at': simulation.created_at.isoformat() if simulation.created_at else None,
                    'updated_at': simulation.updated_at.isoformat() if simulation.updated_at else None
                }
            return None
        finally:
            session.close()
    
    def get_all_simulations(self) -> List[Dict[str, Any]]:
        session = self.get_session()
        try:
            simulations = session.query(Simulation).order_by(Simulation.created_at.desc()).all()
            return [
                {
                    'id': sim.id,
                    'name': sim.name,
                    'reynolds_number': sim.reynolds_number,
                    'inlet_velocity': sim.inlet_velocity,
                    'grid_width': sim.grid_width,
                    'grid_height': sim.grid_height,
                    'obstacle_type': sim.obstacle_type,
                    'created_at': sim.created_at.isoformat() if sim.created_at else None
                }
                for sim in simulations
            ]
        finally:
            session.close()
    
    def save_snapshot(self, simulation_id: int, step: int, 
                      velocity: np.ndarray = None, vorticity: np.ndarray = None, 
                      density: np.ndarray = None) -> int:
        session = self.get_session()
        try:
            snapshot = Snapshot(
                simulation_id=simulation_id,
                step=step,
                velocity_data=velocity.tobytes() if velocity is not None else None,
                vorticity_data=vorticity.tobytes() if vorticity is not None else None,
                density_data=density.tobytes() if density is not None else None
            )
            session.add(snapshot)
            session.commit()
            snapshot_id = snapshot.id
            return snapshot_id
        finally:
            session.close()
    
    def get_snapshot(self, snapshot_id: int) -> Optional[Dict[str, Any]]:
        session = self.get_session()
        try:
            snapshot = session.query(Snapshot).filter(Snapshot.id == snapshot_id).first()
            if snapshot:
                return {
                    'id': snapshot.id,
                    'simulation_id': snapshot.simulation_id,
                    'step': snapshot.step,
                    'time_stamp': snapshot.time_stamp.isoformat() if snapshot.time_stamp else None
                }
            return None
        finally:
            session.close()
    
    def get_snapshots_by_simulation(self, simulation_id: int) -> List[Dict[str, Any]]:
        session = self.get_session()
        try:
            snapshots = session.query(Snapshot).filter(
                Snapshot.simulation_id == simulation_id
            ).order_by(Snapshot.step).all()
            
            return [
                {
                    'id': snap.id,
                    'step': snap.step,
                    'time_stamp': snap.time_stamp.isoformat() if snap.time_stamp else None
                }
                for snap in snapshots
            ]
        finally:
            session.close()
    
    def get_snapshot_data(self, snapshot_id: int, grid_shape: tuple) -> Dict[str, np.ndarray]:
        session = self.get_session()
        try:
            snapshot = session.query(Snapshot).filter(Snapshot.id == snapshot_id).first()
            if not snapshot:
                return {}
            
            result = {}
            if snapshot.velocity_data:
                result['velocity'] = np.frombuffer(snapshot.velocity_data, dtype=np.float32).reshape(
                    grid_shape[0], grid_shape[1], 2
                )
            if snapshot.vorticity_data:
                result['vorticity'] = np.frombuffer(snapshot.vorticity_data, dtype=np.float32).reshape(
                    grid_shape[0], grid_shape[1]
                )
            if snapshot.density_data:
                result['density'] = np.frombuffer(snapshot.density_data, dtype=np.float32).reshape(
                    grid_shape[0], grid_shape[1]
                )
            return result
        finally:
            session.close()
    
    def delete_simulation(self, simulation_id: int) -> bool:
        session = self.get_session()
        try:
            simulation = session.query(Simulation).filter(Simulation.id == simulation_id).first()
            if simulation:
                session.delete(simulation)
                session.commit()
                return True
            return False
        finally:
            session.close()
