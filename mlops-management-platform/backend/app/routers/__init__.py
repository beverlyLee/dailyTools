from .experiments import router as experiments_router
from .models import router as models_router
from .monitoring import router as monitoring_router

router = experiments_router
__all__ = ["experiments", "models", "monitoring"]
