from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import Optional, Dict, Any, List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime

from ..md_engine import MDSimulator
from ..database import get_async_session
from ..models import Simulation, Frame, AtomState
from ..config import settings

router = APIRouter(prefix="/api/simulation", tags=["模拟控制"])

active_simulators: Dict[str, MDSimulator] = {}


class CreateSimulationRequest(BaseModel):
    name: Optional[str] = None
    n_unit_cells: int = settings.DEFAULT_LATTICE_SIZE
    density: float = settings.DEFAULT_DENSITY
    temperature: float = settings.DEFAULT_TEMPERATURE
    timestep: float = settings.DEFAULT_TIMESTEP
    mass: float = 1.0
    epsilon: float = 1.0
    sigma: float = 1.0
    cutoff: float = 2.5
    seed: Optional[int] = 42


class StepSimulationRequest(BaseModel):
    n_steps: int = 100
    save_interval: int = 1
    save_to_db: bool = False


class ScaleTemperatureRequest(BaseModel):
    target_temperature: float


@router.post("/create")
async def create_simulation(
    request: CreateSimulationRequest,
    session: AsyncSession = Depends(get_async_session),
):
    try:
        simulator = MDSimulator(
            n_unit_cells=request.n_unit_cells,
            density=request.density,
            temperature=request.temperature,
            timestep=request.timestep,
            mass=request.mass,
            epsilon=request.epsilon,
            sigma=request.sigma,
            cutoff=request.cutoff,
            seed=request.seed,
        )
        
        sim_id = f"sim_{datetime.utcnow().strftime('%Y%m%d%H%M%S')}"
        active_simulators[sim_id] = simulator
        
        system_info = simulator.get_system_info()
        current_state = simulator.get_state()
        
        return {
            "success": True,
            "simulation_id": sim_id,
            "system_info": system_info,
            "initial_state": {
                "step": current_state.step,
                "time": current_state.time,
                "temperature": current_state.temperature,
                "pressure": current_state.pressure,
                "potential_energy": current_state.potential_energy,
                "kinetic_energy": current_state.kinetic_energy,
                "total_energy": current_state.total_energy,
                "positions": current_state.positions.tolist(),
            },
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{simulation_id}/step")
async def step_simulation(
    simulation_id: str,
    request: StepSimulationRequest,
    session: AsyncSession = Depends(get_async_session),
):
    if simulation_id not in active_simulators:
        raise HTTPException(status_code=404, detail="Simulation not found")
    
    simulator = active_simulators[simulation_id]
    
    try:
        state = simulator.step(
            n_steps=request.n_steps,
            save_interval=request.save_interval,
        )
        
        trajectory_len = len(simulator.trajectory)
        
        return {
            "success": True,
            "simulation_id": simulation_id,
            "state": {
                "step": state.step,
                "time": state.time,
                "temperature": round(state.temperature, 6),
                "pressure": round(state.pressure, 6),
                "potential_energy": round(state.potential_energy, 6),
                "kinetic_energy": round(state.kinetic_energy, 6),
                "total_energy": round(state.total_energy, 6),
                "positions": state.positions.tolist(),
            },
            "trajectory_length": trajectory_len,
            "n_steps_completed": request.n_steps,
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{simulation_id}/state")
async def get_simulation_state(simulation_id: str):
    if simulation_id not in active_simulators:
        raise HTTPException(status_code=404, detail="Simulation not found")
    
    simulator = active_simulators[simulation_id]
    state = simulator.get_state()
    
    return {
        "success": True,
        "simulation_id": simulation_id,
        "state": {
            "step": state.step,
            "time": state.time,
            "temperature": round(state.temperature, 6),
            "pressure": round(state.pressure, 6),
            "potential_energy": round(state.potential_energy, 6),
            "kinetic_energy": round(state.kinetic_energy, 6),
            "total_energy": round(state.total_energy, 6),
            "positions": state.positions.tolist(),
            "velocities": state.velocities.tolist(),
            "forces": state.forces.tolist(),
        },
        "system_info": simulator.get_system_info(),
    }


@router.get("/{simulation_id}/trajectory")
async def get_trajectory(simulation_id: str):
    if simulation_id not in active_simulators:
        raise HTTPException(status_code=404, detail="Simulation not found")
    
    simulator = active_simulators[simulation_id]
    trajectory = simulator.get_trajectory()
    
    trajectory_data = [
        {
            "step": frame.step,
            "time": frame.time,
            "temperature": round(frame.temperature, 6),
            "pressure": round(frame.pressure, 6),
            "potential_energy": round(frame.potential_energy, 6),
            "kinetic_energy": round(frame.kinetic_energy, 6),
            "total_energy": round(frame.total_energy, 6),
            "positions": frame.positions.tolist(),
        }
        for frame in trajectory
    ]
    
    return {
        "success": True,
        "simulation_id": simulation_id,
        "trajectory_length": len(trajectory_data),
        "trajectory": trajectory_data,
    }


@router.get("/{simulation_id}/trajectory/{frame_index}")
async def get_trajectory_frame(simulation_id: str, frame_index: int):
    if simulation_id not in active_simulators:
        raise HTTPException(status_code=404, detail="Simulation not found")
    
    simulator = active_simulators[simulation_id]
    frame = simulator.get_trajectory_frame(frame_index)
    
    if frame is None:
        raise HTTPException(status_code=404, detail="Frame not found")
    
    return {
        "success": True,
        "simulation_id": simulation_id,
        "frame_index": frame_index,
        "frame": {
            "step": frame.step,
            "time": frame.time,
            "temperature": round(frame.temperature, 6),
            "pressure": round(frame.pressure, 6),
            "potential_energy": round(frame.potential_energy, 6),
            "kinetic_energy": round(frame.kinetic_energy, 6),
            "total_energy": round(frame.total_energy, 6),
            "positions": frame.positions.tolist(),
            "velocities": frame.velocities.tolist(),
            "forces": frame.forces.tolist(),
        },
    }


@router.post("/{simulation_id}/scale-temperature")
async def scale_temperature(
    simulation_id: str,
    request: ScaleTemperatureRequest,
):
    if simulation_id not in active_simulators:
        raise HTTPException(status_code=404, detail="Simulation not found")
    
    simulator = active_simulators[simulation_id]
    
    try:
        simulator.scale_velocities(request.target_temperature)
        state = simulator.get_state()
        
        return {
            "success": True,
            "simulation_id": simulation_id,
            "message": f"Temperature scaled to {request.target_temperature}",
            "current_temperature": round(state.temperature, 6),
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{simulation_id}")
async def close_simulation(simulation_id: str):
    if simulation_id not in active_simulators:
        raise HTTPException(status_code=404, detail="Simulation not found")
    
    del active_simulators[simulation_id]
    
    return {
        "success": True,
        "message": f"Simulation {simulation_id} closed",
    }


@router.get("/")
async def list_active_simulations():
    return {
        "success": True,
        "active_simulations": list(active_simulators.keys()),
        "count": len(active_simulators),
    }
