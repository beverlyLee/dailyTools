import pandas as pd
import numpy as np
from typing import Dict, List, Tuple, Any
from sklearn.model_selection import train_test_split
from sklearn.linear_model import LinearRegression
from sklearn.preprocessing import StandardScaler, MinMaxScaler
from sklearn.metrics import mean_squared_error, r2_score
import json
import os

class HousingRegressionTrainer:
    """房价线性回归预测器"""
    
    def __init__(self):
        self.model = None
        self.scaler = None
        self.feature_names = None
        self.trained = False
        self.model_info = None
        
    def load_data(self, file_path: str) -> pd.DataFrame:
        """加载 CSV 数据"""
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"数据文件不存在: {file_path}")
        
        df = pd.read_csv(file_path)
        return df
    
    def preprocess_data(self, df: pd.DataFrame, target_col: str = 'price',
                       feature_cols: List[str] = None,
                       scaling_method: str = 'standard') -> Tuple[np.ndarray, np.ndarray, Dict]:
        """数据预处理"""
        # 如果未指定特征列，选择所有数值列（排除目标列）
        if feature_cols is None:
            numeric_cols = df.select_dtypes(include=[np.number]).columns.tolist()
            feature_cols = [col for col in numeric_cols if col != target_col]
        
        self.feature_names = feature_cols
        
        # 分离特征和目标
        X = df[feature_cols].values
        y = df[target_col].values
        
        # 处理缺失值
        X = np.nan_to_num(X, nan=np.nanmean(X, axis=0))
        y = np.nan_to_num(y, nan=np.nanmean(y))
        
        # 特征缩放
        if scaling_method == 'standard':
            self.scaler = StandardScaler()
        elif scaling_method == 'minmax':
            self.scaler = MinMaxScaler()
        else:
            self.scaler = None
        
        if self.scaler:
            X_scaled = self.scaler.fit_transform(X)
        else:
            X_scaled = X
        
        preprocess_info = {
            'feature_columns': feature_cols,
            'target_column': target_col,
            'scaling_method': scaling_method,
            'n_samples': len(X),
            'n_features': len(feature_cols)
        }
        
        return X_scaled, y, preprocess_info
    
    def train_model(self, X: np.ndarray, y: np.ndarray,
                   test_size: float = 0.2, random_state: int = 42) -> Dict:
        """训练线性回归模型"""
        # 划分训练集和测试集
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=test_size, random_state=random_state
        )
        
        # 创建并训练模型
        self.model = LinearRegression()
        self.model.fit(X_train, y_train)
        
        # 预测
        y_train_pred = self.model.predict(X_train)
        y_test_pred = self.model.predict(X_test)
        
        # 计算评估指标
        train_r2 = r2_score(y_train, y_train_pred)
        test_r2 = r2_score(y_test, y_test_pred)
        train_rmse = np.sqrt(mean_squared_error(y_train, y_train_pred))
        test_rmse = np.sqrt(mean_squared_error(y_test, y_test_pred))
        
        # 残差
        residuals = y_test - y_test_pred
        
        self.model_info = {
            'coefficients': self.model.coef_.tolist(),
            'intercept': self.model.intercept_,
            'feature_names': self.feature_names,
            'metrics': {
                'train_r2': train_r2,
                'test_r2': test_r2,
                'train_rmse': train_rmse,
                'test_rmse': test_rmse,
                'r_squared': test_r2,
                'rmse': test_rmse
            },
            'residuals': {
                'actual': y_test.tolist(),
                'predicted': y_test_pred.tolist(),
                'residuals': residuals.tolist()
            },
            'feature_importance': self.get_feature_importance()
        }
        
        self.trained = True
        
        return self.model_info
    
    def get_feature_importance(self) -> List[Dict]:
        """获取特征重要性（基于系数绝对值）"""
        if not self.trained:
            raise RuntimeError("模型尚未训练")
        
        importance = []
        for name, coef in zip(self.feature_names, self.model.coef_):
            importance.append({
                'feature': name,
                'coefficient': coef,
                'absolute_importance': abs(coef)
            })
        
        # 按绝对重要性排序
        importance.sort(key=lambda x: x['absolute_importance'], reverse=True)
        return importance
    
    def predict(self, features: Dict[str, float]) -> float:
        """预测房价"""
        if not self.trained:
            raise RuntimeError("模型尚未训练")
        
        # 按照特征名称顺序构建输入数组
        X_input = np.array([[features.get(name, 0.0) for name in self.feature_names]])
        
        # 缩放（如果有）
        if self.scaler:
            X_scaled = self.scaler.transform(X_input)
        else:
            X_scaled = X_input
        
        prediction = self.model.predict(X_scaled)[0]
        return float(prediction)
    
    def predict_batch(self, features_list: List[Dict[str, float]]) -> List[float]:
        """批量预测"""
        return [self.predict(features) for features in features_list]
    
    def train_from_file(self, file_path: str, target_col: str = 'price',
                       feature_cols: List[str] = None,
                       scaling_method: str = 'standard',
                       test_size: float = 0.2) -> Dict:
        """从文件加载数据并训练模型"""
        # 加载数据
        df = self.load_data(file_path)
        
        # 预处理
        X, y, preprocess_info = self.preprocess_data(
            df, target_col, feature_cols, scaling_method
        )
        
        # 训练
        model_info = self.train_model(X, y, test_size)
        
        # 合并信息
        result = {
            **model_info,
            'preprocess_info': preprocess_info,
            'data_info': {
                'columns': df.columns.tolist(),
                'dtypes': df.dtypes.astype(str).to_dict(),
                'sample_count': len(df)
            }
        }
        
        return result
    
    def save_model_info(self) -> Dict:
        """保存模型信息（用于存入数据库）"""
        if not self.trained:
            raise RuntimeError("模型尚未训练")
        
        return {
            'model_name': 'Linear_Regression_Housing',
            'features': json.dumps(self.feature_names),
            'coefficients': json.dumps(self.model.coef_.tolist()),
            'intercept': self.model.intercept_,
            'r_squared': self.model_info['metrics']['r_squared'],
            'rmse': self.model_info['metrics']['rmse'],
            'training_data_info': json.dumps({
                'feature_importance': self.model_info['feature_importance'],
                'metrics': self.model_info['metrics']
            })
        }
    
    def load_model_from_db(self, db_model: Any) -> None:
        """从数据库模型加载"""
        self.feature_names = json.loads(db_model.features)
        coefficients = json.loads(db_model.coefficients)
        
        # 创建模型
        self.model = LinearRegression()
        self.model.coef_ = np.array(coefficients)
        self.model.intercept_ = db_model.intercept
        
        self.model_info = {
            'coefficients': coefficients,
            'intercept': db_model.intercept,
            'feature_names': self.feature_names,
            'metrics': {
                'r_squared': db_model.r_squared,
                'rmse': db_model.rmse
            }
        }
        
        self.trained = True

regression_trainer = HousingRegressionTrainer()
