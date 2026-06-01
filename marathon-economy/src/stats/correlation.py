import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(__file__))))

import numpy as np
from scipy import stats
from typing import Dict, List, Tuple
from src.data.event_scraper import EventScraper
from src.data.gdp_loader import GDPLoader


class CorrelationAnalyzer:
    def __init__(self, use_real_data: bool = True):
        self.use_real_data = use_real_data
        self.event_scraper = EventScraper(use_real_data=use_real_data)
        self.gdp_loader = GDPLoader(use_real_data=use_real_data)
        self.merged_data = []

    def merge_data(self) -> List[Dict]:
        """合并赛事和GDP数据"""
        city_events = self.event_scraper.get_city_event_counts()
        gdp_data = self.gdp_loader.load_gdp_data()

        merged = []
        for city, event_stats in city_events.items():
            if city in gdp_data:
                merged.append({
                    "city": city,
                    "event_count": event_stats["event_count"],
                    "total_participants": event_stats["total_participants"],
                    "events": event_stats["events"],
                    "gdp": gdp_data[city]["gdp"],
                    "population": gdp_data[city]["population"],
                    "gdp_per_capita": gdp_data[city]["gdp_per_capita"]
                })

        # 添加没有赛事的城市（为了相关性更准确）
        for city, gdp_stats in gdp_data.items():
            if city not in city_events:
                merged.append({
                    "city": city,
                    "event_count": 0,
                    "total_participants": 0,
                    "events": [],
                    "gdp": gdp_stats["gdp"],
                    "population": gdp_stats["population"],
                    "gdp_per_capita": gdp_stats["gdp_per_capita"]
                })

        self.merged_data = merged
        return merged

    def calculate_pearson_correlation(self) -> Dict:
        """计算皮尔逊相关系数"""
        if not self.merged_data:
            self.merge_data()

        event_counts = [d["event_count"] for d in self.merged_data]
        gdp_values = [d["gdp"] for d in self.merged_data]
        gdp_per_capita_values = [d["gdp_per_capita"] for d in self.merged_data]
        participants = [d["total_participants"] for d in self.merged_data]

        corr_event_gdp, p_event_gdp = stats.pearsonr(event_counts, gdp_values)
        corr_event_gdp_per_capita, p_event_gdp_per_capita = stats.pearsonr(
            event_counts, gdp_per_capita_values
        )
        corr_participants_gdp, p_participants_gdp = stats.pearsonr(
            participants, gdp_values
        )

        return {
            "event_count_vs_gdp": {
                "correlation": float(corr_event_gdp),
                "p_value": float(p_event_gdp),
                "strength": self._get_correlation_strength(corr_event_gdp)
            },
            "event_count_vs_gdp_per_capita": {
                "correlation": float(corr_event_gdp_per_capita),
                "p_value": float(p_event_gdp_per_capita),
                "strength": self._get_correlation_strength(corr_event_gdp_per_capita)
            },
            "participants_vs_gdp": {
                "correlation": float(corr_participants_gdp),
                "p_value": float(p_participants_gdp),
                "strength": self._get_correlation_strength(corr_participants_gdp)
            }
        }

    def _get_correlation_strength(self, corr_value: float) -> str:
        """判断相关强度"""
        abs_corr = abs(corr_value)
        if abs_corr >= 0.8:
            return "强相关"
        elif abs_corr >= 0.5:
            return "中等相关"
        elif abs_corr >= 0.3:
            return "弱相关"
        else:
            return "无相关或极弱相关"

    def calculate_regression(self) -> Dict:
        """计算线性回归"""
        if not self.merged_data:
            self.merge_data()

        x = np.array([d["gdp"] for d in self.merged_data])
        y = np.array([d["event_count"] for d in self.merged_data])

        slope, intercept, r_value, p_value, std_err = stats.linregress(x, y)

        return {
            "slope": float(slope),
            "intercept": float(intercept),
            "r_squared": float(r_value ** 2),
            "p_value": float(p_value),
            "std_error": float(std_err),
            "prediction_formula": f"赛事数量 = {slope:.6f} × GDP(亿) + {intercept:.2f}"
        }

    def get_scatter_data(self) -> List[Dict]:
        """获取散点图数据"""
        if not self.merged_data:
            self.merge_data()
        return self.merged_data

    def get_data_source_info(self) -> Dict[str, Dict]:
        """获取数据源信息"""
        return {
            "event_data": self.event_scraper.get_data_source_info(),
            "gdp_data": self.gdp_loader.get_data_source_info()
        }

    def print_analysis_report(self):
        """打印分析报告"""
        correlations = self.calculate_pearson_correlation()
        regression = self.calculate_regression()
        data_source = self.get_data_source_info()

        print("=" * 70)
        print("马拉松赛事与城市GDP相关性分析报告")
        print("=" * 70)
        print(f"\n📊 数据源:")
        print(f"  赛事数据: {data_source['event_data']['description']}")
        print(f"  GDP数据: {data_source['gdp_data']['description']}")
        print(f"  分析城市数: {len(self.merged_data)}")
        print(f"  赛事总数: {data_source['event_data']['event_count']}场")

        print("\n📈 皮尔逊相关系数:")
        print(f"  赛事数量 vs GDP: {correlations['event_count_vs_gdp']['correlation']:.4f}")
        print(f"    强度: {correlations['event_count_vs_gdp']['strength']}")
        print(f"    p值: {correlations['event_count_vs_gdp']['p_value']:.4e}")
        print(f"  赛事数量 vs 人均GDP: {correlations['event_count_vs_gdp_per_capita']['correlation']:.4f}")
        print(f"    强度: {correlations['event_count_vs_gdp_per_capita']['strength']}")
        print(f"    p值: {correlations['event_count_vs_gdp_per_capita']['p_value']:.4e}")
        print(f"  参赛总人数 vs GDP: {correlations['participants_vs_gdp']['correlation']:.4f}")
        print(f"    强度: {correlations['participants_vs_gdp']['strength']}")
        print(f"    p值: {correlations['participants_vs_gdp']['p_value']:.4e}")

        print("\n📉 线性回归分析:")
        print(f"  {regression['prediction_formula']}")
        print(f"  R²: {regression['r_squared']:.4f} (拟合优度)")

        print("\n🏙️  有赛事的城市数据预览 (按GDP排序):")
        sorted_data = sorted(
            [d for d in self.merged_data if d['event_count'] > 0],
            key=lambda x: x["gdp"], reverse=True
        )[:15]
        for city in sorted_data:
            print(f"  {city['city']:4}: GDP {city['gdp']:8,.1f}亿, 赛事 {city['event_count']:2}场, 参赛 {city['total_participants']:6,}人")

        print("\n" + "=" * 70)


if __name__ == "__main__":
    # 使用真实数据进行分析
    analyzer = CorrelationAnalyzer(use_real_data=True)
    analyzer.merge_data()
    analyzer.print_analysis_report()
