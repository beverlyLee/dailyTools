import os
from typing import List, Dict

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
DATA_DIR = os.path.join(BASE_DIR, 'data')

SERVER_CONFIG = {
    'host': 'localhost',
    'port': 8000,
    'debug': True
}

DATA_CONFIG = {
    'students_count': 200,
    'days_range': 90,
    'majors': ['CS', 'Chinese', 'Math', 'Physics', 'English'],
    'cs_gpa_base': 3.2,
    'chinese_gpa_base': 3.4,
    'default_gpa_base': 3.3
}

MAJOR_HOURS_CONFIG = {
    'CS': {'avg_visits': 5.5, 'avg_hours': 3.5},
    'Chinese': {'avg_visits': 3.0, 'avg_hours': 2.0},
    'Math': {'avg_visits': 4.0, 'avg_hours': 2.5},
    'Physics': {'avg_visits': 4.0, 'avg_hours': 2.5},
    'English': {'avg_visits': 4.0, 'avg_hours': 2.5}
}

API_ENDPOINTS = {
    'grades': '/api/grades',
    'swipes': '/api/swipes',
    'health': '/api/health'
}

COLORS = {
    'CS': '#1f77b4',
    'Chinese': '#ff7f0e',
    'Math': '#2ca02c',
    'Physics': '#d62728',
    'English': '#9467bd'
}

os.makedirs(DATA_DIR, exist_ok=True)
