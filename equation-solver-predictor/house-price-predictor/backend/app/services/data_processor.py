import pandas as pd
import numpy as np
from typing import Dict, Any, List, Tuple, Optional
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import train_test_split
import os


class DataProcessor:
    FEATURE_INFO = [
        {
            "name": "area",
            "display_name": "房屋面积",
            "description": "房屋建筑面积（平方米）",
            "min_value": 30.0,
            "max_value": 300.0,
            "default_value": 100.0
        },
        {
            "name": "rooms",
            "display_name": "房间数量",
            "description": "卧室数量",
            "min_value": 1.0,
            "max_value": 6.0,
            "default_value": 3.0
        },
        {
            "name": "age",
            "display_name": "房龄",
            "description": "房屋建成年数",
            "min_value": 0.0,
            "max_value": 50.0,
            "default_value": 10.0
        },
        {
            "name": "floor",
            "display_name": "楼层",
            "description": "所在楼层",
            "min_value": 1.0,
            "max_value": 30.0,
            "default_value": 10.0
        },
        {
            "name": "distance_to_center",
            "display_name": "到市中心距离",
            "description": "距离市中心的距离（公里）",
            "min_value": 0.5,
            "max_value": 30.0,
            "default_value": 5.0
        },
        {
            "name": "gdp",
            "display_name": "城市GDP",
            "description": "城市年度GDP（亿元）",
            "min_value": 500.0,
            "max_value": 5000.0,
            "default_value": 2000.0
        },
        {
            "name": "population",
            "display_name": "城市人口",
            "description": "城市常住人口（万人）",
            "min_value": 100.0,
            "max_value": 2000.0,
            "default_value": 500.0
        },
        {
            "name": "interest_rate",
            "display_name": "房贷利率",
            "description": "商业房贷利率（%）",
            "min_value": 3.0,
            "max_value": 8.0,
            "default_value": 4.5
        }
    ]
    
    def __init__(self, data_path: Optional[str] = None):
        self.data_path = data_path
        self.scaler = StandardScaler()
        self.feature_scaler = StandardScaler()
        self.target_scaler = StandardScaler()
        self.df: Optional[pd.DataFrame] = None
        self.feature_names = [info["name"] for info in self.FEATURE_INFO]
        self.target_name = "price"
    
    def generate_sample_data(self, n_samples: int = 500) -> pd.DataFrame:
        np.random.seed(42)
        
        area = np.random.uniform(30, 300, n_samples)
        rooms = np.random.randint(1, 7, n_samples)
        age = np.random.uniform(0, 50, n_samples)
        floor = np.random.randint(1, 31, n_samples)
        distance_to_center = np.random.uniform(0.5, 30, n_samples)
        gdp = np.random.uniform(500, 5000, n_samples)
        population = np.random.uniform(100, 2000, n_samples)
        interest_rate = np.random.uniform(3, 8, n_samples)
        
        base_price = 15000
        price = (
            base_price +
            200 * area +
            5000 * rooms +
            -100 * age +
            200 * floor +
            -500 * distance_to_center +
            2 * gdp +
            5 * population +
            -3000 * interest_rate +
            np.random.normal(0, 10000, n_samples)
        )
        
        df = pd.DataFrame({
            "area": area,
            "rooms": rooms,
            "age": age,
            "floor": floor,
            "distance_to_center": distance_to_center,
            "gdp": gdp,
            "population": population,
            "interest_rate": interest_rate,
            "price": price
        })
        
        return df
    
    def load_data(self, use_sample: bool = True) -> pd.DataFrame:
        if use_sample or not self.data_path or not os.path.exists(self.data_path):
            self.df = self.generate_sample_data()
        else:
            self.df = pd.read_csv(self.data_path)
        
        return self.df
    
    def clean_data(self, df: Optional[pd.DataFrame] = None) -> pd.DataFrame:
        if df is None:
            df = self.df
        if df is None:
            raise ValueError("No data loaded")
        
        df = df.dropna()
        df = df[df["price"] > 0]
        
        for feature in self.feature_names:
            if feature in df.columns:
                info = next((f for f in self.FEATURE_INFO if f["name"] == feature), None)
                if info:
                    df = df[
                        (df[feature] >= info["min_value"]) &
                        (df[feature] <= info["max_value"])
                    ]
        
        return df.reset_index(drop=True)
    
    def split_and_scale(
        self,
        df: Optional[pd.DataFrame] = None,
        test_size: float = 0.2,
        random_state: int = 42
    ) -> Tuple[np.ndarray, np.ndarray, np.ndarray, np.ndarray]:
        if df is None:
            df = self.df
        if df is None:
            raise ValueError("No data loaded")
        
        X = df[self.feature_names].values
        y = df[self.target_name].values.reshape(-1, 1)
        
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=test_size, random_state=random_state
        )
        
        X_train_scaled = self.feature_scaler.fit_transform(X_train)
        X_test_scaled = self.feature_scaler.transform(X_test)
        
        y_train_scaled = self.target_scaler.fit_transform(y_train)
        y_test_scaled = self.target_scaler.transform(y_test)
        
        return X_train_scaled, X_test_scaled, y_train_scaled, y_test_scaled
    
    def scale_features(self, features: Dict[str, float]) -> np.ndarray:
        feature_values = []
        for name in self.feature_names:
            value = features.get(name, 0.0)
            feature_values.append(value)
        
        X = np.array(feature_values).reshape(1, -1)
        return self.feature_scaler.transform(X)
    
    def inverse_transform_target(self, y_scaled: np.ndarray) -> np.ndarray:
        return self.target_scaler.inverse_transform(y_scaled)
    
    def get_feature_info(self) -> List[Dict[str, Any]]:
        return self.FEATURE_INFO
    
    def get_dataset_stats(self, df: Optional[pd.DataFrame] = None) -> Dict[str, Any]:
        if df is None:
            df = self.df
        if df is None:
            raise ValueError("No data loaded")
        
        stats = {
            "total_samples": len(df),
            "features": self.feature_names,
            "target": self.target_name,
            "feature_stats": {},
            "target_stats": {}
        }
        
        for feature in self.feature_names:
            if feature in df.columns:
                stats["feature_stats"][feature] = {
                    "mean": float(df[feature].mean()),
                    "std": float(df[feature].std()),
                    "min": float(df[feature].min()),
                    "max": float(df[feature].max()),
                    "median": float(df[feature].median())
                }
        
        if self.target_name in df.columns:
            stats["target_stats"] = {
                "mean": float(df[self.target_name].mean()),
                "std": float(df[self.target_name].std()),
                "min": float(df[self.target_name].min()),
                "max": float(df[self.target_name].max()),
                "median": float(df[self.target_name].median())
            }
        
        return stats
    
    def save_data(self, df: pd.DataFrame, path: str):
        df.to_csv(path, index=False)
