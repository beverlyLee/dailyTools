import numpy as np
from typing import Callable, List, Tuple, Optional, Dict, Any
from enum import Enum


class SolverMethod(str, Enum):
    EULER = "euler"
    RK4 = "rk4"
    RK45 = "rk45"


class ODESolver:
    
    @staticmethod
    def euler(
        f: Callable,
        y0: np.ndarray,
        t_span: Tuple[float, float],
        num_points: int = 1000,
        params: Optional[Dict[str, Any]] = None
    ) -> Tuple[np.ndarray, np.ndarray]:
        t0, tf = t_span
        t = np.linspace(t0, tf, num_points)
        dt = t[1] - t[0]
        
        y = np.zeros((num_points, len(y0)))
        y[0] = y0
        
        params = params or {}
        
        for i in range(num_points - 1):
            y[i + 1] = y[i] + dt * np.array(f(y[i], t[i], **params))
        
        return t, y
    
    @staticmethod
    def rk4(
        f: Callable,
        y0: np.ndarray,
        t_span: Tuple[float, float],
        num_points: int = 1000,
        params: Optional[Dict[str, Any]] = None
    ) -> Tuple[np.ndarray, np.ndarray]:
        t0, tf = t_span
        t = np.linspace(t0, tf, num_points)
        dt = t[1] - t[0]
        
        y = np.zeros((num_points, len(y0)))
        y[0] = y0
        
        params = params or {}
        
        for i in range(num_points - 1):
            ti = t[i]
            yi = y[i]
            
            k1 = dt * np.array(f(yi, ti, **params))
            k2 = dt * np.array(f(yi + k1/2, ti + dt/2, **params))
            k3 = dt * np.array(f(yi + k2/2, ti + dt/2, **params))
            k4 = dt * np.array(f(yi + k3, ti + dt, **params))
            
            y[i + 1] = yi + (k1 + 2*k2 + 2*k3 + k4) / 6
        
        return t, y
    
    @staticmethod
    def solve(
        method: SolverMethod,
        f: Callable,
        y0: np.ndarray,
        t_span: Tuple[float, float],
        num_points: int = 1000,
        params: Optional[Dict[str, Any]] = None
    ) -> Tuple[np.ndarray, np.ndarray]:
        if method == SolverMethod.EULER:
            return ODESolver.euler(f, y0, t_span, num_points, params)
        elif method == SolverMethod.RK4:
            return ODESolver.rk4(f, y0, t_span, num_points, params)
        elif method == SolverMethod.RK45:
            from scipy.integrate import solve_ivp
            params = params or {}
            
            def wrapped_f(t, y):
                return f(y, t, **params)
            
            t_eval = np.linspace(t_span[0], t_span[1], num_points)
            solution = solve_ivp(
                wrapped_f,
                t_span,
                y0,
                method='RK45',
                t_eval=t_eval,
                rtol=1e-8,
                atol=1e-8
            )
            return solution.t, solution.y.T
        else:
            raise ValueError(f"Unknown solver method: {method}")


class ClassicODEs:
    
    @staticmethod
    def lorenz(y: np.ndarray, t: float, sigma: float = 10.0, rho: float = 28.0, beta: float = 8.0/3.0) -> List[float]:
        x, y_val, z = y
        dx_dt = sigma * (y_val - x)
        dy_dt = x * (rho - z) - y_val
        dz_dt = x * y_val - beta * z
        return [dx_dt, dy_dt, dz_dt]
    
    @staticmethod
    def predator_prey(y: np.ndarray, t: float, a: float = 1.0, b: float = 0.1, c: float = 0.5, d: float = 0.02) -> List[float]:
        prey, predator = y
        d_prey_dt = a * prey - b * prey * predator
        d_predator_dt = -c * predator + d * prey * predator
        return [d_prey_dt, d_predator_dt]
    
    @staticmethod
    def van_der_pol(y: np.ndarray, t: float, mu: float = 1.0) -> List[float]:
        x, dx_dt = y
        d2x_dt2 = mu * (1 - x**2) * dx_dt - x
        return [dx_dt, d2x_dt2]
    
    @staticmethod
    def pendulum(y: np.ndarray, t: float, g: float = 9.81, L: float = 1.0, b: float = 0.0) -> List[float]:
        theta, omega = y
        dtheta_dt = omega
        domega_dt = -(g/L) * np.sin(theta) - b * omega
        return [dtheta_dt, domega_dt]
    
    @staticmethod
    def logistic(y: np.ndarray, t: float, r: float = 1.0, K: float = 100.0) -> List[float]:
        population = y[0] if isinstance(y, (list, np.ndarray)) else y
        dN_dt = r * population * (1 - population / K)
        return [dN_dt]
    
    @staticmethod
    def harmonic_oscillator(y: np.ndarray, t: float, omega0: float = 1.0, gamma: float = 0.0) -> List[float]:
        x, v = y
        dx_dt = v
        dv_dt = -omega0**2 * x - 2 * gamma * v
        return [dx_dt, dv_dt]
    
    @staticmethod
    def get_examples() -> Dict[str, Dict[str, Any]]:
        return {
            "lorenz": {
                "name": "洛伦兹吸引子",
                "description": "三维混沌系统，具有蝴蝶效应",
                "dimension": 3,
                "variables": ["x", "y", "z"],
                "default_initial": [1.0, 0.0, 0.0],
                "default_params": {"sigma": 10.0, "rho": 28.0, "beta": 8.0/3.0},
                "param_ranges": {"sigma": [0.1, 50.0], "rho": [0.1, 100.0], "beta": [0.1, 10.0]},
                "function": ClassicODEs.lorenz,
                "t_span": [0.0, 50.0],
            },
            "predator_prey": {
                "name": "捕食者-猎物模型",
                "description": "Lotka-Volterra 方程，描述生态系统中捕食者和猎物的动态平衡",
                "dimension": 2,
                "variables": ["猎物数量", "捕食者数量"],
                "default_initial": [40.0, 9.0],
                "default_params": {"a": 1.0, "b": 0.1, "c": 0.5, "d": 0.02},
                "param_ranges": {"a": [0.1, 5.0], "b": [0.01, 0.5], "c": [0.1, 2.0], "d": [0.001, 0.1]},
                "function": ClassicODEs.predator_prey,
                "t_span": [0.0, 50.0],
            },
            "van_der_pol": {
                "name": "范德波尔振荡器",
                "description": "具有极限环的非线性振荡器",
                "dimension": 2,
                "variables": ["x", "dx/dt"],
                "default_initial": [1.0, 0.0],
                "default_params": {"mu": 1.0},
                "param_ranges": {"mu": [0.1, 10.0]},
                "function": ClassicODEs.van_der_pol,
                "t_span": [0.0, 50.0],
            },
            "pendulum": {
                "name": "单摆",
                "description": "受阻尼作用的单摆运动",
                "dimension": 2,
                "variables": ["角度 θ", "角速度 ω"],
                "default_initial": [0.5, 0.0],
                "default_params": {"g": 9.81, "L": 1.0, "b": 0.1},
                "param_ranges": {"g": [1.0, 20.0], "L": [0.1, 5.0], "b": [0.0, 2.0]},
                "function": ClassicODEs.pendulum,
                "t_span": [0.0, 30.0],
            },
            "logistic": {
                "name": "逻辑斯蒂增长模型",
                "description": "描述种群增长的 S 型曲线",
                "dimension": 1,
                "variables": ["种群数量 N"],
                "default_initial": [10.0],
                "default_params": {"r": 1.0, "K": 100.0},
                "param_ranges": {"r": [0.1, 5.0], "K": [10.0, 1000.0]},
                "function": ClassicODEs.logistic,
                "t_span": [0.0, 20.0],
            },
            "harmonic_oscillator": {
                "name": "简谐振荡器",
                "description": "受阻尼的简谐运动",
                "dimension": 2,
                "variables": ["位移 x", "速度 v"],
                "default_initial": [1.0, 0.0],
                "default_params": {"omega0": 1.0, "gamma": 0.1},
                "param_ranges": {"omega0": [0.1, 10.0], "gamma": [0.0, 2.0]},
                "function": ClassicODEs.harmonic_oscillator,
                "t_span": [0.0, 30.0],
            },
        }
