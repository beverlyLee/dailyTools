from fastapi import APIRouter, HTTPException, Query
from typing import List, Optional
from pydantic import BaseModel

from app.services import mlflow_service

router = APIRouter()

class CompareRunsRequest(BaseModel):
    run_ids: List[str]

class RegisterBestModelRequest(BaseModel):
    model_name: str
    metric_name: str = "accuracy"
    higher_is_better: bool = True

@router.get("/")
def list_experiments():
    try:
        experiments = mlflow_service.list_experiments()
        return {"experiments": experiments}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to list experiments: {str(e)}")

@router.get("/{experiment_id}/runs")
def get_experiment_runs(experiment_id: str):
    try:
        runs = mlflow_service.get_experiment_runs(experiment_id)
        return {"runs": runs}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get experiment runs: {str(e)}")

@router.get("/runs/{run_id}")
def get_run_details(run_id: str):
    try:
        run = mlflow_service.get_run_details(run_id)
        return {"run": run}
    except Exception as e:
        raise HTTPException(status_code=404, detail=f"Run not found: {str(e)}")

@router.post("/runs/compare")
def compare_runs(request: CompareRunsRequest):
    try:
        if len(request.run_ids) < 2:
            raise HTTPException(status_code=400, detail="At least 2 run IDs are required for comparison")
        
        comparison = mlflow_service.compare_runs(request.run_ids)
        return {"comparison": comparison}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to compare runs: {str(e)}")

@router.get("/{experiment_id}/ranking")
def get_model_ranking(
    experiment_id: str,
    metric_name: str = Query("accuracy", description="Metric name to rank by"),
    higher_is_better: bool = Query(True, description="Whether higher metric is better")
):
    try:
        ranking = mlflow_service.get_model_ranking(experiment_id, metric_name, higher_is_better)
        return {"ranking": ranking, "metric_name": metric_name}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get model ranking: {str(e)}")

@router.post("/{experiment_id}/register-best-model")
def register_best_model(experiment_id: str, request: RegisterBestModelRequest):
    try:
        result = mlflow_service.register_best_model(
            experiment_id=experiment_id,
            model_name=request.model_name,
            metric_name=request.metric_name,
            higher_is_better=request.higher_is_better
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to register model: {str(e)}")
