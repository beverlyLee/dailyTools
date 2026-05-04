from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from sqlalchemy.orm import selectinload
from datetime import datetime

from ..database import get_async_session
from ..models import Simulation, Frame, AtomState

router = APIRouter(prefix="/api/trajectory", tags=["轨迹数据管理"])


class SaveTrajectoryRequest(BaseModel):
    name: Optional[str] = None
    simulation_id: str
    positions: List[List[float]]
    step: int
    time: float
    temperature: float
    pressure: float
    potential_energy: float
    kinetic_energy: float
    total_energy: float
    velocities: Optional[List[List[float]]] = None
    forces: Optional[List[List[float]]] = None


@router.post("/save/simulation")
async def save_simulation_to_db(
    name: Optional[str] = None,
    n_unit_cells: int = 5,
    box_size: float = 10.0,
    density: float = 0.8,
    initial_temperature: float = 1.0,
    timestep: float = 0.001,
    session: AsyncSession = Depends(get_async_session),
):
    try:
        simulation = Simulation(
            name=name,
            num_atoms=4 * (n_unit_cells ** 3),
            box_size=box_size,
            density=density,
            initial_temperature=initial_temperature,
            timestep=timestep,
        )
        session.add(simulation)
        await session.flush()
        await session.commit()
        
        return {
            "success": True,
            "simulation_db_id": simulation.id,
            "message": "Simulation metadata saved to database",
        }
        
    except Exception as e:
        await session.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/save/frame/{simulation_db_id}")
async def save_frame_to_db(
    simulation_db_id: int,
    request: SaveTrajectoryRequest,
    session: AsyncSession = Depends(get_async_session),
):
    try:
        result = await session.execute(
            select(Simulation).where(Simulation.id == simulation_db_id)
        )
        simulation = result.scalar_one_or_none()
        
        if not simulation:
            raise HTTPException(status_code=404, detail="Simulation not found")
        
        frame = Frame(
            simulation_id=simulation_db_id,
            frame_number=request.step,
            time=request.time,
            temperature=request.temperature,
            pressure=request.pressure,
            potential_energy=request.potential_energy,
            kinetic_energy=request.kinetic_energy,
            total_energy=request.total_energy,
        )
        session.add(frame)
        await session.flush()
        
        n_atoms = len(request.positions)
        for i in range(n_atoms):
            pos = request.positions[i]
            vel = request.velocities[i] if request.velocities else [0.0, 0.0, 0.0]
            force = request.forces[i] if request.forces else [0.0, 0.0, 0.0]
            
            atom_state = AtomState(
                frame_id=frame.id,
                atom_index=i,
                px=pos[0],
                py=pos[1],
                pz=pos[2],
                vx=vel[0],
                vy=vel[1],
                vz=vel[2],
                fx=force[0],
                fy=force[1],
                fz=force[2],
            )
            session.add(atom_state)
        
        await session.commit()
        
        return {
            "success": True,
            "simulation_db_id": simulation_db_id,
            "frame_id": frame.id,
            "frame_number": request.step,
            "message": f"Frame {request.step} saved",
        }
        
    except Exception as e:
        await session.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/simulations")
async def list_saved_simulations(session: AsyncSession = Depends(get_async_session)):
    try:
        result = await session.execute(
            select(Simulation).order_by(Simulation.created_at.desc())
        )
        simulations = result.scalars().all()
        
        return {
            "success": True,
            "simulations": [
                {
                    "id": sim.id,
                    "name": sim.name,
                    "created_at": sim.created_at.isoformat() if sim.created_at else None,
                    "num_atoms": sim.num_atoms,
                    "box_size": sim.box_size,
                    "density": sim.density,
                    "initial_temperature": sim.initial_temperature,
                    "timestep": sim.timestep,
                }
                for sim in simulations
            ],
            "count": len(simulations),
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/simulation/{simulation_db_id}")
async def get_simulation_info(simulation_db_id: int, session: AsyncSession = Depends(get_async_session)):
    try:
        result = await session.execute(
            select(Simulation)
            .options(selectinload(Simulation.frames))
            .where(Simulation.id == simulation_db_id)
        )
        simulation = result.scalar_one_or_none()
        
        if not simulation:
            raise HTTPException(status_code=404, detail="Simulation not found")
        
        frames = sorted(simulation.frames, key=lambda f: f.frame_number)
        
        return {
            "success": True,
            "simulation": {
                "id": simulation.id,
                "name": simulation.name,
                "created_at": simulation.created_at.isoformat() if simulation.created_at else None,
                "num_atoms": simulation.num_atoms,
                "box_size": simulation.box_size,
                "density": simulation.density,
                "initial_temperature": simulation.initial_temperature,
                "timestep": simulation.timestep,
                "total_frames": len(frames),
            },
            "frame_summary": {
                "first_frame": frames[0].frame_number if frames else None,
                "last_frame": frames[-1].frame_number if frames else None,
                "total_energy_first": frames[0].total_energy if frames else None,
                "total_energy_last": frames[-1].total_energy if frames else None,
            } if frames else None,
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/simulation/{simulation_db_id}/frames")
async def get_all_frames(simulation_db_id: int, session: AsyncSession = Depends(get_async_session)):
    try:
        result = await session.execute(
            select(Simulation).where(Simulation.id == simulation_db_id)
        )
        simulation = result.scalar_one_or_none()
        
        if not simulation:
            raise HTTPException(status_code=404, detail="Simulation not found")
        
        result = await session.execute(
            select(Frame)
            .where(Frame.simulation_id == simulation_db_id)
            .order_by(Frame.frame_number)
        )
        frames = result.scalars().all()
        
        return {
            "success": True,
            "simulation_db_id": simulation_db_id,
            "num_atoms": simulation.num_atoms,
            "box_size": simulation.box_size,
            "frames": [
                {
                    "frame_number": f.frame_number,
                    "time": f.time,
                    "temperature": f.temperature,
                    "pressure": f.pressure,
                    "potential_energy": f.potential_energy,
                    "kinetic_energy": f.kinetic_energy,
                    "total_energy": f.total_energy,
                }
                for f in frames
            ],
            "count": len(frames),
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/simulation/{simulation_db_id}/frame/{frame_number}")
async def get_frame_details(
    simulation_db_id: int,
    frame_number: int,
    session: AsyncSession = Depends(get_async_session),
):
    try:
        result = await session.execute(
            select(Frame)
            .options(selectinload(Frame.atoms))
            .where(
                Frame.simulation_id == simulation_db_id,
                Frame.frame_number == frame_number,
            )
        )
        frame = result.scalar_one_or_none()
        
        if not frame:
            raise HTTPException(status_code=404, detail="Frame not found")
        
        result = await session.execute(
            select(Simulation).where(Simulation.id == simulation_db_id)
        )
        simulation = result.scalar_one_or_none()
        
        atoms = sorted(frame.atoms, key=lambda a: a.atom_index)
        
        return {
            "success": True,
            "simulation_db_id": simulation_db_id,
            "frame_number": frame_number,
            "time": frame.time,
            "temperature": frame.temperature,
            "pressure": frame.pressure,
            "potential_energy": frame.potential_energy,
            "kinetic_energy": frame.kinetic_energy,
            "total_energy": frame.total_energy,
            "num_atoms": simulation.num_atoms if simulation else len(atoms),
            "box_size": simulation.box_size if simulation else 0.0,
            "atoms": [
                {
                    "index": a.atom_index,
                    "position": [a.px, a.py, a.pz],
                    "velocity": [a.vx, a.vy, a.vz],
                    "force": [a.fx, a.fy, a.fz],
                }
                for a in atoms
            ],
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/simulation/{simulation_db_id}")
async def delete_simulation(simulation_db_id: int, session: AsyncSession = Depends(get_async_session)):
    try:
        result = await session.execute(
            select(Simulation).where(Simulation.id == simulation_db_id)
        )
        simulation = result.scalar_one_or_none()
        
        if not simulation:
            raise HTTPException(status_code=404, detail="Simulation not found")
        
        await session.execute(
            delete(Simulation).where(Simulation.id == simulation_db_id)
        )
        await session.commit()
        
        return {
            "success": True,
            "message": f"Simulation {simulation_db_id} deleted",
        }
        
    except Exception as e:
        await session.rollback()
        raise HTTPException(status_code=500, detail=str(e))
