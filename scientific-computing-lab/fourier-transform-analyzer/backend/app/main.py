from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
from sqlalchemy.orm import Session
import numpy as np

from .signal_utils import (
    generate_signal,
    compute_fft,
    compute_stft,
    apply_filter_to_signal
)
from .database import get_db, Experiment, init_db

app = FastAPI(
    title="傅里叶变换信号分析服务",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup_event():
    init_db()

class GenerateSignalRequest(BaseModel):
    signal_type: str
    frequencies: List[float] = [50.0]
    amplitudes: List[float] = [1.0]
    sample_rate: int = 1000
    duration: float = 1.0
    noise_level: float = 0.0
    phase: float = 0.0
    duty_cycle: float = 50.0

class FFTRequest(BaseModel):
    signal: List[float]
    sample_rate: int = 1000

class STFTRequest(BaseModel):
    signal: List[float]
    sample_rate: int = 1000
    nperseg: int = 256
    noverlap: int = 128

class FilterRequest(BaseModel):
    signal: List[float]
    sample_rate: int
    filter_type: str
    low_cutoff: Optional[float] = None
    high_cutoff: Optional[float] = None
    order: int = 5

class SaveExperimentRequest(BaseModel):
    name: str
    signal_type: str
    frequencies: List[float]
    amplitudes: List[float]
    sample_rate: int
    duration: float
    noise_level: float
    filter_type: str
    low_cutoff: float
    high_cutoff: float
    filter_enabled: bool

@app.get("/")
async def root():
    return {
        "name": "傅里叶变换信号分析服务",
        "version": "1.0.0",
        "status": "running"
    }

@app.post("/api/generate-signal")
async def api_generate_signal(request: GenerateSignalRequest):
    try:
        result = generate_signal(
            signal_type=request.signal_type,
            frequencies=request.frequencies,
            amplitudes=request.amplitudes,
            sample_rate=request.sample_rate,
            duration=request.duration,
            noise_level=request.noise_level,
            phase=request.phase,
            duty_cycle=request.duty_cycle
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/fft")
async def api_fft(request: FFTRequest):
    try:
        signal_array = np.array(request.signal)
        result = compute_fft(signal_array, request.sample_rate)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/stft")
async def api_stft(request: STFTRequest):
    try:
        signal_array = np.array(request.signal)
        result = compute_stft(
            signal_array, 
            request.sample_rate,
            request.nperseg,
            request.noverlap
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/filter")
async def api_filter(request: FilterRequest):
    try:
        signal_array = np.array(request.signal)
        filtered_signal = apply_filter_to_signal(
            signal_array,
            request.sample_rate,
            request.filter_type,
            request.low_cutoff,
            request.high_cutoff,
            request.order
        )
        return {"filtered_signal": filtered_signal}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/experiments")
async def save_experiment(request: SaveExperimentRequest, db: Session = Depends(get_db)):
    try:
        experiment = Experiment(
            name=request.name,
            signal_type=request.signal_type,
            frequencies=request.frequencies,
            amplitudes=request.amplitudes,
            sample_rate=request.sample_rate,
            duration=request.duration,
            noise_level=request.noise_level,
            filter_type=request.filter_type,
            low_cutoff=request.low_cutoff,
            high_cutoff=request.high_cutoff,
            filter_enabled=1 if request.filter_enabled else 0
        )
        db.add(experiment)
        db.commit()
        db.refresh(experiment)
        return {
            "success": True,
            "id": experiment.id,
            "message": "实验已保存"
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/experiments")
async def get_experiments(limit: int = 50, db: Session = Depends(get_db)):
    try:
        experiments = db.query(Experiment).order_by(
            Experiment.created_at.desc()
        ).limit(limit).all()
        
        result = []
        for exp in experiments:
            result.append({
                "id": exp.id,
                "name": exp.name,
                "signal_type": exp.signal_type,
                "frequencies": exp.frequencies,
                "amplitudes": exp.amplitudes,
                "sample_rate": exp.sample_rate,
                "duration": exp.duration,
                "noise_level": exp.noise_level,
                "filter_type": exp.filter_type,
                "low_cutoff": exp.low_cutoff,
                "high_cutoff": exp.high_cutoff,
                "filter_enabled": exp.filter_enabled == 1,
                "created_at": exp.created_at.isoformat() if exp.created_at else None
            })
        
        return {"data": result, "total": len(result)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/experiments/{experiment_id}")
async def get_experiment(experiment_id: int, db: Session = Depends(get_db)):
    try:
        exp = db.query(Experiment).filter(Experiment.id == experiment_id).first()
        if not exp:
            raise HTTPException(status_code=404, detail="实验不存在")
        
        return {
            "id": exp.id,
            "name": exp.name,
            "signal_type": exp.signal_type,
            "frequencies": exp.frequencies,
            "amplitudes": exp.amplitudes,
            "sample_rate": exp.sample_rate,
            "duration": exp.duration,
            "noise_level": exp.noise_level,
            "filter_type": exp.filter_type,
            "low_cutoff": exp.low_cutoff,
            "high_cutoff": exp.high_cutoff,
            "filter_enabled": exp.filter_enabled == 1,
            "created_at": exp.created_at.isoformat() if exp.created_at else None
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/experiments/{experiment_id}")
async def delete_experiment(experiment_id: int, db: Session = Depends(get_db)):
    try:
        exp = db.query(Experiment).filter(Experiment.id == experiment_id).first()
        if not exp:
            raise HTTPException(status_code=404, detail="实验不存在")
        
        db.delete(exp)
        db.commit()
        return {"success": True, "message": "实验已删除"}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
