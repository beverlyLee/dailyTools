from fastapi import APIRouter, HTTPException, Query, BackgroundTasks
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import Optional, Dict, Any, List
import taichi as ti
import numpy as np
import json
import base64

from app.lbm.d2q9 import LBM_D2Q9
from app.database.models import DatabaseManager

router = APIRouter()

db_manager = DatabaseManager()

simulation_instances: Dict[int, LBM_D2Q9] = {}
simulation_steps: Dict[int, int] = {}

class SimulationParams(BaseModel):
    reynolds_number: float = 1000.0
    inlet_velocity: float = 0.1
    grid_width: int = 256
    grid_height: int = 128
    obstacle_type: str = "circle"
    obstacle_x: int = 64
    obstacle_y: int = 64
    obstacle_radius: int = 16
    obstacle_width: int = 32
    obstacle_height: int = 32
    name: Optional[str] = None

class StepRequest(BaseModel):
    simulation_id: int
    steps: int = 1
    save_snapshot: bool = False

class SnapshotRequest(BaseModel):
    simulation_id: int
    step: int

@router.post("/init", response_model=Dict[str, Any])
async def init_simulation(params: SimulationParams):
    try:
        if not ti.is_initialized():
            ti.init(arch=ti.cpu)
        
        lbm = LBM_D2Q9(nx=params.grid_width, ny=params.grid_height)
        lbm.set_parameters(reynolds=params.reynolds_number, u_inlet=params.inlet_velocity)
        
        if params.obstacle_type == "circle":
            lbm.set_circular_obstacle(
                cx=params.obstacle_x,
                cy=params.obstacle_y,
                r=params.obstacle_radius
            )
        elif params.obstacle_type == "rectangle":
            lbm.set_rectangular_obstacle(
                x1=params.obstacle_x,
                y1=params.obstacle_y,
                x2=params.obstacle_x + params.obstacle_width,
                y2=params.obstacle_y + params.obstacle_height
            )
        
        obstacle_params = {}
        if params.obstacle_type == "circle":
            obstacle_params = {
                "x": params.obstacle_x,
                "y": params.obstacle_y,
                "radius": params.obstacle_radius
            }
        elif params.obstacle_type == "rectangle":
            obstacle_params = {
                "x": params.obstacle_x,
                "y": params.obstacle_y,
                "width": params.obstacle_width,
                "height": params.obstacle_height
            }
        
        db_params = {
            "name": params.name,
            "reynolds_number": params.reynolds_number,
            "inlet_velocity": params.inlet_velocity,
            "grid_width": params.grid_width,
            "grid_height": params.grid_height,
            "obstacle_type": params.obstacle_type,
            "obstacle_params": json.dumps(obstacle_params)
        }
        simulation_id = db_manager.create_simulation(db_params)
        
        simulation_instances[simulation_id] = lbm
        simulation_steps[simulation_id] = 0
        
        return {
            "success": True,
            "simulation_id": simulation_id,
            "message": "Simulation initialized successfully"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to initialize simulation: {str(e)}")

@router.post("/step", response_model=Dict[str, Any])
async def run_step(request: StepRequest):
    try:
        sim_id = request.simulation_id
        if sim_id not in simulation_instances:
            raise HTTPException(status_code=404, detail="Simulation not found")
        
        lbm = simulation_instances[sim_id]
        steps = request.steps
        
        for _ in range(steps):
            lbm.step()
        
        simulation_steps[sim_id] += steps
        
        velocity = lbm.get_velocity()
        vorticity = lbm.get_vorticity()
        obstacle = lbm.get_obstacle()
        
        if request.save_snapshot:
            db_manager.save_snapshot(
                simulation_id=sim_id,
                step=simulation_steps[sim_id],
                velocity=velocity,
                vorticity=vorticity
            )
        
        velocity_flat = velocity.flatten().tolist()
        vorticity_flat = vorticity.flatten().tolist()
        obstacle_flat = obstacle.flatten().tolist()
        
        return {
            "success": True,
            "simulation_id": sim_id,
            "current_step": simulation_steps[sim_id],
            "grid_width": lbm.nx,
            "grid_height": lbm.ny,
            "velocity": velocity_flat,
            "vorticity": vorticity_flat,
            "obstacle": obstacle_flat
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to run step: {str(e)}")

@router.get("/state/{simulation_id}", response_model=Dict[str, Any])
async def get_simulation_state(simulation_id: int, include_data: bool = True):
    try:
        if simulation_id not in simulation_instances:
            raise HTTPException(status_code=404, detail="Simulation not found")
        
        lbm = simulation_instances[simulation_id]
        
        response = {
            "success": True,
            "simulation_id": simulation_id,
            "current_step": simulation_steps[simulation_id],
            "grid_width": lbm.nx,
            "grid_height": lbm.ny,
            "reynolds_number": lbm.reynolds,
            "inlet_velocity": lbm.u_inlet
        }
        
        if include_data:
            velocity = lbm.get_velocity()
            vorticity = lbm.get_vorticity()
            obstacle = lbm.get_obstacle()
            
            response["velocity"] = velocity.flatten().tolist()
            response["vorticity"] = vorticity.flatten().tolist()
            response["obstacle"] = obstacle.flatten().tolist()
        
        return response
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get state: {str(e)}")

@router.post("/reset/{simulation_id}", response_model=Dict[str, Any])
async def reset_simulation(simulation_id: int):
    try:
        if simulation_id not in simulation_instances:
            raise HTTPException(status_code=404, detail="Simulation not found")
        
        lbm = simulation_instances[simulation_id]
        lbm.reset()
        simulation_steps[simulation_id] = 0
        
        return {
            "success": True,
            "simulation_id": simulation_id,
            "message": "Simulation reset successfully"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to reset: {str(e)}")

@router.delete("/{simulation_id}", response_model=Dict[str, Any])
async def delete_simulation(simulation_id: int):
    try:
        if simulation_id in simulation_instances:
            del simulation_instances[simulation_id]
            del simulation_steps[simulation_id]
        
        db_manager.delete_simulation(simulation_id)
        
        return {
            "success": True,
            "simulation_id": simulation_id,
            "message": "Simulation deleted successfully"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete: {str(e)}")

@router.get("/list", response_model=Dict[str, Any])
async def list_simulations():
    try:
        simulations = db_manager.get_all_simulations()
        return {
            "success": True,
            "simulations": simulations,
            "active_simulation_ids": list(simulation_instances.keys())
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to list simulations: {str(e)}")

@router.get("/snapshots/{simulation_id}", response_model=Dict[str, Any])
async def get_snapshots(simulation_id: int):
    try:
        snapshots = db_manager.get_snapshots_by_simulation(simulation_id)
        return {
            "success": True,
            "simulation_id": simulation_id,
            "snapshots": snapshots
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get snapshots: {str(e)}")

@router.get("/snapshot/{snapshot_id}", response_model=Dict[str, Any])
async def get_snapshot(snapshot_id: int):
    try:
        snapshot_info = db_manager.get_snapshot(snapshot_id)
        if not snapshot_info:
            raise HTTPException(status_code=404, detail="Snapshot not found")
        
        sim_info = db_manager.get_simulation(snapshot_info["simulation_id"])
        if not sim_info:
            raise HTTPException(status_code=404, detail="Simulation not found")
        
        grid_shape = (sim_info["grid_width"], sim_info["grid_height"])
        snapshot_data = db_manager.get_snapshot_data(snapshot_id, grid_shape)
        
        response = {
            "success": True,
            "snapshot_id": snapshot_id,
            "simulation_id": snapshot_info["simulation_id"],
            "step": snapshot_info["step"],
            "time_stamp": snapshot_info["time_stamp"],
            "grid_width": sim_info["grid_width"],
            "grid_height": sim_info["grid_height"]
        }
        
        if "velocity" in snapshot_data:
            response["velocity"] = snapshot_data["velocity"].flatten().tolist()
        if "vorticity" in snapshot_data:
            response["vorticity"] = snapshot_data["vorticity"].flatten().tolist()
        if "density" in snapshot_data:
            response["density"] = snapshot_data["density"].flatten().tolist()
        
        return response
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get snapshot: {str(e)}")
