from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from src.analysis.tidal_flow import tidal_analyzer
import os

app = FastAPI(title="共享单车潮汐流动分析系统")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/static", StaticFiles(directory="static"), name="static")


@app.get("/")
async def root():
    return FileResponse("static/index.html")


@app.get("/api/tidal/summary")
async def get_tidal_summary():
    return tidal_analyzer.get_tidal_summary()


@app.get("/api/tidal/morning")
async def get_morning_peak():
    return {
        "peak_type": "morning",
        "time_range": f"{os.getenv('MORNING_PEAK_START')} - {os.getenv('MORNING_PEAK_END')}",
        "vectors": tidal_analyzer.get_flow_vectors('morning')
    }


@app.get("/api/tidal/evening")
async def get_evening_peak():
    return {
        "peak_type": "evening",
        "time_range": f"{os.getenv('EVENING_PEAK_START')} - {os.getenv('EVENING_PEAK_END')}",
        "vectors": tidal_analyzer.get_flow_vectors('evening')
    }


@app.get("/api/stations")
async def get_stations():
    return tidal_analyzer.get_stations_with_type()


@app.get("/api/config")
async def get_config():
    return {
        "gaode_api_key": os.getenv("GAODE_API_KEY", ""),
        "gaode_js_api_key": os.getenv("GAODE_JS_API_KEY", "")
    }


@app.get("/api/data-source")
async def get_data_source():
    from src.data.trip_flow import trip_flow
    return trip_flow.get_data_source()


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host=os.getenv("HOST", "0.0.0.0"),
        port=int(os.getenv("PORT", 8000)),
        reload=True
    )
