from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import GameHistory
from ..services.nash_equilibrium import (
    nash_solver,
    PureStrategyEquilibrium,
    MixedStrategyEquilibrium,
    NashEquilibriumResponse
)

router = APIRouter(prefix="/api", tags=["纳什均衡求解"])


class PayoffMatrixData(BaseModel):
    player1_strategies: List[str]
    player2_strategies: List[str]
    payoff_matrix_player1: List[List[float]]
    payoff_matrix_player2: List[List[float]]


class PureStrategyEquilibriumResponse(BaseModel):
    player1_strategy: str
    player2_strategy: str
    player1_payoff: float
    player2_payoff: float
    row_index: int
    col_index: int


class MixedStrategyEquilibriumResponse(BaseModel):
    player1_distribution: Dict[str, float]
    player2_distribution: Dict[str, float]
    player1_expected_payoff: float
    player2_expected_payoff: float
    player1_support: List[int]
    player2_support: List[int]


class NashEquilibriumResult(BaseModel):
    pure_equilibria: List[PureStrategyEquilibriumResponse]
    mixed_equilibria: List[MixedStrategyEquilibriumResponse]
    has_pure_equilibrium: bool
    has_mixed_equilibrium: bool
    message: str


@router.post("/solve", response_model=NashEquilibriumResult)
async def solve_nash_equilibrium(
    data: PayoffMatrixData,
    save_to_history: bool = False,
    db: Session = Depends(get_db)
):
    """
    Solve for Nash equilibria of a two-player game.
    
    Args:
        data: Game data including strategies and payoff matrices
        save_to_history: Whether to save this game to history
        db: Database session
    
    Returns:
        Nash equilibrium result with pure and mixed strategy equilibria
    """
    num_rows = len(data.player1_strategies)
    num_cols = len(data.player2_strategies)
    
    if num_rows != len(data.payoff_matrix_player1):
        raise HTTPException(
            status_code=400,
            detail="玩家1策略数量与收益矩阵行数不匹配"
        )
    
    if num_cols != len(data.payoff_matrix_player1[0]) if data.payoff_matrix_player1 else 0:
        raise HTTPException(
            status_code=400,
            detail="玩家2策略数量与收益矩阵列数不匹配"
        )
    
    result = nash_solver.solve(
        payoff_matrix_player1=data.payoff_matrix_player1,
        payoff_matrix_player2=data.payoff_matrix_player2,
        player1_strategies=data.player1_strategies,
        player2_strategies=data.player2_strategies
    )
    
    if save_to_history:
        history = GameHistory(
            player1_strategies=data.player1_strategies,
            player2_strategies=data.player2_strategies,
            payoff_matrix_player1=data.payoff_matrix_player1,
            payoff_matrix_player2=data.payoff_matrix_player2,
            pure_equilibria=[
                {
                    "player1_strategy": pe.player1_strategy,
                    "player2_strategy": pe.player2_strategy,
                    "player1_payoff": pe.player1_payoff,
                    "player2_payoff": pe.player2_payoff,
                    "row_index": pe.row_index,
                    "col_index": pe.col_index,
                }
                for pe in result.pure_equilibria
            ],
            mixed_equilibria=[
                {
                    "player1_distribution": me.player1_distribution,
                    "player2_distribution": me.player2_distribution,
                    "player1_expected_payoff": me.player1_expected_payoff,
                    "player2_expected_payoff": me.player2_expected_payoff,
                }
                for me in result.mixed_equilibria
            ],
        )
        db.add(history)
        db.commit()
    
    return NashEquilibriumResult(
        pure_equilibria=[
            PureStrategyEquilibriumResponse(
                player1_strategy=pe.player1_strategy,
                player2_strategy=pe.player2_strategy,
                player1_payoff=pe.player1_payoff,
                player2_payoff=pe.player2_payoff,
                row_index=pe.row_index,
                col_index=pe.col_index,
            )
            for pe in result.pure_equilibria
        ],
        mixed_equilibria=[
            MixedStrategyEquilibriumResponse(
                player1_distribution=me.player1_distribution,
                player2_distribution=me.player2_distribution,
                player1_expected_payoff=me.player1_expected_payoff,
                player2_expected_payoff=me.player2_expected_payoff,
                player1_support=me.player1_support,
                player2_support=me.player2_support,
            )
            for me in result.mixed_equilibria
        ],
        has_pure_equilibrium=result.has_pure_equilibrium,
        has_mixed_equilibrium=result.has_mixed_equilibrium,
        message=result.message,
    )


@router.get("/history")
async def get_game_history(
    limit: int = 20,
    db: Session = Depends(get_db)
):
    """Get recent game history."""
    from sqlalchemy import desc
    
    history = db.query(GameHistory).order_by(
        desc(GameHistory.created_at)
    ).limit(limit).all()
    
    return {
        "history": [
            {
                "id": h.id,
                "player1_strategies": h.player1_strategies,
                "player2_strategies": h.player2_strategies,
                "has_pure_equilibrium": len(h.pure_equilibria) > 0,
                "has_mixed_equilibrium": len(h.mixed_equilibria) > 0,
                "created_at": h.created_at.isoformat() if h.created_at else None,
            }
            for h in history
        ]
    }
