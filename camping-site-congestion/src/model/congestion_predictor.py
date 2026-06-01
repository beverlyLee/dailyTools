import pandas as pd
import numpy as np
from datetime import datetime
from sklearn.linear_model import LinearRegression
from sklearn.preprocessing import StandardScaler
from typing import Dict, List, Tuple
import warnings
warnings.filterwarnings('ignore')


class CongestionPredictor:
    def __init__(self, checkin_data: pd.DataFrame):
        self.checkin_data = checkin_data
        self.model = LinearRegression()
        self.scaler = StandardScaler()
        self.site_models = {}
        self._train_models()

    def _extract_features(self, data: pd.DataFrame) -> pd.DataFrame:
        features = pd.DataFrame()
        
        features["month"] = data["date"].dt.month
        features["day_of_week"] = data["date"].dt.dayofweek
        features["day_of_month"] = data["date"].dt.day
        features["is_holiday"] = data["is_holiday"].astype(int)
        
        features["month_sin"] = np.sin(2 * np.pi * features["month"] / 12)
        features["month_cos"] = np.cos(2 * np.pi * features["month"] / 12)
        features["day_sin"] = np.sin(2 * np.pi * features["day_of_week"] / 7)
        features["day_cos"] = np.cos(2 * np.pi * features["day_of_week"] / 7)
        
        season_map = {"spring": 0, "summer": 1, "autumn": 2, "winter": 3}
        features["season"] = data["season"].map(season_map)
        
        return features

    def _train_models(self):
        sites = self.checkin_data["site_name"].unique()
        
        for site in sites:
            site_data = self.checkin_data[self.checkin_data["site_name"] == site]
            
            X = self._extract_features(site_data)
            y = site_data["checkin_count"].values
            
            X_scaled = self.scaler.fit_transform(X)
            
            model = LinearRegression()
            model.fit(X_scaled, y)
            
            self.site_models[site] = {
                "model": model,
                "scaler": self.scaler,
                "max_checkins": y.max(),
                "mean_checkins": y.mean()
            }

    def predict_congestion(self, site_name: str, date: datetime) -> Dict:
        if site_name not in self.site_models:
            raise ValueError(f"Site {site_name} not found in trained models")
        
        site_info = self.site_models[site_name]
        
        temp_df = pd.DataFrame([{
            "date": date,
            "is_holiday": self._is_holiday(date),
            "season": self._get_season(date.month)
        }])
        
        X = self._extract_features(temp_df)
        X_scaled = site_info["scaler"].transform(X)
        
        predicted_checkins = site_info["model"].predict(X_scaled)[0]
        predicted_checkins = max(0, predicted_checkins)
        
        is_holiday = self._is_holiday(date)
        
        site_base_popularity = {
            "武功山": 45, "莫干山": 40, "千岛湖": 42, "安吉小杭坑": 38,
            "黄山风景区": 35, "张家界": 33, "桂林阳朔": 32, "三亚亚龙湾": 38,
            "长白山": 28, "天目湖": 30
        }
        base_level = site_base_popularity.get(site_name, 30)
        
        holiday_boost = 35 if is_holiday else 8
        seasonal_factor = 1.0
        month = date.month
        if month in [5, 10]:
            seasonal_factor = 1.15
        elif month in [7, 8]:
            seasonal_factor = 1.1
        elif month in [12, 1, 2]:
            seasonal_factor = 0.85
        
        congestion_level = (base_level + holiday_boost) * seasonal_factor
        congestion_level = min(95, max(40, congestion_level))
        
        if congestion_level >= 80:
            level = "严重拥挤"
            color = "red"
            alert = True
        elif congestion_level >= 60:
            level = "拥挤"
            color = "orange"
            alert = False
        elif congestion_level >= 40:
            level = "适中"
            color = "yellow"
            alert = False
        else:
            level = "舒适"
            color = "green"
            alert = False
        
        return {
            "site_name": site_name,
            "date": date,
            "predicted_checkins": int(predicted_checkins),
            "congestion_level": round(congestion_level, 1),
            "level": level,
            "color": color,
            "alert": alert
        }

    def predict_holiday_congestion(self, year: int, holiday_type: str = "may_day") -> pd.DataFrame:
        if holiday_type == "may_day":
            dates = [datetime(year, 5, day) for day in range(1, 6)]
        elif holiday_type == "national_day":
            dates = [datetime(year, 10, day) for day in range(1, 8)]
        else:
            raise ValueError("holiday_type must be 'may_day' or 'national_day'")
        
        results = []
        sites = list(self.site_models.keys())
        
        for site in sites:
            for date in dates:
                prediction = self.predict_congestion(site, date)
                results.append(prediction)
        
        return pd.DataFrame(results)

    def predict_month_congestion(self, site_name: str, year: int, month: int) -> pd.DataFrame:
        import calendar
        _, num_days = calendar.monthrange(year, month)
        dates = [datetime(year, month, day) for day in range(1, num_days + 1)]
        
        results = []
        for date in dates:
            prediction = self.predict_congestion(site_name, date)
            results.append(prediction)
        
        return pd.DataFrame(results)

    def get_congestion_forecast(self, site_name: str, days_ahead: int = 30) -> pd.DataFrame:
        start_date = datetime.now()
        dates = [start_date + pd.Timedelta(days=i) for i in range(days_ahead)]
        
        results = []
        for date in dates:
            prediction = self.predict_congestion(site_name, date)
            results.append(prediction)
        
        return pd.DataFrame(results)

    def _get_season(self, month: int) -> str:
        if month in [3, 4, 5]:
            return "spring"
        elif month in [6, 7, 8]:
            return "summer"
        elif month in [9, 10, 11]:
            return "autumn"
        else:
            return "winter"

    def _is_holiday(self, date: datetime) -> bool:
        month, day = date.month, date.day
        
        if (month == 5 and 1 <= day <= 5):
            return True
        elif (month == 10 and 1 <= day <= 7):
            return True
        elif (month == 1 and 20 <= day <= 31) or (month == 2 and day <= 10):
            return True
        elif (month == 4 and 3 <= day <= 5):
            return True
        elif (month == 6 and 10 <= day <= 12):
            return True
        elif (month == 9 and 15 <= day <= 17):
            return True
        elif date.weekday() >= 5:
            return True
        return False

    def recommend_best_sites(self, date: datetime, top_n: int = 5) -> List[Dict]:
        results = []
        sites = list(self.site_models.keys())
        
        for site in sites:
            prediction = self.predict_congestion(site, date)
            weather_score = self._estimate_weather(date, site)
            overall_score = weather_score * 0.5 + (100 - prediction["congestion_level"]) * 0.5
            
            results.append({
                **prediction,
                "weather_score": round(weather_score, 1),
                "overall_score": round(overall_score, 1)
            })
        
        results.sort(key=lambda x: x["overall_score"], reverse=True)
        return results[:top_n]

    def _estimate_weather(self, date: datetime, site_name: str) -> float:
        month = date.month
        season = self._get_season(month)
        
        season_scores = {
            "spring": 80,
            "summer": 70,
            "autumn": 90,
            "winter": 60
        }
        
        base_score = season_scores.get(season, 70)
        
        autumn_sites = ["武功山", "黄山风景区", "莫干山"]
        if site_name in autumn_sites and season == "autumn":
            base_score += 10
        
        if date.weekday() >= 5:
            base_score -= 5
        
        return min(100, base_score)
