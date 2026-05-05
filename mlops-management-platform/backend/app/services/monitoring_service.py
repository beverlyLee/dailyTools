import asyncio
import time
from typing import Dict, List, Any, Optional
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from collections import deque
import threading
import numpy as np
from scipy import stats

from app.config import get_settings

settings = get_settings()

@dataclass
class MetricPoint:
    timestamp: float
    value: float

@dataclass
class ServiceMetrics:
    service_name: str
    qps_history: deque = field(default_factory=lambda: deque(maxlen=1000))
    latency_history: deque = field(default_factory=lambda: deque(maxlen=1000))
    gpu_utilization_history: deque = field(default_factory=lambda: deque(maxlen=1000))
    prediction_distribution: Dict[str, int] = field(default_factory=dict)
    prediction_history: deque = field(default_factory=lambda: deque(maxlen=10000))
    baseline_distribution: Optional[Dict[str, float]] = None
    drift_score: float = 0.0
    drift_detected: bool = False
    
    def add_qps(self, value: float):
        self.qps_history.append(MetricPoint(timestamp=time.time(), value=value))
    
    def add_latency(self, value: float):
        self.latency_history.append(MetricPoint(timestamp=time.time(), value=value))
    
    def add_gpu_utilization(self, value: float):
        self.gpu_utilization_history.append(MetricPoint(timestamp=time.time(), value=value))
    
    def add_prediction(self, prediction: Any, timestamp: Optional[float] = None):
        ts = timestamp if timestamp else time.time()
        self.prediction_history.append({"prediction": prediction, "timestamp": ts})
        
        pred_str = str(prediction)
        if pred_str not in self.prediction_distribution:
            self.prediction_distribution[pred_str] = 0
        self.prediction_distribution[pred_str] += 1
        
        self._calculate_drift()
    
    def set_baseline(self, predictions: List[Any]):
        dist = {}
        for pred in predictions:
            pred_str = str(pred)
            if pred_str not in dist:
                dist[pred_str] = 0
            dist[pred_str] += 1
        
        total = len(predictions)
        self.baseline_distribution = {k: v/total for k, v in dist.items()}
    
    def _calculate_drift(self):
        if not self.baseline_distribution or not self.prediction_distribution:
            self.drift_score = 0.0
            self.drift_detected = False
            return
        
        current_total = sum(self.prediction_distribution.values())
        if current_total < 10:
            self.drift_score = 0.0
            self.drift_detected = False
            return
        
        current_dist = {k: v/current_total for k, v in self.prediction_distribution.items()}
        
        all_categories = set(self.baseline_distribution.keys()) | set(current_dist.keys())
        
        baseline_probs = []
        current_probs = []
        for cat in all_categories:
            baseline_probs.append(self.baseline_distribution.get(cat, 0.001))
            current_probs.append(current_dist.get(cat, 0.001))
        
        baseline_probs = np.array(baseline_probs) / np.sum(baseline_probs)
        current_probs = np.array(current_probs) / np.sum(current_probs)
        
        kl_divergence = stats.entropy(baseline_probs, current_probs)
        
        self.drift_score = kl_divergence
        self.drift_detected = kl_divergence > 0.5
    
    def get_recent_metrics(self, minutes: int = 5) -> Dict[str, Any]:
        cutoff_time = time.time() - (minutes * 60)
        
        qps_recent = [m.value for m in self.qps_history if m.timestamp >= cutoff_time]
        latency_recent = [m.value for m in self.latency_history if m.timestamp >= cutoff_time]
        gpu_recent = [m.value for m in self.gpu_utilization_history if m.timestamp >= cutoff_time]
        
        return {
            "qps": {
                "current": qps_recent[-1] if qps_recent else 0,
                "average": np.mean(qps_recent) if qps_recent else 0,
                "max": max(qps_recent) if qps_recent else 0,
                "min": min(qps_recent) if qps_recent else 0,
                "history": [{"timestamp": m.timestamp, "value": m.value} 
                           for m in self.qps_history if m.timestamp >= cutoff_time]
            },
            "latency": {
                "current": latency_recent[-1] if latency_recent else 0,
                "average": np.mean(latency_recent) if latency_recent else 0,
                "p95": np.percentile(latency_recent, 95) if latency_recent else 0,
                "p99": np.percentile(latency_recent, 99) if latency_recent else 0,
                "history": [{"timestamp": m.timestamp, "value": m.value} 
                           for m in self.latency_history if m.timestamp >= cutoff_time]
            },
            "gpu_utilization": {
                "current": gpu_recent[-1] if gpu_recent else 0,
                "average": np.mean(gpu_recent) if gpu_recent else 0,
                "max": max(gpu_recent) if gpu_recent else 0,
                "history": [{"timestamp": m.timestamp, "value": m.value} 
                           for m in self.gpu_utilization_history if m.timestamp >= cutoff_time]
            },
            "prediction_distribution": self.prediction_distribution.copy(),
            "drift_score": self.drift_score,
            "drift_detected": self.drift_detected,
            "baseline_distribution": self.baseline_distribution
        }

class MonitoringService:
    def __init__(self):
        self.services: Dict[str, ServiceMetrics] = {}
        self._monitoring_thread: Optional[threading.Thread] = None
        self._stop_event = threading.Event()
        self._rollback_history: Dict[str, List[Dict[str, Any]]] = {}
    
    def register_service(self, service_name: str):
        if service_name not in self.services:
            self.services[service_name] = ServiceMetrics(service_name=service_name)
            self._rollback_history[service_name] = []
    
    def unregister_service(self, service_name: str):
        if service_name in self.services:
            del self.services[service_name]
    
    def get_service(self, service_name: str) -> Optional[ServiceMetrics]:
        return self.services.get(service_name)
    
    def record_request(self, service_name: str, latency: float):
        if service_name not in self.services:
            self.register_service(service_name)
        
        service = self.services[service_name]
        service.add_latency(latency)
        
        current_time = time.time()
        if not hasattr(service, '_last_request_count_time'):
            service._last_request_count_time = current_time
            service._request_count = 0
        
        service._request_count += 1
        
        time_diff = current_time - service._last_request_count_time
        if time_diff >= 1.0:
            qps = service._request_count / time_diff
            service.add_qps(qps)
            service._request_count = 0
            service._last_request_count_time = current_time
    
    def record_gpu_utilization(self, service_name: str, utilization: float):
        if service_name not in self.services:
            self.register_service(service_name)
        
        service = self.services[service_name]
        service.add_gpu_utilization(utilization)
    
    def record_prediction(self, service_name: str, prediction: Any):
        if service_name not in self.services:
            self.register_service(service_name)
        
        service = self.services[service_name]
        service.add_prediction(prediction)
    
    def set_baseline(self, service_name: str, predictions: List[Any]):
        if service_name not in self.services:
            self.register_service(service_name)
        
        service = self.services[service_name]
        service.set_baseline(predictions)
    
    def get_service_metrics(self, service_name: str, minutes: int = 5) -> Optional[Dict[str, Any]]:
        service = self.get_service(service_name)
        if not service:
            return None
        
        return service.get_recent_metrics(minutes)
    
    def get_all_services_metrics(self) -> List[Dict[str, Any]]:
        metrics_list = []
        for service_name in self.services:
            metrics = self.get_service_metrics(service_name)
            if metrics:
                metrics["service_name"] = service_name
                metrics_list.append(metrics)
        return metrics_list
    
    def record_rollback(self, service_name: str, from_version: str, to_version: str, 
                         reason: str = "Manual rollback"):
        if service_name not in self._rollback_history:
            self._rollback_history[service_name] = []
        
        rollback_record = {
            "timestamp": time.time(),
            "from_version": from_version,
            "to_version": to_version,
            "reason": reason
        }
        self._rollback_history[service_name].append(rollback_record)
        
        return rollback_record
    
    def get_rollback_history(self, service_name: str) -> List[Dict[str, Any]]:
        return self._rollback_history.get(service_name, [])
    
    def start_monitoring(self):
        if self._monitoring_thread and self._monitoring_thread.is_alive():
            return
        
        self._stop_event.clear()
        self._monitoring_thread = threading.Thread(target=self._monitoring_loop, daemon=True)
        self._monitoring_thread.start()
    
    def stop_monitoring(self):
        self._stop_event.set()
        if self._monitoring_thread:
            self._monitoring_thread.join(timeout=5)
    
    def _monitoring_loop(self):
        while not self._stop_event.is_set():
            for service_name in self.services:
                try:
                    gpu_util = self._simulate_gpu_utilization(service_name)
                    self.record_gpu_utilization(service_name, gpu_util)
                except Exception:
                    pass
            
            time.sleep(settings.MONITORING_INTERVAL)
    
    def _simulate_gpu_utilization(self, service_name: str) -> float:
        import random
        base_util = 60.0 + random.uniform(-10, 10)
        return max(0.0, min(100.0, base_util))
    
    def simulate_request(self, service_name: str):
        import random
        
        latency = random.uniform(5, 50)
        self.record_request(service_name, latency)
        
        predictions = ["cat", "dog", "bird", "fish"]
        prediction = random.choice(predictions)
        self.record_prediction(service_name, prediction)
        
        return {"latency": latency, "prediction": prediction}
