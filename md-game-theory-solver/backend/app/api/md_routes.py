"""
分子动力学模拟 API 路由
"""

import sys
import os
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, BackgroundTasks
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session
from datetime import datetime
import uuid

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.db.database import get_db
from app.models.models import MDSimulation, TrajectoryFrame, StatsRecord
from app.core.md_simulator import simulation_manager, MDSimulator


router = APIRouter(prefix="/md", tags=["分子动力学模拟"])


class SimulationConfig(BaseModel):
    """模拟配置"""
    lattice_type: str = "FCC"
    unit_cells: int = 3
    atom_type: str = "Ar"
    temperature: float = 300.0
    timestep: float = 1.0
    steps: int = 1000
    record_interval: int = 10


def run_simulation_background(sim_id: str, config: SimulationConfig, db: Session):
    """后台运行模拟任务"""
    try:
        simulator = simulation_manager.get_simulation(sim_id)
        if not simulator:
            return
        
        # 运行模拟
        result = simulator.run(config.steps, config.record_interval)
        
        # 更新数据库记录
        db_sim = db.query(MDSimulation).filter(MDSimulation.simulation_id == sim_id).first()
        if db_sim:
            db_sim.status = "completed"
            db_sim.current_step = result["end_step"]
            db_sim.final_temperature = result["final_temperature"]
            db_sim.final_pressure = result["final_pressure"]
            db_sim.final_potential_energy = result["final_potential_energy"]
            db_sim.final_kinetic_energy = result["final_kinetic_energy"]
            db_sim.final_total_energy = result["final_total_energy"]
            db_sim.energy_mean = result["energy_conservation_check"]["mean_total_energy"]
            db_sim.energy_fluctuation = result["energy_conservation_check"]["relative_fluctuation"]
            db_sim.completed_at = datetime.utcnow()
            db.commit()
            
            # 保存轨迹数据
            for frame_idx, frame in enumerate(simulator.trajectory_frames):
                frame_record = TrajectoryFrame(
                    simulation_id=db_sim.id,
                    frame_step=frame["step"],
                    frame_index=frame_idx,
                    atoms_data=frame["atoms"],
                    box_length=frame["box_length"],
                )
                db.add(frame_record)
            
            # 保存统计数据
            for stats in simulator.stats_history:
                stats_record = StatsRecord(
                    simulation_id=db_sim.id,
                    step=stats["step"],
                    temperature=stats["temperature"],
                    pressure=stats["pressure"],
                    potential_energy=stats["potential_energy"],
                    kinetic_energy=stats["kinetic_energy"],
                    total_energy=stats["total_energy"],
                )
                db.add(stats_record)
            
            db.commit()
            
    except Exception as e:
        print(f"Simulation error: {e}")
        db_sim = db.query(MDSimulation).filter(MDSimulation.simulation_id == sim_id).first()
        if db_sim:
            db_sim.status = "error"
            db.commit()


@router.post("/simulate")
async def start_simulation(
    config: SimulationConfig,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    """
    启动新的分子动力学模拟
    
    创建模拟实例，记录到数据库，并在后台运行模拟
    """
    try:
        # 创建模拟实例
        sim_id = simulation_manager.create_simulation({
            "lattice_type": config.lattice_type,
            "unit_cells": config.unit_cells,
            "atom_type": config.atom_type,
            "temperature": config.temperature,
            "timestep": config.timestep,
        })
        
        # 记录到数据库
        db_sim = MDSimulation(
            simulation_id=sim_id,
            lattice_type=config.lattice_type,
            unit_cells=config.unit_cells,
            atom_type=config.atom_type,
            temperature=config.temperature,
            timestep=config.timestep,
            total_steps=config.steps,
            record_interval=config.record_interval,
            status="running",
            current_step=0,
        )
        db.add(db_sim)
        db.commit()
        db.refresh(db_sim)
        
        # 后台运行模拟
        background_tasks.add_task(run_simulation_background, sim_id, config, db)
        
        return JSONResponse(
            content={
                "success": True,
                "simulation_id": sim_id,
                "message": "模拟已启动，后台运行中",
                "n_atoms": simulation_manager.get_simulation(sim_id).n_atoms,
                "box_length": simulation_manager.get_simulation(sim_id).box_length,
            }
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"启动模拟失败: {str(e)}")


@router.get("/simulation/{sim_id}/status")
async def get_simulation_status(
    sim_id: str,
    db: Session = Depends(get_db),
):
    """获取模拟状态"""
    # 首先检查内存中的模拟（运行中）
    sim = simulation_manager.get_simulation(sim_id)
    if sim:
        config = simulation_manager.simulation_configs.get(sim_id, {})
        return JSONResponse(
            content={
                "success": True,
                "simulation_id": sim_id,
                "status": config.get("status", "running"),
                "current_step": sim.current_step,
                "total_steps": config.get("steps", 0),
                "n_atoms": sim.n_atoms,
                "box_length": sim.box_length,
            }
        )
    
    # 检查数据库中的模拟（已完成）
    db_sim = db.query(MDSimulation).filter(MDSimulation.simulation_id == sim_id).first()
    if db_sim:
        return JSONResponse(
            content={
                "success": True,
                "simulation_id": sim_id,
                "status": db_sim.status,
                "current_step": db_sim.current_step,
                "total_steps": db_sim.total_steps,
                "n_atoms": 0,
                "box_length": 0,
            }
        )
    
    raise HTTPException(status_code=404, detail="模拟不存在")


@router.get("/simulation/{sim_id}/stats")
async def get_simulation_stats(
    sim_id: str,
    db: Session = Depends(get_db),
):
    """获取模拟统计数据"""
    # 检查内存中的模拟
    sim = simulation_manager.get_simulation(sim_id)
    if sim and sim.stats_history:
        stats = sim.get_current_stats()
        return JSONResponse(
            content={
                "success": True,
                "current_step": stats["step"],
                "temperature": stats["temperature"],
                "pressure": stats["pressure"],
                "potential_energy": stats["potential_energy"],
                "kinetic_energy": stats["kinetic_energy"],
                "total_energy": stats["total_energy"],
            }
        )
    
    # 检查数据库
    db_sim = db.query(MDSimulation).filter(MDSimulation.simulation_id == sim_id).first()
    if db_sim:
        return JSONResponse(
            content={
                "success": True,
                "current_step": db_sim.current_step,
                "temperature": db_sim.final_temperature or 0,
                "pressure": db_sim.final_pressure or 0,
                "potential_energy": db_sim.final_potential_energy or 0,
                "kinetic_energy": db_sim.final_kinetic_energy or 0,
                "total_energy": db_sim.final_total_energy or 0,
                "energy_conservation": {
                    "mean": db_sim.energy_mean,
                    "fluctuation": db_sim.energy_fluctuation,
                },
            }
        )
    
    raise HTTPException(status_code=404, detail="模拟不存在")


@router.get("/simulation/{sim_id}/trajectory")
async def get_trajectory(
    sim_id: str,
    frame_start: Optional[int] = Query(0, ge=0),
    frame_end: Optional[int] = Query(-1),
    db: Session = Depends(get_db),
):
    """
    获取轨迹数据
    
    Args:
        sim_id: 模拟ID
        frame_start: 起始帧索引
        frame_end: 结束帧索引（-1表示最后一帧）
    """
    # 检查内存中的模拟
    sim = simulation_manager.get_simulation(sim_id)
    if sim and sim.trajectory_frames:
        frames = sim.get_trajectory_data(frame_start, frame_end)
        return JSONResponse(
            content={
                "success": True,
                "simulation_id": sim_id,
                "n_frames": len(frames),
                "frames": frames,
            }
        )
    
    # 检查数据库
    db_sim = db.query(MDSimulation).filter(MDSimulation.simulation_id == sim_id).first()
    if db_sim:
        query = db.query(TrajectoryFrame).filter(
            TrajectoryFrame.simulation_id == db_sim.id
        ).order_by(TrajectoryFrame.frame_index)
        
        if frame_end >= 0:
            query = query.filter(TrajectoryFrame.frame_index >= frame_start).filter(
                TrajectoryFrame.frame_index <= frame_end
            )
        elif frame_start > 0:
            query = query.filter(TrajectoryFrame.frame_index >= frame_start)
        
        frames = query.all()
        
        result_frames = []
        for f in frames:
            result_frames.append({
                "step": f.frame_step,
                "box_length": f.box_length,
                "atoms": f.atoms_data,
            })
        
        return JSONResponse(
            content={
                "success": True,
                "simulation_id": sim_id,
                "n_frames": len(result_frames),
                "frames": result_frames,
            }
        )
    
    raise HTTPException(status_code=404, detail="模拟不存在")


@router.get("/simulations")
async def list_simulations(
    db: Session = Depends(get_db),
    limit: int = Query(50, ge=1, le=200),
):
    """获取所有模拟列表"""
    simulations = db.query(MDSimulation).order_by(
        MDSimulation.created_at.desc()
    ).limit(limit).all()
    
    result = []
    for sim in simulations:
        result.append({
            "simulation_id": sim.simulation_id,
            "lattice_type": sim.lattice_type,
            "atom_type": sim.atom_type,
            "n_atoms": sim.unit_cells,  # 近似
            "status": sim.status,
            "current_step": sim.current_step,
            "total_steps": sim.total_steps,
            "created_at": sim.created_at.isoformat() if sim.created_at else None,
            "completed_at": sim.completed_at.isoformat() if sim.completed_at else None,
        })
    
    return JSONResponse(
        content={
            "success": True,
            "simulations": result,
            "count": len(result),
        }
    )


@router.get("/simulation/{sim_id}/energy-validation")
async def get_energy_validation(
    sim_id: str,
    db: Session = Depends(get_db),
):
    """获取能量守恒验证数据"""
    db_sim = db.query(MDSimulation).filter(MDSimulation.simulation_id == sim_id).first()
    if not db_sim:
        raise HTTPException(status_code=404, detail="模拟不存在")
    
    # 获取统计记录
    stats = db.query(StatsRecord).filter(
        StatsRecord.simulation_id == db_sim.id
    ).order_by(StatsRecord.step).all()
    
    energy_data = []
    for s in stats:
        energy_data.append({
            "step": s.step,
            "potential_energy": s.potential_energy,
            "kinetic_energy": s.kinetic_energy,
            "total_energy": s.total_energy,
            "temperature": s.temperature,
        })
    
    # 检查内存中的模拟
    mem_sim = simulation_manager.get_simulation(sim_id)
    if mem_sim:
        # 合并数据
        seen_steps = {d["step"] for d in energy_data}
        for s in mem_sim.stats_history:
            if s["step"] not in seen_steps:
                energy_data.append({
                    "step": s["step"],
                    "potential_energy": s["potential_energy"],
                    "kinetic_energy": s["kinetic_energy"],
                    "total_energy": s["total_energy"],
                    "temperature": s["temperature"],
                })
        energy_data.sort(key=lambda x: x["step"])
    
    return JSONResponse(
        content={
            "success": True,
            "simulation_id": sim_id,
            "energy_conservation": {
                "mean_total_energy": db_sim.energy_mean,
                "relative_fluctuation": db_sim.energy_fluctuation,
                "is_conserved": db_sim.energy_fluctuation < 0.01 if db_sim.energy_fluctuation else None,
            },
            "energy_data": energy_data,
        }
    )
