import pandas as pd
import numpy as np
from sklearn.preprocessing import StandardScaler, MinMaxScaler
from sklearn.model_selection import train_test_split
from typing import Tuple, Dict, Any
import json


class DataService:
    def __init__(self):
        self.scaler = None
        self.feature_columns = []
        self.target_column = ""
        
    def load_csv(self, file_path: str) -> pd.DataFrame:
        try:
            df = pd.read_csv(file_path)
            return df
        except Exception as e:
            raise Exception(f"无法加载CSV文件: {str(e)}")
    
    def clean_data(self, df: pd.DataFrame, target_column: str = "price") -> pd.DataFrame:
        df = df.copy()
        
        df = df.dropna()
        
        for col in df.columns:
            if df[col].dtype == 'object':
                try:
                    df[col] = pd.to_numeric(df[col], errors='coerce')
                except:
                    pass
        
        df = df.dropna()
        
        numeric_cols = df.select_dtypes(include=[np.number]).columns
        df = df[numeric_cols]
        
        Q1 = df.quantile(0.25)
        Q3 = df.quantile(0.75)
        IQR = Q3 - Q1
        df = df[~((df < (Q1 - 1.5 * IQR)) | (df > (Q3 + 1.5 * IQR))).any(axis=1)]
        
        return df
    
    def prepare_features(self, df: pd.DataFrame, target_column: str = "price") -> Tuple[pd.DataFrame, pd.Series]:
        if target_column not in df.columns:
            raise Exception(f"目标列 {target_column} 不存在于数据中")
        
        self.target_column = target_column
        self.feature_columns = [col for col in df.columns if col != target_column]
        
        X = df[self.feature_columns]
        y = df[target_column]
        
        return X, y
    
    def normalize_data(self, X: pd.DataFrame, method: str = "standard") -> Tuple[np.ndarray, Any]:
        if method == "standard":
            self.scaler = StandardScaler()
        elif method == "minmax":
            self.scaler = MinMaxScaler()
        else:
            raise Exception(f"不支持的归一化方法: {method}")
        
        X_normalized = self.scaler.fit_transform(X)
        return X_normalized, self.scaler
    
    def split_data(self, X: np.ndarray, y: pd.Series, test_size: float = 0.2, random_state: int = 42) -> Tuple:
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=test_size, random_state=random_state
        )
        return X_train, X_test, y_train, y_test
    
    def get_feature_ranges(self, df: pd.DataFrame) -> Dict[str, Dict[str, float]]:
        ranges = {}
        for col in df.columns:
            if col != self.target_column:
                ranges[col] = {
                    "min": float(df[col].min()),
                    "max": float(df[col].max()),
                    "mean": float(df[col].mean()),
                    "std": float(df[col].std())
                }
        return ranges
    
    def prepare_single_sample(self, features: Dict[str, float]) -> np.ndarray:
        if not self.scaler:
            raise Exception("请先训练模型以获取归一化器")
        
        feature_values = []
        for col in self.feature_columns:
            if col not in features:
                raise Exception(f"缺少特征: {col}")
            feature_values.append(features[col])
        
        sample = np.array(feature_values).reshape(1, -1)
        sample_normalized = self.scaler.transform(sample)
        
        return sample_normalized
    
    def get_feature_info(self, df: pd.DataFrame) -> Dict[str, Any]:
        info = {
            "total_samples": len(df),
            "feature_count": len(self.feature_columns),
            "features": self.feature_columns,
            "target": self.target_column,
            "statistics": {}
        }
        
        for col in self.feature_columns:
            info["statistics"][col] = {
                "min": float(df[col].min()),
                "max": float(df[col].max()),
                "mean": round(float(df[col].mean()), 2),
                "std": round(float(df[col].std()), 2),
                "correlation_with_price": round(float(df[col].corr(df[self.target_column])), 3)
            }
        
        return info
