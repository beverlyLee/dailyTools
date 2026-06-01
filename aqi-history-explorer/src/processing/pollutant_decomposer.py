"""
污染物分解与分析模块
计算各污染物贡献率，进行统计分析
"""
import pandas as pd
import numpy as np
from typing import Dict, List, Tuple, Optional
from datetime import datetime


class PollutantDecomposer:
    """污染物分解分析器"""

    def __init__(self):
        self.pollutant_standards = {
            "pm25": {"limit_24h": 75, "limit_annual": 35},
            "pm10": {"limit_24h": 150, "limit_annual": 70},
            "so2": {"limit_24h": 150, "limit_annual": 60},
            "no2": {"limit_24h": 80, "limit_annual": 40},
            "co": {"limit_24h": 4, "limit_annual": None},
            "o3": {"limit_8h": 160, "limit_1h": 200}
        }

    def calculate_pollutant_contribution(self, row: pd.Series) -> Dict[str, float]:
        """计算单条数据中各污染物的贡献率"""
        pollutants = ["pm25", "pm10", "so2", "no2", "co", "o3"]
        iaqi_values = {}

        for pollutant in pollutants:
            iaqi = self._calculate_individual_aqi(pollutant, row.get(pollutant, 0))
            iaqi_values[pollutant] = iaqi

        total_iaqi = sum(iaqi_values.values())
        if total_iaqi > 0:
            contributions = {
                pollutant: round((value / total_iaqi) * 100, 2)
                for pollutant, value in iaqi_values.items()
            }
        else:
            contributions = {pollutant: 0 for pollutant in pollutants}

        return contributions

    def _calculate_individual_aqi(self, pollutant: str, concentration: float) -> float:
        """计算单个污染物的IAQI"""
        if pollutant == "pm25":
            breaks = [0, 35, 75, 115, 150, 250, 350, 500]
            aqi_breaks = [0, 50, 100, 150, 200, 300, 400, 500]
        elif pollutant == "pm10":
            breaks = [0, 50, 150, 250, 350, 420, 500, 600]
            aqi_breaks = [0, 50, 100, 150, 200, 300, 400, 500]
        elif pollutant == "so2":
            breaks = [0, 50, 150, 475, 800, 1600, 2100, 2620]
            aqi_breaks = [0, 50, 100, 150, 200, 300, 400, 500]
        elif pollutant == "no2":
            breaks = [0, 40, 80, 180, 280, 565, 750, 940]
            aqi_breaks = [0, 50, 100, 150, 200, 300, 400, 500]
        elif pollutant == "co":
            breaks = [0, 2, 4, 14, 24, 36, 48, 60]
            aqi_breaks = [0, 50, 100, 150, 200, 300, 400, 500]
        elif pollutant == "o3":
            breaks = [0, 100, 160, 215, 265, 800, 1000, 1200]
            aqi_breaks = [0, 50, 100, 150, 200, 300, 400, 500]
        else:
            return 0

        concentration = max(0, concentration)

        for i in range(len(breaks) - 1):
            if breaks[i] <= concentration <= breaks[i + 1]:
                iaqi = aqi_breaks[i] + (aqi_breaks[i + 1] - aqi_breaks[i]) * \
                       (concentration - breaks[i]) / (breaks[i + 1] - breaks[i])
                return round(iaqi, 2)

        return 500.0

    def add_contribution_columns(self, df: pd.DataFrame) -> pd.DataFrame:
        """为DataFrame添加污染物贡献率列"""
        df = df.copy()

        contributions = df.apply(self.calculate_pollutant_contribution, axis=1)
        contributions_df = pd.DataFrame(list(contributions))

        for col in contributions_df.columns:
            df[f"{col}_contribution"] = contributions_df[col].values

        df["primary_pollutant"] = contributions_df.idxmax(axis=1)
        df["max_contribution"] = contributions_df.max(axis=1)

        return df

    def calculate_monthly_stats(self, df: pd.DataFrame) -> pd.DataFrame:
        """计算月度统计数据"""
        df = df.copy()
        df["date"] = pd.to_datetime(df["date"])
        df["year"] = df["date"].dt.year
        df["month"] = df["date"].dt.month

        monthly_stats = df.groupby(["year", "month"], observed=True).agg({
            "aqi": ["mean", "median", "min", "max", "std"],
            "pm25": ["mean", "median"],
            "pm10": ["mean", "median"],
            "so2": ["mean"],
            "no2": ["mean"],
            "co": ["mean"],
            "o3": ["mean"],
            "temperature": ["mean"],
            "humidity": ["mean"],
            "wind_speed": ["mean"]
        }).round(2)

        monthly_stats.columns = ["_".join(col) for col in monthly_stats.columns]
        return monthly_stats.reset_index()

    def calculate_seasonal_stats(self, df: pd.DataFrame) -> pd.DataFrame:
        """计算季节性统计数据"""
        df = df.copy()
        df["date"] = pd.to_datetime(df["date"])
        df["month"] = df["date"].dt.month

        def get_season(month):
            if month in [3, 4, 5]:
                return "春季"
            elif month in [6, 7, 8]:
                return "夏季"
            elif month in [9, 10, 11]:
                return "秋季"
            else:
                return "冬季"

        df["season"] = df["month"].apply(get_season)

        seasonal_stats = df.groupby("season", observed=True).agg({
            "aqi": ["mean", "median", "min", "max", "count"],
            "pm25": ["mean", "median"],
            "pm10": ["mean", "median"],
            "temperature": ["mean"],
            "humidity": ["mean"],
            "wind_speed": ["mean"]
        }).round(2)

        seasonal_stats.columns = ["_".join(col) for col in seasonal_stats.columns]
        return seasonal_stats.reset_index()

    def calculate_exceedance_days(self, df: pd.DataFrame) -> Dict[str, int]:
        """计算超标天数"""
        df = df.copy()
        df["date"] = pd.to_datetime(df["date"])

        exceedance = {
            "total_days": len(df),
            "good_days": len(df[df["aqi"] <= 50]),
            "moderate_days": len(df[(df["aqi"] > 50) & (df["aqi"] <= 100)]),
            "light_pollution_days": len(df[(df["aqi"] > 100) & (df["aqi"] <= 150)]),
            "moderate_pollution_days": len(df[(df["aqi"] > 150) & (df["aqi"] <= 200)]),
            "heavy_pollution_days": len(df[(df["aqi"] > 200) & (df["aqi"] <= 300)]),
            "severe_pollution_days": len(df[df["aqi"] > 300]),
            "pm25_exceed_days": len(df[df["pm25"] > 75]),
            "pm10_exceed_days": len(df[df["pm10"] > 150]),
        }

        exceedance["exceedance_rate"] = round(
            (exceedance["light_pollution_days"] + exceedance["moderate_pollution_days"] +
             exceedance["heavy_pollution_days"] + exceedance["severe_pollution_days"])
            / exceedance["total_days"] * 100, 2
        )

        return exceedance

    def detect_anomalies(self, df: pd.DataFrame, threshold: float = 2.0) -> pd.DataFrame:
        """检测异常数据点"""
        df = df.copy()
        df["date"] = pd.to_datetime(df["date"])

        df["aqi_zscore"] = (df["aqi"] - df["aqi"].mean()) / df["aqi"].std()
        df["pm25_zscore"] = (df["pm25"] - df["pm25"].mean()) / df["pm25"].std()

        anomalies = df[
            (abs(df["aqi_zscore"]) > threshold) |
            (abs(df["pm25_zscore"]) > threshold)
        ].copy()

        return anomalies

    def calculate_correlation_matrix(self, df: pd.DataFrame) -> pd.DataFrame:
        """计算污染物与气象要素的相关性矩阵"""
        df = df.copy()

        cols = ["aqi", "pm25", "pm10", "so2", "no2", "co", "o3",
                "temperature", "humidity", "wind_speed"]

        numeric_cols = [col for col in cols if col in df.columns]
        correlation_matrix = df[numeric_cols].corr().round(3)

        return correlation_matrix

    def compare_cities(self, dfs: Dict[str, pd.DataFrame]) -> pd.DataFrame:
        """多城市对比分析"""
        comparison = []

        for city, df in dfs.items():
            stats = {
                "city": city,
                "aqi_mean": round(df["aqi"].mean(), 2),
                "aqi_median": round(df["aqi"].median(), 2),
                "aqi_max": df["aqi"].max(),
                "aqi_min": df["aqi"].min(),
                "pm25_mean": round(df["pm25"].mean(), 2),
                "pm10_mean": round(df["pm10"].mean(), 2),
                "good_days": len(df[df["aqi"] <= 50]),
                "heavy_pollution_days": len(df[df["aqi"] > 200]),
                "avg_temperature": round(df["temperature"].mean(), 1),
                "avg_humidity": round(df["humidity"].mean(), 1),
                "avg_wind_speed": round(df["wind_speed"].mean(), 2),
            }
            comparison.append(stats)

        return pd.DataFrame(comparison)

    def get_pollution_episodes(self, df: pd.DataFrame,
                                threshold: int = 200,
                                min_duration: int = 2) -> List[Dict]:
        """识别重污染过程"""
        df = df.copy()
        df["date"] = pd.to_datetime(df["date"])
        df = df.sort_values("date")

        episodes = []
        current_episode = None

        for _, row in df.iterrows():
            if row["aqi"] >= threshold:
                if current_episode is None:
                    current_episode = {
                        "start_date": row["date"],
                        "end_date": row["date"],
                        "max_aqi": row["aqi"],
                        "avg_aqi": row["aqi"],
                        "days": 1,
                        "data": [row.to_dict()]
                    }
                else:
                    current_episode["end_date"] = row["date"]
                    current_episode["max_aqi"] = max(current_episode["max_aqi"], row["aqi"])
                    current_episode["days"] += 1
                    current_episode["data"].append(row.to_dict())
            else:
                if current_episode is not None:
                    if current_episode["days"] >= min_duration:
                        current_episode["avg_aqi"] = round(
                            sum(d["aqi"] for d in current_episode["data"]) /
                            current_episode["days"], 2
                        )
                        episodes.append(current_episode)
                    current_episode = None

        if current_episode is not None and current_episode["days"] >= min_duration:
            current_episode["avg_aqi"] = round(
                sum(d["aqi"] for d in current_episode["data"]) /
                current_episode["days"], 2
            )
            episodes.append(current_episode)

        return episodes
