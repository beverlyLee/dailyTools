import nashpy as nash
import numpy as np
from typing import List, Tuple, Dict, Any
from itertools import combinations
from app.schemas import (
    PureStrategyEquilibrium,
    MixedStrategyEquilibrium,
    NashEquilibriumResponse
)


class NashEquilibriumSolver:
    def __init__(self):
        pass

    def solve(
        self,
        payoff_matrix_player1: List[List[float]],
        payoff_matrix_player2: List[List[float]],
        player1_strategies: List[str],
        player2_strategies: List[str]
    ) -> NashEquilibriumResponse:
        A = np.array(payoff_matrix_player1)
        B = np.array(payoff_matrix_player2)

        game = nash.Game(A, B)

        pure_equilibria = self._find_pure_strategy_equilibria(
            A, B, player1_strategies, player2_strategies
        )

        mixed_equilibria = self._find_mixed_strategy_equilibria(
            game, A, B, player1_strategies, player2_strategies
        )

        response = NashEquilibriumResponse(
            pure_equilibria=pure_equilibria,
            mixed_equilibria=mixed_equilibria,
            has_pure_equilibrium=len(pure_equilibria) > 0,
            has_mixed_equilibrium=len(mixed_equilibria) > 0
        )

        if not response.has_pure_equilibrium and not response.has_mixed_equilibrium:
            response.message = "未找到纳什均衡"
        else:
            response.message = f"找到 {len(pure_equilibria)} 个纯策略均衡, {len(mixed_equilibria)} 个混合策略均衡"

        return response

    def _find_pure_strategy_equilibria(
        self,
        A: np.ndarray,
        B: np.ndarray,
        player1_strategies: List[str],
        player2_strategies: List[str]
    ) -> List[PureStrategyEquilibrium]:
        pure_equilibria = []
        num_rows, num_cols = A.shape

        for i in range(num_rows):
            for j in range(num_cols):
                is_best_response_p1 = all(A[i, j] >= A[k, j] for k in range(num_rows))
                is_best_response_p2 = all(B[i, j] >= B[i, l] for l in range(num_cols))

                if is_best_response_p1 and is_best_response_p2:
                    pure_equilibria.append(
                        PureStrategyEquilibrium(
                            player1_strategy=player1_strategies[i],
                            player2_strategy=player2_strategies[j],
                            player1_payoff=float(A[i, j]),
                            player2_payoff=float(B[i, j]),
                            row_index=i,
                            col_index=j
                        )
                    )

        return pure_equilibria

    def _find_mixed_strategy_equilibria(
        self,
        game: nash.Game,
        A: np.ndarray,
        B: np.ndarray,
        player1_strategies: List[str],
        player2_strategies: List[str]
    ) -> List[MixedStrategyEquilibrium]:
        mixed_equilibria = []
        seen_equilibria = set()

        try:
            equilibria = list(game.support_enumeration())

            for eq in equilibria:
                p1_dist, p2_dist = eq

                is_pure_p1 = all(x == 1 or x == 0 for x in p1_dist)
                is_pure_p2 = all(x == 1 or x == 0 for x in p2_dist)

                if is_pure_p1 and is_pure_p2:
                    continue

                eq_key = (
                    tuple(round(x, 6) for x in p1_dist),
                    tuple(round(x, 6) for x in p2_dist)
                )
                if eq_key in seen_equilibria:
                    continue
                seen_equilibria.add(eq_key)

                p1_dist_dict = {
                    player1_strategies[i]: float(p1_dist[i])
                    for i in range(len(p1_dist))
                    if p1_dist[i] > 1e-10
                }
                p2_dist_dict = {
                    player2_strategies[i]: float(p2_dist[i])
                    for i in range(len(p2_dist))
                    if p2_dist[i] > 1e-10
                }

                p1_support = [i for i, x in enumerate(p1_dist) if x > 1e-10]
                p2_support = [i for i, x in enumerate(p2_dist) if x > 1e-10]

                expected_p1 = float(np.dot(np.dot(p1_dist, A), p2_dist))
                expected_p2 = float(np.dot(np.dot(p1_dist, B), p2_dist))

                mixed_equilibria.append(
                    MixedStrategyEquilibrium(
                        player1_distribution=p1_dist_dict,
                        player2_distribution=p2_dist_dict,
                        player1_expected_payoff=expected_p1,
                        player2_expected_payoff=expected_p2,
                        player1_support=p1_support,
                        player2_support=p2_support
                    )
                )

        except Exception as e:
            print(f"Error in support enumeration: {e}")

        return mixed_equilibria


solver = NashEquilibriumSolver()
