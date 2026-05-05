from .health import router as health_router
from .simulation import router as simulation_router
from .trajectory import router as trajectory_router
from .game_solver import router as game_solver_router
from .game_examples import router as game_examples_router

__all__ = [
    "health_router",
    "simulation_router",
    "trajectory_router",
    "game_solver_router",
    "game_examples_router",
]
