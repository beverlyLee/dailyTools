from .solver import router as solver_router
from .examples import router as examples_router
from .health import router as health_router

__all__ = ['solver_router', 'examples_router', 'health_router']
