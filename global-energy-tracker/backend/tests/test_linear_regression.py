import pytest
import numpy as np
import sys
import os

# 添加src目录到Python路径
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'src')))

from prediction.linear_regression import LinearRegressionModel


class TestLinearRegressionModel:
    """测试线性回归模型类"""
    
    def setup_method(self):
        """每个测试方法前的初始化"""
        self.model = LinearRegressionModel()
        
        # 创建测试数据
        np.random.seed(42)  # 设置随机种子以确保可重复性
        self.X = np.array([[i] for i in range(10)])  # 特征：0-9
        self.y = np.array([2 * i + 1 + np.random.normal(0, 0.5) for i in range(10)])  # 目标：y = 2x + 1 + 噪声
    
    def test_initialization(self):
        """测试初始化"""
        # 测试默认初始化
        assert self.model is not None
        assert self.model.model is not None
        assert self.model.is_trained == False
        assert self.model.coefficients is None
        assert self.model.intercept is None
    
    def test_train(self):
        """测试模型训练"""
        # 训练模型
        self.model.train(self.X, self.y)
        
        # 检查模型是否已训练
        assert self.model.is_trained == True
        
        # 检查系数和截距是否已设置
        assert self.model.coefficients is not None
        assert self.model.intercept is not None
        
        # 检查系数是否接近预期值（应该接近2）
        assert abs(self.model.coefficients[0] - 2) < 0.5
        
        # 检查截距是否接近预期值（应该接近1）
        assert abs(self.model.intercept - 1) < 1.0
    
    def test_predict_before_training(self):
        """测试训练前预测（应该抛出异常）"""
        with pytest.raises(RuntimeError, match='模型尚未训练'):
            self.model.predict(self.X)
    
    def test_predict(self):
        """测试模型预测"""
        # 训练模型
        self.model.train(self.X, self.y)
        
        # 进行预测
        predictions = self.model.predict(self.X)
        
        # 检查预测结果的形状
        assert len(predictions) == len(self.y)
        
        # 检查预测值是否合理（应该接近真实值）
        for i in range(len(self.y)):
            assert abs(predictions[i] - self.y[i]) < 2.0
    
    def test_evaluate_before_training(self):
        """测试训练前评估（应该抛出异常）"""
        with pytest.raises(RuntimeError, match='模型尚未训练'):
            self.model.evaluate(self.X, self.y)
    
    def test_evaluate(self):
        """测试模型评估"""
        # 训练模型
        self.model.train(self.X, self.y)
        
        # 评估模型
        metrics = self.model.evaluate(self.X, self.y)
        
        # 检查返回的指标
        assert 'mse' in metrics
        assert 'r2' in metrics
        
        # 检查MSE是否合理（应该小于2.0）
        assert metrics['mse'] < 2.0
        
        # 检查R²是否合理（应该接近1.0）
        assert metrics['r2'] > 0.8
    
    def test_train_test_split_evaluate(self):
        """测试训练集-测试集划分评估"""
        # 执行训练集-测试集划分评估
        result = self.model.train_test_split_evaluate(
            self.X, self.y, test_size=0.2, random_state=42
        )
        
        # 检查返回结果
        assert 'train_metrics' in result
        assert 'test_metrics' in result
        assert 'train_size' in result
        assert 'test_size' in result
        
        # 检查训练集和测试集大小
        assert result['train_size'] == 8  # 10个样本，20%测试集，所以训练集8个
        assert result['test_size'] == 2    # 测试集2个
        
        # 检查指标是否存在
        assert 'mse' in result['train_metrics']
        assert 'r2' in result['train_metrics']
        assert 'mse' in result['test_metrics']
        assert 'r2' in result['test_metrics']
    
    def test_get_model_parameters_before_training(self):
        """测试训练前获取模型参数（应该抛出异常）"""
        with pytest.raises(RuntimeError, match='模型尚未训练'):
            self.model.get_model_parameters()
    
    def test_get_model_parameters(self):
        """测试获取模型参数"""
        # 训练模型
        self.model.train(self.X, self.y)
        
        # 获取模型参数
        params = self.model.get_model_parameters()
        
        # 检查返回的参数
        assert 'coefficients' in params
        assert 'intercept' in params
        assert 'equation' in params
        
        # 检查系数和截距
        assert params['coefficients'] == self.model.coefficients.tolist()
        assert params['intercept'] == self.model.intercept
        
        # 检查方程字符串格式
        assert 'y = ' in params['equation']
    
    def test_validate_model(self):
        """测试模型交叉验证"""
        # 执行交叉验证
        result = self.model.validate_model(self.X, self.y, n_folds=5)
        
        # 检查返回结果
        assert 'n_folds' in result
        assert 'mse_scores' in result
        assert 'mse_mean' in result
        assert 'mse_std' in result
        assert 'r2_scores' in result
        assert 'r2_mean' in result
        assert 'r2_std' in result
        
        # 检查折数
        assert result['n_folds'] == 5
        
        # 检查分数数组长度
        assert len(result['mse_scores']) == 5
        assert len(result['r2_scores']) == 5
        
        # 检查统计指标
        assert isinstance(result['mse_mean'], float)
        assert isinstance(result['mse_std'], float)
        assert isinstance(result['r2_mean'], float)
        assert isinstance(result['r2_std'], float)
        
        # 检查R²均值是否合理
        assert result['r2_mean'] > 0.5  # 应该有一定的拟合度
    
    def test_input_shape_handling(self):
        """测试输入形状处理"""
        # 测试一维数组输入
        X_1d = np.array([i for i in range(10)])
        y_1d = np.array([2 * i + 1 for i in range(10)])
        
        # 训练模型（应该自动转换为二维）
        self.model.train(X_1d, y_1d)
        
        # 检查模型是否已训练
        assert self.model.is_trained == True
        
        # 进行预测（一维输入）
        predictions = self.model.predict(X_1d)
        
        # 检查预测结果
        assert len(predictions) == len(y_1d)
    
    def test_linearity(self):
        """测试线性关系拟合"""
        # 创建完全线性的数据
        X_linear = np.array([[i] for i in range(100)])
        y_linear = np.array([3 * i + 5 for i in range(100)])  # 完全线性：y = 3x + 5
        
        # 训练模型
        self.model.train(X_linear, y_linear)
        
        # 评估模型
        metrics = self.model.evaluate(X_linear, y_linear)
        
        # 对于完全线性的数据，MSE应该接近0，R²应该接近1
        assert metrics['mse'] < 0.001
        assert abs(metrics['r2'] - 1.0) < 0.001
        
        # 检查系数和截距
        assert abs(self.model.coefficients[0] - 3.0) < 0.001
        assert abs(self.model.intercept - 5.0) < 0.001
    
    def test_prediction_accuracy(self):
        """测试预测准确性"""
        # 训练模型
        self.model.train(self.X, self.y)
        
        # 预测已知点
        test_X = np.array([[5]])
        prediction = self.model.predict(test_X)
        
        # 预期值应该接近 2*5 + 1 = 11
        expected = 11
        assert abs(prediction[0] - expected) < 2.0
    
    def test_model_equation_generation(self):
        """测试模型方程生成"""
        # 训练模型
        self.model.train(self.X, self.y)
        
        # 获取方程
        equation = self.model._get_equation()
        
        # 检查方程格式
        assert equation.startswith('y = ')
        
        # 检查是否包含系数和截距
        assert str(round(self.model.intercept, 4)) in equation
        
        # 检查是否包含x1项
        assert 'x1' in equation


if __name__ == '__main__':
    pytest.main([__file__, '-v'])
