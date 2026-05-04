import numpy as np
from typing import Callable, List, Tuple, Optional, Dict, Any
import warnings

from .ode_solvers import ODESolver, SolverMethod


class PoincareAnalyzer:
    
    @staticmethod
    def compute_section(
        f: Callable,
        y0: np.ndarray,
        t_span: Tuple[float, float],
        plane_dimension: int = 0,
        plane_value: float = 0.0,
        direction: int = 1,
        method: SolverMethod = SolverMethod.RK4,
        num_points: int = 10000,
        params: Optional[Dict[str, Any]] = None
    ) -> Tuple[np.ndarray, np.ndarray]:
        t, y = ODESolver.solve(method, f, y0, t_span, num_points, params)
        
        crossings = []
        values_at_crossing = []
        
        for i in range(len(t) - 1):
            current_val = y[i, plane_dimension]
            next_val = y[i + 1, plane_dimension]
            
            if direction > 0:
                if current_val <= plane_value and next_val > plane_value:
                    crossings.append(i)
            elif direction < 0:
                if current_val >= plane_value and next_val < plane_value:
                    crossings.append(i)
            else:
                if (current_val - plane_value) * (next_val - plane_value) < 0:
                    crossings.append(i)
        
        poincare_points = []
        
        for i in crossings:
            y_i = y[i]
            y_next = y[i + 1]
            t_i = t[i]
            t_next = t[i + 1]
            
            val_i = y_i[plane_dimension]
            val_next = y_next[plane_dimension]
            
            if abs(val_next - val_i) < 1e-10:
                continue
            
            alpha = (plane_value - val_i) / (val_next - val_i)
            
            interpolated_y = y_i + alpha * (y_next - y_i)
            interpolated_t = t_i + alpha * (t_next - t_i)
            
            other_dims = [j for j in range(y.shape[1]) if j != plane_dimension]
            poincare_point = [interpolated_t] + [interpolated_y[j] for j in other_dims]
            poincare_points.append(poincare_point)
        
        if not poincare_points:
            warnings.warn("No Poincare section crossings found. Try adjusting the plane or increasing num_points.")
            return np.array([]), np.array([])
        
        poincare_array = np.array(poincare_points)
        times = poincare_array[:, 0]
        points = poincare_array[:, 1:]
        
        return times, points
    
    @staticmethod
    def analyze_dynamics(
        poincare_points: np.ndarray,
        threshold: float = 1e-3
    ) -> Dict[str, Any]:
        if len(poincare_points) < 2:
            return {
                "num_points": len(poincare_points),
                "behavior": "insufficient_data",
                "description": "数据点不足，无法分析"
            }
        
        distances = []
        for i in range(len(poincare_points) - 1):
            dist = np.linalg.norm(poincare_points[i + 1] - poincare_points[i])
            distances.append(dist)
        
        distances = np.array(distances)
        
        mean_dist = np.mean(distances)
        std_dist = np.std(distances)
        
        if len(poincare_points) < 10:
            return {
                "num_points": len(poincare_points),
                "behavior": "uncertain",
                "description": "数据点较少，需要更长时间的模拟",
                "mean_distance": float(mean_dist),
                "std_distance": float(std_dist)
            }
        
        unique_points = []
        for point in poincare_points:
            is_unique = True
            for existing in unique_points:
                if np.linalg.norm(point - existing) < threshold:
                    is_unique = False
                    break
            if is_unique:
                unique_points.append(point)
        
        num_unique = len(unique_points)
        
        if num_unique == 1:
            behavior = "fixed_point"
            description = "固定点 - 系统可能收敛到稳定状态"
        elif num_unique <= 5:
            behavior = "periodic"
            description = f"周期轨道 - 周期约为 {num_unique}"
        else:
            variance = np.var(poincare_points, axis=0)
            total_variance = np.sum(variance)
            
            if total_variance > 1e-2:
                behavior = "chaotic"
                description = "可能是混沌运动 - 点集分散"
            else:
                behavior = "quasiperiodic"
                description = "拟周期运动 - 点集形成闭合曲线"
        
        return {
            "num_points": len(poincare_points),
            "num_unique_points": num_unique,
            "behavior": behavior,
            "description": description,
            "mean_distance": float(mean_dist),
            "std_distance": float(std_dist),
            "variance": variance.tolist(),
        }
