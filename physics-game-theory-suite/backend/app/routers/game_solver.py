from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from typing import Optional

from app.schemas import (
    PayoffMatrixRequest,
    NashEquilibriumResponse,
)
from app.database import get_db
from app.models import GameHistory
from app.game_solver import solver

router = APIRouter(prefix="/game-solver", tags=["Game Theory Solver"])


@router.post("/solve", response_model=NashEquilibriumResponse)
def solve_nash_equilibrium(
    request: PayoffMatrixRequest,
    save_history: bool = True,
    db: Session = Depends(get_db)
):
    try:
        num_rows = len(request.payoff_matrix_player1)
        num_cols = len(request.payoff_matrix_player1[0]) if num_rows > 0 else 0

        if num_rows != len(request.player1_strategies):
            raise HTTPException(
                status_code=400,
                detail=f"玩家1策略数量 ({len(request.player1_strategies)}) 与矩阵行数 ({num_rows}) 不匹配"
            )

        if num_cols != len(request.player2_strategies):
            raise HTTPException(
                status_code=400,
                detail=f"玩家2策略数量 ({len(request.player2_strategies)}) 与矩阵列数 ({num_cols}) 不匹配"
            )

        for i, row in enumerate(request.payoff_matrix_player1):
            if len(row) != num_cols:
                raise HTTPException(
                    status_code=400,
                    detail=f"玩家1收益矩阵第 {i+1} 行列数不一致"
                )

        for i, row in enumerate(request.payoff_matrix_player2):
            if len(row) != num_cols:
                raise HTTPException(
                    status_code=400,
                    detail=f"玩家2收益矩阵第 {i+1} 行列数不一致"
                )

        result = solver.solve(
            request.payoff_matrix_player1,
            request.payoff_matrix_player2,
            request.player1_strategies,
            request.player2_strategies
        )
        
        if save_history:
            try:
                history = GameHistory(
                    player1_strategies=request.player1_strategies,
                    player2_strategies=request.player2_strategies,
                    payoff_matrix_player1=request.payoff_matrix_player1,
                    payoff_matrix_player2=request.payoff_matrix_player2,
                    pure_equilibria=[eq.model_dump() for eq in result.pure_equilibria] if result.pure_equilibria else None,
                    mixed_equilibria=[eq.model_dump() for eq in result.mixed_equilibria] if result.mixed_equilibria else None,
                )
                db.add(history)
                db.commit()
            except Exception as e:
                print(f"Failed to save history: {e}")

        return result

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"求解纳什均衡时出错: {str(e)}"
        )


@router.get("/history")
def get_game_history(limit: int = 20, offset: int = 0, db: Session = Depends(get_db)):
    history = db.query(GameHistory).order_by(
        GameHistory.created_at.desc()
    ).offset(offset).limit(limit).all()
    
    return {
        "total": db.query(GameHistory).count(),
        "history": [
            {
                "id": h.id,
                "created_at": h.created_at.isoformat() if h.created_at else None,
                "player1_strategies": h.player1_strategies,
                "player2_strategies": h.player2_strategies,
                "has_pure_equilibrium": h.pure_equilibria is not None and len(h.pure_equilibria) > 0,
                "has_mixed_equilibrium": h.mixed_equilibria is not None and len(h.mixed_equilibria) > 0,
            }
            for h in history
        ]
    }


@router.delete("/history/{history_id}")
def delete_game_history(history_id: int, db: Session = Depends(get_db)):
    history = db.query(GameHistory).filter(GameHistory.id == history_id).first()
    if not history:
        raise HTTPException(status_code=404, detail="历史记录不存在")
    
    db.delete(history)
    db.commit()
    
    return {"success": True, "message": "历史记录已删除"}
