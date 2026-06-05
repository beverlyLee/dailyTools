import asyncio
import json
import os
from typing import Dict, List
from dotenv import load_dotenv

load_dotenv()


class ComfortIndex:
    def __init__(self):
        self.weights = {
            "wind": 0.35,
            "grass": 0.25,
            "drainage": 0.20,
            "keywords": 0.20,
        }

        self.positive_keywords = {
            "草坪": 10,
            "草地": 10,
            "无大风": 15,
            "风小": 10,
            "避风": 15,
            "背风": 15,
            "排水好": 10,
            "不积水": 10,
            "干燥": 8,
            "平坦": 8,
            "开阔": 5,
            "厕所": 5,
            "水源": 5,
            "淋浴": 5,
            "停车场": 5,
        }

        self.negative_keywords = {
            "风大": -15,
            "大风": -15,
            "积水": -10,
            "潮湿": -8,
            "泥泞": -10,
            "蚊子多": -8,
            "暴晒": -8,
        }

    def calculate_score(
        self, weather_data: Dict, note_keywords: List[str]
    ) -> Dict:
        wind_score = self._calculate_wind_score(weather_data)
        grass_score = self._calculate_grass_score(weather_data)
        drainage_score = self._calculate_drainage_score(weather_data)
        keyword_score = self._calculate_keyword_score(note_keywords)

        total_score = (
            wind_score * self.weights["wind"]
            + grass_score * self.weights["grass"]
            + drainage_score * self.weights["drainage"]
            + keyword_score * self.weights["keywords"]
        )

        total_score = max(0, min(100, total_score))

        return {
            "total_score": round(total_score, 1),
            "wind_score": round(wind_score, 1),
            "grass_score": round(grass_score, 1),
            "drainage_score": round(drainage_score, 1),
            "keyword_score": round(keyword_score, 1),
            "grade": self._get_grade(total_score),
            "color": self._get_color(total_score),
            "recommendation": self._get_recommendation(total_score),
            "wind_level": weather_data.get("wind_level", 3),
            "wind_level_desc": weather_data.get("wind_level_desc", "微风"),
            "grass_coverage": weather_data.get("grass_coverage", 75),
            "rain_probability": weather_data.get("rain_probability", 30),
            "details": self._generate_details(
                wind_score, grass_score, drainage_score, keyword_score, weather_data
            ),
        }

    def _calculate_wind_score(self, weather_data: Dict) -> float:
        wind_level = weather_data.get("wind_level", 3)
        if wind_level <= 1:
            return 95
        elif wind_level == 2:
            return 85
        elif wind_level == 3:
            return 65
        elif wind_level == 4:
            return 40
        elif wind_level == 5:
            return 25
        elif wind_level == 6:
            return 10
        else:
            return 5

    def _calculate_grass_score(self, weather_data: Dict) -> float:
        coverage = weather_data.get("grass_coverage", 75)
        if coverage >= 90:
            return 95
        elif coverage >= 80:
            return 80 + (coverage - 80) * 0.75
        elif coverage >= 70:
            return 65 + (coverage - 70) * 0.75
        elif coverage >= 60:
            return 50 + (coverage - 60) * 0.75
        elif coverage >= 45:
            return 30 + (coverage - 45) * 0.5
        elif coverage >= 30:
            return 15 + (coverage - 30) * 0.5
        else:
            return coverage * 0.5

    def _calculate_drainage_score(self, weather_data: Dict) -> float:
        score = weather_data.get("drainage_score", 50)
        return max(0, min(100, score - 10))

    def _calculate_keyword_score(self, keywords: List[str]) -> float:
        score = 40
        for kw in keywords:
            if kw in self.positive_keywords:
                score += self.positive_keywords[kw]
            if kw in self.negative_keywords:
                score += self.negative_keywords[kw]
        return max(0, min(100, score))

    def _get_grade(self, score: float) -> str:
        if score >= 75:
            return "S"
        elif score >= 68:
            return "A"
        elif score >= 58:
            return "B"
        elif score >= 48:
            return "C"
        else:
            return "D"

    def _get_color(self, score: float) -> str:
        if score >= 75:
            return "#22c55e"
        elif score >= 68:
            return "#84cc16"
        elif score >= 58:
            return "#eab308"
        elif score >= 48:
            return "#f97316"
        else:
            return "#ef4444"

    def _get_recommendation(self, score: float) -> str:
        if score >= 75:
            return "强烈推荐，绝佳露营地！"
        elif score >= 68:
            return "推荐，舒适度较高"
        elif score >= 58:
            return "一般，可根据天气选择"
        elif score >= 48:
            return "不推荐，条件较差"
        else:
            return "不建议前往"

    def _generate_details(
        self,
        wind_score: float,
        grass_score: float,
        drainage_score: float,
        keyword_score: float,
        weather_data: Dict,
    ) -> List[Dict]:
        details = []

        wind_level = weather_data.get("wind_level", 3)
        if wind_score >= 80:
            details.append({
                "icon": "🍃",
                "title": "风力适宜",
                "desc": f"年均{weather_data.get('wind_level_desc', '微风')}，体感舒适",
                "positive": True,
            })
        elif wind_score >= 50:
            details.append({
                "icon": "💨",
                "title": "风力一般",
                "desc": "部分时段风较大，建议选择避风位置",
                "positive": True,
            })
        else:
            details.append({
                "icon": "🌪️",
                "title": "风力较大",
                "desc": "常年风力较强，建议携带防风装备",
                "positive": False,
            })

        coverage = weather_data.get("grass_coverage", 75)
        if grass_score >= 80:
            details.append({
                "icon": "🌿",
                "title": "草地优良",
                "desc": f"草地覆盖率{coverage}%，地面平整柔软",
                "positive": True,
            })
        elif grass_score >= 50:
            details.append({
                "icon": "🌱",
                "title": "草地一般",
                "desc": f"草地覆盖率约{coverage}%，部分区域裸露",
                "positive": True,
            })
        else:
            details.append({
                "icon": "🏜️",
                "title": "草地不足",
                "desc": "草地覆盖率较低，地面条件较差",
                "positive": False,
            })

        if drainage_score >= 70:
            details.append({
                "icon": "💧",
                "title": "排水良好",
                "desc": "不易积水，雨后能快速恢复",
                "positive": True,
            })
        elif drainage_score >= 50:
            details.append({
                "icon": "🌧️",
                "title": "排水一般",
                "desc": "雨后可能有局部积水，建议避开雨季",
                "positive": True,
            })
        else:
            details.append({
                "icon": "🌊",
                "title": "排水较差",
                "desc": "容易积水，不建议雨季前往",
                "positive": False,
            })

        return details


async def main():
    scorer = ComfortIndex()

    weather_data = {
        "wind_level": 2,
        "wind_level_desc": "轻风",
        "grass_coverage": 85,
        "drainage_score": 80,
        "rain_probability": 25,
    }

    keywords = ["草坪", "排水好", "平坦", "停车场"]

    result = scorer.calculate_score(weather_data, keywords)
    print(json.dumps(result, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    asyncio.run(main())
