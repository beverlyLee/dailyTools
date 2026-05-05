from fastapi import APIRouter, HTTPException, Query
from typing import List, Optional, Any
from pydantic import BaseModel

from app.services import monitoring_service

router = APIRouter()

class RecordRequestRequest(BaseModel):
    latency: float

class RecordPredictionRequest(BaseModel):
    prediction: Any

class SetBaselineRequest(BaseModel):
    predictions: List[Any]

class RollbackRequest(BaseModel):
    from_version: str
    to_version: str
    reason: str = "Manual rollback"

@router.post("/services/{service_name}/register")
def register_service(service_name: str):
    try:
        monitoring_service.register_service(service_name)
        return {"service_name": service_name, "status": "registered"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to register service: {str(e)}")

@router.delete("/services/{service_name}")
def unregister_service(service_name: str):
    try:
        monitoring_service.unregister_service(service_name)
        return {"service_name": service_name, "status": "unregistered"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to unregister service: {str(e)}")

@router.get("/services")
def list_services():
    try:
        services = list(monitoring_service.services.keys())
        return {"services": services}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to list services: {str(e)}")

@router.get("/services/{service_name}/metrics")
def get_service_metrics(
    service_name: str,
    minutes: int = Query(5, ge=1, le=60, description="Number of minutes to look back")
):
    try:
        metrics = monitoring_service.get_service_metrics(service_name, minutes)
        if metrics is None:
            raise HTTPException(status_code=404, detail="Service not found")
        return {"service_name": service_name, "metrics": metrics}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get metrics: {str(e)}")

@router.get("/metrics")
def get_all_services_metrics():
    try:
        metrics = monitoring_service.get_all_services_metrics()
        return {"metrics": metrics}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get all metrics: {str(e)}")

@router.post("/services/{service_name}/record-request")
def record_request(service_name: str, request: RecordRequestRequest):
    try:
        monitoring_service.record_request(service_name, request.latency)
        return {"status": "recorded"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to record request: {str(e)}")

@router.post("/services/{service_name}/record-gpu")
def record_gpu_utilization(service_name: str, utilization: float = Query(..., ge=0, le=100)):
    try:
        monitoring_service.record_gpu_utilization(service_name, utilization)
        return {"status": "recorded", "utilization": utilization}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to record GPU utilization: {str(e)}")

@router.post("/services/{service_name}/record-prediction")
def record_prediction(service_name: str, request: RecordPredictionRequest):
    try:
        monitoring_service.record_prediction(service_name, request.prediction)
        return {"status": "recorded"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to record prediction: {str(e)}")

@router.post("/services/{service_name}/set-baseline")
def set_baseline(service_name: str, request: SetBaselineRequest):
    try:
        if not request.predictions:
            raise HTTPException(status_code=400, detail="Predictions list cannot be empty")
        
        monitoring_service.set_baseline(service_name, request.predictions)
        return {"status": "baseline_set", "predictions_count": len(request.predictions)}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to set baseline: {str(e)}")

@router.post("/services/{service_name}/simulate-request")
def simulate_request(service_name: str):
    try:
        result = monitoring_service.simulate_request(service_name)
        return {"status": "simulated", **result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to simulate request: {str(e)}")

@router.post("/services/{service_name}/rollback")
def rollback_service(service_name: str, request: RollbackRequest):
    try:
        record = monitoring_service.record_rollback(
            service_name=service_name,
            from_version=request.from_version,
            to_version=request.to_version,
            reason=request.reason
        )
        return {"status": "rollback_recorded", "rollback": record}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to record rollback: {str(e)}")

@router.get("/services/{service_name}/rollback-history")
def get_rollback_history(service_name: str):
    try:
        history = monitoring_service.get_rollback_history(service_name)
        return {"service_name": service_name, "rollback_history": history}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get rollback history: {str(e)}")
