import numpy as np
from typing import Dict, Any, List, Optional
import os

from .data_processor import DataProcessor
from .model_trainer import ModelTrainer


class HousePricePredictor:
    _instance: Optional['HousePricePredictor'] = None
    
    def __new__(cls, *args, **kwargs):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance
    
    def __init__(
        self,
        data_path: Optional[str] = None,
        model_path: Optional[str] = None,
        scaler_path: Optional[str] = None
    ):
        if hasattr(self, '_initialized') and self._initialized:
            return
        
        self.data_processor = DataProcessor(data_path)
        self.model_trainer = ModelTrainer(model_path, scaler_path)
        self.model_trainer.set_data_processor(self.data_processor)
        self._initialized = False
        self._is_trained = False
    
    def initialize(self, force_retrain: bool = False):
        if self._initialized and not force_retrain:
            return
        
        self.data_processor.load_data(use_sample=True)
        
        if self.model_trainer.load_model() and not force_retrain:
            self._is_trained = True
        else:
            self.train_model()
        
        self._initialized = True
    
    def train_model(
        self,
        test_size: float = 0.2,
        random_state: int = 42
    ) -> Dict[str, Any]:
        if self.data_processor.df is None:
            self.data_processor.load_data(use_sample=True)
        
        clean_df = self.data_processor.clean_data()
        
        X_train, X_test, y_train, y_test = self.data_processor.split_and_scale(
            clean_df, test_size, random_state
        )
        
        training_result = self.model_trainer.train(X_train, y_train, X_test, y_test)
        self._is_trained = True
        
        self.model_trainer.save_model()
        
        return training_result
    
    def predict(self, features: Dict[str, float]) -> Dict[str, Any]:
        if not self._is_trained:
            self.initialize()
        
        X_scaled = self.data_processor.scale_features(features)
        y_pred_scaled = self.model_trainer.predict(X_scaled)
        y_pred = self.data_processor.inverse_transform_target(y_pred_scaled)
        
        predicted_price = float(y_pred[0][0])
        
        feature_contributions = self._calculate_feature_contributions(features)
        
        return {
            "predicted_price": predicted_price,
            "predicted_price_formatted": f"{predicted_price:,.0f} 元",
            "feature_contributions": feature_contributions,
            "input_features": features
        }
    
    def _calculate_feature_contributions(
        self,
        features: Dict[str, float]
    ) -> List[Dict[str, Any]]:
        if self.model_trainer.model is None:
            return []
        
        coefficients = self.model_trainer.model.coef_.flatten().tolist()
        feature_names = self.data_processor.feature_names
        
        contributions = []
        for name, coef in zip(feature_names, coefficients):
            value = features.get(name, 0.0)
            
            info = next((f for f in self.data_processor.FEATURE_INFO if f["name"] == name), None)
            display_name = info["display_name"] if info else name
            
            contributions.append({
                "name": name,
                "display_name": display_name,
                "value": value,
                "coefficient": float(coef),
                "impact": float(coef * value)
            })
        
        return contributions
    
    def get_feature_info(self) -> List[Dict[str, Any]]:
        return self.data_processor.get_feature_info()
    
    def get_dataset_stats(self) -> Dict[str, Any]:
        if self.data_processor.df is None:
            self.data_processor.load_data(use_sample=True)
        
        return self.data_processor.get_dataset_stats()
    
    def get_model_metrics(self) -> Optional[Dict[str, float]]:
        return self.model_trainer.get_metrics()
    
    def get_residual_data(self) -> Optional[Dict[str, Any]]:
        return self.model_trainer.get_residual_data()
    
    def get_feature_importance(self) -> List[Dict[str, Any]]:
        if self.model_trainer.model is None:
            return []
        
        coefficients = self.model_trainer.model.coef_.flatten().tolist()
        feature_names = self.data_processor.feature_names
        
        abs_coefficients = [abs(c) for c in coefficients]
        total_abs = sum(abs_coefficients) if sum(abs_coefficients) > 0 else 1
        
        importance_list = []
        for name, coef, abs_coef in zip(feature_names, coefficients, abs_coefficients):
            info = next((f for f in self.data_processor.FEATURE_INFO if f["name"] == name), None)
            display_name = info["display_name"] if info else name
            
            importance_list.append({
                "name": name,
                "display_name": display_name,
                "coefficient": float(coef),
                "absolute_value": float(abs_coef),
                "importance": float(abs_coef / total_abs * 100)
            })
        
        importance_list.sort(key=lambda x: x["absolute_value"], reverse=True)
        
        return importance_list
    
    def get_default_features(self) -> Dict[str, float]:
        defaults = {}
        for info in self.data_processor.FEATURE_INFO:
            defaults[info["name"]] = info["default_value"]
        return defaults
    
    def is_trained(self) -> bool:
        return self._is_trained
