import pandas as pd
import numpy as np
import sys
import os

# 添加当前目录到Python路径
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from data_loader.data_loader import DataLoader
from prediction.linear_regression import LinearRegressionModel

def main():
    print("Global Energy Tracker - Backend Application")
    print("=" * 50)
    
    # 初始化数据加载器
    loader = DataLoader()
    
    # 加载示例数据
    print("\n1. 加载能源数据...")
    energy_data = loader.load_energy_data()
    print(f"   - 成功加载 {len(energy_data)} 条能源数据记录")
    
    # 加载可再生能源数据
    print("\n2. 加载可再生能源数据...")
    renewable_data = loader.load_renewable_data()
    print(f"   - 成功加载 {len(renewable_data)} 条可再生能源数据记录")
    
    # 数据清洗示例
    print("\n3. 执行数据清洗...")
    cleaned_energy_data = loader.clean_data(energy_data)
    cleaned_renewable_data = loader.clean_data(renewable_data)
    print(f"   - 能源数据清洗后剩余 {len(cleaned_energy_data)} 条记录")
    print(f"   - 可再生能源数据清洗后剩余 {len(cleaned_renewable_data)} 条记录")
    
    # 趋势预测示例
    print("\n4. 执行趋势预测...")
    model = LinearRegressionModel()
    
    # 准备能源消耗趋势数据
    energy_trend = cleaned_energy_data.groupby('Year')['Energy_Consumption'].sum().reset_index()
    
    # 训练模型
    X = energy_trend[['Year']].values
    y = energy_trend['Energy_Consumption'].values
    model.train(X, y)
    
    # 预测未来5年
    future_years = np.array([[2023], [2024], [2025], [2026], [2027]])
    predictions = model.predict(future_years)
    
    print("   - 未来5年能源消耗预测:")
    for year, prediction in zip(future_years.flatten(), predictions):
        print(f"     {year}: {prediction:.2f} 百万吨油当量")
    
    # 模型评估
    print("\n5. 模型评估...")
    metrics = model.evaluate(X, y)
    print(f"   - 均方误差 (MSE): {metrics['mse']:.4f}")
    print(f"   - 决定系数 (R²): {metrics['r2']:.4f}")
    
    print("\n" + "=" * 50)
    print("应用执行完成!")

if __name__ == "__main__":
    main()
