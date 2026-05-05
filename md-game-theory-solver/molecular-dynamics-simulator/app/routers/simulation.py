from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional, Dict, Any
from sqlalchemy.orm import Session
import uuid

from ..database import get_db
from ..models import Simulation, Frame
from ..md_engine import MDSimulator

router = APIRouter(prefix="/api/simulation", tags=["模拟控制"])

simulations: Dict[str, MDSimulator] = {}


class SimulationConfig(BaseModel):
    n_unit_cells: int = 3
    density: float = 0.8
    temperature: float = 1.0
    timestep: float = 0.001
    mass: float = 1.0
    epsilon: float = 1.0
    sigma: float = 1.0
    cutoff: float = 2.5
    seed: Optional[int] = None


class StepRequest(BaseModel):
    steps: int = 1


class TemperatureScaleRequest(BaseModel):
    target_temperature: float


@router.post("/create")
async def create_simulation(config: SimulationConfig):
    simulation_id = str(uuid.uuid4())
    
    simulator = MDSimulator(
        n_unit_cells=config.n_unit_cells,
        density=config.density,
        temperature=config.temperature,
        timestep=config.timestep,
        mass=config.mass,
        epsilon=config.epsilon,
        sigma=config.sigma,
        cutoff=config.cutoff,
        seed=config.seed,
    )
    
    simulations[simulation_id] = simulator
    
    initial_state = simulator.get_state()
    system_info = simulator.get_system_info()
    
    return {
        "simulation_id": simulation_id,
        "system_info": system_info,
        "initial_state": initial_state.to_dict(),
    }


@router.get("/{simulation_id}/state")
async def get_simulation_state(simulation_id: str):
    if simulation_id not in simulations:
        raise HTTPException(status_code=404, detail="Simulation not found")
    
    simulator = simulations[simulation_id]
    state = simulator.get_state()
    
    return {"state": state.to_dict()}


@router.post("/{simulation_id}/step")
async def step_simulation(simulation_id: str, request: StepRequest):
    if simulation_id not in simulations:
        raise HTTPException(status_code=404, detail="Simulation not found")
    
    simulator = simulations[simulation_id]
    state = simulator.step(n_steps=request.steps)
    
    return {
        "success": True,
        "state": state.to_dict(),
    }


@router.post("/{simulation_id}/scale-temperature")
async def scale_temperature(simulation_id: str, request: TemperatureScaleRequest):
    if simulation_id not in simulations:
        raise HTTPException(status_code=404, detail="Simulation not found")
    
    simulator = simulations[simulation_id]
    simulator.scale_velocities(request.target_temperature)
    
    return {"success": True}


@router.post("/{simulation_id}/close")
async def close_simulation(simulation_id: str):
    if simulation_id in simulations:
        del simulations[simulation_id]
    
    return {"success": True}


@router.post("/{simulation_id}/save")
async def save_simulation(
    simulation_id: str, 
    name: Optional[str] = None,
    db: Session = Depends(get_db)
):
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
