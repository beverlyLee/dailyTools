from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import image_processor, rules, preview
from app.models.database import init_db

app = FastAPI(title="Batch Image Processor", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(image_processor.router, prefix="/api/images", tags=["Image Processing"])
app.include_router(rules.router, prefix="/api/rules", tags=["Rename Rules"])
app.include_router(preview.router, prefix="/api/preview", tags=["Preview"])

@app.on_event("startup")
async def startup_event():
    init_db()

@app.get("/")
async def root():
    return {"message": "Batch Image Processor API", "version": "1.0.0"}
