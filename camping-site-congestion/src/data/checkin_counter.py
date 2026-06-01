import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from typing import Dict, List, Tuple, Any
import logging
from .social_crawler import SocialMediaCrawler
from .data_pipeline import DataPipeline, DataQualityAssessor

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class CheckinCounter:
    def __init__(self, use_mock: bool = True):
        self.use_mock = use_mock
        self.camping_sites = {
            "武功山": {"province": "江西", "base_popularity": 95, "season_factor": {"spring": 1.3, "summer": 0.9, "autumn": 1.5, "winter": 0.7}},
            "安吉小杭坑": {"province": "浙江", "base_popularity": 85, "season_factor": {"spring": 1.2, "summer": 1.1, "autumn": 1.3, "winter": 0.6}},
            "千岛湖": {"province": "浙江", "base_popularity": 88, "season_factor": {"spring": 1.1, "summer": 1.4, "autumn": 1.2, "winter": 0.5}},
            "莫干山": {"province": "浙江", "base_popularity": 90, "season_factor": {"spring": 1.3, "summer": 1.2, "autumn": 1.4, "winter": 0.6}},
            "天目湖": {"province": "江苏", "base_popularity": 75, "season_factor": {"spring": 1.1, "summer": 1.3, "autumn": 1.2, "winter": 0.5}},
            "黄山风景区": {"province": "安徽", "base_popularity": 82, "season_factor": {"spring": 1.2, "summer": 1.0, "autumn": 1.4, "winter": 0.6}},
            "张家界": {"province": "湖南", "base_popularity": 80, "season_factor": {"spring": 1.3, "summer": 1.1, "autumn": 1.3, "winter": 0.5}},
            "桂林阳朔": {"province": "广西", "base_popularity": 78, "season_factor": {"spring": 1.4, "summer": 1.2, "autumn": 1.3, "winter": 0.6}},
            "三亚亚龙湾": {"province": "海南", "base_popularity": 85, "season_factor": {"spring": 1.1, "summer": 0.8, "autumn": 1.0, "winter": 1.5}},
            "长白山": {"province": "吉林", "base_popularity": 70, "season_factor": {"spring": 0.8, "summer": 1.4, "autumn": 1.0, "winter": 1.2}},
        }
        
        self.crawler = SocialMediaCrawler()
        self.checkin_data = None
        self.last_update = None
        self.data_source = None
        self._generate_historical_data()

    def _get_season(self, month: int) -> str:
        if month in [3, 4, 5]:
            return "spring"
        elif month in [6, 7, 8]:
            return "summer"
        elif month in [9, 10, 11]:
            return "autumn"
        else:
            return "winter"

    def _generate_historical_data(self):
        logger.info(f"开始生成历史打卡数据，数据源模式: {'模拟' if self.use_mock else '真实API'}")
        
        end_date = datetime(2026, 12, 31)
        start_date = datetime(2024, 1, 1)
        
        all_data = []
        for site_name in self.camping_sites.keys():
            site_data = self.crawler.crawl_site_data(
                site_name,
                start_date=start_date,
                end_date=end_date
            )
            all_data.append(site_data)
        
        combined_df = pd.concat(all_data, ignore_index=True)
        
        daily_agg = combined_df.groupby(["date", "site_name", "province"]).agg({
            "checkin_count": "sum",
            "like_count": "sum",
            "comment_count": "sum",
            "share_count": "sum",
            "is_holiday": "first",
            "is_weekend": "first",
            "season": "first",
            "data_source": "first"
        }).reset_index()
        
        self.checkin_data = daily_agg
        self.last_update = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        self.data_source = "MOCK_DATA" if self.use_mock else "SOCIAL_MEDIA_API"
        
        logger.info(f"历史数据生成完成，共 {len(self.checkin_data)} 条记录，更新时间: {self.last_update}")

    def get_site_checkins(self, site_name: str, start_date: str = None, end_date: str = None) -> pd.DataFrame:
        data = self.checkin_data[self.checkin_data["site_name"] == site_name]
        if start_date:
            data = data[data["date"] >= pd.to_datetime(start_date)]
        if end_date:
            data = data[data["date"] <= pd.to_datetime(end_date)]
        return data

    def get_all_sites(self) -> List[str]:
        return list(self.camping_sites.keys())

    def get_holiday_checkins(self, year: int, holiday_type: str = "may_day") -> pd.DataFrame:
        if holiday_type == "may_day":
            start = datetime(year, 5, 1)
            end = datetime(year, 5, 5)
        elif holiday_type == "national_day":
            start = datetime(year, 10, 1)
            end = datetime(year, 10, 7)
        else:
            raise ValueError("holiday_type must be 'may_day' or 'national_day'")
        
        return self.checkin_data[
            (self.checkin_data["date"] >= start) & 
            (self.checkin_data["date"] <= end)
        ]

    def get_monthly_average(self, site_name: str) -> Dict[int, float]:
        site_data = self.get_site_checkins(site_name)
        site_data["month"] = site_data["date"].dt.month
        return site_data.groupby("month")["checkin_count"].mean().to_dict()

    def get_best_camping_windows(self, year: int = 2026, top_n: int = 10) -> pd.DataFrame:
        from .weather_service import WeatherService
        
        weather_service = WeatherService()
        year_data = self.checkin_data[self.checkin_data["date"].dt.year == year].copy()
        
        weather_scores = []
        for _, row in year_data.iterrows():
            weather = weather_service.get_weather_for_date(row["site_name"], row["date"])
            weather_scores.append(weather.get("weather_score", 70))
        
        year_data["weather_score"] = weather_scores
        
        year_data["congestion_level"] = year_data["checkin_count"].apply(
            lambda x: min(100, x / 30)
        )
        
        year_data["overall_score"] = (
            year_data["weather_score"] * 0.6 + 
            (100 - year_data["congestion_level"]) * 0.4
        )
        
        year_data["data_source"] = self.data_source
        year_data["update_time"] = self.last_update
        
        return year_data.sort_values("overall_score", ascending=False).head(top_n)

    def refresh_data(self) -> bool:
        try:
            logger.info("正在刷新数据...")
            self._generate_historical_data()
            return True
        except Exception as e:
            logger.error(f"数据刷新失败: {e}")
            return False

    def get_data_status(self) -> Dict:
        return {
            "last_update": self.last_update,
            "data_source": self.data_source,
            "total_records": len(self.checkin_data),
            "date_range": {
                "start": self.checkin_data["date"].min().strftime("%Y-%m-%d"),
                "end": self.checkin_data["date"].max().strftime("%Y-%m-%d")
            },
            "use_mock": self.use_mock
        }

    def get_platform_distribution(self, site_name: str = None) -> Dict:
        data = self.checkin_data
        if site_name:
            data = data[data["site_name"] == site_name]
        
        platform_data = self.crawler.crawl_site_data(site_name or "武功山", days=1)
        dist = platform_data.groupby("platform")["checkin_count"].sum().to_dict()
        
        return {
            "distribution": dist,
            "total": sum(dist.values()),
            "data_source": self.data_source,
            "update_time": self.last_update
        }

    def get_engagement_metrics(self, site_name: str, date: datetime = None) -> Dict:
        if date is None:
            date = datetime.now()
        
        summary = self.crawler.get_daily_summary(site_name, date)
        return summary


class CheckinCounterWithPipeline(CheckinCounter):
    def __init__(self, use_mock: bool = True, enable_pipeline: bool = True):
        self.enable_pipeline = enable_pipeline
        self.data_pipeline = DataPipeline() if enable_pipeline else None
        self.data_quality_assessor = DataQualityAssessor()
        self.pipeline_results = {}
        super().__init__(use_mock)

    def import_external_data(self, source_id: str, input_file: str = None, 
                             days: int = 365) -> Dict[str, Any]:
        if not self.enable_pipeline:
            raise ValueError("数据管道未启用")
        
        logger.info(f"导入外部数据源: {source_id}")
        
        result = self.data_pipeline.run_full_pipeline(
            source_id=source_id,
            input_file=input_file,
            site_names=list(self.camping_sites.keys()),
            days=days
        )
        
        self.pipeline_results[source_id] = result
        
        if self.checkin_data is not None and "cleaned_data" in result:
            new_data = result["cleaned_data"]
            if "date" in new_data.columns and "site_name" in new_data.columns:
                if "checkin_count" in new_data.columns:
                    self.checkin_data = pd.concat([self.checkin_data, new_data], ignore_index=True)
                    self.last_update = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                    logger.info(f"已合并 {len(new_data)} 条外部数据记录")
        
        return result

    def get_current_data_quality(self) -> Dict[str, Any]:
        if self.checkin_data is None:
            return {"error": "无数据"}
        
        quality_report = self.data_quality_assessor.assess_quality(self.checkin_data)
        
        return {
            "overall_score": quality_report.overall_score,
            "quality_level": quality_report.quality_level.value,
            "total_records": quality_report.total_records,
            "valid_records": quality_report.valid_records,
            "missing_values_rate": quality_report.missing_values_rate,
            "duplicate_rate": quality_report.duplicate_rate,
            "outlier_rate": quality_report.outlier_rate,
            "consistency_score": quality_report.consistency_score,
            "issues_count": len(quality_report.issues),
            "issues": quality_report.issues[:10],
            "timestamp": quality_report.timestamp
        }

    def get_data_sources_info(self) -> List[Dict[str, Any]]:
        if not self.enable_pipeline:
            return []
        
        sources = []
        for source_id, config in self.data_pipeline.importer.data_sources.items():
            source_info = {
                "source_id": source_id,
                "source_name": config.source_name,
                "source_type": config.source_type.value,
                "description": config.description,
                "update_frequency": config.update_frequency,
                "weight": config.weight,
                "enabled": config.enabled,
                "imported": source_id in self.pipeline_results
            }
            if source_id in self.pipeline_results:
                result = self.pipeline_results[source_id]
                source_info.update({
                    "record_count": result.get("record_count_after", 0),
                    "quality_score": result.get("quality_after", {}).get("overall_score", 0)
                })
            sources.append(source_info)
        
        return sources

    def merge_multi_source_data(self, source_ids: List[str]) -> pd.DataFrame:
        if not self.enable_pipeline:
            raise ValueError("数据管道未启用")
        
        return self.data_pipeline.merge_multi_source_data(source_ids)

    def run_diagnostic_checks(self) -> Dict[str, Any]:
        diagnostics = {
            "timestamp": datetime.now().isoformat(),
            "data_quality": self.get_current_data_quality(),
            "pipeline_enabled": self.enable_pipeline,
            "active_sources": list(self.pipeline_results.keys()),
            "total_records": len(self.checkin_data) if self.checkin_data is not None else 0,
            "data_status": self.get_data_status()
        }
        
        return diagnostics
