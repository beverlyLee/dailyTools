from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any, Union
from enum import Enum


class SolverMethod(str, Enum):
    euler = "euler"
    rk4 = "rk4"
    rk45 = "rk45"


class SolveODERequest(BaseModel):
    equation_key: Optional[str] = Field(None, description="经典方程的键名，如 'lorenz', 'predator_prey'")
    custom_equation: Optional[str] = Field(None, description="自定义方程表达式（保留字段，暂未实现）")
    
    initial_conditions: List[float] = Field(..., description="初始条件列表")
    parameters: Dict[str, float] = Field(default_factory=dict, description="方程参数字典")
    solver_method: SolverMethod = Field(default=SolverMethod.rk4, description="数值求解方法")
    
    t_start: float = Field(default=0.0, description="起始时间")
    t_end: float = Field(default=50.0, description="结束时间")
    num_points: int = Field(default=1000, ge=100, le=10000, description="时间步数")


class SolveODEResponse(BaseModel):
    success: bool = True
    message: str = "求解成功"
    data: Dict[str, Any]


class PoincareSectionRequest(BaseModel):
    equation_key: str
    initial_conditions: List[float]
    parameters: Dict[str, float] = Field(default_factory=dict)
    solver_method: SolverMethod = Field(default=SolverMethod.rk4)
    
    t_start: float = Field(default=0.0)
    t_end: float = Field(default=100.0)
    num_points: int = Field(default=5000, ge=1000, le=20000)
    
    plane_dimension: int = Field(default=0, description="庞加莱截面所在的维度索引")
    plane_value: float = Field(default=0.0, description="截面平面的阈值")
    direction: int = Field(default=1, description="穿越方向: 1=正方向, -1=负方向, 0=双向")


class PoincareSectionResponse(BaseModel):
    success: bool = True
    message: str = "庞加莱截面计算成功"
    data: Dict[str, Any]


class ParameterScanRequest(BaseModel):
    equation_key: str
    initial_conditions: List[float]
    parameters: Dict[str, float] = Field(default_factory=dict)
    
    scan_parameter: str = Field(..., description="要扫描的参数名称")
    param_start: float = Field(..., description="参数起始值")
    param_end: float = Field(..., description="参数结束值")
    param_steps: int = Field(default=20, ge=2, le=100, description="扫描点数")
    
    solver_method: SolverMethod = Field(default=SolverMethod.rk4)
    t_start: float = Field(default=0.0)
    t_end: float = Field(default=50.0)
    num_points: int = Field(default=1000)
    
    save_to_db: bool = Field(default=True, description="是否保存到数据库")


class ParameterScanResponse(BaseModel):
    success: bool = True
    message: str = "参数扫描完成"
    data: Dict[str, Any]


class ClassicExampleInfo(BaseModel):
    key: str
    name: str
    description: str
    dimension: int
    variables: List[str]
    default_initial: List[float]
    default_params: Dict[str, float]
    param_ranges: Dict[str, List[float]]
    t_span: List[float]


class ClassicExamplesResponse(BaseModel):
    success: bool = True
    data: List[ClassicExampleInfo]


class ScanRecordResponse(BaseModel):
    id: int
    equation_name: str
    parameter_name: str
    parameter_start: float
    parameter_end: float
    parameter_steps: int
    created_at: str


class ScanRecordsListResponse(BaseModel):
    success: bool = True
    data: List[ScanRecordResponse]
