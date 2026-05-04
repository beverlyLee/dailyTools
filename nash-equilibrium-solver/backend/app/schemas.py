from pydantic import BaseModel
from typing import List, Optional, Dict, Any


class PayoffMatrixRequest(BaseModel):
    player1_strategies: List[str]
    player2_strategies: List[str]
    payoff_matrix_player1: List[List[float]]
    payoff_matrix_player2: List[List[float]]


class PureStrategyEquilibrium(BaseModel):
    type: str = "pure"
    player1_strategy: str
    player2_strategy: str
    player1_payoff: float
    player2_payoff: float
    row_index: int
    col_index: int


class MixedStrategyEquilibrium(BaseModel):
    type: str = "mixed"
    player1_distribution: Dict[str, float]
    player2_distribution: Dict[str, float]
    player1_expected_payoff: float
    player2_expected_payoff: float
    player1_support: List[int]
    player2_support: List[int]


class NashEquilibriumResponse(BaseModel):
    pure_equilibria: List[PureStrategyEquilibrium] = []
    mixed_equilibria: List[MixedStrategyEquilibrium] = []
    has_pure_equilibrium: bool = False
    has_mixed_equilibrium: bool = False
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
