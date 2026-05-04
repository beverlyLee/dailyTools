from .visa import router as visa_router
from .checklist import router as checklist_router
from .ocr import router as ocr_router

__all__ = [
    "visa_router",
    "checklist_router",
    "ocr_router",
]
