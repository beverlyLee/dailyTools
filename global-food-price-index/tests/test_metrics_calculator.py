import unittest
import pandas as pd
import numpy as np
from datetime import datetime

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'backend', 'src'))

from metrics_calculator import MetricsCalculator


class TestMetricsCalculator(unittest.TestCase):
    """
    测试 MetricsCalculator 类的同比和环比计算功能
    """
    
    def setUp(self):
        """
        设置测试数据
        """
        # 创建测试数据：24个月的月度数据
        dates = pd.date_range(start='2022-01-01', periods=24, freq='MS')
        
        # 创建简单的测试值，便于手动计算验证
        values = [100, 102, 105, 103, 108, 110, 115, 112, 118, 120, 125, 128,
                  130, 133, 136, 134, 140, 143, 149, 146, 153, 156, 162, 166]
        
        self.test_df = pd.DataFrame({
            'Date': dates,
            'Food Price Index': values,
            'Meat': [v * 1.1 for v in values],
            'Dairy': [v * 0.9 for v in values]
        })
    
    def test_calculate_month_over_month_basic(self):
        """
        测试基本的环比计算
        """
        # 计算环比
        mom = MetricsCalculator.calculate_month_over_month(
            self.test_df, 
            'Food Price Index'
        )
        
        # 验证第一个值应该是NaN（没有上月数据）
        self.assertTrue(pd.isna(mom.iloc[0]))
        
        # 验证第二个月的环比：(102-100)/100*100 = 2.0
        expected_2nd_month = (102 - 100) / 100 * 100
        self.assertAlmostEqual(mom.iloc[1], expected_2nd_month, places=4)
        
        # 验证第三个月的环比：(105-102)/102*100 ≈ 2.9412
        expected_3rd_month = (105 - 102) / 102 * 100
        self.assertAlmostEqual(mom.iloc[2], expected_3rd_month, places=4)
        
        # 验证第四个月的环比（下降）：(103-105)/105*100 ≈ -1.9048
        expected_4th_month = (103 - 105) / 105 * 100
        self.assertAlmostEqual(mom.iloc[3], expected_4th_month, places=4)
    
    def test_calculate_month_over_month_formula(self):
        """
        验证环比计算公式的正确性
        环比涨幅 = (当前月值 - 上月值) / 上月值 * 100
        """
        # 手动计算几个点的环比
        expected_mom = []
        values = self.test_df['Food Price Index'].values
        
        for i in range(len(values)):
            if i == 0:
                expected_mom.append(np.nan)
            else:
                # 环比公式：(当前值 - 上月值) / 上月值 * 100
                mom = (values[i] - values[i-1]) / values[i-1] * 100
                expected_mom.append(mom)
        
        # 计算实际值
        actual_mom = MetricsCalculator.calculate_month_over_month(
            self.test_df, 
            'Food Price Index'
        )
        
        # 验证每个点（跳过NaN）
        for i in range(1, len(expected_mom)):
            self.assertAlmostEqual(
                actual_mom.iloc[i], 
                expected_mom[i], 
                places=6,
                msg=f"第 {i+1} 个月的环比计算错误"
            )
    
    def test_calculate_year_over_year_basic(self):
        """
        测试基本的同比计算
        """
        # 计算同比
        yoy = MetricsCalculator.calculate_year_over_year(
            self.test_df, 
            'Food Price Index'
        )
        
        # 验证前12个值应该是NaN（没有去年同月数据）
        for i in range(12):
            self.assertTrue(
                pd.isna(yoy.iloc[i]), 
                f"第 {i+1} 个月不应该有同比数据"
            )
        
        # 验证第13个月（2023-01）的同比
        # 2023-01值: 130, 2022-01值: 100
        # 同比 = (130-100)/100*100 = 30.0
        expected_13th_month = (130 - 100) / 100 * 100
        self.assertAlmostEqual(yoy.iloc[12], expected_13th_month, places=4)
        
        # 验证第14个月（2023-02）的同比
        # 2023-02值: 133, 2022-02值: 102
        # 同比 = (133-102)/102*100 ≈ 30.3922
        expected_14th_month = (133 - 102) / 102 * 100
        self.assertAlmostEqual(yoy.iloc[13], expected_14th_month, places=4)
    
    def test_calculate_year_over_year_formula(self):
        """
        验证同比计算公式的正确性
        同比涨幅 = (当前月值 - 去年同月值) / 去年同月值 * 100
        """
        # 手动计算同比
        expected_yoy = []
        values = self.test_df['Food Price Index'].values
        
        for i in range(len(values)):
            if i < 12:
                expected_yoy.append(np.nan)
            else:
                # 同比公式：(当前值 - 去年同月值) / 去年同月值 * 100
                yoy = (values[i] - values[i-12]) / values[i-12] * 100
                expected_yoy.append(yoy)
        
        # 计算实际值
        actual_yoy = MetricsCalculator.calculate_year_over_year(
            self.test_df, 
            'Food Price Index'
        )
        
        # 验证每个点（跳过前12个NaN）
        for i in range(12, len(expected_yoy)):
            self.assertAlmostEqual(
                actual_yoy.iloc[i], 
                expected_yoy[i], 
                places=6,
                msg=f"第 {i+1} 个月的同比计算错误"
            )
    
    def test_calculate_all_metrics(self):
        """
        测试计算所有类别的指标
        """
        metrics_df = MetricsCalculator.calculate_all_metrics(self.test_df)
        
        # 验证列数
        # Date + 3个类别 * 2个指标 = 7列
        expected_columns = 7
        self.assertEqual(len(metrics_df.columns), expected_columns)
        
        # 验证列名
        expected_column_names = [
            'Date',
            'Food Price Index_MoM',
            'Food Price Index_YoY',
            'Meat_MoM',
            'Meat_YoY',
            'Dairy_MoM',
            'Dairy_YoY'
        ]
        for col in expected_column_names:
            self.assertIn(col, metrics_df.columns)
        
        # 验证行数
        self.assertEqual(len(metrics_df), len(self.test_df))
    
    def test_get_latest_metrics(self):
        """
        测试获取最新指标
        """
        latest = MetricsCalculator.get_latest_metrics(self.test_df)
        
        # 验证返回结构
        self.assertIn('date', latest)
        self.assertIn('metrics', latest)
        
        # 验证日期
        expected_date = self.test_df['Date'].max().strftime('%Y-%m-%d')
        self.assertEqual(latest['date'], expected_date)
        
        # 验证指标类别
        expected_categories = ['Food Price Index', 'Meat', 'Dairy']
        for category in expected_categories:
            self.assertIn(category, latest['metrics'])
            self.assertIn('MoM', latest['metrics'][category])
            self.assertIn('YoY', latest['metrics'][category])
    
    def test_edge_case_empty_dataframe(self):
        """
        测试空DataFrame的情况
        """
        empty_df = pd.DataFrame()
        
        with self.assertRaises(ValueError) as context:
            MetricsCalculator.calculate_month_over_month(empty_df, 'Value')
        
        self.assertIn("为空", str(context.exception))
    
    def test_edge_case_missing_columns(self):
        """
        测试缺少必要列的情况
        """
        # 缺少Date列
        df_no_date = pd.DataFrame({
            'Value': [100, 102, 105]
        })
        
        with self.assertRaises(ValueError) as context:
            MetricsCalculator.calculate_month_over_month(df_no_date, 'Value')
        
        self.assertIn("缺少'Date'列", str(context.exception))
        
        # 缺少值列
        df_no_value = pd.DataFrame({
            'Date': pd.date_range('2022-01-01', periods=3)
        })
        
        with self.assertRaises(ValueError) as context:
            MetricsCalculator.calculate_month_over_month(df_no_value, 'NonExistent')
        
        self.assertIn("缺少'NonExistent'列", str(context.exception))
    
    def test_edge_case_insufficient_data_for_yoy(self):
        """
        测试数据不足12个月时的同比计算
        """
        # 只有6个月的数据
        short_dates = pd.date_range(start='2022-01-01', periods=6, freq='MS')
        short_df = pd.DataFrame({
            'Date': short_dates,
            'Value': [100, 102, 105, 103, 108, 110]
        })
        
        yoy = MetricsCalculator.calculate_year_over_year(short_df, 'Value')
        
        # 所有值都应该是NaN
        for i in range(len(yoy)):
            self.assertTrue(pd.isna(yoy.iloc[i]))
    
    def test_negative_and_zero_values(self):
        """
        测试包含负值和零值的情况
        """
        # 创建包含零值和负值的测试数据
        dates = pd.date_range(start='2022-01-01', periods=5, freq='MS')
        special_values = [100, 0, -50, 100, 150]
        
        special_df = pd.DataFrame({
            'Date': dates,
            'Value': special_values
        })
        
        # 计算环比
        mom = MetricsCalculator.calculate_month_over_month(special_df, 'Value')
        
        # 第一个值：NaN
        self.assertTrue(pd.isna(mom.iloc[0]))
        
        # 第二个月：从100到0，环比 = (0-100)/100*100 = -100
        self.assertAlmostEqual(mom.iloc[1], -100.0, places=4)
        
        # 第三个月：从0到-50，除以零应该是inf或NaN
        self.assertTrue(np.isinf(mom.iloc[2]) or pd.isna(mom.iloc[2]))
        
        # 第四个月：从-50到100，环比 = (100 - (-50))/(-50)*100 = -300
        expected_4th = (100 - (-50)) / (-50) * 100
        self.assertAlmostEqual(mom.iloc[3], expected_4th, places=4)


if __name__ == '__main__':
    unittest.main()
