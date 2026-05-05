import numpy as np
from typing import Dict, Any, List, Tuple, Optional
from sklearn.linear_model import LinearRegression
from sklearn.metrics import mean_squared_error, mean_absolute_error, r2_score
import joblib
import os

from .data_processor import DataProcessor


class ModelTrainer:
    def __init__(self, model_path: Optional[str] = None, scaler_path: Optional[str] = None):
        self.model: Optional[LinearRegression] = None
        self.model_path = model_path
        self.scaler_path = scaler_path
        self.data_processor: Optional[DataProcessor] = None
        self.metrics: Optional[Dict[str, float]] = None
        self.residual_data: Optional[Dict[str, Any]] = None
    
    def set_data_processor(self, data_processor: DataProcessor):
        self.data_processor = data_processor
    
    def train(
        self,
        X_train: np.ndarray,
        y_train: np.ndarray,
        X_test: np.ndarray,
        y_test: np.ndarray
    ) -> Dict[str, Any]:
        self.model = LinearRegression()
        self.model.fit(X_train, y_train)
        
        y_train_pred = self.model.predict(X_train)
        y_test_pred = self.model.predict(X_test)
        
        if self.data_processor:
            y_test_actual = self.data_processor.inverse_transform_target(y_test)
            y_test_pred_actual = self.data_processor.inverse_transform_target(y_test_pred)
            
            mse = mean_squared_error(y_test_actual, y_test_pred_actual)
            rmse = np.sqrt(mse)
            mae = mean_absolute_error(y_test_actual, y_test_pred_actual)
            r2 = r2_score(y_test_actual, y_test_pred_actual)
            
            self.residual_data = {
                "actual": y_test_actual.flatten().tolist(),
                "predicted": y_test_pred_actual.flatten().tolist(),
                "residuals": (y_test_actual - y_test_pred_actual).flatten().tolist()
            }
        else:
            mse = mean_squared_error(y_test, y_test_pred)
            rmse = np.sqrt(mse)
            mae = mean_absolute_error(y_test, y_test_pred)
            r2 = r2_score(y_test, y_test_pred)
            
            self.residual_data = {
                "actual": y_test.flatten().tolist(),
                "predicted": y_test_pred.flatten().tolist(),
                "residuals": (y_test - y_test_pred).flatten().tolist()
            }
        
        self.metrics = {
            "r2_score": float(r2),
            "mse": float(mse),
            "rmse": float(rmse),
            "mae": float(mae)
        }
        
        coefficients = self.model.coef_.flatten().tolist() if self.model.coef_ is not None else []
        intercept = float(self.model.intercept_[0]) if hasattr(self.model.intercept_, '__len__') else float(self.model.intercept_)
        
        feature_names = self.data_processor.feature_names if self.data_processor else []
        feature_importance = self._calculate_feature_importance(coefficients, feature_names)
        
        return {
            "metrics": self.metrics,
            "coefficients": coefficients,
            "intercept": intercept,
            "feature_names": feature_names,
            "feature_importance": feature_importance
        }
    
    def _calculate_feature_importance(
        self,
        coefficients: List[float],
        feature_names: List[str]
    ) -> List[Dict[str, Any]]:
        if not coefficients or not feature_names:
            return []
        
        abs_coefficients = [abs(c) for c in coefficients]
        total_abs = sum(abs_coefficients) if sum(abs_coefficients) > 0 else 1
        
        importance_list = []
        for name, coef, abs_coef in zip(feature_names, coefficients, abs_coefficients):
            importance_list.append({
                "name": name,
                "coefficient": float(coef),
                "absolute_value": float(abs_coef),
                "importance": float(abs_coef / total_abs * 100)
            })
        
        importance_list.sort(key=lambda x: x["absolute_value"], reverse=True)
        
        return importance_list
    
    def predict(self, X: np.ndarray) -> np.ndarray:
        if self.model is None:
            raise ValueError("Model not trained")
        return self.model.predict(X)
    
    def save_model(self, path: Optional[str] = None):
        if self.model is None:
            raise ValueError("Model not trained")
        
        save_path = path or self.model_path
        if save_path:
            os.makedirs(os.path.dirname(save_path), exist_ok=True)
            joblib.dump(self.model, save_path)
    
    def load_model(self, path: Optional[str] = None):
        load_path = path or self.model_path
        if load_path and os.path.exists(load_path):
            self.model = joblib.load(load_path)
            return True
        return False
    
    def get_metrics(self) -> Optional[Dict[str, float]]:
        return self.metrics
    
    def get_residual_data(self) -> Optional[Dict[str, Any]]:
        return self.residual_data
