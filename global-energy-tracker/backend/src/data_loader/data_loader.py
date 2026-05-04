import pandas as pd
import numpy as np
import os
from typing import Optional, Dict, Any

class DataLoader:
    """
    数据加载器类，用于加载和清洗来自不同来源的能源统计数据
    支持BP和EIA等数据源的CSV格式数据
    """
    
    def __init__(self, data_dir: Optional[str] = None):
        """
        初始化数据加载器
        
        Args:
            data_dir: 数据目录路径，默认为项目的data目录
        """
        if data_dir is None:
            # 默认使用项目的data目录
            self.data_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), 'data')
        else:
            self.data_dir = data_dir
        
        # 确保数据目录存在
        os.makedirs(self.data_dir, exist_ok=True)
    
    def load_energy_data(self, source: str = 'bp') -> pd.DataFrame:
        """
        加载能源消耗数据
        
        Args:
            source: 数据源类型，支持 'bp' 或 'eia'
        
        Returns:
            包含能源消耗数据的DataFrame
        """
        if source == 'bp':
            # 加载BP能源数据
            bp_file = os.path.join(self.data_dir, 'bp_energy_data.csv')
            if os.path.exists(bp_file):
                return pd.read_csv(bp_file)
            else:
                # 如果文件不存在，创建示例数据
                return self._create_sample_energy_data()
        elif source == 'eia':
            # 加载EIA能源数据
            eia_file = os.path.join(self.data_dir, 'eia_energy_data.csv')
            if os.path.exists(eia_file):
                return pd.read_csv(eia_file)
            else:
                # 如果文件不存在，创建示例数据
                return self._create_sample_energy_data()
        else:
            raise ValueError(f"不支持的数据源: {source}，请使用 'bp' 或 'eia'")
    
    def load_renewable_data(self, source: str = 'bp') -> pd.DataFrame:
        """
        加载可再生能源数据
        
        Args:
            source: 数据源类型，支持 'bp' 或 'eia'
        
        Returns:
            包含可再生能源数据的DataFrame
        """
        if source == 'bp':
            # 加载BP可再生能源数据
            bp_renewable_file = os.path.join(self.data_dir, 'bp_renewable_data.csv')
            if os.path.exists(bp_renewable_file):
                return pd.read_csv(bp_renewable_file)
            else:
                # 如果文件不存在，创建示例数据
                return self._create_sample_renewable_data()
        elif source == 'eia':
            # 加载EIA可再生能源数据
            eia_renewable_file = os.path.join(self.data_dir, 'eia_renewable_data.csv')
            if os.path.exists(eia_renewable_file):
                return pd.read_csv(eia_renewable_file)
            else:
                # 如果文件不存在，创建示例数据
                return self._create_sample_renewable_data()
        else:
            raise ValueError(f"不支持的数据源: {source}，请使用 'bp' 或 'eia'")
    
    def clean_data(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        清洗数据，包括处理缺失值、异常值等
        
        Args:
            df: 需要清洗的原始DataFrame
        
        Returns:
            清洗后的DataFrame
        """
        # 复制原始数据，避免修改原数据
        cleaned_df = df.copy()
        
        # 1. 处理缺失值
        # 首先查看缺失值情况
        missing_values = cleaned_df.isnull().sum()
        
        # 对于数值列，使用平均值填充缺失值
        numeric_columns = cleaned_df.select_dtypes(include=[np.number]).columns
        for col in numeric_columns:
            if cleaned_df[col].isnull().any():
                # 计算平均值（排除NaN）
                mean_value = cleaned_df[col].mean()
                # 填充缺失值
                cleaned_df[col] = cleaned_df[col].fillna(mean_value)
        
        # 2. 处理异常值（使用IQR方法）
        for col in numeric_columns:
            # 计算四分位数
            Q1 = cleaned_df[col].quantile(0.25)
            Q3 = cleaned_df[col].quantile(0.75)
            IQR = Q3 - Q1
            
            # 定义异常值范围
            lower_bound = Q1 - 1.5 * IQR
            upper_bound = Q3 + 1.5 * IQR
            
            # 替换异常值为边界值
            cleaned_df[col] = cleaned_df[col].clip(lower=lower_bound, upper=upper_bound)
        
        # 3. 数据类型转换
        # 确保年份列是整数类型
        if 'Year' in cleaned_df.columns:
            cleaned_df['Year'] = cleaned_df['Year'].astype(int)
        
        # 4. 去重
        cleaned_df = cleaned_df.drop_duplicates()
        
        # 5. 重置索引
        cleaned_df = cleaned_df.reset_index(drop=True)
        
        return cleaned_df
    
    def _create_sample_energy_data(self) -> pd.DataFrame:
        """
        创建示例能源数据，当实际数据文件不存在时使用
        
        Returns:
            示例能源数据DataFrame
        """
        # 创建年份范围（2000-2022年）
        years = list(range(2000, 2023))
        
        # 创建主要国家/地区
        countries = ['China', 'United States', 'India', 'Russia', 'Japan', 
                     'Germany', 'Brazil', 'Canada', 'South Korea', 'France']
        
        # 创建能源类型
        energy_types = ['Oil', 'Natural Gas', 'Coal', 'Nuclear', 'Renewables']
        
        # 生成数据
        data = []
        for country in countries:
            for year in years:
                for energy_type in energy_types:
                    # 生成基础消耗量（基于国家和能源类型）
                    base_consumption = self._get_base_consumption(country, energy_type)
                    
                    # 添加年份趋势（逐年增长）
                    year_factor = 1 + (year - 2000) * 0.02
                    
                    # 添加随机噪声
                    noise = np.random.normal(0, 0.1)
                    
                    # 计算最终消耗量
                    consumption = base_consumption * year_factor * (1 + noise)
                    
                    data.append({
                        'Country': country,
                        'Year': year,
                        'Energy_Type': energy_type,
                        'Energy_Consumption': max(0, consumption),  # 确保不为负
                        'Unit': 'Million Tonnes of Oil Equivalent'
                    })
        
        return pd.DataFrame(data)
    
    def _create_sample_renewable_data(self) -> pd.DataFrame:
        """
        创建示例可再生能源数据，当实际数据文件不存在时使用
        
        Returns:
            示例可再生能源数据DataFrame
        """
        # 创建年份范围（2000-2022年）
        years = list(range(2000, 2023))
        
        # 创建主要国家/地区
        countries = ['China', 'United States', 'India', 'Germany', 'Brazil', 
                     'Japan', 'Canada', 'France', 'United Kingdom', 'Italy']
        
        # 创建可再生能源类型
        renewable_types = ['Solar', 'Wind', 'Hydro', 'Biomass', 'Geothermal']
        
        # 生成数据
        data = []
        for country in countries:
            for year in years:
                for renewable_type in renewable_types:
                    # 生成基础消耗量（基于国家和可再生能源类型）
                    base_production = self._get_base_renewable_production(country, renewable_type)
                    
                    # 添加年份趋势（可再生能源增长更快）
                    year_factor = 1 + (year - 2000) * 0.05
                    
                    # 添加随机噪声
                    noise = np.random.normal(0, 0.15)
                    
                    # 计算最终产量
                    production = base_production * year_factor * (1 + noise)
                    
                    data.append({
                        'Country': country,
                        'Year': year,
                        'Renewable_Type': renewable_type,
                        'Production': max(0, production),  # 确保不为负
                        'Unit': 'TWh'
                    })
        
        return pd.DataFrame(data)
    
    def _get_base_consumption(self, country: str, energy_type: str) -> float:
        """
        获取特定国家和能源类型的基础消耗量
        
        Args:
            country: 国家名称
            energy_type: 能源类型
        
        Returns:
            基础消耗量
        """
        # 定义不同国家的能源消耗基础值（2000年左右的水平）
        country_bases = {
            'China': {'Oil': 200, 'Natural Gas': 30, 'Coal': 500, 'Nuclear': 5, 'Renewables': 20},
            'United States': {'Oil': 350, 'Natural Gas': 250, 'Coal': 200, 'Nuclear': 30, 'Renewables': 30},
            'India': {'Oil': 80, 'Natural Gas': 20, 'Coal': 150, 'Nuclear': 3, 'Renewables': 15},
            'Russia': {'Oil': 120, 'Natural Gas': 150, 'Coal': 80, 'Nuclear': 10, 'Renewables': 10},
            'Japan': {'Oil': 200, 'Natural Gas': 80, 'Coal': 100, 'Nuclear': 25, 'Renewables': 10},
            'Germany': {'Oil': 120, 'Natural Gas': 70, 'Coal': 80, 'Nuclear': 15, 'Renewables': 15},
            'Brazil': {'Oil': 80, 'Natural Gas': 10, 'Coal': 20, 'Nuclear': 2, 'Renewables': 25},
            'Canada': {'Oil': 80, 'Natural Gas': 60, 'Coal': 30, 'Nuclear': 5, 'Renewables': 20},
            'South Korea': {'Oil': 100, 'Natural Gas': 30, 'Coal': 60, 'Nuclear': 15, 'Renewables': 5},
            'France': {'Oil': 90, 'Natural Gas': 40, 'Coal': 20, 'Nuclear': 40, 'Renewables': 15}
        }
        
        # 返回对应的值，默认值为10
        return country_bases.get(country, {}).get(energy_type, 10)
    
    def _get_base_renewable_production(self, country: str, renewable_type: str) -> float:
        """
        获取特定国家和可再生能源类型的基础产量
        
        Args:
            country: 国家名称
            renewable_type: 可再生能源类型
        
        Returns:
            基础产量
        """
        # 定义不同国家的可再生能源基础产量（2000年左右的水平）
        country_bases = {
            'China': {'Solar': 0.1, 'Wind': 0.5, 'Hydro': 200, 'Biomass': 5, 'Geothermal': 0.1},
            'United States': {'Solar': 0.5, 'Wind': 5, 'Hydro': 250, 'Biomass': 10, 'Geothermal': 2},
            'India': {'Solar': 0.1, 'Wind': 2, 'Hydro': 100, 'Biomass': 3, 'Geothermal': 0.1},
            'Germany': {'Solar': 1, 'Wind': 10, 'Hydro': 20, 'Biomass': 5, 'Geothermal': 0.5},
            'Brazil': {'Solar': 0.1, 'Wind': 1, 'Hydro': 300, 'Biomass': 15, 'Geothermal': 0.1},
            'Japan': {'Solar': 1, 'Wind': 1, 'Hydro': 80, 'Biomass': 2, 'Geothermal': 1},
            'Canada': {'Solar': 0.1, 'Wind': 2, 'Hydro': 350, 'Biomass': 3, 'Geothermal': 0.1},
            'France': {'Solar': 0.5, 'Wind': 2, 'Hydro': 60, 'Biomass': 2, 'Geothermal': 0.5},
            'United Kingdom': {'Solar': 0.5, 'Wind': 5, 'Hydro': 5, 'Biomass': 2, 'Geothermal': 0.1},
            'Italy': {'Solar': 1, 'Wind': 2, 'Hydro': 40, 'Biomass': 2, 'Geothermal': 5}
        }
        
        # 返回对应的值，默认值为1
        return country_bases.get(country, {}).get(renewable_type, 1)
