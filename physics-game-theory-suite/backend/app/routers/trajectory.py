from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List

from app.database import get_db
from app.models import SimulationRecord, SimulationFrame
from app.schemas import (
    SavedSimulationList,
    SavedFramesResponse,
    FrameInfo,
    SimulationStateResponse,
)

router = APIRouter(prefix="/trajectory", tags=["Trajectory"])


@router.get("/", response_model=SavedSimulationList)
def list_saved_simulations(db: Session = Depends(get_db)):
    records = db.query(SimulationRecord).order_by(SimulationRecord.created_at.desc()).all()
    
    simulations = []
    for record in records:
        frame_count = db.query(func.count(SimulationFrame.id)).filter(
            SimulationFrame.simulation_id == record.id
        ).scalar()
        
        simulations.append({
            "id": record.id,
            "name": record.name or f"模拟 #{record.id}",
            "n_atoms": record.n_atoms,
            "box_size": record.box_size,
            "total_steps": record.total_steps,
            "total_time": record.total_time,
            "frame_count": frame_count,
            "created_at": record.created_at.isoformat() if record.created_at else None,
        })
    
    return SavedSimulationList(simulations=simulations)


@router.get("/{simulation_id}")
def get_simulation_info(simulation_id: int, db: Session = Depends(get_db)):
    record = db.query(SimulationRecord).filter(SimulationRecord.id == simulation_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="轨迹不存在")
    
    frame_count = db.query(func.count(SimulationFrame.id)).filter(
        SimulationFrame.simulation_id == simulation_id
    ).scalar()
    
    return {
        "simulation": {
            "id": record.id,
            "name": record.name or f"模拟 #{record.id}",
            "n_atoms": record.n_atoms,
            "box_size": record.box_size,
            "density": record.density,
            "initial_temperature": record.initial_temperature,
            "timestep": record.timestep,
            "mass": record.mass,
            "epsilon": record.epsilon,
            "sigma": record.sigma,
            "cutoff": record.cutoff,
            "total_steps": record.total_steps,
            "total_time": record.total_time,
            "frame_count": frame_count,
            "created_at": record.created_at.isoformat() if record.created_at else None,
        }
    }


@router.get("/{simulation_id}/frames", response_model=SavedFramesResponse)
def get_frames(simulation_id: int, db: Session = Depends(get_db)):
    record = db.query(SimulationRecord).filter(SimulationRecord.id == simulation_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="轨迹不存在")
    
    frames = db.query(SimulationFrame).filter(
        SimulationFrame.simulation_id == simulation_id
    ).order_by(SimulationFrame.frame_number).all()
    
    frame_info_list = [
        FrameInfo(
            frame_number=f.frame_number,
            time=f.time,
            temperature=f.temperature,
            pressure=f.pressure,
            potential_energy=f.potential_energy,
            kinetic_energy=f.kinetic_energy,
            total_energy=f.total_energy,
        )
        for f in frames
    ]
    
    return SavedFramesResponse(
        box_size=record.box_size,
        num_atoms=record.n_atoms,
        frames=frame_info_list,
    )


@router.get("/{simulation_id}/frames/{frame_number}", response_model=SimulationStateResponse)
def get_frame_details(simulation_id: int, frame_number: int, db: Session = Depends(get_db)):
    frame = db.query(SimulationFrame).filter(
        SimulationFrame.simulation_id == simulation_id,
        SimulationFrame.frame_number == frame_number
    ).first()
    
    if not frame:
        raise HTTPException(status_code=404, detail="帧不存在")
    
    return SimulationStateResponse(
        step=frame.frame_number,
        time=frame.time,
        positions=frame.positions,
        velocities=frame.velocities,
        forces=frame.forces,
        temperature=frame.temperature,
        pressure=frame.pressure,
        potential_energy=frame.potential_energy,
        kinetic_energy=frame.kinetic_energy,
        total_energy=frame.total_energy,
    )


@router.delete("/{simulation_id}")
def delete_simulation(simulation_id: int, db: Session = Depends(get_db)):
    record = db.query(SimulationRecord).filter(SimulationRecord.id == simulation_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="轨迹不存在")
    
    db.delete(record)
    db.commit()
    
    return {"success": True, "message": "轨迹已删除"}
