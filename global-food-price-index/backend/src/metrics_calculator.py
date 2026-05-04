import pandas as pd
import numpy as np
from typing import Optional, Dict, List, Any
from pathlib import Path


class MetricsCalculator:
    """
    计算食品价格指数的同比和环比涨幅
    """
    
    @staticmethod
    def calculate_month_over_month(
        df: pd.DataFrame,
        value_column: str = 'Food Price Index'
    ) -> pd.Series:
        """
        计算环比涨幅（月环比）
        
        环比涨幅 = (当前月值 - 上月值) / 上月值 * 100
        
        Args:
            df: 包含日期和数值的DataFrame
            value_column: 数值列名
            
        Returns:
            环比涨幅Series，索引为日期
        """
        if df is None or df.empty:
            raise ValueError("DataFrame为空或None")
        
        if 'Date' not in df.columns:
            raise ValueError("DataFrame缺少'Date'列")
        
        if value_column not in df.columns:
            raise ValueError(f"DataFrame缺少'{value_column}'列")
        
        # 确保数据按日期排序
        df_sorted = df.sort_values('Date').copy()
        
        # 计算环比变化
        # 上月值 = shift(1)
        previous_month = df_sorted[value_column].shift(1)
        
        # 环比涨幅 = (当前值 - 上月值) / 上月值 * 100
        mom_change = (
            (df_sorted[value_column] - previous_month) / previous_month * 100
        )
        
        # 设置索引为日期
        mom_change.index = df_sorted['Date']
        
        return mom_change
    
    @staticmethod
    def calculate_year_over_year(
        df: pd.DataFrame,
        value_column: str = 'Food Price Index'
    ) -> pd.Series:
        """
        计算同比涨幅（年同比）
        
        同比涨幅 = (当前月值 - 去年同月值) / 去年同月值 * 100
        
        Args:
            df: 包含日期和数值的DataFrame
            value_column: 数值列名
            
        Returns:
            同比涨幅Series，索引为日期
        """
        if df is None or df.empty:
            raise ValueError("DataFrame为空或None")
        
        if 'Date' not in df.columns:
            raise ValueError("DataFrame缺少'Date'列")
        
        if value_column not in df.columns:
            raise ValueError(f"DataFrame缺少'{value_column}'列")
        
        # 确保数据按日期排序
        df_sorted = df.sort_values('Date').copy()
        
        # 设置日期为索引以便使用时间偏移
        df_temp = df_sorted.set_index('Date')
        
        # 计算同比变化
        # 去年同月值 = shift(12)（假设是月度数据）
        previous_year = df_temp[value_column].shift(12, freq='MS')
        
        # 重新对齐数据
        df_sorted['previous_year'] = df_sorted['Date'].map(
            lambda x: previous_year.get(x, np.nan)
        )
        
        # 同比涨幅 = (当前值 - 去年同月值) / 去年同月值 * 100
        yoy_change = (
            (df_sorted[value_column] - df_sorted['previous_year']) / 
            df_sorted['previous_year'] * 100
        )
        
        # 设置索引为日期
        yoy_change.index = df_sorted['Date']
        
        return yoy_change
    
    @staticmethod
    def calculate_all_metrics(
        df: pd.DataFrame,
        categories: Optional[List[str]] = None
    ) -> pd.DataFrame:
        """
        计算所有类别的同比和环比涨幅
        
        Args:
            df: 原始数据DataFrame
            categories: 要计算的类别列表，如果为None则计算所有数值列
            
        Returns:
            包含所有指标的DataFrame
        """
        if df is None or df.empty:
            raise ValueError("DataFrame为空或None")
        
        if 'Date' not in df.columns:
            raise ValueError("DataFrame缺少'Date'列")
        
        # 如果没有指定类别，使用所有数值列
        if categories is None:
            categories = [col for col in df.columns if col != 'Date' and 
                         pd.api.types.is_numeric_dtype(df[col])]
        
        result_df = df[['Date']].copy()
        
        for category in categories:
            if category not in df.columns:
                continue
            
            # 计算环比
            mom = MetricsCalculator.calculate_month_over_month(df, category)
            result_df[f'{category}_MoM'] = result_df['Date'].map(mom.to_dict())
            
            # 计算同比
            yoy = MetricsCalculator.calculate_year_over_year(df, category)
            result_df[f'{category}_YoY'] = result_df['Date'].map(yoy.to_dict())
        
        return result_df
    
    @staticmethod
    def get_latest_metrics(
        df: pd.DataFrame,
        categories: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """
        获取最新的同比和环比数据
        
        Args:
            df: 包含指标的DataFrame
            categories: 类别列表
            
        Returns:
            包含最新数据的字典
        """
        metrics_df = MetricsCalculator.calculate_all_metrics(df, categories)
        
        if metrics_df.empty:
            return {}
        
        # 获取最新日期的数据
        latest_row = metrics_df.sort_values('Date').iloc[-1]
        latest_date = latest_row['Date']
        
        result = {
            'date': latest_date.strftime('%Y-%m-%d') if pd.notna(latest_date) else None,
            'metrics': {}
        }
        
        for col in metrics_df.columns:
            if col == 'Date':
                continue
            
            # 解析列名，格式为 "类别_指标类型"
            parts = col.rsplit('_', 1)
            if len(parts) == 2:
                category, metric_type = parts
                if category not in result['metrics']:
                    result['metrics'][category] = {}
                
                value = latest_row[col]
                result['metrics'][category][metric_type] = (
                    round(value, 2) if pd.notna(value) else None
                )
        
        return result
    
    @staticmethod
    def get_metrics_by_date_range(
        df: pd.DataFrame,
        start_date: str,
        end_date: str,
        categories: Optional[List[str]] = None
    ) -> pd.DataFrame:
        """
        获取指定日期范围的指标数据
        
        Args:
            df: 原始数据DataFrame
            start_date: 开始日期
            end_date: 结束日期
            categories: 类别列表
            
        Returns:
            指定日期范围的指标DataFrame
        """
        metrics_df = MetricsCalculator.calculate_all_metrics(df, categories)
        
        try:
            start = pd.to_datetime(start_date)
            end = pd.to_datetime(end_date)
            
            mask = (metrics_df['Date'] >= start) & (metrics_df['Date'] <= end)
            return metrics_df.loc[mask].copy()
            
        except Exception as e:
            raise ValueError(f"日期格式错误: {str(e)}")
