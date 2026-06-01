from typing import Dict, List, Tuple
import math


class SnowQualitySimulator:
    def __init__(self):
        self.powder_snow_temp_range = (-15, -5)
        self.icy_snow_temp_range = (-5, 0)
        self.melting_temp = 0
    
    def calculate_snow_quality(self, temperature: float, snowfall: float, 
                               wind_speed: float, humidity: int, 
                               days_since_snowfall: int = 0) -> Dict:
        powder_probability = self._calculate_powder_probability(
            temperature, snowfall, wind_speed, humidity, days_since_snowfall
        )
        
        icy_probability = self._calculate_icy_probability(
            temperature, snowfall, wind_speed, days_since_snowfall
        )
        
        total = powder_probability + icy_probability
        if total > 0:
            powder_probability = powder_probability / total * 100
            icy_probability = icy_probability / total * 100
        
        quality_score = self._calculate_quality_score(
            powder_probability, icy_probability, temperature, snowfall
        )
        
        quality_level = self._get_quality_level(quality_score)
        
        return {
            "powder_probability": round(powder_probability, 1),
            "icy_probability": round(icy_probability, 1),
            "quality_score": round(quality_score, 1),
            "quality_level": quality_level,
            "recommendation": self._get_recommendation(quality_level, powder_probability)
        }
    
    def _calculate_powder_probability(self, temp: float, snowfall: float, 
                                       wind: float, humidity: int, days: int) -> float:
        prob = 0.0
        
        if self.powder_snow_temp_range[0] <= temp <= self.powder_snow_temp_range[1]:
            prob += 40
        elif temp < self.powder_snow_temp_range[0]:
            prob += 25
        elif self.powder_snow_temp_range[1] < temp < 0:
            prob += 15
        
        if snowfall > 10:
            prob += 30
        elif snowfall > 5:
            prob += 20
        elif snowfall > 0:
            prob += 10
        
        if 5 <= wind <= 15:
            prob += 10
        elif wind > 25:
            prob -= 15
        
        if 60 <= humidity <= 80:
            prob += 10
        elif humidity < 40:
            prob -= 10
        
        if days == 0:
            prob += 10
        elif days <= 2:
            prob += 5
        elif days > 5:
            prob -= 20
        
        return max(0, prob)
    
    def _calculate_icy_probability(self, temp: float, snowfall: float, 
                                    wind: float, days: int) -> float:
        prob = 0.0
        
        if self.icy_snow_temp_range[0] <= temp <= self.icy_snow_temp_range[1]:
            prob += 35
        elif temp >= self.melting_temp:
            prob += 50
        
        if temp > -2 and days > 3:
            prob += 25
        
        if snowfall == 0 and days > 2:
            prob += 15
        
        if wind > 20:
            prob += 10
        
        return max(0, prob)
    
    def _calculate_quality_score(self, powder_pct: float, icy_pct: float, 
                                  temp: float, snowfall: float) -> float:
        score = 0
        
        score += powder_pct * 0.6
        score -= icy_pct * 0.4
        
        if -12 <= temp <= -6:
            score += 15
        elif -15 <= temp <= -3:
            score += 10
        elif temp > 0:
            score -= 30
        
        if snowfall > 8:
            score += 20
        elif snowfall > 3:
            score += 10
        
        return max(0, min(100, score))
    
    def _get_quality_level(self, score: float) -> str:
        if score >= 80:
            return "excellent"
        elif score >= 60:
            return "good"
        elif score >= 40:
            return "fair"
        elif score >= 20:
            return "poor"
        else:
            return "very_poor"
    
    def _get_recommendation(self, quality_level: str, powder_pct: float) -> str:
        recommendations = {
            "excellent": "完美粉雪条件！非常适合滑雪，强烈推荐。",
            "good": "雪质良好，适合各类滑雪活动。",
            "fair": "雪质一般，可以滑雪但体验一般。",
            "poor": "雪质较差，建议谨慎选择，可能有结冰情况。",
            "very_poor": "雪质很差，不建议滑雪，可能有安全隐患。"
        }
        return recommendations.get(quality_level, "暂无推荐")
    
    def predict_daily_snow_quality(self, daily_weather: List[Dict]) -> List[Dict]:
        results = []
        days_since_last_snow = 0
        
        for day_data in daily_weather:
            if day_data["snowfall"] > 0:
                days_since_last_snow = 0
            else:
                days_since_last_snow += 1
            
            quality = self.calculate_snow_quality(
                temperature=day_data["temperature"],
                snowfall=day_data["snowfall"],
                wind_speed=day_data["wind_speed"],
                humidity=day_data["humidity"],
                days_since_snowfall=days_since_last_snow
            )
            
            results.append({
                "date": day_data["date"],
                "weather": day_data,
                "snow_quality": quality
            })
        
        return results
    
    def calculate_monthly_score(self, monthly_data: Dict) -> Dict:
        daily_data = monthly_data.get("daily_data", [])
        quality_results = self.predict_daily_snow_quality(daily_data)
        
        avg_score = sum(r["snow_quality"]["quality_score"] for r in quality_results) / len(quality_results) if quality_results else 0
        excellent_days = sum(1 for r in quality_results if r["snow_quality"]["quality_level"] == "excellent")
        good_days = sum(1 for r in quality_results if r["snow_quality"]["quality_level"] == "good")
        
        return {
            "resort_id": monthly_data["resort_id"],
            "resort_name": monthly_data["resort_name"],
            "year": monthly_data["year"],
            "month": monthly_data["month"],
            "avg_quality_score": round(avg_score, 1),
            "excellent_days": excellent_days,
            "good_days": good_days,
            "skiable_days": excellent_days + good_days,
            "total_snowfall": monthly_data["total_snowfall"],
            "avg_temperature": monthly_data["avg_temperature"],
            "daily_details": quality_results
        }
    
    def get_optimal_skiing_window(self, resort_yearly_data: Dict) -> Dict:
        monthly_scores = []
        
        for month_data in resort_yearly_data["monthly_data"]:
            monthly_weather = {
                "resort_id": resort_yearly_data["resort_id"],
                "resort_name": resort_yearly_data["resort_name"],
                "year": resort_yearly_data["year"],
                "month": month_data["month"],
                "total_snowfall": month_data["total_snowfall"],
                "avg_temperature": month_data["avg_temperature"],
                "daily_data": month_data.get("daily_data", [])
            }
            
            score = self.calculate_monthly_score(monthly_weather)
            monthly_scores.append({
                "month": month_data["month"],
                "score": score["avg_quality_score"],
                "skiable_days": score["skiable_days"]
            })
        
        sorted_months = sorted(monthly_scores, key=lambda x: x["score"], reverse=True)
        best_months = [m["month"] for m in sorted_months[:3]]
        
        return {
            "resort_id": resort_yearly_data["resort_id"],
            "resort_name": resort_yearly_data["resort_name"],
            "year": resort_yearly_data["year"],
            "monthly_scores": monthly_scores,
            "best_months": best_months,
            "peak_month": sorted_months[0]["month"] if sorted_months else None,
            "recommendation": f"最佳滑雪月份为 {self._format_months(best_months)}，建议在此期间安排滑雪行程。"
        }
    
    def _format_months(self, months: List[int]) -> str:
        month_names = ["1月", "2月", "3月", "4月", "5月", "6月", 
                       "7月", "8月", "9月", "10月", "11月", "12月"]
        return "、".join([month_names[m-1] for m in sorted(months)])
