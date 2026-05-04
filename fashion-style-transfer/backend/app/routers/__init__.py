from .images import router as images_router
from .style_transfer import router as style_transfer_router
from .history import router as history_router
from .download import router as download_router
from .health import router as health_router

__all__ = [
    "images_router",
    "style_transfer_router",
    "history_router",
    "download_router",
    "health_router",
]
