from fastapi import APIRouter, HTTPException, Query
from typing import List, Optional
from pydantic import BaseModel

from app.services import mlflow_service

router = APIRouter()

class TransitionStageRequest(BaseModel):
    stage: str

@router.get("/")
def list_registered_models():
    try:
        models = mlflow_service.list_registered_models()
        return {"models": models}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to list models: {str(e)}")

@router.get("/{model_name}")
def get_model_details(model_name: str):
    try:
        model = mlflow_service.get_model_details(model_name)
        return {"model": model}
    except Exception as e:
        raise HTTPException(status_code=404, detail=f"Model not found: {str(e)}")

@router.post("/{model_name}/versions/{version}/stage")
def transition_model_stage(model_name: str, version: str, request: TransitionStageRequest):
    try:
        valid_stages = ["Staging", "Production", "Archived", "None"]
        if request.stage not in valid_stages:
            raise HTTPException(
                status_code=400, 
                detail=f"Invalid stage. Must be one of: {valid_stages}"
            )
        
        result = mlflow_service.transition_model_stage(model_name, version, request.stage)
        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to transition model stage: {str(e)}")

@router.get("/{model_name}/latest-production")
def get_latest_production_model(model_name: str):
    try:
        model = mlflow_service.get_model_details(model_name)
        
        production_versions = [
            v for v in model["versions"] 
            if v["stage"] == "Production"
        ]
        
        if not production_versions:
            raise HTTPException(status_code=404, detail="No production version found")
        
        latest = production_versions[0]
        return {
            "model_name": model_name,
            "version": latest["version"],
            "stage": latest["stage"],
            "run_id": latest["run_id"],
            "source": latest["source"]
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get production model: {str(e)}")
