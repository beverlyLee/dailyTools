from .health import router as health_router
from .simulation import router as simulation_router
from .trajectory import router as trajectory_router

__all__ = [
    'health_router',
    'simulation_router',
    'trajectory_router',
]
