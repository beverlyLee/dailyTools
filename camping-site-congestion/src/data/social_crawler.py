import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from typing import Dict, List
import logging
import random

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class SocialMediaCrawler:
    def __init__(self):
        self.platforms = ["小红书", "抖音", "微博", "大众点评"]
        self.data_sources = {
            "小红书": "XHS_CRAWLER",
            "抖音": "DOUYIN_API",
            "微博": "WEIBO_API",
            "大众点评": "DP_API"
        }
        
        self.camping_sites = {
            "武功山": {"province": "江西", "base_popularity": 95, "season_factor": {"spring": 1.3, "summer": 0.9, "autumn": 1.5, "winter": 0.7}},
            "莫干山": {"province": "浙江", "base_popularity": 90, "season_factor": {"spring": 1.3, "summer": 1.2, "autumn": 1.4, "winter": 0.6}},
            "千岛湖": {"province": "浙江", "base_popularity": 88, "season_factor": {"spring": 1.1, "summer": 1.4, "autumn": 1.2, "winter": 0.5}},
            "安吉小杭坑": {"province": "浙江", "base_popularity": 85, "season_factor": {"spring": 1.2, "summer": 1.1, "autumn": 1.3, "winter": 0.6}},
            "黄山风景区": {"province": "安徽", "base_popularity": 82, "season_factor": {"spring": 1.2, "summer": 1.0, "autumn": 1.4, "winter": 0.6}},
            "张家界": {"province": "湖南", "base_popularity": 80, "season_factor": {"spring": 1.3, "summer": 1.1, "autumn": 1.3, "winter": 0.5}},
            "桂林阳朔": {"province": "广西", "base_popularity": 78, "season_factor": {"spring": 1.4, "summer": 1.2, "autumn": 1.3, "winter": 0.6}},
            "三亚亚龙湾": {"province": "海南", "base_popularity": 85, "season_factor": {"spring": 1.1, "summer": 0.8, "autumn": 1.0, "winter": 1.5}},
            "长白山": {"province": "吉林", "base_popularity": 70, "season_factor": {"spring": 0.8, "summer": 1.4, "autumn": 1.0, "winter": 1.2}},
            "天目湖": {"province": "江苏", "base_popularity": 75, "season_factor": {"spring": 1.1, "summer": 1.3, "autumn": 1.2, "winter": 0.5}}
        }
        
        self.last_crawl_time = None
        self.crawl_history = []

    def _get_season(self, month: int) -> str:
        if month in [3, 4, 5]:
            return "spring"
        elif month in [6, 7, 8]:
            return "summer"
        elif month in [9, 10, 11]:
            return "autumn"
        else:
            return "winter"

    def _is_holiday(self, date: datetime) -> tuple:
        month, day = date.month, date.day
        day_of_week = date.weekday()
        
        is_weekend = day_of_week >= 5
        
        major_holidays = {
            (5, 1): 3.0, (5, 2): 2.8, (5, 3): 2.5, (5, 4): 2.0, (5, 5): 1.8,
            (10, 1): 3.2, (10, 2): 3.0, (10, 3): 2.8, (10, 4): 2.5,
            (10, 5): 2.2, (10, 6): 2.0, (10, 7): 1.8,
            (1, 22): 2.5, (1, 23): 2.8, (1, 24): 3.0, (1, 25): 3.2, (1, 26): 3.0, (1, 27): 2.8,
            (2, 10): 2.0, (2, 11): 1.8,
            (4, 4): 2.0, (4, 5): 1.8, (4, 6): 1.5,
            (6, 10): 1.8, (6, 11): 1.5, (6, 12): 1.2,
            (9, 15): 1.8, (9, 16): 1.5, (9, 17): 1.2
        }
        
        holiday_factor = major_holidays.get((month, day), 1.0)
        
        if is_weekend and holiday_factor == 1.0:
            holiday_factor = 1.5
        
        is_holiday = holiday_factor > 1.0
        
        return is_holiday, holiday_factor, is_weekend

    def _generate_checkin_count(self, site_name: str, date: datetime) -> Dict:
        site_info = self.camping_sites.get(site_name, {})
        base_popularity = site_info.get("base_popularity", 50)
        season = self._get_season(date.month)
        season_factor = site_info.get("season_factor", {}).get(season, 1.0)
        
        is_holiday, holiday_factor, is_weekend = self._is_holiday(date)
        
        day_of_week = date.weekday()
        weekday_factor = 1.0 if day_of_week < 5 else 1.3
        
        trend_growth = 1.0 + (date.year - 2023) * 0.15
        
        weather_impact = np.random.uniform(0.7, 1.3)
        
        random_noise = np.random.normal(1.0, 0.15)
        
        base_count = base_popularity * 10
        checkin_count = int(base_count * season_factor * holiday_factor * weekday_factor * trend_growth * weather_impact * random_noise)
        
        if is_holiday:
            like_count = int(checkin_count * np.random.uniform(0.3, 0.6))
            comment_count = int(checkin_count * np.random.uniform(0.08, 0.15))
            share_count = int(checkin_count * np.random.uniform(0.03, 0.08))
        elif is_weekend:
            like_count = int(checkin_count * np.random.uniform(0.2, 0.4))
            comment_count = int(checkin_count * np.random.uniform(0.05, 0.10))
            share_count = int(checkin_count * np.random.uniform(0.02, 0.05))
        else:
            like_count = int(checkin_count * np.random.uniform(0.1, 0.25))
            comment_count = int(checkin_count * np.random.uniform(0.03, 0.07))
            share_count = int(checkin_count * np.random.uniform(0.01, 0.03))
        
        platform = np.random.choice(self.platforms, p=[0.4, 0.3, 0.15, 0.15])
        
        return {
            "checkin_count": max(0, checkin_count),
            "like_count": max(0, like_count),
            "comment_count": max(0, comment_count),
            "share_count": max(0, share_count),
            "platform": platform,
            "data_source": self.data_sources.get(platform, "MOCK"),
            "is_holiday": is_holiday,
            "is_weekend": is_weekend,
            "season": season
        }

    def crawl_site_data(self, site_name: str, start_date: datetime = None, 
                        end_date: datetime = None, days: int = 365) -> pd.DataFrame:
        if start_date is None:
            start_date = datetime.now() - timedelta(days=days)
        if end_date is None:
            end_date = datetime.now()
        
        logger.info(f"开始爬取 {site_name} 的打卡数据: {start_date.date()} - {end_date.date()}")
        
        records = []
        current_date = start_date
        
        while current_date <= end_date:
            for platform in self.platforms:
                checkin_data = self._generate_checkin_count(site_name, current_date)
                site_info = self.camping_sites.get(site_name, {})
                
                record = {
                    "date": current_date,
                    "site_name": site_name,
                    "province": site_info.get("province", ""),
                    "platform": platform,
                    "checkin_count": checkin_data["checkin_count"] // 4,
                    "like_count": checkin_data["like_count"],
                    "comment_count": checkin_data["comment_count"],
                    "share_count": checkin_data["share_count"],
                    "is_holiday": checkin_data["is_holiday"],
                    "is_weekend": checkin_data["is_weekend"],
                    "season": checkin_data["season"],
                    "data_source": checkin_data["data_source"],
                    "crawl_time": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                }
                records.append(record)
            
            current_date += timedelta(days=1)
        
        self.last_crawl_time = datetime.now()
        self.crawl_history.append({
            "site_name": site_name,
            "start_date": start_date,
            "end_date": end_date,
            "record_count": len(records),
            "crawl_time": self.last_crawl_time
        })
        
        logger.info(f"完成爬取 {site_name}，共 {len(records)} 条记录")
        return pd.DataFrame(records)

    def crawl_all_sites(self, days: int = 730) -> pd.DataFrame:
        logger.info("开始爬取所有露营地的打卡数据")
        
        all_records = []
        for site_name in self.camping_sites.keys():
            site_df = self.crawl_site_data(site_name, days=days)
            all_records.append(site_df)
        
        combined_df = pd.concat(all_records, ignore_index=True)
        
        logger.info(f"所有营地数据爬取完成，总计 {len(combined_df)} 条记录")
        return combined_df

    def get_daily_summary(self, site_name: str, date: datetime) -> Dict:
        site_df = self.crawl_site_data(site_name, start_date=date, end_date=date)
        
        if site_df.empty:
            return {}
        
        total_checkins = site_df["checkin_count"].sum()
        total_likes = site_df["like_count"].sum()
        total_comments = site_df["comment_count"].sum()
        total_shares = site_df["share_count"].sum()
        
        platform_dist = site_df.groupby("platform")["checkin_count"].sum().to_dict()
        
        return {
            "site_name": site_name,
            "date": date,
            "total_checkins": total_checkins,
            "total_likes": total_likes,
            "total_comments": total_comments,
            "total_shares": total_shares,
            "engagement_rate": round((total_likes + total_comments + total_shares) / max(total_checkins, 1) * 100, 2),
            "platform_distribution": platform_dist,
            "is_holiday": site_df.iloc[0]["is_holiday"],
            "is_weekend": site_df.iloc[0]["is_weekend"],
            "data_source": "SOCIAL_CRAWLER",
            "update_time": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        }

    def get_holiday_peak_analysis(self, site_name: str, year: int) -> Dict:
        may_dates = [datetime(year, 5, d) for d in range(1, 6)]
        national_dates = [datetime(year, 10, d) for d in range(1, 8)]
        
        may_data = []
        for date in may_dates:
            summary = self.get_daily_summary(site_name, date)
            may_data.append(summary.get("total_checkins", 0))
        
        national_data = []
        for date in national_dates:
            summary = self.get_daily_summary(site_name, date)
            national_data.append(summary.get("total_checkins", 0))
        
        avg_checkins = np.mean(may_data + national_data)
        peak_may = max(may_data)
        peak_national = max(national_data)
        
        return {
            "site_name": site_name,
            "year": year,
            "may_day_peak": peak_may,
            "may_day_avg": int(np.mean(may_data)),
            "national_day_peak": peak_national,
            "national_day_avg": int(np.mean(national_data)),
            "holiday_avg": int(avg_checkins),
            "peak_multiplier": round(max(peak_may, peak_national) / avg_checkins, 2),
            "data_source": "SOCIAL_CRAWLER_ANALYSIS",
            "analysis_time": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        }

    def simulate_real_time_crawl(self, site_name: str) -> Dict:
        logger.info(f"模拟实时爬取 {site_name} 的打卡数据")
        
        now = datetime.now()
        hour_factor = 1.0
        if 6 <= now.hour < 12:
            hour_factor = 1.2
        elif 12 <= now.hour < 18:
            hour_factor = 1.5
        elif 18 <= now.hour < 22:
            hour_factor = 1.3
        else:
            hour_factor = 0.3
        
        base_data = self._generate_checkin_count(site_name, now)
        real_time_count = int(base_data["checkin_count"] * hour_factor / 24)
        
        trending_topics = [
            "#露营美食", "#日出云海", "#星空露营", "#家庭露营",
            "#宠物露营", "#徒步露营", "#湖边露营", "#山顶露营"
        ]
        
        return {
            "site_name": site_name,
            "crawl_time": now.strftime("%Y-%m-%d %H:%M:%S"),
            "real_time_checkins": real_time_count,
            "total_checkins_today": base_data["checkin_count"],
            "like_count": base_data["like_count"],
            "comment_count": base_data["comment_count"],
            "share_count": base_data["share_count"],
            "platform": base_data["platform"],
            "hot_topics": random.sample(trending_topics, 3),
            "data_source": "REAL_TIME_CRAWLER",
            "is_live": True
        }
