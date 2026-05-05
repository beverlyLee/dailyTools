"""
博弈论纳什均衡求解器
实现：纯策略纳什均衡检测、混合策略纳什均衡（Support Enumeration算法）、
      与Nashpy库集成验证
"""

import numpy as np
from typing import List, Dict, Tuple, Optional, Set
from dataclasses import dataclass
from itertools import combinations
import uuid
from datetime import datetime

try:
    import nashpy as nash
    NASHPY_AVAILABLE = True
except ImportError:
    NASHPY_AVAILABLE = False


@dataclass
class PureStrategyEquilibrium:
    """纯策略纳什均衡"""
    row: int              # 行玩家策略索引
    col: int              # 列玩家策略索引
    row_strategy: str     # 行玩家策略名称
    col_strategy: str     # 列玩家策略名称
    expected_payoff: Tuple[float, float]  # (行玩家收益, 列玩家收益)
    best_responses: Tuple[List[int], List[int]]  # 互为最优反应


@dataclass
class MixedStrategyEquilibrium:
    """混合策略纳什均衡"""
    player1_distribution: np.ndarray  # 行玩家策略概率分布
    player2_distribution: np.ndarray  # 列玩家策略概率分布
    expected_payoff: Tuple[float, float]  # 期望收益
    support_size: Tuple[int, int]  # 支撑集大小
    strategies: Tuple[List[str], List[str]]  # 策略名称


class NashEquilibriumSolver:
    """
    纳什均衡求解器
    支持双人有限博弈（双矩阵博弈）
    """
    
    def __init__(self):
        self.row_payoff_matrix = None  # 行玩家收益矩阵
        self.col_payoff_matrix = None  # 列玩家收益矩阵
        self.row_strategies = []       # 行玩家策略名称
        self.col_strategies = []       # 列玩家策略名称
        self.n_rows = 0
        self.n_cols = 0
    
    def set_game(
        self,
        payoff_matrix: List[List[Dict]],
        row_strategies: Optional[List[str]] = None,
        col_strategies: Optional[List[str]] = None,
    ):
        """
        设置博弈
        
        Args:
            payoff_matrix: 收益矩阵，格式为 [[{player1: a, player2: b}, ...], ...]
            row_strategies: 行玩家策略名称列表
            col_strategies: 列玩家策略名称列表
        """
        self.n_rows = len(payoff_matrix)
        self.n_cols = len(payoff_matrix[0]) if self.n_rows > 0 else 0
        
        # 构建收益矩阵
        self.row_payoff_matrix = np.zeros((self.n_rows, self.n_cols), dtype=np.float64)
        self.col_payoff_matrix = np.zeros((self.n_rows, self.n_cols), dtype=np.float64)
        
        for i in range(self.n_rows):
            for j in range(self.n_cols):
                self.row_payoff_matrix[i, j] = float(payoff_matrix[i][j].get("player1", 0))
                self.col_payoff_matrix[i, j] = float(payoff_matrix[i][j].get("player2", 0))
        
        # 设置策略名称
        if row_strategies:
            self.row_strategies = row_strategies
        else:
            self.row_strategies = [f"策略{i+1}" for i in range(self.n_rows)]
        
        if col_strategies:
            self.col_strategies = col_strategies
        else:
            self.col_strategies = [f"策略{j+1}" for j in range(self.n_cols)]
    
    def find_pure_strategy_equilibria(self) -> List[PureStrategyEquilibrium]:
        """
        寻找纯策略纳什均衡
        
        纯策略纳什均衡定义：
        - 对于行玩家，选择的策略是对列玩家策略的最优反应
        - 对于列玩家，选择的策略是对行玩家策略的最优反应
        
        算法：
        1. 对每个列j，找到行玩家的最优反应（最大收益行）
        2. 对每个行i，找到列玩家的最优反应（最大收益列）
        3. 如果(i,j)在两个最优反应集合的交集中，则是纳什均衡
        """
        equilibria = []
        
        # 对每个列，找到行玩家的最优反应
        row_best_responses = {}
        for j in range(self.n_cols):
            # 列j的行收益
            col_payoffs = self.row_payoff_matrix[:, j]
            max_payoff = np.max(col_payoffs)
            best_rows = np.where(col_payoffs == max_payoff)[0].tolist()
            row_best_responses[j] = best_rows
        
        # 对每个行，找到列玩家的最优反应
        col_best_responses = {}
        for i in range(self.n_rows):
            # 行i的列收益
            row_payoffs = self.col_payoff_matrix[i, :]
            max_payoff = np.max(row_payoffs)
            best_cols = np.where(row_payoffs == max_payoff)[0].tolist()
            col_best_responses[i] = best_cols
        
        # 查找互为最优反应的策略组合
        for i in range(self.n_rows):
            for j in range(self.n_cols):
                if i in row_best_responses.get(j, []) and j in col_best_responses.get(i, []):
                    # 这是一个纯策略纳什均衡
                    eq = PureStrategyEquilibrium(
                        row=i,
                        col=j,
                        row_strategy=self.row_strategies[i],
                        col_strategy=self.col_strategies[j],
                        expected_payoff=(
                            float(self.row_payoff_matrix[i, j]),
                            float(self.col_payoff_matrix[i, j]),
                        ),
                        best_responses=(
                            row_best_responses.get(j, []),
                            col_best_responses.get(i, []),
                        ),
                    )
                    equilibria.append(eq)
        
        return equilibria
    
    def _is_indifference_condition_satisfied(
        self,
        row_support: Set[int],
        col_support: Set[int],
    ) -> Optional[Tuple[np.ndarray, np.ndarray]]:
        """
        检查无差异条件是否满足
        
        对于混合策略均衡：
        - 行玩家在其支撑集中的所有纯策略期望收益相等
        - 列玩家在其支撑集中的所有纯策略期望收益相等
        - 支撑集外的策略期望收益不高于支撑集内的
        
        Args:
            row_support: 行玩家支撑集（策略索引集合）
            col_support: 列玩家支撑集（策略索引集合）
        
        Returns:
            如果存在均衡，返回 (行分布, 列分布)，否则返回 None
        """
        k = len(row_support)
        l = len(col_support)
        
        # 转换为列表便于索引
        row_indices = sorted(row_support)
        col_indices = sorted(col_support)
        
        # 提取子矩阵
        R_sub = self.row_payoff_matrix[np.ix_(row_indices, col_indices)]
        C_sub = self.col_payoff_matrix[np.ix_(row_indices, col_indices)]
        
        try:
            # 列玩家的无差异条件：
            # 对于行玩家的混合策略 p，列玩家在支撑集中各策略期望收益相等
            # R_sub[0] · p = R_sub[1] · p = ... = R_sub[k-1] · p
            # (R_sub[i] - R_sub[j]) · p = 0 对任意 i,j 且 sum(p) = 1
            
            if l > 1:
                # 构建线性系统求解行玩家策略 p
                A_row = []
                b_row = []
                
                # 无差异条件
                for i in range(1, l):
                    A_row.append(R_sub[:, i] - R_sub[:, 0])
                    b_row.append(0.0)
                
                # 概率和为1
                A_row.append(np.ones(k))
                b_row.append(1.0)
                
                A_row = np.array(A_row)
                b_row = np.array(b_row)
                
                # 求解最小二乘（系统可能超定）
                p_sub = np.linalg.lstsq(A_row, b_row, rcond=None)[0]
            else:
                # 列玩家只有一个策略，行玩家可以选择任意纯策略
                p_sub = np.zeros(k)
                p_sub[0] = 1.0
            
            # 检查概率合法性
            if np.any(p_sub < -1e-10) or abs(np.sum(p_sub) - 1.0) > 1e-8:
                return None
            
            p_sub = np.clip(p_sub, 0, 1)
            p_sub = p_sub / np.sum(p_sub) if np.sum(p_sub) > 0 else p_sub
            
            # 行玩家的无差异条件：求解列玩家策略 q
            if k > 1:
                A_col = []
                b_col = []
                
                for i in range(1, k):
                    A_col.append(C_sub[i, :] - C_sub[0, :])
                    b_col.append(0.0)
                
                A_col.append(np.ones(l))
                b_col.append(1.0)
                
                A_col = np.array(A_col)
                b_col = np.array(b_col)
                
                q_sub = np.linalg.lstsq(A_col, b_col, rcond=None)[0]
            else:
                # 行玩家只有一个策略
                q_sub = np.zeros(l)
                q_sub[0] = 1.0
            
            if np.any(q_sub < -1e-10) or abs(np.sum(q_sub) - 1.0) > 1e-8:
                return None
            
            q_sub = np.clip(q_sub, 0, 1)
            q_sub = q_sub / np.sum(q_sub) if np.sum(q_sub) > 0 else q_sub
            
            # 构建完整分布
            p_full = np.zeros(self.n_rows)
            for idx, strat_idx in enumerate(row_indices):
                p_full[strat_idx] = p_sub[idx]
            
            q_full = np.zeros(self.n_cols)
            for idx, strat_idx in enumerate(col_indices):
                q_full[strat_idx] = q_sub[idx]
            
            # 验证支撑集外的策略不优
            # 对行玩家：支撑集外策略的期望收益 <= 支撑集内策略的期望收益
            row_expected = np.dot(self.row_payoff_matrix, q_full)
            support_expected = np.max(row_expected[row_indices])
            
            for i in range(self.n_rows):
                if i not in row_support and row_expected[i] > support_expected + 1e-8:
                    return None
            
            # 对列玩家同理
            col_expected = np.dot(p_full, self.col_payoff_matrix)
            support_expected_col = np.max(col_expected[col_indices])
            
            for j in range(self.n_cols):
                if j not in col_support and col_expected[j] > support_expected_col + 1e-8:
                    return None
            
            return (p_full, q_full)
            
        except np.linalg.LinAlgError:
            return None
    
    def find_mixed_strategy_equilibria(
        self,
        min_support: int = 1,
        max_support: Optional[int] = None,
    ) -> List[MixedStrategyEquilibrium]:
        """
        使用 Support Enumeration 算法寻找混合策略纳什均衡
        
        算法思想：
        1. 穷举所有可能的支撑集组合
        2. 对每个组合，检查是否存在满足无差异条件的概率分布
        3. 验证支撑集外的策略是否不优于支撑集内的
        
        Args:
            min_support: 最小支撑集大小
            max_support: 最大支撑集大小（默认 min(n_rows, n_cols)）
        
        Returns:
            混合策略纳什均衡列表
        """
        if max_support is None:
            max_support = min(self.n_rows, self.n_cols)
        
        equilibria = []
        seen_distributions = set()
        
        # 遍历所有可能的支撑集大小组合
        for k in range(min_support, max_support + 1):
            for l in range(min_support, max_support + 1):
                if k > self.n_rows or l > self.n_cols:
                    continue
                
                # 穷举所有 k 大小的行策略子集
                for row_indices in combinations(range(self.n_rows), k):
                    row_support = set(row_indices)
                    
                    # 穷举所有 l 大小的列策略子集
                    for col_indices in combinations(range(self.n_cols), l):
                        col_support = set(col_indices)
                        
                        # 检查无差异条件
                        result = self._is_indifference_condition_satisfied(
                            row_support, col_support
                        )
                        
                        if result is not None:
                            p, q = result
                            
                            # 去重（相同分布视为同一均衡）
                            dist_key = (
                                tuple(np.round(p, 8)),
                                tuple(np.round(q, 8)),
                            )
                            if dist_key in seen_distributions:
                                continue
                            seen_distributions.add(dist_key)
                            
                            # 计算期望收益
                            exp_payoff_row = np.dot(p, np.dot(self.row_payoff_matrix, q))
                            exp_payoff_col = np.dot(p, np.dot(self.col_payoff_matrix, q))
                            
                            eq = MixedStrategyEquilibrium(
                                player1_distribution=p,
                                player2_distribution=q,
                                expected_payoff=(float(exp_payoff_row), float(exp_payoff_col)),
                                support_size=(k, l),
                                strategies=(
                                    [self.row_strategies[i] for i in row_indices],
                                    [self.col_strategies[j] for j in col_indices],
                                ),
                            )
                            equilibria.append(eq)
        
        # 按支撑集大小排序
        equilibria.sort(key=lambda x: x.support_size)
        return equilibria
    
    def solve_with_nashpy(self) -> Dict:
        """
        使用 Nashpy 库求解（作为验证或备用方法）
        """
        if not NASHPY_AVAILABLE:
            return {"error": "Nashpy library not available"}
        
        # 创建双矩阵博弈
        game = nash.Game(self.row_payoff_matrix, self.col_payoff_matrix)
        
        result = {
            "game_type": str(type(game)),
            "equilibria": [],
        }
        
        # 支持枚举法
        try:
            for eq in game.support_enumeration():
                p, q = eq
                exp_row = game[p, q][0]
                exp_col = game[p, q][1]
                
                result["equilibria"].append({
                    "player1_distribution": p.tolist(),
                    "player2_distribution": q.tolist(),
                    "expected_payoff": (float(exp_row), float(exp_col)),
                })
        except Exception as e:
            result["error"] = str(e)
        
        return result
    
    def solve(self) -> Dict:
        """
        综合求解：纯策略 + 混合策略
        
        Returns:
            完整的求解结果
        """
        # 寻找纯策略均衡
        pure_equilibria = self.find_pure_strategy_equilibria()
        
        # 寻找混合策略均衡
        mixed_equilibria = self.find_mixed_strategy_equilibria()
        
        # 使用 Nashpy 验证（如果可用）
        nashpy_result = None
        if NASHPY_AVAILABLE:
            try:
                nashpy_result = self.solve_with_nashpy()
            except:
                pass
        
        # 构建返回结果
        result = {
            "game_type": "bimatrix",
            "n_rows": self.n_rows,
            "n_cols": self.n_cols,
            "row_strategies": self.row_strategies,
            "col_strategies": self.col_strategies,
            "row_payoff_matrix": self.row_payoff_matrix.tolist(),
            "col_payoff_matrix": self.col_payoff_matrix.tolist(),
            "pure_equilibria": [
                {
                    "row": eq.row,
                    "col": eq.col,
                    "row_strategy": eq.row_strategy,
                    "col_strategy": eq.col_strategy,
                    "expected_payoff": {
                        "player1": eq.expected_payoff[0],
                        "player2": eq.expected_payoff[1],
                    },
                    "is_pure": True,
                }
                for eq in pure_equilibria
            ],
            "mixed_equilibria": [
                {
                    "player1_distribution": eq.player1_distribution.tolist(),
                    "player2_distribution": eq.player2_distribution.tolist(),
                    "expected_payoff": {
                        "player1": eq.expected_payoff[0],
                        "player2": eq.expected_payoff[1],
                    },
                    "support_size": {
                        "player1": eq.support_size[0],
                        "player2": eq.support_size[1],
                    },
                    "support_strategies": {
                        "player1": eq.strategies[0],
                        "player2": eq.strategies[1],
                    },
                }
                for eq in mixed_equilibria
            ],
            "solver_info": {
                "algorithm": "Pure Strategy Detection + Support Enumeration",
                "nashpy_available": NASHPY_AVAILABLE,
                "nashpy_version": nash.__version__ if NASHPY_AVAILABLE else None,
            },
        }
        
        if nashpy_result:
            result["nashpy_verification"] = nashpy_result
        
        return result


# 经典博弈模板
GAME_TEMPLATES = {
    "prisoners_dilemma": {
        "name": "囚徒困境",
        "description": "两个囚犯面临背叛或合作的选择",
        "player1_strategies": ["沉默", "坦白"],
        "player2_strategies": ["沉默", "坦白"],
        "payoff_matrix": [
            [{"player1": -1, "player2": -1}, {"player1": -10, "player2": 0}],
            [{"player1": 0, "player2": -10}, {"player1": -5, "player2": -5}],
        ],
    },
    "battle_of_sexes": {
        "name": "性别之战",
        "description": "夫妻选择去看足球还是芭蕾舞",
        "player1_strategies": ["足球", "芭蕾"],
        "player2_strategies": ["足球", "芭蕾"],
        "payoff_matrix": [
            [{"player1": 3, "player2": 1}, {"player1": 0, "player2": 0}],
            [{"player1": 0, "player2": 0}, {"player1": 1, "player2": 3}],
        ],
    },
    "matching_pennies": {
        "name": "硬币配对",
        "description": "零和博弈的经典例子",
        "player1_strategies": ["正面", "反面"],
        "player2_strategies": ["正面", "反面"],
        "payoff_matrix": [
            [{"player1": 1, "player2": -1}, {"player1": -1, "player2": 1}],
            [{"player1": -1, "player2": 1}, {"player1": 1, "player2": -1}],
        ],
    },
    "stag_hunt": {
        "name": "猎鹿博弈",
        "description": "合作猎鹿或独自猎兔",
        "player1_strategies": ["猎鹿", "猎兔"],
        "player2_strategies": ["猎鹿", "猎兔"],
        "payoff_matrix": [
            [{"player1": 4, "player2": 4}, {"player1": 1, "player2": 3}],
            [{"player1": 3, "player2": 1}, {"player1": 2, "player2": 2}],
        ],
    },
    "rock_paper_scissors": {
        "name": "石头剪刀布",
        "description": "零和博弈，只有混合策略均衡",
        "player1_strategies": ["石头", "剪刀", "布"],
        "player2_strategies": ["石头", "剪刀", "布"],
        "payoff_matrix": [
            [{"player1": 0, "player2": 0}, {"player1": 1, "player2": -1}, {"player1": -1, "player2": 1}],
            [{"player1": -1, "player2": 1}, {"player1": 0, "player2": 0}, {"player1": 1, "player2": -1}],
            [{"player1": 1, "player2": -1}, {"player1": -1, "player2": 1}, {"player1": 0, "player2": 0}],
        ],
    },
}
