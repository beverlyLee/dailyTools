from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from app.database import init_db
from app.routers import image_router, music_router, chart_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    yield


app = FastAPI(
    title="智能图像与生成式AI平台",
    description="一个集成了智能图像风格迁移、音乐生成和NL2SQL图表生成的综合AI平台",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(image_router.router)
app.include_router(music_router.router)
app.include_router(chart_router.router)


@app.get("/")
async def root():
    return {
        "message": "欢迎使用智能图像与生成式AI平台",
        "version": "1.0.0",
        "endpoints": {
            "图像生成": "/api/image",
            "音乐生成": "/api/music",
            "图表生成": "/api/chart",
        },
        "docs": "/docs",
    }


@app.get("/health")
async def health_check():
    return {"status": "healthy"}
