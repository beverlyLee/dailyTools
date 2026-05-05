"""
APS 排程优化器配置文件
"""

import os


class Config:
    SERVER_HOST = os.getenv('APS_HOST', 'localhost')
    SERVER_PORT = int(os.getenv('APS_PORT', 8080))
    
    ALGORITHM_CONFIG = {
        'population_size': int(os.getenv('APS_POPULATION_SIZE', 100)),
        'generations': int(os.getenv('APS_GENERATIONS', 50)),
        'mutation_prob': float(os.getenv('APS_MUTATION_PROB', 0.2)),
        'crossover_prob': float(os.getenv('APS_CROSSOVER_PROB', 0.7)),
        'elitism_size': int(os.getenv('APS_ELITISM_SIZE', 5)),
        'tournament_size': int(os.getenv('APS_TOURNAMENT_SIZE', 3))
    }
    
    CONSTRAINT_WEIGHTS = {
        'precedence': 10.0,
        'resource_capacity': 10.0,
        'mold_availability': 10.0,
        'material_kitting': 10.0,
        'employee_availability': 10.0,
        'due_date': 5.0
    }
    
    DJANGO_API_URL = os.getenv('DJANGO_API_URL', 'http://localhost:8000/api')
    
    LOG_LEVEL = os.getenv('APS_LOG_LEVEL', 'INFO')
    
    OUTPUT_DIR = os.getenv('APS_OUTPUT_DIR', './output')
    
    GANTT_CONFIG = {
        'colors': {
            'running': '#4CAF50',
            'scheduled': '#2196F3',
            'late': '#F44336',
            'maintenance': '#FF9800',
            'warning': '#FFC107'
        }
    }
    
    LOAD_CONFIG = {
        'time_interval_minutes': 60,
        'thresholds': {
            'low': 50,
            'medium': 75,
            'high': 100
        }
    }
