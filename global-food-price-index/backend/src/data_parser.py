import pandas as pd
import os
from typing import Optional, Dict, Any
from pathlib import Path


class FAODataParser:
    """
    解析FAO食品价格指数CSV数据的类
    包含异常处理机制
    """
    
    def __init__(self, data_dir: Optional[str] = None):
        """
        初始化数据解析器
        
        Args:
            data_dir: 数据文件所在目录，如果为None则使用默认目录
        """
        if data_dir is None:
            # 默认数据目录：backend/data
            current_dir = Path(__file__).resolve().parent.parent
            self.data_dir = current_dir / "data"
        else:
            self.data_dir = Path(data_dir)
        
        self.data_file = self.data_dir / "fao_food_price_index.csv"
        self.df: Optional[pd.DataFrame] = None
    
    def load_data(self, skip_rows: int = 4) -> pd.DataFrame:
        """
        加载并解析FAO CSV数据文件
        
        Args:
            skip_rows: 需要跳过的行数（FAO CSV文件前4行为元数据）
            
        Returns:
            解析后的DataFrame
            
        Raises:
            FileNotFoundError: 数据文件不存在
            ValueError: 数据格式错误
            Exception: 其他解析错误
        """
        try:
            # 检查文件是否存在
            if not self.data_file.exists():
                raise FileNotFoundError(f"数据文件不存在: {self.data_file}")
            
            # 读取CSV文件
            # FAO CSV格式：
            # 第1行：标题
            # 第2行：基准年份 (2014-2016=100)
            # 第3行：列名
            # 第4行：空行
            # 从第5行开始：实际数据
            
            # 读取列名
            headers = pd.read_csv(self.data_file, skiprows=2, nrows=1, header=None)
            column_names = headers.iloc[0].tolist()
            
            # 清理列名（去除空值）
            column_names = [str(col).strip() for col in column_names if not pd.isna(col)]
            
            # 读取实际数据
            self.df = pd.read_csv(
                self.data_file,
                skiprows=skip_rows,
                header=None,
                usecols=range(len(column_names)),
                names=column_names
            )
            
            # 数据清洗
            self._clean_data()
            
            # 验证数据
            self._validate_data()
            
            return self.df
            
        except FileNotFoundError as e:
            raise e
        except pd.errors.EmptyDataError:
            raise ValueError("数据文件为空")
        except pd.errors.ParserError as e:
            raise ValueError(f"数据解析错误: {str(e)}")
        except Exception as e:
            raise Exception(f"加载数据时发生未知错误: {str(e)}")
    
    def _clean_data(self):
        """
        清洗数据：处理缺失值、转换数据类型等
        """
        if self.df is None:
            return
        
        # 去除全为空的列
        self.df = self.df.dropna(axis=1, how='all')
        
        # 去除全为空的行
        self.df = self.df.dropna(axis=0, how='all')
        
        # 转换日期列
        if 'Date' in self.df.columns:
            self.df['Date'] = pd.to_datetime(self.df['Date'], errors='coerce')
            # 去除日期无效的行
            self.df = self.df.dropna(subset=['Date'])
        
        # 转换数值列
        numeric_columns = [col for col in self.df.columns if col != 'Date']
        for col in numeric_columns:
            # 尝试转换为数值，错误的设为NaN
            self.df[col] = pd.to_numeric(self.df[col], errors='coerce')
        
        # 重置索引
        self.df = self.df.reset_index(drop=True)
    
    def _validate_data(self):
        """
        验证数据的完整性和正确性
        """
        if self.df is None or self.df.empty:
            raise ValueError("数据为空或加载失败")
        
        # 检查必要的列是否存在
        required_columns = ['Date', 'Food Price Index']
        for col in required_columns:
            if col not in self.df.columns:
                raise ValueError(f"缺少必要的列: {col}")
        
        # 检查是否有足够的数据点
        if len(self.df) < 12:
            raise ValueError("数据点不足，至少需要12个月的数据")
    
    def get_data(self) -> Optional[pd.DataFrame]:
        """
        获取已加载的数据
        
        Returns:
            DataFrame或None（如果数据未加载）
        """
        return self.df
    
    def get_latest_date(self) -> Optional[str]:
        """
        获取最新数据日期
        
        Returns:
            最新日期字符串，格式为YYYY-MM-DD
        """
        if self.df is None or 'Date' not in self.df.columns:
            return None
        
        latest_date = self.df['Date'].max()
        return latest_date.strftime('%Y-%m-%d') if pd.notna(latest_date) else None
    
    def get_available_categories(self) -> list:
        """
        获取可用的食品类别列表
        
        Returns:
            类别名称列表
        """
        if self.df is None:
            return []
        
        # 排除Date列
        categories = [col for col in self.df.columns if col != 'Date']
        return categories
    
    def get_data_by_category(self, category: str) -> Optional[pd.DataFrame]:
        """
        获取特定类别的数据
        
        Args:
            category: 类别名称
            
        Returns:
            包含Date和指定类别数据的DataFrame
        """
        if self.df is None:
            return None
        
        if category not in self.df.columns:
            raise ValueError(f"类别 '{category}' 不存在")
        
        return self.df[['Date', category]].copy()
    
    def get_data_by_date_range(self, start_date: str, end_date: str) -> Optional[pd.DataFrame]:
        """
        获取指定日期范围的数据
        
        Args:
            start_date: 开始日期，格式为YYYY-MM-DD
            end_date: 结束日期，格式为YYYY-MM-DD
            
        Returns:
            指定日期范围的数据
        """
        if self.df is None:
            return None
        
        try:
            start = pd.to_datetime(start_date)
            end = pd.to_datetime(end_date)
            
            mask = (self.df['Date'] >= start) & (self.df['Date'] <= end)
            return self.df.loc[mask].copy()
            
        except Exception as e:
            raise ValueError(f"日期格式错误: {str(e)}")
    
    def to_dict(self, orient: str = 'records') -> list:
        """
        将数据转换为字典格式
        
        Args:
            orient: 转换方向，默认为'records'
            
        Returns:
            字典列表
        """
        if self.df is None:
            return []
        
        # 转换日期为字符串
        df_copy = self.df.copy()
        df_copy['Date'] = df_copy['Date'].dt.strftime('%Y-%m-%d')
        
        return df_copy.to_dict(orient=orient)
