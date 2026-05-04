from fastapi import APIRouter, HTTPException
from app.schemas import (
    PayoffMatrixRequest,
    NashEquilibriumResponse
)
from app.services.nash_equilibrium import solver

router = APIRouter(prefix="/solver", tags=["Nash Equilibrium Solver"])


@router.post("/solve", response_model=NashEquilibriumResponse)
def solve_nash_equilibrium(request: PayoffMatrixRequest):
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

        return result

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"求解纳什均衡时出错: {str(e)}"
        )
