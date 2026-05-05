from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import Optional, Dict, Any, List
import json
import base64
import numpy as np
import taichi as ti

from app.lbm import LBM_D2Q9
from app.models import DatabaseManager

router = APIRouter(prefix="/api/simulation", tags=["Simulation"])

db_manager = DatabaseManager()

simulation_instance: Optional[LBM_D2Q9] = None
current_simulation_id: Optional[int] = None
current_step: int = 0
is_running: bool = False


class SimulationParams(BaseModel):
    reynolds_number: float = 1000.0
    inlet_velocity: float = 0.1
    grid_width: int = 256
    grid_height: int = 128
    obstacle_type: str = "circle"
    obstacle_x: int = 64
    obstacle_y: int = 64
    obstacle_radius: int = 16
    obstacle_width: Optional[int] = 32
    obstacle_height: Optional[int] = 32
    name: Optional[str] = None


class StepRequest(BaseModel):
    steps: int = 1


def array_to_base64(arr: np.ndarray) -> str:
    return base64.b64encode(arr.tobytes()).decode('utf-8')


@router.post("/init")
async def init_simulation(params: SimulationParams):
    global simulation_instance, current_simulation_id, current_step, is_running
    
    try:
        if ti.is_initialized():
            ti.reset()
        
        ti.init(arch=ti.cpu)
        
        simulation_instance = LBM_D2Q9(
            nx=params.grid_width,
            ny=params.grid_height
        )
        
        simulation_instance.set_parameters(
            reynolds=params.reynolds_number,
            u_inlet=params.inlet_velocity
        )
        
        if params.obstacle_type == "circle":
            simulation_instance.set_circular_obstacle(
                cx=params.obstacle_x,
                cy=params.obstacle_y,
                r=params.obstacle_radius
            )
            obstacle_params = json.dumps({
                "type": "circle",
                "x": params.obstacle_x,
                "y": params.obstacle_y,
                "radius": params.obstacle_radius
            })
        else:
            w = params.obstacle_width or 32
            h = params.obstacle_height or 32
            simulation_instance.set_rectangular_obstacle(
                x1=params.obstacle_x,
                y1=params.obstacle_y,
                x2=params.obstacle_x + w,
                y2=params.obstacle_y + h
            )
            obstacle_params = json.dumps({
                "type": "rectangle",
                "x": params.obstacle_x,
                "y": params.obstacle_y,
                "width": w,
                "height": h
            })
        
        db_params = {
            "name": params.name,
            "reynolds_number": params.reynolds_number,
            "inlet_velocity": params.inlet_velocity,
            "grid_width": params.grid_width,
            "grid_height": params.grid_height,
            "obstacle_type": params.obstacle_type,
            "obstacle_params": obstacle_params
        }
        current_simulation_id = db_manager.create_simulation(db_params)
        current_step = 0
        is_running = False
        
        state = simulation_instance.get_state()
        
        return {
            "success": True,
            "simulation_id": current_simulation_id,
            "grid_width": params.grid_width,
            "grid_height": params.grid_height,
            "current_step": current_step,
            "state": {
                "velocity": array_to_base64(state['velocity'].astype(np.float32)),
                "vorticity": array_to_base64(state['vorticity'].astype(np.float32)),
                "density": array_to_base64(state['density'].astype(np.float32)),
                "obstacle": array_to_base64(state['obstacle'].astype(np.int32))
            }
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/step")
async def step_simulation(request: StepRequest):
    global simulation_instance, current_step
    
    if simulation_instance is None:
        raise HTTPException(status_code=400, detail="Simulation not initialized")
    
    try:
        simulation_instance.step_multiple(request.steps)
        current_step += request.steps
        
        state = simulation_instance.get_state()
        
        return {
            "success": True,
            "current_step": current_step,
            "state": {
                "velocity": array_to_base64(state['velocity'].astype(np.float32)),
                "vorticity": array_to_base64(state['vorticity'].astype(np.float32)),
                "density": array_to_base64(state['density'].astype(np.float32)),
                "obstacle": array_to_base64(state['obstacle'].astype(np.int32))
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/snapshot")
async def save_snapshot():
    global simulation_instance, current_simulation_id, current_step
    
    if simulation_instance is None or current_simulation_id is None:
        raise HTTPException(status_code=400, detail="Simulation not initialized")
    
    try:
        state = simulation_instance.get_state()
        
        snapshot_id = db_manager.save_snapshot(
            simulation_id=current_simulation_id,
            step=current_step,
            velocity=state['velocity'],
            vorticity=state['vorticity'],
            density=state['density']
        )
        
        return {
            "success": True,
            "snapshot_id": snapshot_id,
            "step": current_step
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/simulations")
async def get_simulations():
    try:
        simulations = db_manager.get_all_simulations()
        return {
            "success": True,
            "simulations": simulations
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/simulations/{simulation_id}")
async def get_simulation(simulation_id: int):
    try:
        simulation = db_manager.get_simulation(simulation_id)
        if simulation is None:
            raise HTTPException(status_code=404, detail="Simulation not found")
        
        snapshots = db_manager.get_snapshots_by_simulation(simulation_id)
        
        return {
            "success": True,
            "simulation": simulation,
            "snapshots": snapshots
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/snapshots/{snapshot_id}")
async def get_snapshot_data(snapshot_id: int, grid_width: int = 256, grid_height: int = 128):
    try:
        snapshot = db_manager.get_snapshot(snapshot_id)
        if snapshot is None:
            raise HTTPException(status_code=404, detail="Snapshot not found")
        
        sim = db_manager.get_simulation(snapshot['simulation_id'])
        if sim:
            grid_width = sim['grid_width']
            grid_height = sim['grid_height']
        
        data = db_manager.get_snapshot_data(snapshot_id, (grid_width, grid_height))
        
        result = {
            "success": True,
            "snapshot": snapshot,
            "grid_width": grid_width,
            "grid_height": grid_height,
            "state": {}
        }
        
        if 'velocity' in data:
            result['state']['velocity'] = array_to_base64(data['velocity'].astype(np.float32))
        if 'vorticity' in data:
            result['state']['vorticity'] = array_to_base64(data['vorticity'].astype(np.float32))
        if 'density' in data:
            result['state']['density'] = array_to_base64(data['density'].astype(np.float32))
        
        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/simulations/{simulation_id}")
async def delete_simulation(simulation_id: int):
    try:
        success = db_manager.delete_simulation(simulation_id)
        if not success:
            raise HTTPException(status_code=404, detail="Simulation not found")
        
        return {"success": True, "message": "Simulation deleted"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/status")
async def get_status():
    global simulation_instance, current_simulation_id, current_step, is_running
    
    return {
        "initialized": simulation_instance is not None,
        "simulation_id": current_simulation_id,
        "current_step": current_step,
        "is_running": is_running
    }
