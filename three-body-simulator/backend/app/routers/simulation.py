from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Optional
import uuid

from app.physics.three_body import ThreeBodySimulator
from app.models.database import (
    init_db, save_simulation, save_trajectory,
    get_simulation, get_all_simulations, get_trajectory_data,
    delete_simulation
)

router = APIRouter()

class BodyConfig(BaseModel):
    id: int
    mass: float
    position: List[float]
    velocity: List[float]

class SimulationConfig(BaseModel):
    name: str
    description: Optional[str] = ""
    bodies: List[BodyConfig]
    dt: float = 0.01
    num_steps: int = 1000

class StepRequest(BaseModel):
    simulation_id: str
    dt: float = 0.01
    steps: int = 1

active_simulations: Dict[str, ThreeBodySimulator] = {}

init_db()

@router.post("/simulations/")
def create_simulation(config: SimulationConfig):
    bodies_config = [
        {
            "id": body.id,
            "mass": body.mass,
            "position": body.position,
            "velocity": body.velocity
        }
        for body in config.bodies
    ]
    
    simulator = ThreeBodySimulator()
    simulator.init_bodies(bodies_config)
    
    simulation_id = str(uuid.uuid4())
    active_simulations[simulation_id] = simulator
    
    db_simulation_id = save_simulation(
        name=config.name,
        config={
            "bodies": bodies_config,
            "dt": config.dt,
            "num_steps": config.num_steps
        },
        description=config.description
    )
    
    return {
        "simulation_id": simulation_id,
        "db_id": db_simulation_id,
        "state": simulator.get_current_state()
    }

@router.post("/simulations/{simulation_id}/step")
def step_simulation(simulation_id: str, request: StepRequest):
    if simulation_id not in active_simulations:
        raise HTTPException(status_code=404, detail="Simulation not found")
    
    simulator = active_simulations[simulation_id]
    
    for _ in range(request.steps):
        simulator.step(request.dt)
    
    return {
        "simulation_id": simulation_id,
        "state": simulator.get_current_state()
    }

@router.get("/simulations/{simulation_id}/state")
def get_simulation_state(simulation_id: str):
    if simulation_id not in active_simulations:
        raise HTTPException(status_code=404, detail="Simulation not found")
    
    simulator = active_simulations[simulation_id]
    return {
        "simulation_id": simulation_id,
        "state": simulator.get_current_state()
    }

@router.get("/simulations/{simulation_id}/trajectory")
def get_simulation_trajectory(simulation_id: str):
    if simulation_id not in active_simulations:
        raise HTTPException(status_code=404, detail="Simulation not found")
    
    simulator = active_simulations[simulation_id]
    return {
        "simulation_id": simulation_id,
        "trajectory": simulator.get_trajectory()
    }

@router.post("/simulations/{simulation_id}/save")
def save_active_simulation(simulation_id: str, name: str = "", description: str = ""):
    if simulation_id not in active_simulations:
        raise HTTPException(status_code=404, detail="Simulation not found")
    
    simulator = active_simulations[simulation_id]
    current_state = simulator.get_current_state()
    
    db_id = save_simulation(
        name=name or f"Simulation_{simulation_id[:8]}",
        config={
            "bodies": [b.to_dict() for b in simulator.bodies],
            "current_time": simulator.time
        },
        description=description
    )
    
    trajectory = simulator.get_trajectory()
    for i, state in enumerate(trajectory):
        state["step"] = i
    
    save_trajectory(db_id, trajectory)
    
    return {
        "saved": True,
        "db_id": db_id,
        "steps_saved": len(trajectory)
    }

@router.delete("/simulations/{simulation_id}")
def stop_simulation(simulation_id: str):
    if simulation_id in active_simulations:
        del active_simulations[simulation_id]
        return {"stopped": True, "simulation_id": simulation_id}
    return {"stopped": False, "message": "Simulation not found"}

@router.get("/database/simulations")
def list_saved_simulations():
    simulations = get_all_simulations()
    return {"simulations": simulations}

@router.get("/database/simulations/{db_id}")
def get_saved_simulation(db_id: int):
    simulation = get_simulation(db_id)
    if simulation is None:
        raise HTTPException(status_code=404, detail="Simulation not found in database")
    
    trajectory = get_trajectory_data(db_id)
    return {
        "simulation": simulation,
        "trajectory": trajectory
    }

@router.delete("/database/simulations/{db_id}")
def delete_saved_simulation(db_id: int):
    deleted = delete_simulation(db_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Simulation not found")
    return {"deleted": True, "db_id": db_id}

@router.get("/health")
def health_check():
    return {"status": "healthy", "active_simulations": len(active_simulations)}
