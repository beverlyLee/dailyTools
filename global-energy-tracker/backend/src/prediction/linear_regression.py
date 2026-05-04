import numpy as np
import pandas as pd
from typing import Dict, Any, Tuple, Optional
from sklearn.linear_model import LinearRegression
from sklearn.metrics import mean_squared_error, r2_score
from sklearn.model_selection import train_test_split

class LinearRegressionModel:
    """
    线性回归模型类，用于能源趋势预测
    包含模型训练、预测、评估和验证功能
    """
    
    def __init__(self):
        """
        初始化线性回归模型
        """
        self.model = LinearRegression()
        self.is_trained = False
        self.coefficients = None
        self.intercept = None
    
    def train(self, X: np.ndarray, y: np.ndarray) -> None:
        """
        训练线性回归模型
        
        Args:
            X: 特征矩阵，形状为 (n_samples, n_features)
            y: 目标变量数组，形状为 (n_samples,)
        """
        # 确保输入是numpy数组
        X = np.array(X)
        y = np.array(y)
        
        # 检查输入形状
        if X.ndim == 1:
            X = X.reshape(-1, 1)
        
        # 训练模型
        self.model.fit(X, y)
        
        # 保存模型参数
        self.coefficients = self.model.coef_
        self.intercept = self.model.intercept_
        self.is_trained = True
    
    def predict(self, X: np.ndarray) -> np.ndarray:
        """
        使用训练好的模型进行预测
        
        Args:
            X: 特征矩阵，形状为 (n_samples, n_features)
        
        Returns:
            预测结果数组，形状为 (n_samples,)
        """
        if not self.is_trained:
            raise RuntimeError("模型尚未训练，请先调用 train() 方法")
        
        # 确保输入是numpy数组
        X = np.array(X)
        
        # 检查输入形状
        if X.ndim == 1:
            X = X.reshape(-1, 1)
        
        # 进行预测
        return self.model.predict(X)
    
    def evaluate(self, X: np.ndarray, y: np.ndarray) -> Dict[str, float]:
        """
        评估模型性能
        
        Args:
            X: 特征矩阵，形状为 (n_samples, n_features)
            y: 真实目标变量数组，形状为 (n_samples,)
        
        Returns:
            包含评估指标的字典，包括 MSE 和 R²
        """
        if not self.is_trained:
            raise RuntimeError("模型尚未训练，请先调用 train() 方法")
        
        # 确保输入是numpy数组
        X = np.array(X)
        y = np.array(y)
        
        # 检查输入形状
        if X.ndim == 1:
            X = X.reshape(-1, 1)
        
        # 进行预测
        y_pred = self.predict(X)
        
        # 计算评估指标
        mse = mean_squared_error(y, y_pred)
        r2 = r2_score(y, y_pred)
        
        return {
            'mse': mse,
            'r2': r2
        }
    
    def train_test_split_evaluate(
        self, 
        X: np.ndarray, 
        y: np.ndarray, 
        test_size: float = 0.2, 
        random_state: Optional[int] = 42
    ) -> Dict[str, Any]:
        """
        使用训练集-测试集划分来评估模型性能
        
        Args:
            X: 特征矩阵，形状为 (n_samples, n_features)
            y: 目标变量数组，形状为 (n_samples,)
            test_size: 测试集比例，默认为 0.2
            random_state: 随机种子，默认为 42
        
        Returns:
            包含训练和测试评估指标的字典
        """
        # 确保输入是numpy数组
        X = np.array(X)
        y = np.array(y)
        
        # 检查输入形状
        if X.ndim == 1:
            X = X.reshape(-1, 1)
        
        # 划分训练集和测试集
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=test_size, random_state=random_state
        )
        
        # 在训练集上训练模型
        self.train(X_train, y_train)
        
        # 评估训练集性能
        train_metrics = self.evaluate(X_train, y_train)
        
        # 评估测试集性能
        test_metrics = self.evaluate(X_test, y_test)
        
        return {
            'train_metrics': train_metrics,
            'test_metrics': test_metrics,
            'train_size': len(X_train),
            'test_size': len(X_test)
        }
    
    def get_model_parameters(self) -> Dict[str, Any]:
        """
        获取模型参数
        
        Returns:
            包含模型参数的字典
        """
        if not self.is_trained:
            raise RuntimeError("模型尚未训练，请先调用 train() 方法")
        
        return {
            'coefficients': self.coefficients.tolist(),
            'intercept': self.intercept,
            'equation': self._get_equation()
        }
    
    def _get_equation(self) -> str:
        """
        获取回归方程的字符串表示
        
        Returns:
            回归方程字符串
        """
        if not self.is_trained:
            raise RuntimeError("模型尚未训练，请先调用 train() 方法")
        
        # 构建方程字符串
        equation = f"y = {self.intercept:.4f}"
        
        for i, coef in enumerate(self.coefficients):
            if coef >= 0:
                equation += f" + {coef:.4f}x{i+1}"
            else:
                equation += f" - {abs(coef):.4f}x{i+1}"
        
        return equation
    
    def validate_model(
        self, 
        X: np.ndarray, 
        y: np.ndarray, 
        n_folds: int = 5
    ) -> Dict[str, Any]:
        """
        使用交叉验证验证模型性能
        
        Args:
            X: 特征矩阵，形状为 (n_samples, n_features)
            y: 目标变量数组，形状为 (n_samples,)
            n_folds: 交叉验证的折数，默认为 5
        
        Returns:
            包含交叉验证结果的字典
        """
        from sklearn.model_selection import cross_val_score
        
        # 确保输入是numpy数组
        X = np.array(X)
        y = np.array(y)
        
        # 检查输入形状
        if X.ndim == 1:
            X = X.reshape(-1, 1)
        
        # 使用交叉验证评估模型
        mse_scores = cross_val_score(
            self.model, X, y, cv=n_folds, scoring='neg_mean_squared_error'
        )
        r2_scores = cross_val_score(
            self.model, X, y, cv=n_folds, scoring='r2'
        )
        
        # 转换为正数MSE
        mse_scores = -mse_scores
        
        # 计算统计指标
        mse_mean = np.mean(mse_scores)
        mse_std = np.std(mse_scores)
        r2_mean = np.mean(r2_scores)
        r2_std = np.std(r2_scores)
        
        return {
            'n_folds': n_folds,
            'mse_scores': mse_scores.tolist(),
            'mse_mean': mse_mean,
            'mse_std': mse_std,
            'r2_scores': r2_scores.tolist(),
            'r2_mean': r2_mean,
            'r2_std': r2_std
        }
