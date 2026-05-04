import numpy as np
from scipy.integrate import odeint
from typing import Dict, Tuple, List, Optional
import pandas as pd

class SEIRModel:
    def __init__(self, 
                 population: float = 1_000_000,
                 transmission_rate: float = 0.3,
                 incubation_rate: float = 0.2,
                 recovery_rate: float = 0.1,
                 mortality_rate: float = 0.0):
        
        self.N = population
        self.beta = transmission_rate
        self.sigma = incubation_rate
        self.gamma = recovery_rate
        self.mu = mortality_rate
        
        self._validate_parameters()
    
    def _validate_parameters(self):
        if self.N <= 0:
            raise ValueError("总人口数必须大于0")
        if self.beta < 0 or self.beta > 1:
            raise ValueError("传播率应在0到1之间")
        if self.sigma < 0:
            raise ValueError("潜伏期倒数必须非负")
        if self.gamma < 0:
            raise ValueError("康复率必须非负")
        if self.mu < 0 or self.mu > 1:
            raise ValueError("死亡率应在0到1之间")
        
        if self.gamma + self.mu <= 0:
            raise ValueError("康复率与死亡率之和必须大于0")
    
    def _derivatives(self, y, t):
        S, E, I, R = y
        
        lambda_ = self.beta * I / self.N
        
        dS_dt = -lambda_ * S
        dE_dt = lambda_ * S - self.sigma * E
        dI_dt = self.sigma * E - (self.gamma + self.mu) * I
        dR_dt = self.gamma * I
        
        return dS_dt, dE_dt, dI_dt, dR_dt
    
    def simulate(self, 
                 initial_conditions: Dict[str, float],
                 simulation_days: int = 180,
                 time_step: float = 0.5) -> pd.DataFrame:
        
        S0 = initial_conditions.get('S', self.N - 1)
        E0 = initial_conditions.get('E', 1)
        I0 = initial_conditions.get('I', 0)
        R0 = initial_conditions.get('R', 0)
        
        total_initial = S0 + E0 + I0 + R0
        if not np.isclose(total_initial, self.N, rtol=1e-5):
            raise ValueError(f"初始条件总和 ({total_initial}) 不等于总人口 ({self.N})")
        
        if any(x < 0 for x in [S0, E0, I0, R0]):
            raise ValueError("所有初始条件必须非负")
        
        t = np.arange(0, simulation_days + time_step, time_step)
        
        y0 = [S0, E0, I0, R0]
        
        solution = odeint(self._derivatives, y0, t)
        
        results = pd.DataFrame({
            't': t,
            'S': solution[:, 0],
            'E': solution[:, 1],
            'I': solution[:, 2],
            'R': solution[:, 3]
        })
        
        results['total'] = results['S'] + results['E'] + results['I'] + results['R']
        
        return results
    
    def get_basic_reproduction_number(self) -> float:
        if self.gamma + self.mu <= 0:
            return float('inf')
        return self.beta / (self.gamma + self.mu)
    
    def get_peak_information(self, results: pd.DataFrame) -> Dict:
        if results.empty:
            return {}
        
        peak_idx = results['I'].idxmax()
        peak_row = results.loc[peak_idx]
        
        return {
            'peak_day': peak_row['t'],
            'peak_infected': peak_row['I'],
            'peak_exposed': peak_row['E'],
            'susceptible_at_peak': peak_row['S'],
            'recovered_at_peak': peak_row['R']
        }
    
    def estimate_herd_immunity_threshold(self) -> float:
        R0 = self.get_basic_reproduction_number()
        if R0 <= 1:
            return 0.0
        return 1 - 1 / R0

def test_numerical_stability(population: float = 1_000_000,
                             transmission_rate: float = 0.3,
                             recovery_rate: float = 0.1,
                             simulation_days: int = 180) -> Dict:
    
    results = {
        'conservation': {},
        'non_negative': {},
        'monotonicity': {},
        'time_step_analysis': {}
    }
    
    model = SEIRModel(
        population=population,
        transmission_rate=transmission_rate,
        recovery_rate=recovery_rate
    )
    
    initial_conditions = {
        'S': population - 10 - 5,
        'E': 10,
        'I': 5,
        'R': 0
    }
    
    base_results = model.simulate(
        initial_conditions=initial_conditions,
        simulation_days=simulation_days,
        time_step=0.1
    )
    
    total_population = base_results['total'].values
    max_error = np.max(np.abs(total_population - population))
    conservation_passed = max_error < 1e-6
    
    results['conservation'] = {
        'passed': conservation_passed,
        'max_error': max_error,
        'mean_error': np.mean(np.abs(total_population - population))
    }
    
    negative_values = []
    for col in ['S', 'E', 'I', 'R']:
        neg_indices = base_results[base_results[col] < 0].index
        for idx in neg_indices:
            negative_values.append({
                'variable': col,
                'time': base_results.loc[idx, 't'],
                'value': base_results.loc[idx, col]
            })
    
    results['non_negative'] = {
        'passed': len(negative_values) == 0,
        'negative_values': negative_values
    }
    
    r_values = base_results['R'].values
    r_increasing = np.all(np.diff(r_values) >= -1e-10)
    
    results['monotonicity'] = {
        'passed': r_increasing,
        'decreases_count': int(np.sum(np.diff(r_values) < -1e-10))
    }
    
    time_steps = [1.0, 0.5, 0.2, 0.1, 0.05]
    
    for step in time_steps:
        step_results = model.simulate(
            initial_conditions=initial_conditions,
            simulation_days=simulation_days,
            time_step=step
        )
        
        results['time_step_analysis'][step] = step_results
    
    return results

def run_sensitivity_analysis(base_params: Dict,
                             param_ranges: Dict,
                             initial_conditions: Dict,
                             simulation_days: int = 180) -> Dict:
    
    sensitivity_results = {}
    
    for param_name, param_range in param_ranges.items():
        peaks = []
        totals = []
        
        for value in param_range:
            params = base_params.copy()
            params[param_name] = value
            
            model = SEIRModel(**params)
            results = model.simulate(initial_conditions, simulation_days)
            
            peak_info = model.get_peak_information(results)
            peaks.append(peak_info['peak_infected'])
            totals.append(results['R'].iloc[-1])
        
        sensitivity_results[param_name] = {
            'values': param_range,
            'peak_infected': peaks,
            'total_infected': totals
        }
    
    return sensitivity_results
