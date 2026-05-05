import mlflow
from mlflow.tracking import MlflowClient
from typing import List, Dict, Any, Optional
from datetime import datetime
import json

from app.config import get_settings

settings = get_settings()

class MLFlowService:
    def __init__(self):
        self.tracking_uri = settings.MLFLOW_TRACKING_URI
        mlflow.set_tracking_uri(self.tracking_uri)
        self.client = MlflowClient()
    
    def list_experiments(self) -> List[Dict[str, Any]]:
        experiments = self.client.search_experiments()
        return [
            {
                "experiment_id": exp.experiment_id,
                "name": exp.name,
                "artifact_location": exp.artifact_location,
                "lifecycle_stage": exp.lifecycle_stage,
                "last_update_time": exp.last_update_time
            }
            for exp in experiments
        ]
    
    def get_experiment_runs(self, experiment_id: str) -> List[Dict[str, Any]]:
        runs = self.client.search_runs(
            experiment_ids=[experiment_id],
            order_by=["start_time DESC"]
        )
        
        runs_data = []
        for run in runs:
            run_info = {
                "run_id": run.info.run_id,
                "experiment_id": run.info.experiment_id,
                "status": run.info.status,
                "start_time": run.info.start_time,
                "end_time": run.info.end_time,
                "artifact_uri": run.info.artifact_uri,
                "params": dict(run.data.params),
                "metrics": dict(run.data.metrics),
                "tags": dict(run.data.tags) if run.data.tags else {}
            }
            runs_data.append(run_info)
        
        return runs_data
    
    def get_run_details(self, run_id: str) -> Dict[str, Any]:
        run = self.client.get_run(run_id)
        
        metric_history = {}
        for metric_name in run.data.metrics.keys():
            history = self.client.get_metric_history(run_id, metric_name)
            metric_history[metric_name] = [
                {"step": m.step, "value": m.value, "timestamp": m.timestamp}
                for m in history
            ]
        
        return {
            "run_id": run.info.run_id,
            "experiment_id": run.info.experiment_id,
            "status": run.info.status,
            "start_time": run.info.start_time,
            "end_time": run.info.end_time,
            "params": dict(run.data.params),
            "metrics": dict(run.data.metrics),
            "metric_history": metric_history,
            "tags": dict(run.data.tags) if run.data.tags else {}
        }
    
    def compare_runs(self, run_ids: List[str]) -> Dict[str, Any]:
        runs_data = []
        for run_id in run_ids:
            run = self.client.get_run(run_id)
            runs_data.append({
                "run_id": run_id,
                "params": dict(run.data.params),
                "metrics": dict(run.data.metrics)
            })
        
        all_params = set()
        all_metrics = set()
        for run in runs_data:
            all_params.update(run["params"].keys())
            all_metrics.update(run["metrics"].keys())
        
        params_comparison = {}
        for param in all_params:
            params_comparison[param] = {
                run["run_id"]: run["params"].get(param, None)
                for run in runs_data
            }
        
        metrics_comparison = {}
        for metric in all_metrics:
            metrics_comparison[metric] = {
                run["run_id"]: run["metrics"].get(metric, None)
                for run in runs_data
            }
        
        return {
            "runs": runs_data,
            "params_comparison": params_comparison,
            "metrics_comparison": metrics_comparison
        }
    
    def get_model_ranking(self, experiment_id: str, metric_name: str = "accuracy", 
                          higher_is_better: bool = True) -> List[Dict[str, Any]]:
        runs = self.client.search_runs(
            experiment_ids=[experiment_id],
            filter_string=f"metrics.{metric_name} IS NOT NULL",
            order_by=[f"metrics.{metric_name} {'DESC' if higher_is_better else 'ASC'}"]
        )
        
        ranking = []
        for i, run in enumerate(runs):
            ranking.append({
                "rank": i + 1,
                "run_id": run.info.run_id,
                "run_name": run.data.tags.get("mlflow.runName", f"Run {run.info.run_id[:8]}") if run.data.tags else f"Run {run.info.run_id[:8]}",
                metric_name: run.data.metrics.get(metric_name),
                "params": dict(run.data.params),
                "status": run.info.status
            })
        
        return ranking
    
    def register_best_model(self, experiment_id: str, model_name: str, 
                             metric_name: str = "accuracy", higher_is_better: bool = True) -> Dict[str, Any]:
        ranking = self.get_model_ranking(experiment_id, metric_name, higher_is_better)
        
        if not ranking:
            raise ValueError(f"No runs found with metric '{metric_name}'")
        
        best_run = ranking[0]
        run_id = best_run["run_id"]
        
        try:
            model_uri = f"runs:/{run_id}/model"
            registered_model = mlflow.register_model(model_uri, model_name)
            
            self.client.set_model_version_tag(
                registered_model.name,
                registered_model.version,
                "source_run",
                run_id
            )
            self.client.set_model_version_tag(
                registered_model.name,
                registered_model.version,
                metric_name,
                str(best_run[metric_name])
            )
            
            return {
                "model_name": registered_model.name,
                "version": registered_model.version,
                "run_id": run_id,
                metric_name: best_run[metric_name],
                "status": "registered"
            }
        except Exception as e:
            raise ValueError(f"Failed to register model: {str(e)}")
    
    def list_registered_models(self) -> List[Dict[str, Any]]:
        models = self.client.search_registered_models()
        
        models_data = []
        for model in models:
            latest_versions = []
            for version in model.latest_versions:
                latest_versions.append({
                    "version": version.version,
                    "stage": version.current_stage,
                    "run_id": version.run_id,
                    "source": version.source,
                    "status": version.status
                })
            
            models_data.append({
                "name": model.name,
                "creation_timestamp": model.creation_timestamp,
                "last_updated_timestamp": model.last_updated_timestamp,
                "description": model.description,
                "latest_versions": latest_versions
            })
        
        return models_data
    
    def get_model_details(self, model_name: str) -> Dict[str, Any]:
        model = self.client.get_registered_model(model_name)
        
        versions = []
        for version in self.client.search_model_versions(f"name='{model_name}'"):
            versions.append({
                "version": version.version,
                "stage": version.current_stage,
                "run_id": version.run_id,
                "source": version.source,
                "status": version.status,
                "creation_timestamp": version.creation_timestamp,
                "tags": dict(version.tags) if version.tags else {}
            })
        
        return {
            "name": model.name,
            "creation_timestamp": model.creation_timestamp,
            "last_updated_timestamp": model.last_updated_timestamp,
            "description": model.description,
            "tags": dict(model.tags) if model.tags else {},
            "versions": sorted(versions, key=lambda x: int(x["version"]), reverse=True)
        }
    
    def transition_model_stage(self, model_name: str, version: str, stage: str) -> Dict[str, Any]:
        valid_stages = ["Staging", "Production", "Archived", "None"]
        if stage not in valid_stages:
            raise ValueError(f"Invalid stage. Must be one of: {valid_stages}")
        
        self.client.transition_model_version_stage(
            name=model_name,
            version=version,
            stage=stage,
            archive_existing_versions=False
        )
        
        return {
            "model_name": model_name,
            "version": version,
            "stage": stage,
            "status": "updated"
        }
