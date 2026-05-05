from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional
from datetime import datetime


class SimulationConfig(BaseModel):
    lattice_type: str = Field(default="fcc", description="晶格类型: fcc, sc, bcc")
    n_unit_cells: int = Field(default=5, ge=1, le=10, description="单位晶胞数量")
    density: float = Field(default=0.8, gt=0, description="数密度")
    temperature: float = Field(default=1.0, ge=0, description="初始温度")
    timestep: float = Field(default=0.001, gt=0, description="时间步长")
    mass: Optional[float] = Field(default=1.0, gt=0, description="原子质量")
    epsilon: Optional[float] = Field(default=1.0, gt=0, description="LJ势深度参数")
    sigma: Optional[float] = Field(default=1.0, gt=0, description="LJ势长度参数")
    cutoff: Optional[float] = Field(default=2.5, gt=0, description="截断半径")
    seed: Optional[int] = Field(default=None, description="随机种子")
    atom_type: Optional[str] = Field(default=None, description="原子类型: argon, helium, neon, krypton")


class SimulationStateResponse(BaseModel):
    step: int
    time: float
    positions: List[List[float]]
    velocities: Optional[List[List[float]]] = None
    forces: Optional[List[List[float]]] = None
    temperature: float
    pressure: float
    potential_energy: float
    kinetic_energy: float
    total_energy: float


class SystemInfo(BaseModel):
    n_atoms: int
    box_size: float
    density: float
    initial_temperature: float
    timestep: float
    mass: float
    epsilon: float
    sigma: float
    cutoff: float
    n_unit_cells: int
    lattice_type: str
    atom_type: Optional[str] = None


class CreateSimulationResponse(BaseModel):
    simulation_id: str
    system_info: SystemInfo
    initial_state: SimulationStateResponse
    message: str = "模拟创建成功"


class StepSimulationResponse(BaseModel):
    simulation_id: str
    state: SimulationStateResponse


class TemperatureScaleRequest(BaseModel):
    target_temperature: float = Field(gt=0, description="目标温度")


class SavedSimulationList(BaseModel):
    simulations: List[Dict[str, Any]]


class FrameInfo(BaseModel):
    frame_number: int
    time: float
    temperature: float
    pressure: float
    potential_energy: float
    kinetic_energy: float
    total_energy: float


class SavedFramesResponse(BaseModel):
    box_size: float
    num_atoms: int
    frames: List[FrameInfo]


class SaveSimulationRequest(BaseModel):
    name: Optional[str] = Field(default=None, description="模拟名称")


class SaveSimulationResponse(BaseModel):
    id: int
    message: str


class PayoffMatrixRequest(BaseModel):
    player1_strategies: List[str]
    player2_strategies: List[str]
    payoff_matrix_player1: List[List[float]]
    payoff_matrix_player2: List[List[float]]


class PureStrategyEquilibrium(BaseModel):
    player1_strategy: str
    player2_strategy: str
    player1_payoff: float
    player2_payoff: float
    row_index: int
    col_index: int


class MixedStrategyEquilibrium(BaseModel):
    player1_distribution: Dict[str, float]
    player2_distribution: Dict[str, float]
    player1_expected_payoff: float
    player2_expected_payoff: float
    player1_support: List[int]
    player2_support: List[int]


class NashEquilibriumResponse(BaseModel):
    pure_equilibria: List[PureStrategyEquilibrium]
    mixed_equilibria: List[MixedStrategyEquilibrium]
    has_pure_equilibrium: bool
    has_mixed_equilibrium: bool
    message: str = ""


class GameExampleResponse(BaseModel):
    id: int
    name: str
    description: Optional[str]
    player1_strategies: List[str]
    player2_strategies: List[str]
    payoff_matrix_player1: List[List[float]]
    payoff_matrix_player2: List[List[float]]
    category: Optional[str]

    class Config:
        from_attributes = True


class GameExampleListResponse(BaseModel):
    examples: List[GameExampleResponse]


class HealthResponse(BaseModel):
    status: str
    version: str
    components: Dict[str, bool]
