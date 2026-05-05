from .ui_test import router as ui_test_router
from .api_test import router as api_test_router
from .scheduler import router as scheduler_router
from .reports import router as reports_router

ui_test = ui_test_router
api_test = api_test_router
scheduler = scheduler_router
reports = reports_router

__all__ = ["ui_test", "api_test", "scheduler", "reports"]
