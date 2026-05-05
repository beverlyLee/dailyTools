"""
数据库模型定义
"""

from sqlalchemy import Column, Integer, String, Float, DateTime, Text, ForeignKey, JSON
from sqlalchemy.orm import relationship
from datetime import datetime
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.db.database import Base


class MDSimulation(Base):
    """分子动力学模拟记录"""
    __tablename__ = "md_simulations"

    id = Column(Integer, primary_key=True, index=True)
    simulation_id = Column(String(64), unique=True, index=True, nullable=False)
    
    # 模拟配置
    lattice_type = Column(String(20), nullable=False)
    unit_cells = Column(Integer, default=3)
    atom_type = Column(String(20), default="Ar")
    temperature = Column(Float, default=300.0)
    timestep = Column(Float, default=1.0)
    total_steps = Column(Integer, default=1000)
    record_interval = Column(Integer, default=10)
    
    # 模拟状态
    status = Column(String(20), default="initialized")  # initialized, running, completed, error
    current_step = Column(Integer, default=0)
    
    # 结果统计
    final_temperature = Column(Float, nullable=True)
    final_pressure = Column(Float, nullable=True)
    final_potential_energy = Column(Float, nullable=True)
    final_kinetic_energy = Column(Float, nullable=True)
    final_total_energy = Column(Float, nullable=True)
    
    # 能量守恒验证
    energy_mean = Column(Float, nullable=True)
    energy_fluctuation = Column(Float, nullable=True)
    
    # 时间戳
    created_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)
    
    # 关系
    trajectory_frames = relationship("TrajectoryFrame", back_populates="simulation")
    stats_records = relationship("StatsRecord", back_populates="simulation")


class TrajectoryFrame(Base):
    """轨迹帧数据（原子位置、速度等）"""
    __tablename__ = "trajectory_frames"

    id = Column(Integer, primary_key=True, index=True)
    simulation_id = Column(Integer, ForeignKey("md_simulations.id"))
    
    frame_step = Column(Integer, nullable=False)
    frame_index = Column(Integer, nullable=False)
    
    # 原子数据（JSON 格式存储）
    # 格式: [{"index": 0, "type": "Ar", "x": 0.0, "y": 0.0, "z": 0.0, ...}, ...]
    atoms_data = Column(JSON, nullable=False)
    
    # 盒子信息
    box_length = Column(Float, nullable=False)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # 关系
    simulation = relationship("MDSimulation", back_populates="trajectory_frames")


class StatsRecord(Base):
    """模拟统计记录"""
    __tablename__ = "stats_records"

    id = Column(Integer, primary_key=True, index=True)
    simulation_id = Column(Integer, ForeignKey("md_simulations.id"))
    
    step = Column(Integer, nullable=False)
    temperature = Column(Float, nullable=False)
    pressure = Column(Float, nullable=False)
    potential_energy = Column(Float, nullable=False)
    kinetic_energy = Column(Float, nullable=False)
    total_energy = Column(Float, nullable=False)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # 关系
    simulation = relationship("MDSimulation", back_populates="stats_records")


class GameRecord(Base):
    """博弈记录"""
    __tablename__ = "game_records"

    id = Column(Integer, primary_key=True, index=True)
    game_id = Column(String(64), unique=True, index=True, nullable=False)
    
    name = Column(String(200), default="未命名博弈")
    description = Column(Text, nullable=True)
    
    # 策略定义
    player1_strategies = Column(JSON, nullable=False)  # ["策略1", "策略2", ...]
    player2_strategies = Column(JSON, nullable=False)
    
    # 收益矩阵
    # 格式: [[{"player1": a, "player2": b}, ...], ...]
    payoff_matrix = Column(JSON, nullable=False)
    
    # 求解结果
    result = Column(JSON, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class GameTemplate(Base):
    """经典博弈模板（可选，用于快速加载）"""
    __tablename__ = "game_templates"

    id = Column(Integer, primary_key=True, index=True)
    template_key = Column(String(50), unique=True, index=True, nullable=False)
    
    name = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)
    
    player1_strategies = Column(JSON, nullable=False)
    player2_strategies = Column(JSON, nullable=False)
    payoff_matrix = Column(JSON, nullable=False)
    
    is_active = Column(Integer, default=1)
    created_at = Column(DateTime, default=datetime.utcnow)
