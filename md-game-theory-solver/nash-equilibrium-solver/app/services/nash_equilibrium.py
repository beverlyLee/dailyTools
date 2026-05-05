import numpy as np
from typing import List, Tuple, Dict, Any, Optional
from dataclasses import dataclass
from itertools import combinations

try:
    import nashpy as nash
    NASHPY_AVAILABLE = True
except ImportError:
    NASHPY_AVAILABLE = False


@dataclass
class PureStrategyEquilibrium:
    player1_strategy: str
    player2_strategy: str
    player1_payoff: float
    player2_payoff: float
    row_index: int
    col_index: int


@dataclass
class MixedStrategyEquilibrium:
    player1_distribution: Dict[str, float]
    player2_distribution: Dict[str, float]
    player1_expected_payoff: float
    player2_expected_payoff: float
    player1_support: List[int]
    player2_support: List[int]


@dataclass
class NashEquilibriumResponse:
    pure_equilibria: List[PureStrategyEquilibrium]
    mixed_equilibria: List[MixedStrategyEquilibrium]
    has_pure_equilibrium: bool
    has_mixed_equilibrium: bool
    message: str


class NashEquilibriumSolver:
    """
    Nash Equilibrium Solver for two-player games.
    
    This solver finds both:
    1. Pure strategy Nash equilibria (best response analysis)
    2. Mixed strategy Nash equilibria (Support Enumeration algorithm)
    """
    
    def __init__(self):
        pass
    
    def solve(
        self,
        payoff_matrix_player1: List[List[float]],
        payoff_matrix_player2: List[List[float]],
        player1_strategies: List[str],
        player2_strategies: List[str]
    ) -> NashEquilibriumResponse:
        """
        Solve for Nash equilibria of a two-player game.
        
        Args:
            payoff_matrix_player1: Payoff matrix for player 1 (rows x cols)
            payoff_matrix_player2: Payoff matrix for player 2 (rows x cols)
            player1_strategies: Names of player 1's strategies
            player2_strategies: Names of player 2's strategies
        
        Returns:
            NashEquilibriumResponse containing all equilibria found
        """
        A = np.array(payoff_matrix_player1, dtype=float)
        B = np.array(payoff_matrix_player2, dtype=float)
        
        pure_equilibria = self._find_pure_strategy_equilibria(
            A, B, player1_strategies, player2_strategies
        )
        
        if NASHPY_AVAILABLE:
            mixed_equilibria = self._find_mixed_strategy_equilibria_nashpy(
                A, B, player1_strategies, player2_strategies
            )
        else:
            mixed_equilibria = self._find_mixed_strategy_equilibria_manual(
                A, B, player1_strategies, player2_strategies
            )
        
        response = NashEquilibriumResponse(
            pure_equilibria=pure_equilibria,
            mixed_equilibria=mixed_equilibria,
            has_pure_equilibrium=len(pure_equilibria) > 0,
            has_mixed_equilibrium=len(mixed_equilibria) > 0,
            message=""
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
        """
        Find pure strategy Nash equilibria by checking best responses.
        
        A strategy profile (i,j) is a Nash equilibrium if:
        - i is a best response to j (no incentive for player 1 to deviate)
        - j is a best response to i (no incentive for player 2 to deviate)
        """
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
    
    def _find_mixed_strategy_equilibria_nashpy(
        self,
        A: np.ndarray,
        B: np.ndarray,
        player1_strategies: List[str],
        player2_strategies: List[str]
    ) -> List[MixedStrategyEquilibrium]:
        """
        Find mixed strategy equilibria using nashpy library.
        
        Uses Support Enumeration algorithm.
        """
        mixed_equilibria = []
        seen_equilibria = set()
        
        try:
            game = nash.Game(A, B)
            equilibria = list(game.support_enumeration())
            
            for eq in equilibria:
                p1_dist, p2_dist = eq
                
                is_pure_p1 = all(abs(x - 1.0) < 1e-10 or abs(x) < 1e-10 for x in p1_dist)
                is_pure_p2 = all(abs(x - 1.0) < 1e-10 or abs(x) < 1e-10 for x in p2_dist)
                
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
            print(f"Error in nashpy support enumeration: {e}")
        
        return mixed_equilibria
    
    def _find_mixed_strategy_equilibria_manual(
        self,
        A: np.ndarray,
        B: np.ndarray,
        player1_strategies: List[str],
        player2_strategies: List[str]
    ) -> List[MixedStrategyEquilibrium]:
        """
        Manual implementation of Support Enumeration algorithm.
        
        This is a fallback when nashpy is not available.
        """
        mixed_equilibria = []
        num_rows, num_cols = A.shape
        
        if num_rows < 2 or num_cols < 2:
            return mixed_equilibria
        
        try:
            if num_rows == 2 and num_cols == 2:
                a, b = A[0, 0], A[0, 1]
                c, d = A[1, 0], A[1, 1]
                
                e, f = B[0, 0], B[0, 1]
                g, h = B[1, 0], B[1, 1]
                
                denominator_q = (a - b - c + d)
                if denominator_q != 0:
                    q = (d - b) / denominator_q
                    if 0 < q < 1:
                        denominator_p = (e - f - g + h)
                        if denominator_p != 0:
                            p = (h - f) / denominator_p
                            if 0 < p < 1:
                                p1_dist = {
                                    player1_strategies[0]: p,
                                    player1_strategies[1]: 1 - p
                                }
                                p2_dist = {
                                    player2_strategies[0]: q,
                                    player2_strategies[1]: 1 - q
                                }
                                
                                expected_p1 = p * q * a + p * (1 - q) * b + (1 - p) * q * c + (1 - p) * (1 - q) * d
                                expected_p2 = p * q * e + p * (1 - q) * f + (1 - p) * q * g + (1 - p) * (1 - q) * h
                                
                                mixed_equilibria.append(
                                    MixedStrategyEquilibrium(
                                        player1_distribution=p1_dist,
                                        player2_distribution=p2_dist,
                                        player1_expected_payoff=float(expected_p1),
                                        player2_expected_payoff=float(expected_p2),
                                        player1_support=[0, 1],
                                        player2_support=[0, 1]
                                    )
                                )
        
        except Exception as e:
            print(f"Error in manual mixed strategy calculation: {e}")
        
        return mixed_equilibria


nash_solver = NashEquilibriumSolver()


GAME_EXAMPLES = [
    {
        "name": "囚徒困境",
        "category": "经典博弈",
        "description": "两个囚犯可以选择合作或背叛。背叛是占优策略，但双方合作会获得更好的结果。",
        "player1_strategies": ["合作", "背叛"],
        "player2_strategies": ["合作", "背叛"],
        "payoff_matrix_player1": [[3, 0], [5, 1]],
        "payoff_matrix_player2": [[3, 5], [0, 1]],
    },
    {
        "name": "性别之战",
        "category": "协调博弈",
        "description": "一对情侣想一起活动，但偏好不同：足球或芭蕾。他们更愿意在一起，即使是自己不太喜欢的活动。",
        "player1_strategies": ["足球", "芭蕾"],
        "player2_strategies": ["足球", "芭蕾"],
        "payoff_matrix_player1": [[3, 0], [0, 2]],
        "payoff_matrix_player2": [[2, 0], [0, 3]],
    },
    {
        "name": "猜硬币",
        "category": "零和博弈",
        "description": "两个玩家同时猜硬币正面或反面。如果一致，玩家1赢；否则玩家2赢。只有混合策略均衡。",
        "player1_strategies": ["正面", "反面"],
        "player2_strategies": ["正面", "反面"],
        "payoff_matrix_player1": [[1, -1], [-1, 1]],
        "payoff_matrix_player2": [[-1, 1], [1, -1]],
    },
    {
        "name": "猎鹿博弈",
        "category": "协调博弈",
        "description": "两个猎人可以一起猎鹿（需要合作）或各自猎兔。猎鹿获得更高回报但需要信任。",
        "player1_strategies": ["猎鹿", "猎兔"],
        "player2_strategies": ["猎鹿", "猎兔"],
        "payoff_matrix_player1": [[4, 1], [3, 2]],
        "payoff_matrix_player2": [[4, 3], [1, 2]],
    },
    {
        "name": "懦夫博弈",
        "category": "斗鸡博弈",
        "description": "两个司机相向而行，谁先转向谁就是懦夫。如果都不转向会相撞，结果最差。",
        "player1_strategies": ["转向", "直行"],
        "player2_strategies": ["转向", "直行"],
        "payoff_matrix_player1": [[0, -1], [1, -10]],
        "payoff_matrix_player2": [[0, 1], [-1, -10]],
    },
    {
        "name": "剪刀石头布",
        "category": "零和博弈",
        "description": "经典的猜拳游戏：剪刀赢布，布赢石头，石头赢剪刀。",
        "player1_strategies": ["石头", "剪刀", "布"],
        "player2_strategies": ["石头", "剪刀", "布"],
        "payoff_matrix_player1": [[0, 1, -1], [-1, 0, 1], [1, -1, 0]],
        "payoff_matrix_player2": [[0, -1, 1], [1, 0, -1], [-1, 1, 0]],
    },
]
