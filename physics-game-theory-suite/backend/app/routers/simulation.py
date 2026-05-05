from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from typing import Dict, Any
import uuid

from app.schemas import (
    SimulationConfig,
    CreateSimulationResponse,
    StepSimulationResponse,
    SimulationStateResponse,
    SystemInfo,
    TemperatureScaleRequest,
    SaveSimulationRequest,
    SaveSimulationResponse,
)
from app.database import get_db
from app.models import SimulationRecord, SimulationFrame
from app.md_engine import MDSimulator
from app.md_engine.lattice import LatticeType

router = APIRouter(prefix="/simulation", tags=["Physics Simulation"])

simulations: Dict[str, MDSimulator] = {}


@router.post("/create", response_model=CreateSimulationResponse)
def create_simulation(config: SimulationConfig):
    try:
        atom_type = None
        if config.atom_type:
            from app.md_engine.simulator import AtomType
            atom_type_map = {
                "argon": AtomType.ARGON,
                "helium": AtomType.HELIUM,
                "neon": AtomType.NEON,
                "krypton": AtomType.KRYPTON,
            }
            atom_type = atom_type_map.get(config.atom_type.lower())
        
        if config.lattice_type not in ["fcc", "sc", "bcc"]:
            raise HTTPException(status_code=400, detail="无效的晶格类型，支持: fcc, sc, bcc")
        
        simulator = MDSimulator(
            lattice_type=config.lattice_type,
            n_unit_cells=config.n_unit_cells,
            density=config.density,
            temperature=config.temperature,
            timestep=config.timestep,
            mass=config.mass if config.mass else 1.0,
            epsilon=config.epsilon if config.epsilon else 1.0,
            sigma=config.sigma if config.sigma else 1.0,
            cutoff=config.cutoff if config.cutoff else 2.5,
            seed=config.seed,
            atom_type=atom_type,
        )
        
        simulation_id = str(uuid.uuid4())
        simulations[simulation_id] = simulator
        
        system_info = SystemInfo(**simulator.get_system_info())
        initial_state = SimulationStateResponse(**simulator.get_state().to_dict())
        
        return CreateSimulationResponse(
            simulation_id=simulation_id,
            system_info=system_info,
            initial_state=initial_state,
            message=f"模拟创建成功，共 {simulator.n_atoms} 个原子"
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"创建模拟失败: {str(e)}")


@router.post("/{simulation_id}/step", response_model=StepSimulationResponse)
def step_simulation(
    simulation_id: str,
    steps: int = 1,
    save_interval: int = 1
):
    if simulation_id not in simulations:
        raise HTTPException(status_code=404, detail="模拟不存在")
    
    simulator = simulations[simulation_id]
    
    try:
        state = simulator.step(n_steps=steps, save_interval=save_interval)
        return StepSimulationResponse(
            simulation_id=simulation_id,
            state=SimulationStateResponse(**state.to_dict())
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"模拟步进失败: {str(e)}")


@router.get("/{simulation_id}/state", response_model=SimulationStateResponse)
def get_simulation_state(simulation_id: str):
    if simulation_id not in simulations:
        raise HTTPException(status_code=404, detail="模拟不存在")
    
    simulator = simulations[simulation_id]
    return SimulationStateResponse(**simulator.get_state().to_dict())


@router.get("/{simulation_id}/info", response_model=SystemInfo)
def get_simulation_info(simulation_id: str):
    if simulation_id not in simulations:
        raise HTTPException(status_code=404, detail="模拟不存在")
    
    simulator = simulations[simulation_id]
    return SystemInfo(**simulator.get_system_info())


@router.post("/{simulation_id}/scale-temperature")
def scale_temperature(simulation_id: str, request: TemperatureScaleRequest):
    if simulation_id not in simulations:
        raise HTTPException(status_code=404, detail="模拟不存在")
    
    simulator = simulations[simulation_id]
    
    try:
        simulator.scale_velocities(request.target_temperature)
        return {
            "success": True,
            "message": f"温度已缩放至 {request.target_temperature}",
            "current_temperature": simulator.temperature
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"温度缩放失败: {str(e)}")


@router.delete("/{simulation_id}")
def close_simulation(simulation_id: str):
    if simulation_id in simulations:
        del simulations[simulation_id]
        return {"success": True, "message": "模拟已关闭"}
    return {"success": True, "message": "模拟不存在"}


@router.post("/{simulation_id}/save", response_model=SaveSimulationResponse)
def save_simulation(
    simulation_id: str,
    request: SaveSimulationRequest,
    db: Session = Depends(get_db)
):
    if simulation_id not in simulations:
        raise HTTPException(status_code=404, detail="模拟不存在")
    
    simulator = simulations[simulation_id]
    system_info = simulator.get_system_info()
    
    try:
        record = SimulationRecord(
            name=request.name,
            n_atoms=system_info["n_atoms"],
            box_size=system_info["box_size"],
            density=system_info["density"],
            initial_temperature=system_info["initial_temperature"],
            timestep=system_info["timestep"],
            mass=system_info["mass"],
            epsilon=system_info["epsilon"],
            sigma=system_info["sigma"],
            cutoff=system_info["cutoff"],
            total_steps=simulator.step_count,
            total_time=simulator.time,
        )
        db.add(record)
        db.flush()
        
        trajectory = simulator.get_trajectory()
        for frame in trajectory:
            frame_data = SimulationFrame(
                simulation_id=record.id,
                frame_number=frame.step,
                time=frame.time,
                temperature=frame.temperature,
                pressure=frame.pressure,
                potential_energy=frame.potential_energy,
                kinetic_energy=frame.kinetic_energy,
                total_energy=frame.total_energy,
                positions=frame.positions.tolist(),
                velocities=frame.velocities.tolist() if frame.velocities is not None else None,
                forces=frame.forces.tolist() if frame.forces is not None else None,
            )
            db.add(frame_data)
        
        db.commit()
        
        return SaveSimulationResponse(
            id=record.id,
            message=f"模拟已保存，共 {len(trajectory)} 帧"
        )
        
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"保存模拟失败: {str(e)}")


@router.get("/")
def list_active_simulations():
    return {
        "active_simulations": [
            {
                "id": sim_id,
                "n_atoms": sim.n_atoms,
                "steps": sim.step_count,
            }
            for sim_id, sim in simulations.items()
        ]
    }
