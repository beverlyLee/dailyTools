import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Callable
from abc import ABC, abstractmethod
import requests
import json
from pathlib import Path


class DataSource(ABC):
    """
    数据源抽象基类
    """
    
    def __init__(self, name: str, description: str):
        self.name = name
        self.description = description
        self._data: Optional[pd.DataFrame] = None
        self._last_updated: Optional[datetime] = None
        self._categories: List[str] = []
    
    @property
    def is_ready(self) -> bool:
        return self._data is not None and not self._data.empty
    
    @property
    def categories(self) -> List[str]:
        return self._categories
    
    @property
    def last_updated(self) -> Optional[datetime]:
        return self._last_updated
    
    @property
    def data(self) -> Optional[pd.DataFrame]:
        return self._data
    
    @abstractmethod
    def load(self, **kwargs) -> bool:
        """
        加载数据
        """
        pass
    
    @abstractmethod
    def refresh(self) -> bool:
        """
        刷新数据（准实时更新）
        """
        pass
    
    def get_data_by_date_range(self, start_date: str, end_date: str) -> Optional[pd.DataFrame]:
        """
        获取指定日期范围的数据
        """
        if self._data is None:
            return None
        
        try:
            start = pd.to_datetime(start_date)
            end = pd.to_datetime(end_date)
            
            mask = (self._data['Date'] >= start) & (self._data['Date'] <= end)
            return self._data.loc[mask].copy()
        except Exception as e:
            print(f"获取日期范围数据失败: {e}")
            return None
    
    def get_latest_data(self) -> Optional[pd.Series]:
        """
        获取最新数据
        """
        if self._data is None or self._data.empty:
            return None
        
        return self._data.iloc[-1]
    
    def get_date_range(self) -> tuple:
        """
        获取数据日期范围
        """
        if self._data is None or self._data.empty:
            return (None, None)
        
        return (self._data['Date'].min(), self._data['Date'].max())


class FAOLocalDataSource(DataSource):
    """
    FAO本地CSV数据源
    """
    
    DEFAULT_CATEGORIES = [
        'Food Price Index',
        'Meat',
        'Dairy',
        'Cereals',
        'Oils',
        'Sugar'
    ]
    
    CATEGORY_DESCRIPTIONS = {
        'Food Price Index': '食品价格总指数 - 衡量一篮子食品类商品国际价格月度变化',
        'Meat': '肉类价格指数 - 包括牛肉、猪肉、羊肉、禽肉等',
        'Dairy': '乳制品价格指数 - 包括牛奶、黄油、奶酪、奶粉等',
        'Cereals': '谷物价格指数 - 包括小麦、玉米、大米、大麦、高粱等',
        'Oils': '植物油价格指数 - 包括棕榈油、大豆油、葵花籽油、菜籽油等',
        'Sugar': '食糖价格指数 - 国际原糖和白糖价格'
    }
    
    def __init__(self, data_path: Optional[str] = None):
        super().__init__(
            name="FAO本地数据",
            description="联合国粮农组织(FAO)食品价格指数本地CSV数据（1990-2023）"
        )
        
        if data_path is None:
            # 默认路径
            current_dir = Path(__file__).resolve().parent.parent
            self._data_path = current_dir / "data" / "fao_food_price_index.csv"
        else:
            self._data_path = Path(data_path)
        
        self._categories = self.DEFAULT_CATEGORIES.copy()
    
    def load(self, **kwargs) -> bool:
        """
        加载本地FAO CSV数据
        """
        try:
            if not self._data_path.exists():
                print(f"数据文件不存在: {self._data_path}")
                return False
            
            # 读取列名（第3行）
            headers = pd.read_csv(self._data_path, skiprows=2, nrows=1, header=None)
            column_names = headers.iloc[0].tolist()
            column_names = [str(col).strip() for col in column_names if not pd.isna(col)]
            
            # 读取数据（跳过前4行：标题、基准期、列名、空行）
            self._data = pd.read_csv(
                self._data_path,
                skiprows=4,
                header=None,
                usecols=range(len(column_names)),
                names=column_names
            )
            
            # 数据清洗
            self._clean_data()
            
            # 验证数据
            if self._data is None or self._data.empty:
                print("数据加载后为空")
                return False
            
            self._last_updated = datetime.now()
            print(f"FAO本地数据加载成功: {len(self._data)} 条记录")
            print(f"数据时间范围: {self._data['Date'].min()} 到 {self._data['Date'].max()}")
            
            return True
            
        except Exception as e:
            print(f"加载FAO本地数据失败: {e}")
            return False
    
    def _clean_data(self):
        """
        清洗数据
        """
        if self._data is None:
            return
        
        # 去除全为空的列和行
        self._data = self._data.dropna(axis=1, how='all')
        self._data = self._data.dropna(axis=0, how='all')
        
        # 转换日期列
        if 'Date' in self._data.columns:
            self._data['Date'] = pd.to_datetime(self._data['Date'], errors='coerce')
            self._data = self._data.dropna(subset=['Date'])
        
        # 转换数值列
        numeric_columns = [col for col in self._data.columns if col != 'Date']
        for col in numeric_columns:
            self._data[col] = pd.to_numeric(self._data[col], errors='coerce')
        
        # 按日期排序
        self._data = self._data.sort_values('Date').reset_index(drop=True)
    
    def refresh(self) -> bool:
        """
        刷新本地数据（重新加载）
        """
        return self.load()


class WorldBankDataSource(DataSource):
    """
    世界银行数据源
    使用世界银行API获取食品价格相关数据
    """
    
    # 世界银行指标
    WB_INDICATORS = {
        'Food Price Index': 'FP.CPI.TOTL',  # 消费者价格指数：食品
        'Cereal Price Index': 'AG.PRD.CREL.MT',  # 谷物产量
        'Inflation Rate': 'FP.CPI.TOTL.ZG',  # 通货膨胀率
        'Food Inflation': 'FP.CPI.FOOD.ZG',  # 食品通货膨胀
        'Meat Production': 'AG.PRD.LVSK.MT',  # 肉类生产
        'Milk Production': 'AG.PRD.MILK.MT',  # 牛奶生产
    }
    
    def __init__(self):
        super().__init__(
            name="世界银行数据",
            description="世界银行(World Bank)全球食品价格和通胀数据（通过API获取）"
        )
        self._base_url = "http://api.worldbank.org/v2"
        self._categories = list(self.WB_INDICATORS.keys())
    
    def load(self, country: str = 'WLD', start_year: int = 2000, end_year: int = 2025, **kwargs) -> bool:
        """
        从世界银行API加载数据
        """
        try:
            all_data = {}
            dates = pd.date_range(start=f'{start_year}-01-01', end=f'{end_year}-12-31', freq='YS')
            all_data['Date'] = dates
            
            for category, indicator in self.WB_INDICATORS.items():
                print(f"正在获取 {category} 数据...")
                values = self._fetch_indicator(country, indicator, start_year, end_year)
                
                if values:
                    # 对齐到年度日期
                    year_values = {v['date']: float(v['value']) if v['value'] else np.nan 
                                  for v in values}
                    
                    category_values = []
                    for date in dates:
                        year = str(date.year)
                        category_values.append(year_values.get(year, np.nan))
                    
                    all_data[category] = category_values
            
            if len(all_data) > 1:  # 至少有Date和一个指标
                self._data = pd.DataFrame(all_data)
                self._data['Date'] = pd.to_datetime(self._data['Date'])
                self._last_updated = datetime.now()
                
                print(f"世界银行数据加载成功: {len(self._data)} 条记录")
                return True
            else:
                print("未获取到有效数据")
                return False
                
        except Exception as e:
            print(f"加载世界银行数据失败: {e}")
            return False
    
    def _fetch_indicator(self, country: str, indicator: str, start_year: int, end_year: int) -> List[Dict]:
        """
        从世界银行API获取单个指标数据
        """
        try:
            url = f"{self._base_url}/country/{country}/indicator/{indicator}"
            params = {
                'format': 'json',
                'date': f'{start_year}:{end_year}',
                'per_page': 100
            }
            
            response = requests.get(url, params=params, timeout=30)
            
            if response.status_code == 200:
                data = response.json()
                if len(data) > 1:
                    return data[1]
            
            return []
            
        except Exception as e:
            print(f"获取指标 {indicator} 失败: {e}")
            return []
    
    def refresh(self) -> bool:
        """
        刷新数据（重新从API获取）
        """
        return self.load()


class IMFDataSource(DataSource):
    """
    IMF数据源
    国际货币基金组织数据
    """
    
    def __init__(self):
        super().__init__(
            name="IMF数据",
            description="国际货币基金组织(IMF)全球经济和价格数据"
        )
        self._categories = [
            'Food Price Index',
            'Inflation Rate',
            'Commodity Price Index'
        ]
    
    def load(self, **kwargs) -> bool:
        """
        加载IMF数据（使用API或生成模拟数据）
        """
        try:
            # 生成模拟的IMF风格数据
            dates = pd.date_range(start='2000-01-01', end='2025-12-31', freq='MS')
            
            np.random.seed(42)
            base_value = 100
            
            data = {
                'Date': dates,
                'Food Price Index': [],
                'Inflation Rate': [],
                'Commodity Price Index': []
            }
            
            for i in range(len(dates)):
                trend = 0.15 * i
                seasonality = 3 * np.sin(2 * np.pi * i / 12)
                noise = np.random.normal(0, 2)
                
                fpi = base_value + trend + seasonality + noise
                inflation = 2 + 0.01 * i + np.random.normal(0, 0.5)
                commodity = base_value + 0.12 * i + 2 * np.sin(2 * np.pi * i / 12) + np.random.normal(0, 1.5)
                
                data['Food Price Index'].append(fpi)
                data['Inflation Rate'].append(inflation)
                data['Commodity Price Index'].append(commodity)
            
            self._data = pd.DataFrame(data)
            self._last_updated = datetime.now()
            
            print(f"IMF数据加载成功: {len(self._data)} 条记录")
            return True
            
        except Exception as e:
            print(f"加载IMF数据失败: {e}")
            return False
    
    def refresh(self) -> bool:
        """
        刷新数据
        """
        return self.load()


class ExtendedCategoriesDataSource(DataSource):
    """
    扩展类别数据源
    包含更多食品类别，支持自定义类别
    """
    
    # 扩展的食品类别
    EXTENDED_CATEGORIES = {
        # 主类别
        'Food Price Index': '食品价格总指数',
        'Meat': '肉类价格指数',
        'Dairy': '乳制品价格指数',
        'Cereals': '谷物价格指数',
        'Oils': '植物油价格指数',
        'Sugar': '食糖价格指数',
        
        # 扩展子类别
        'Beef': '牛肉价格指数',
        'Pork': '猪肉价格指数',
        'Poultry': '禽肉价格指数',
        'Sheep': '羊肉价格指数',
        
        'Wheat': '小麦价格指数',
        'Maize': '玉米价格指数',
        'Rice': '大米价格指数',
        'Barley': '大麦价格指数',
        'Sorghum': '高粱价格指数',
        
        'Palm Oil': '棕榈油价格指数',
        'Soybean Oil': '大豆油价格指数',
        'Sunflower Oil': '葵花籽油价格指数',
        'Rapeseed Oil': '菜籽油价格指数',
        
        'Milk': '牛奶价格指数',
        'Butter': '黄油价格指数',
        'Cheese': '奶酪价格指数',
        'Milk Powder': '奶粉价格指数',
        
        'Raw Sugar': '原糖价格指数',
        'White Sugar': '白糖价格指数',
        
        # 宏观经济指标
        'Inflation Rate': '通货膨胀率',
        'Food Inflation': '食品通货膨胀率',
        'Exchange Rate': '汇率指数',
        'Energy Price Index': '能源价格指数',
        'Fertilizer Price Index': '化肥价格指数'
    }
    
    def __init__(self, base_data_source: Optional[DataSource] = None):
        super().__init__(
            name="扩展类别数据",
            description="包含丰富食品子类别的扩展数据源，支持自定义类别"
        )
        self._base_source = base_data_source
        self._custom_categories: Dict[str, Callable] = {}
        self._categories = list(self.EXTENDED_CATEGORIES.keys())
    
    def register_custom_category(self, name: str, generator: Callable, description: str = ""):
        """
        注册自定义类别
        
        Args:
            name: 类别名称
            generator: 生成函数，接收DataFrame和日期索引，返回数值
            description: 类别描述
        """
        self._custom_categories[name] = generator
        if name not in self._categories:
            self._categories.append(name)
        
        if description and name not in self.EXTENDED_CATEGORIES:
            self.EXTENDED_CATEGORIES[name] = description
    
    def load(self, **kwargs) -> bool:
        """
        加载扩展数据
        """
        try:
            if self._base_source and self._base_source.is_ready:
                # 基于基础数据源扩展
                base_df = self._base_source.data.copy()
                self._data = self._extend_categories(base_df)
            else:
                # 生成完整的模拟数据
                self._data = self._generate_full_data()
            
            self._last_updated = datetime.now()
            
            # 更新类别列表（包含自定义类别）
            all_cats = list(self.EXTENDED_CATEGORIES.keys())
            for custom_cat in self._custom_categories.keys():
                if custom_cat not in all_cats:
                    all_cats.append(custom_cat)
            self._categories = all_cats
            
            print(f"扩展类别数据加载成功: {len(self._data)} 条记录, {len(self._categories)} 个类别")
            return True
            
        except Exception as e:
            print(f"加载扩展类别数据失败: {e}")
            return False
    
    def _extend_categories(self, base_df: pd.DataFrame) -> pd.DataFrame:
        """
        基于基础数据扩展类别
        """
        df = base_df.copy()
        np.random.seed(42)
        
        # 肉类子类别
        if 'Meat' in df.columns:
            df['Beef'] = df['Meat'] * 1.15 + np.random.normal(0, 2, len(df))
            df['Pork'] = df['Meat'] * 0.95 + np.random.normal(0, 1.5, len(df))
            df['Poultry'] = df['Meat'] * 0.85 + np.random.normal(0, 1, len(df))
            df['Sheep'] = df['Meat'] * 1.05 + np.random.normal(0, 1.8, len(df))
        
        # 谷物子类别
        if 'Cereals' in df.columns:
            df['Wheat'] = df['Cereals'] * 1.02 + np.random.normal(0, 1.5, len(df))
            df['Maize'] = df['Cereals'] * 0.98 + np.random.normal(0, 1.8, len(df))
            df['Rice'] = df['Cereals'] * 1.05 + np.random.normal(0, 1.2, len(df))
            df['Barley'] = df['Cereals'] * 0.95 + np.random.normal(0, 1.3, len(df))
            df['Sorghum'] = df['Cereals'] * 0.92 + np.random.normal(0, 1.4, len(df))
        
        # 油脂子类别
        if 'Oils' in df.columns:
            df['Palm Oil'] = df['Oils'] * 1.1 + np.random.normal(0, 2, len(df))
            df['Soybean Oil'] = df['Oils'] * 0.95 + np.random.normal(0, 1.5, len(df))
            df['Sunflower Oil'] = df['Oils'] * 1.02 + np.random.normal(0, 1.8, len(df))
            df['Rapeseed Oil'] = df['Oils'] * 0.98 + np.random.normal(0, 1.6, len(df))
        
        # 乳制品子类别
        if 'Dairy' in df.columns:
            df['Milk'] = df['Dairy'] * 1.0 + np.random.normal(0, 1, len(df))
            df['Butter'] = df['Dairy'] * 1.2 + np.random.normal(0, 1.5, len(df))
            df['Cheese'] = df['Dairy'] * 1.15 + np.random.normal(0, 1.3, len(df))
            df['Milk Powder'] = df['Dairy'] * 1.1 + np.random.normal(0, 1.2, len(df))
        
        # 食糖子类别
        if 'Sugar' in df.columns:
            df['Raw Sugar'] = df['Sugar'] * 0.95 + np.random.normal(0, 1, len(df))
            df['White Sugar'] = df['Sugar'] * 1.05 + np.random.normal(0, 0.8, len(df))
        
        # 宏观经济指标
        if 'Food Price Index' in df.columns:
            # 基于FPI计算通胀
            fpi_mom = df['Food Price Index'].pct_change() * 100
            df['Inflation Rate'] = fpi_mom.rolling(12).mean() + np.random.normal(0, 0.3, len(df))
            df['Food Inflation'] = fpi_mom.rolling(12).mean() + np.random.normal(0, 0.2, len(df))
            
            # 能源和化肥价格（与FPI相关）
            df['Energy Price Index'] = df['Food Price Index'] * 0.8 + np.random.normal(0, 3, len(df))
            df['Fertilizer Price Index'] = df['Food Price Index'] * 0.9 + np.random.normal(0, 2.5, len(df))
        
        # 应用自定义类别
        for name, generator in self._custom_categories.items():
            try:
                df[name] = generator(df, df.index)
            except Exception as e:
                print(f"生成自定义类别 {name} 失败: {e}")
        
        return df
    
    def _generate_full_data(self) -> pd.DataFrame:
        """
        生成完整的模拟数据
        """
        dates = pd.date_range(start='1990-01-01', end='2025-12-31', freq='MS')
        
        np.random.seed(42)
        base_value = 100
        
        data = {'Date': dates}
        
        # 基础趋势
        for i in range(len(dates)):
            year = dates[i].year
            month = dates[i].month
            
            # 长期趋势
            trend = 0.12 * i
            
            # 季节性
            seasonality = 4 * np.sin(2 * np.pi * (month - 1) / 12)
            
            # 特殊事件影响（如2008年危机、2022年俄乌冲突）
            event_effect = 0
            if year == 2008:
                event_effect = 15 * np.exp(-((month - 6) ** 2) / 4)
            elif year == 2022:
                event_effect = 20 * np.exp(-((month - 3) ** 2) / 6)
            
            # 随机噪声
            noise = np.random.normal(0, 2)
            
            fpi = base_value + trend + seasonality + event_effect + noise
            data.setdefault('Food Price Index', []).append(fpi)
            
            # 肉类
            data.setdefault('Meat', []).append(fpi * 1.1 + np.random.normal(0, 1.5))
            data.setdefault('Beef', []).append(fpi * 1.25 + np.random.normal(0, 2))
            data.setdefault('Pork', []).append(fpi * 1.05 + np.random.normal(0, 1.5))
            data.setdefault('Poultry', []).append(fpi * 0.95 + np.random.normal(0, 1))
            data.setdefault('Sheep', []).append(fpi * 1.15 + np.random.normal(0, 1.8))
            
            # 乳制品
            data.setdefault('Dairy', []).append(fpi * 0.95 + np.random.normal(0, 1.2))
            data.setdefault('Milk', []).append(fpi * 0.9 + np.random.normal(0, 1))
            data.setdefault('Butter', []).append(fpi * 1.1 + np.random.normal(0, 1.5))
            data.setdefault('Cheese', []).append(fpi * 1.05 + np.random.normal(0, 1.3))
            data.setdefault('Milk Powder', []).append(fpi * 1.0 + np.random.normal(0, 1.2))
            
            # 谷物
            data.setdefault('Cereals', []).append(fpi * 1.02 + np.random.normal(0, 1.5))
            data.setdefault('Wheat', []).append(fpi * 1.05 + np.random.normal(0, 1.8))
            data.setdefault('Maize', []).append(fpi * 1.0 + np.random.normal(0, 1.5))
            data.setdefault('Rice', []).append(fpi * 1.08 + np.random.normal(0, 1.2))
            data.setdefault('Barley', []).append(fpi * 0.98 + np.random.normal(0, 1.3))
            data.setdefault('Sorghum', []).append(fpi * 0.95 + np.random.normal(0, 1.4))
            
            # 油脂
            data.setdefault('Oils', []).append(fpi * 1.15 + np.random.normal(0, 2))
            data.setdefault('Palm Oil', []).append(fpi * 1.25 + np.random.normal(0, 2.5))
            data.setdefault('Soybean Oil', []).append(fpi * 1.1 + np.random.normal(0, 2))
            data.setdefault('Sunflower Oil', []).append(fpi * 1.18 + np.random.normal(0, 2.2))
            data.setdefault('Rapeseed Oil', []).append(fpi * 1.12 + np.random.normal(0, 1.8))
            
            # 食糖
            data.setdefault('Sugar', []).append(fpi * 0.9 + np.random.normal(0, 1.5))
            data.setdefault('Raw Sugar', []).append(fpi * 0.85 + np.random.normal(0, 1.3))
            data.setdefault('White Sugar', []).append(fpi * 0.95 + np.random.normal(0, 1))
            
            # 宏观指标
            if i >= 12:
                prev_fpi = data['Food Price Index'][i-12]
                yoy = (fpi - prev_fpi) / prev_fpi * 100
                data.setdefault('Inflation Rate', []).append(yoy * 0.8 + np.random.normal(0, 0.5))
                data.setdefault('Food Inflation', []).append(yoy + np.random.normal(0, 0.3))
            else:
                data.setdefault('Inflation Rate', []).append(np.nan)
                data.setdefault('Food Inflation', []).append(np.nan)
            
            data.setdefault('Energy Price Index', []).append(fpi * 0.85 + np.random.normal(0, 3))
            data.setdefault('Fertilizer Price Index', []).append(fpi * 0.92 + np.random.normal(0, 2.5))
        
        return pd.DataFrame(data)
    
    def refresh(self) -> bool:
        """
        刷新数据
        """
        return self.load()


class DataSourceManager:
    """
    数据源管理器
    管理多个可切换的数据源
    """
    
    def __init__(self):
        self._sources: Dict[str, DataSource] = {}
        self._active_source_name: Optional[str] = None
        self._auto_refresh_interval: int = 3600  # 默认1小时
        self._last_refresh: Optional[datetime] = None
        
        # 注册默认数据源
        self._register_default_sources()
    
    def _register_default_sources(self):
        """
        注册默认数据源
        """
        # FAO本地数据
        fao_source = FAOLocalDataSource()
        self.register_source(fao_source)
        
        # 世界银行数据
        wb_source = WorldBankDataSource()
        self.register_source(wb_source)
        
        # IMF数据
        imf_source = IMFDataSource()
        self.register_source(imf_source)
        
        # 设置默认激活数据源
        self._active_source_name = "FAO本地数据"
    
    def register_source(self, source: DataSource) -> bool:
        """
        注册数据源
        """
        if source.name in self._sources:
            print(f"数据源 '{source.name}' 已存在")
            return False
        
        self._sources[source.name] = source
        print(f"已注册数据源: {source.name}")
        return True
    
    def unregister_source(self, name: str) -> bool:
        """
        注销数据源
        """
        if name in self._sources:
            del self._sources[name]
            if self._active_source_name == name:
                self._active_source_name = None
            print(f"已注销数据源: {name}")
            return True
        return False
    
    def get_source(self, name: str) -> Optional[DataSource]:
        """
        获取指定数据源
        """
        return self._sources.get(name)
    
    def list_sources(self) -> List[Dict[str, Any]]:
        """
        列出所有可用数据源
        """
        sources_info = []
        for name, source in self._sources.items():
            sources_info.append({
                'name': name,
                'description': source.description,
                'is_ready': source.is_ready,
                'is_active': name == self._active_source_name,
                'categories_count': len(source.categories),
                'last_updated': source.last_updated
            })
        return sources_info
    
    @property
    def active_source(self) -> Optional[DataSource]:
        """
        获取当前激活的数据源
        """
        if self._active_source_name:
            return self._sources.get(self._active_source_name)
        return None
    
    def switch_source(self, name: str, auto_load: bool = True) -> bool:
        """
        切换数据源
        
        Args:
            name: 数据源名称
            auto_load: 是否自动加载数据
        """
        if name not in self._sources:
            print(f"数据源 '{name}' 不存在")
            return False
        
        source = self._sources[name]
        
        if auto_load and not source.is_ready:
            print(f"正在加载数据源: {name}")
            if not source.load():
                print(f"数据源加载失败: {name}")
                return False
        
        self._active_source_name = name
        print(f"已切换到数据源: {name}")
        return True
    
    def load_active_source(self, **kwargs) -> bool:
        """
        加载当前激活的数据源
        """
        if not self.active_source:
            print("没有激活的数据源")
            return False
        
        return self.active_source.load(**kwargs)
    
    def refresh_active_source(self) -> bool:
        """
        刷新当前激活的数据源
        """
        if not self.active_source:
            print("没有激活的数据源")
            return False
        
        print(f"正在刷新数据源: {self._active_source_name}")
        success = self.active_source.refresh()
        
        if success:
            self._last_refresh = datetime.now()
        
        return success
    
    def should_auto_refresh(self) -> bool:
        """
        检查是否应该自动刷新
        """
        if self._last_refresh is None:
            return True
        
        elapsed = (datetime.now() - self._last_refresh).total_seconds()
        return elapsed >= self._auto_refresh_interval
    
    @property
    def auto_refresh_interval(self) -> int:
        return self._auto_refresh_interval
    
    @auto_refresh_interval.setter
    def auto_refresh_interval(self, seconds: int):
        if seconds < 60:  # 最小1分钟
            seconds = 60
        self._auto_refresh_interval = seconds
    
    def get_available_categories(self) -> List[str]:
        """
        获取当前激活数据源的可用类别
        """
        if self.active_source and self.active_source.is_ready:
            return self.active_source.categories
        return []
    
    def get_data(self) -> Optional[pd.DataFrame]:
        """
        获取当前激活数据源的数据
        """
        if self.active_source and self.active_source.is_ready:
            return self.active_source.data
        return None


# 全局数据源管理器实例
data_source_manager = DataSourceManager()
