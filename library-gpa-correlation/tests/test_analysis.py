import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(__file__)), 'src'))

import unittest
import pandas as pd
import numpy as np


class TestDataGenerator(unittest.TestCase):
    
    def test_generate_dataset(self):
        from utils.data_generator import generate_dataset
        dataset = generate_dataset()
        self.assertIn('grades', dataset)
        self.assertIn('swipes', dataset)
        self.assertIsInstance(dataset['grades'], pd.DataFrame)
        self.assertIsInstance(dataset['swipes'], pd.DataFrame)
        self.assertGreater(len(dataset['grades']), 0)
        self.assertGreater(len(dataset['swipes']), 0)
    
    def test_get_or_create_dataset(self):
        from utils.data_generator import get_or_create_dataset
        dataset = get_or_create_dataset(force_regenerate=True)
        self.assertIn('grades', dataset)
        self.assertIn('swipes', dataset)
        self.assertTrue(os.path.exists(os.path.join('data', 'grades.csv')))
        self.assertTrue(os.path.exists(os.path.join('data', 'swipes.csv')))


class TestFeatureExtractor(unittest.TestCase):
    
    def test_get_analysis_dataset(self):
        from features.time_feature_extractor import get_analysis_dataset
        df = get_analysis_dataset(use_local=True)
        self.assertIsInstance(df, pd.DataFrame)
        self.assertGreater(len(df), 0)
        
        required_columns = ['student_id', 'major', 'gpa', 'avg_daily_hours', 'total_hours']
        for col in required_columns:
            self.assertIn(col, df.columns)
    
    def test_calculate_major_median_hours(self):
        from features.time_feature_extractor import get_analysis_dataset, calculate_major_median_hours
        
        df = get_analysis_dataset(use_local=True)
        major_stats = calculate_major_median_hours(df)
        
        self.assertIsInstance(major_stats, pd.DataFrame)
        self.assertIn('major', major_stats.columns)
        self.assertIn('median_hours', major_stats.columns)
        self.assertIn('mean_hours', major_stats.columns)
        
        cs_median = major_stats[major_stats['major'] == 'CS']['median_hours'].values[0]
        chinese_median = major_stats[major_stats['major'] == 'Chinese']['median_hours'].values[0]
        self.assertGreater(cs_median, chinese_median, "CS专业在馆时长中位数应高于文学院")


class TestRegression(unittest.TestCase):
    
    def test_run_full_regression_analysis(self):
        from features.time_feature_extractor import get_analysis_dataset
        from analysis.regression import run_full_regression_analysis
        
        df = get_analysis_dataset(use_local=True)
        results = run_full_regression_analysis(df)
        
        self.assertIn('simple_regression', results)
        self.assertIn('multiple_regression', results)
        self.assertIn('correlation', results)
        
        simple = results['simple_regression']
        self.assertIn('r_squared', simple)
        self.assertIn('coefficients', simple)
        self.assertIn('p_values', simple)
        self.assertIn('avg_daily_hours', simple['p_values'])
        
        self.assertIsInstance(simple['r_squared'], np.float64)
        self.assertGreaterEqual(simple['r_squared'], 0)
        self.assertLessEqual(simple['r_squared'], 1)
    
    def test_format_regression_results(self):
        from features.time_feature_extractor import get_analysis_dataset
        from analysis.regression import run_full_regression_analysis, format_regression_results
        
        df = get_analysis_dataset(use_local=True)
        results = run_full_regression_analysis(df)
        formatted = format_regression_results(results)
        
        self.assertIsInstance(formatted, str)
        self.assertGreater(len(formatted), 0)
        self.assertIn('简单线性回归分析', formatted)
        self.assertIn('显著性', formatted)
        self.assertIn('相关性分析', formatted)


class TestIntegration(unittest.TestCase):
    
    def test_full_analysis_flow(self):
        from features.time_feature_extractor import get_analysis_dataset, calculate_major_median_hours
        from analysis.regression import run_full_regression_analysis
        
        df = get_analysis_dataset(use_local=True)
        major_stats = calculate_major_median_hours(df)
        results = run_full_regression_analysis(df)
        
        cs_median = major_stats[major_stats['major'] == 'CS']['median_hours'].values[0]
        chinese_median = major_stats[major_stats['major'] == 'Chinese']['median_hours'].values[0]
        
        self.assertGreater(cs_median, chinese_median)
        
        p_value = results['simple_regression']['p_values']['avg_daily_hours']
        self.assertIsInstance(p_value, (np.float64, float))
        self.assertGreater(p_value, 0)


def run_tests():
    print('=' * 60)
    print('🧪 运行测试套件')
    print('=' * 60)
    print()
    
    loader = unittest.TestLoader()
    suite = unittest.TestSuite()
    
    suite.addTests(loader.loadTestsFromTestCase(TestDataGenerator))
    suite.addTests(loader.loadTestsFromTestCase(TestFeatureExtractor))
    suite.addTests(loader.loadTestsFromTestCase(TestRegression))
    suite.addTests(loader.loadTestsFromTestCase(TestIntegration))
    
    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(suite)
    
    print()
    print('=' * 60)
    if result.wasSuccessful():
        print('✅ 所有测试通过！')
    else:
        print(f'❌ {len(result.failures) + len(result.errors)} 个测试失败/错误')
    print('=' * 60)
    
    return result.wasSuccessful()


if __name__ == '__main__':
    success = run_tests()
    sys.exit(0 if success else 1)
