import numpy as np
from typing import Callable, Dict, List, Tuple, Any
import json

class ODESolver:
    """常微分方程数值求解器"""
    
    def __init__(self):
        self.methods = {
            'euler': self.euler_method,
            'rk4': self.rk4_method,
            'scipy': self.scipy_solver
        }
        
        self.classical_models = {
            'lorenz': self.lorenz_system,
            'predator_prey': self.lotka_volterra_system,
            'van_der_pol': self.van_der_pol_system,
            'harmonic': self.harmonic_oscillator
        }
    
    def euler_method(self, f: Callable, y0: np.ndarray, t_span: Tuple[float, float], 
                    dt: float, params: Dict = None) -> Tuple[np.ndarray, np.ndarray]:
        """欧拉法求解 ODE"""
        t0, tf = t_span
        n_steps = int((tf - t0) / dt)
        t = np.linspace(t0, tf, n_steps + 1)
        y = np.zeros((n_steps + 1, len(y0)))
        y[0] = y0
        
        for i in range(n_steps):
            y[i+1] = y[i] + dt * np.array(f(t[i], y[i], params))
        
        return t, y
    
    def rk4_method(self, f: Callable, y0: np.ndarray, t_span: Tuple[float, float],
                   dt: float, params: Dict = None) -> Tuple[np.ndarray, np.ndarray]:
        """四阶龙格-库塔法求解 ODE"""
        t0, tf = t_span
        n_steps = int((tf - t0) / dt)
        t = np.linspace(t0, tf, n_steps + 1)
        y = np.zeros((n_steps + 1, len(y0)))
        y[0] = y0
        
        for i in range(n_steps):
            ti = t[i]
            yi = y[i]
            
            k1 = np.array(f(ti, yi, params))
            k2 = np.array(f(ti + dt/2, yi + dt/2 * k1, params))
            k3 = np.array(f(ti + dt/2, yi + dt/2 * k2, params))
            k4 = np.array(f(ti + dt, yi + dt * k3, params))
            
            y[i+1] = yi + (dt/6) * (k1 + 2*k2 + 2*k3 + k4)
        
        return t, y
    
    def scipy_solver(self, f: Callable, y0: np.ndarray, t_span: Tuple[float, float],
                    dt: float, params: Dict = None) -> Tuple[np.ndarray, np.ndarray]:
        """使用 SciPy 的 ODE 求解器"""
        from scipy.integrate import solve_ivp
        
        t0, tf = t_span
        n_steps = int((tf - t0) / dt)
        t_eval = np.linspace(t0, tf, n_steps + 1)
        
        def wrapped_f(t, y):
            return f(t, y, params)
        
        sol = solve_ivp(wrapped_f, t_span, y0, t_eval=t_eval, method='RK45')
        return sol.t, sol.y.T
    
    def lorenz_system(self, t: float, y: np.ndarray, params: Dict = None) -> List[float]:
        """洛伦兹吸引子系统"""
        sigma = params.get('sigma', 10.0) if params else 10.0
        rho = params.get('rho', 28.0) if params else 28.0
        beta = params.get('beta', 8.0/3.0) if params else 8.0/3.0
        
        x, y_z, z = y
        dx_dt = sigma * (y_z - x)
        dy_dt = x * (rho - z) - y_z
        dz_dt = x * y_z - beta * z
        
        return [dx_dt, dy_dt, dz_dt]
    
    def lotka_volterra_system(self, t: float, y: np.ndarray, params: Dict = None) -> List[float]:
        """捕食者-猎物模型（Lotka-Volterra）"""
        alpha = params.get('alpha', 1.0) if params else 1.0
        beta = params.get('beta', 0.1) if params else 0.1
        delta = params.get('delta', 0.075) if params else 0.075
        gamma = params.get('gamma', 1.5) if params else 1.5
        
        prey, predator = y
        dprey_dt = alpha * prey - beta * prey * predator
        dpredator_dt = delta * prey * predator - gamma * predator
        
        return [dprey_dt, dpredator_dt]
    
    def van_der_pol_system(self, t: float, y: np.ndarray, params: Dict = None) -> List[float]:
        """Van der Pol 振荡器"""
        mu = params.get('mu', 1.0) if params else 1.0
        
        x, v = y
        dx_dt = v
        dv_dt = mu * (1 - x**2) * v - x
        
        return [dx_dt, dv_dt]
    
    def harmonic_oscillator(self, t: float, y: np.ndarray, params: Dict = None) -> List[float]:
        """简谐振荡器"""
        omega = params.get('omega', 1.0) if params else 1.0
        damping = params.get('damping', 0.0) if params else 0.0
        
        x, v = y
        dx_dt = v
        dv_dt = -omega**2 * x - damping * v
        
        return [dx_dt, dv_dt]
    
    def solve_custom_equation(self, equation_str: str, y0: np.ndarray, 
                              t_span: Tuple[float, float], dt: float,
                              method: str = 'rk4', params: Dict = None) -> Dict:
        """求解自定义方程"""
        # 这里简化处理，实际应用需要安全的表达式解析
        # 对于生产环境，应该使用更安全的表达式解析方式
        raise NotImplementedError("自定义方程解析需要安全的表达式解析器")
    
    def solve_classical_model(self, model_name: str, y0: np.ndarray,
                              t_span: Tuple[float, float], dt: float,
                              method: str = 'rk4', params: Dict = None) -> Dict:
        """求解经典模型"""
        if model_name not in self.classical_models:
            raise ValueError(f"未知的经典模型: {model_name}")
        
        if method not in self.methods:
            raise ValueError(f"未知的求解方法: {method}")
        
        f = self.classical_models[model_name]
        solver = self.methods[method]
        
        t, y = solver(f, y0, t_span, dt, params)
        
        return {
            'time': t.tolist(),
            'solution': y.tolist(),
            'model': model_name,
            'method': method,
            'parameters': params or {}
        }
    
    def poincare_section(self, solution: Dict, plane: str = 'z', value: float = 0.0,
                        direction: int = 1) -> List[List[float]]:
        """计算庞加莱截面"""
        t = np.array(solution['time'])
        y = np.array(solution['solution'])
        
        plane_indices = {'x': 0, 'y': 1, 'z': 2}
        if plane not in plane_indices:
            raise ValueError(f"未知的平面: {plane}")
        
        idx = plane_indices[plane]
        points = []
        
        for i in range(len(t) - 1):
            y1 = y[i, idx]
            y2 = y[i+1, idx]
            
            # 检查是否穿越指定平面
            if (y1 - value) * (y2 - value) < 0:
                # 线性插值找到精确穿越点
                alpha = (value - y1) / (y2 - y1)
                cross_point = y[i] + alpha * (y[i+1] - y[i])
                
                # 检查穿越方向
                dy = y2 - y1
                if direction > 0 and dy[idx] > 0:
                    points.append(cross_point.tolist())
                elif direction < 0 and dy[idx] < 0:
                    points.append(cross_point.tolist())
        
        return points
    
    def parameter_scan(self, model_name: str, y0: np.ndarray,
                       t_span: Tuple[float, float], dt: float,
                       param_name: str, param_range: Tuple[float, float],
                       n_steps: int, method: str = 'rk4') -> Dict:
        """参数扫描"""
        param_values = np.linspace(param_range[0], param_range[1], n_steps)
        results = []
        
        for param_val in param_values:
            params = {param_name: param_val}
            try:
                sol = self.solve_classical_model(model_name, y0, t_span, dt, method, params)
                results.append({
                    'parameter': param_val,
                    'solution': sol
                })
            except Exception as e:
                results.append({
                    'parameter': param_val,
                    'error': str(e)
                })
        
        return {
            'parameter_name': param_name,
            'parameter_values': param_values.tolist(),
            'results': results
        }

ode_solver = ODESolver()
