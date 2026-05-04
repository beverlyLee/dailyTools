import pytest
import pandas as pd
import numpy as np
import sys
import os

# 添加src目录到Python路径
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'src')))

from data_loader.data_loader import DataLoader


class TestDataLoader:
    """测试数据加载器类"""
    
    def setup_method(self):
        """每个测试方法前的初始化"""
        self.loader = DataLoader()
    
    def test_initialization(self):
        """测试初始化"""
        # 测试默认初始化
        assert self.loader is not None
        assert self.loader.data_dir is not None
        assert os.path.exists(self.loader.data_dir)
    
    def test_load_energy_data(self):
        """测试加载能源数据"""
        # 测试默认数据源（BP）
        data = self.loader.load_energy_data()
        assert isinstance(data, pd.DataFrame)
        assert len(data) > 0
        
        # 检查必要的列是否存在
        required_columns = ['Country', 'Year', 'Energy_Type', 'Energy_Consumption', 'Unit']
        for col in required_columns:
            assert col in data.columns
        
        # 测试EIA数据源
        eia_data = self.loader.load_energy_data(source='eia')
        assert isinstance(eia_data, pd.DataFrame)
        assert len(eia_data) > 0
        
        # 测试无效数据源
        with pytest.raises(ValueError):
            self.loader.load_energy_data(source='invalid')
    
    def test_load_renewable_data(self):
        """测试加载可再生能源数据"""
        # 测试默认数据源（BP）
        data = self.loader.load_renewable_data()
        assert isinstance(data, pd.DataFrame)
        assert len(data) > 0
        
        # 检查必要的列是否存在
        required_columns = ['Country', 'Year', 'Renewable_Type', 'Production', 'Unit']
        for col in required_columns:
            assert col in data.columns
        
        # 测试EIA数据源
        eia_data = self.loader.load_renewable_data(source='eia')
        assert isinstance(eia_data, pd.DataFrame)
        assert len(eia_data) > 0
        
        # 测试无效数据源
        with pytest.raises(ValueError):
            self.loader.load_renewable_data(source='invalid')
    
    def test_clean_data_missing_values(self):
        """测试数据清洗 - 处理缺失值"""
        # 创建包含缺失值的测试数据
        test_data = pd.DataFrame({
            'Year': [2020, 2021, 2022, 2023],
            'Value': [100, np.nan, 150, np.nan],
            'Category': ['A', 'B', 'C', 'D']
        })
        
        # 执行数据清洗
        cleaned_data = self.loader.clean_data(test_data)
        
        # 检查缺失值是否被处理
        assert cleaned_data['Value'].isnull().sum() == 0
        
        # 检查填充的值是否合理（应该是平均值）
        expected_mean = (100 + 150) / 2
        # 检查所有非原始值是否等于平均值
        for i, val in enumerate(cleaned_data['Value']):
            if pd.isna(test_data['Value'].iloc[i]):
                assert val == expected_mean
    
    def test_clean_data_outliers(self):
        """测试数据清洗 - 处理异常值"""
        # 创建包含异常值的测试数据
        test_data = pd.DataFrame({
            'Year': [2020, 2021, 2022, 2023, 2024],
            'Value': [100, 110, 105, 1000, 95]  # 1000是异常值
        })
        
        # 执行数据清洗
        cleaned_data = self.loader.clean_data(test_data)
        
        # 检查异常值是否被处理（应该被裁剪到合理范围）
        # 原始最大值是1000，清洗后应该小于这个值
        assert cleaned_data['Value'].max() < 1000
        
        # 检查最小值是否合理
        assert cleaned_data['Value'].min() >= 0
    
    def test_clean_data_data_types(self):
        """测试数据清洗 - 数据类型转换"""
        # 创建数据类型不正确的测试数据
        test_data = pd.DataFrame({
            'Year': ['2020', '2021', '2022', '2023'],  # 年份是字符串类型
            'Value': [100.0, 110.0, 120.0, 130.0]
        })
        
        # 执行数据清洗
        cleaned_data = self.loader.clean_data(test_data)
        
        # 检查年份列是否转换为整数类型
        assert cleaned_data['Year'].dtype == np.int64 or cleaned_data['Year'].dtype == np.int32
    
    def test_clean_data_duplicates(self):
        """测试数据清洗 - 去重"""
        # 创建包含重复数据的测试数据
        test_data = pd.DataFrame({
            'Year': [2020, 2021, 2020, 2022],
            'Value': [100, 110, 100, 120]
        })
        
        # 执行数据清洗
        cleaned_data = self.loader.clean_data(test_data)
        
        # 检查重复数据是否被移除
        assert len(cleaned_data) == 3  # 原始4条，去重后应该是3条
    
    def test_create_sample_energy_data(self):
        """测试创建示例能源数据"""
        # 调用私有方法创建示例数据
        sample_data = self.loader._create_sample_energy_data()
        
        # 检查数据格式
        assert isinstance(sample_data, pd.DataFrame)
        assert len(sample_data) > 0
        
        # 检查必要的列
        required_columns = ['Country', 'Year', 'Energy_Type', 'Energy_Consumption', 'Unit']
        for col in required_columns:
            assert col in sample_data.columns
        
        # 检查数据范围
        assert sample_data['Year'].min() == 2000
        assert sample_data['Year'].max() == 2022
        
        # 检查能源类型
        expected_energy_types = ['Oil', 'Natural Gas', 'Coal', 'Nuclear', 'Renewables']
        actual_energy_types = sample_data['Energy_Type'].unique()
        for et in expected_energy_types:
            assert et in actual_energy_types
    
    def test_create_sample_renewable_data(self):
        """测试创建示例可再生能源数据"""
        # 调用私有方法创建示例数据
        sample_data = self.loader._create_sample_renewable_data()
        
        # 检查数据格式
        assert isinstance(sample_data, pd.DataFrame)
        assert len(sample_data) > 0
        
        # 检查必要的列
        required_columns = ['Country', 'Year', 'Renewable_Type', 'Production', 'Unit']
        for col in required_columns:
            assert col in sample_data.columns
        
        # 检查数据范围
        assert sample_data['Year'].min() == 2000
        assert sample_data['Year'].max() == 2022
        
        # 检查可再生能源类型
        expected_renewable_types = ['Solar', 'Wind', 'Hydro', 'Biomass', 'Geothermal']
        actual_renewable_types = sample_data['Renewable_Type'].unique()
        for rt in expected_renewable_types:
            assert rt in actual_renewable_types
    
    def test_get_base_consumption(self):
        """测试获取基础消耗量"""
        # 测试已知国家和能源类型
        china_oil = self.loader._get_base_consumption('China', 'Oil')
        assert china_oil == 200
        
        us_coal = self.loader._get_base_consumption('United States', 'Coal')
        assert us_coal == 200
        
        # 测试未知国家或能源类型（应该返回默认值）
        unknown_country = self.loader._get_base_consumption('Unknown Country', 'Oil')
        assert unknown_country == 10
        
        unknown_type = self.loader._get_base_consumption('China', 'Unknown Type')
        assert unknown_type == 10
    
    def test_get_base_renewable_production(self):
        """测试获取基础可再生能源产量"""
        # 测试已知国家和可再生能源类型
        china_solar = self.loader._get_base_renewable_production('China', 'Solar')
        assert china_solar == 0.1
        
        us_wind = self.loader._get_base_renewable_production('United States', 'Wind')
        assert us_wind == 5
        
        # 测试未知国家或可再生能源类型（应该返回默认值）
        unknown_country = self.loader._get_base_renewable_production('Unknown Country', 'Solar')
        assert unknown_country == 1
        
        unknown_type = self.loader._get_base_renewable_production('China', 'Unknown Type')
        assert unknown_type == 1
    
    def test_data_consistency(self):
        """测试数据一致性"""
        # 加载能源数据
        energy_data = self.loader.load_energy_data()
        
        # 检查数据是否有负数
        assert (energy_data['Energy_Consumption'] >= 0).all()
        
        # 检查年份范围
        assert energy_data['Year'].min() >= 2000
        assert energy_data['Year'].max() <= 2022
        
        # 加载可再生能源数据
        renewable_data = self.loader.load_renewable_data()
        
        # 检查数据是否有负数
        assert (renewable_data['Production'] >= 0).all()
        
        # 检查年份范围
        assert renewable_data['Year'].min() >= 2000
        assert renewable_data['Year'].max() <= 2022


if __name__ == '__main__':
    pytest.main([__file__, '-v'])
