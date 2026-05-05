from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import List, Optional
from sqlalchemy import desc

from ..database import get_db
from ..models import Simulation, Frame

router = APIRouter(prefix="/api/trajectory", tags=["轨迹管理"])


class SaveSimulationRequest(BaseModel):
    simulation_id: str
    name: Optional[str] = None


@router.post("/save")
async def save_trajectory_from_simulation(
    request: SaveSimulationRequest,
    db: Session = Depends(get_db)
):
    simulation_id = request.simulation_id
    name = request.name
    from ..routers.simulation import simulations
    
    if simulation_id not in simulations:
        raise HTTPException(status_code=404, detail="Simulation not found")
    
    simulator = simulations[simulation_id]
    system_info = simulator.get_system_info()
    trajectory = simulator.get_trajectory()
    
    db_simulation = Simulation(
        name=name or f"模拟 {len(trajectory)} 帧",
        num_atoms=system_info["n_atoms"],
        box_size=system_info["box_size"],
        density=system_info["density"],
        initial_temperature=system_info["initial_temperature"],
        timestep=system_info["timestep"],
        frame_count=len(trajectory),
    )
    db.add(db_simulation)
    db.commit()
    db.refresh(db_simulation)
    
    for state in trajectory:
        frame = Frame(
            simulation_id=db_simulation.id,
            frame_number=state.step,
            time=state.time,
            temperature=state.temperature,
            pressure=state.pressure,
            potential_energy=state.potential_energy,
            kinetic_energy=state.kinetic_energy,
            total_energy=state.total_energy,
            positions=state.positions.tolist(),
            velocities=state.velocities.tolist(),
            forces=state.forces.tolist(),
        )
        db.add(frame)
    
    db.commit()
    
    return {"id": db_simulation.id}


@router.get("/list")
async def list_saved_simulations(db: Session = Depends(get_db)):
    simulations = db.query(Simulation).order_by(desc(Simulation.created_at)).all()
    
    return {
        "simulations": [
            {
                "id": sim.id,
                "name": sim.name,
                "num_atoms": sim.num_atoms,
                "created_at": sim.created_at.isoformat() if sim.created_at else None,
                "frame_count": sim.frame_count,
            }
            for sim in simulations
        ]
    }


@router.get("/{simulation_db_id}/info")
async def get_simulation_info(simulation_db_id: int, db: Session = Depends(get_db)):
    simulation = db.query(Simulation).filter(Simulation.id == simulation_db_id).first()
    
    if not simulation:
        raise HTTPException(status_code=404, detail="Simulation not found")
    
    return {
        "simulation": {
            "id": simulation.id,
            "name": simulation.name,
            "num_atoms": simulation.num_atoms,
            "box_size": simulation.box_size,
            "density": simulation.density,
            "initial_temperature": simulation.initial_temperature,
            "timestep": simulation.timestep,
            "created_at": simulation.created_at.isoformat() if simulation.created_at else None,
            "frame_count": simulation.frame_count,
        }
    }


@router.get("/{simulation_db_id}/frames")
async def get_frames(simulation_db_id: int, db: Session = Depends(get_db)):
    simulation = db.query(Simulation).filter(Simulation.id == simulation_db_id).first()
    
    if not simulation:
        raise HTTPException(status_code=404, detail="Simulation not found")
    
    frames = db.query(Frame).filter(
        Frame.simulation_id == simulation_db_id
    ).order_by(Frame.frame_number).all()
    
    return {
        "frames": [
            {
                "frame_number": frame.frame_number,
                "time": frame.time,
                "temperature": frame.temperature,
                "pressure": frame.pressure,
                "potential_energy": frame.potential_energy,
                "kinetic_energy": frame.kinetic_energy,
                "total_energy": frame.total_energy,
            }
            for frame in frames
        ],
        "box_size": simulation.box_size,
        "num_atoms": simulation.num_atoms,
    }


@router.get("/{simulation_db_id}/frames/{frame_number}")
async def get_frame_details(
    simulation_db_id: int, 
    frame_number: int, 
    db: Session = Depends(get_db)
):
    frame = db.query(Frame).filter(
        Frame.simulation_id == simulation_db_id,
        Frame.frame_number == frame_number
    ).first()
    
    if not frame:
        raise HTTPException(status_code=404, detail="Frame not found")
    
    positions = frame.positions
    velocities = frame.velocities
    
    return {
        "frame_number": frame.frame_number,
        "atoms": [
            {
                "id": i,
                "position": {"x": pos[0], "y": pos[1], "z": pos[2]},
                "velocity": {"x": vel[0], "y": vel[1], "z": vel[2]},
            }
            for i, (pos, vel) in enumerate(zip(positions, velocities))
        ]
    }
