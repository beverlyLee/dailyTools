from typing import Dict, List, Tuple
from collections import defaultdict
from datetime import datetime

from src.data.illness_simulator import (
    generate_yearly_data,
    COMMON_ILLNESSES,
    COLLEGES,
    get_seasonal_multiplier,
)


class SeasonalAnalyzer:
    def __init__(self, year: int = 2025):
        self.year = year
        self.data = generate_yearly_data(year)
        self.daily_records = self.data["daily_records"]
        self.colleges = self.data["colleges"]
        self.social_media_trends = self.data["social_media_trends"]

    def get_illness_by_month(self, illness: str, college: str = None) -> Dict[int, Dict]:
        monthly_data = defaultdict(lambda: {"cases": 0, "risk": 0.0, "count": 0})

        for record in self.daily_records:
            if record["illness"] != illness:
                continue
            if college and record["college"] != college:
                continue

            date = datetime.strptime(record["date"], "%Y-%m-%d")
            month = date.month
            monthly_data[month]["cases"] += record["case_count"]
            monthly_data[month]["risk"] += record["risk_level"]
            monthly_data[month]["count"] += 1

        result = {}
        for month in range(1, 13):
            if monthly_data[month]["count"] > 0:
                result[month] = {
                    "total_cases": monthly_data[month]["cases"],
                    "avg_risk": round(
                        monthly_data[month]["risk"] / monthly_data[month]["count"], 4
                    ),
                    "avg_daily_cases": round(
                        monthly_data[month]["cases"] / monthly_data[month]["count"], 2
                    ),
                }
            else:
                result[month] = {"total_cases": 0, "avg_risk": 0.0, "avg_daily_cases": 0.0}

        return result

    def get_seasonal_patterns(self, college: str = None) -> Dict[str, Dict]:
        patterns = {}

        for illness in COMMON_ILLNESSES:
            monthly_data = self.get_illness_by_month(illness, college)

            sorted_months = sorted(
                monthly_data.items(), key=lambda x: x[1]["avg_risk"], reverse=True
            )

            peak_months = [m[0] for m in sorted_months[:3]]
            high_risk_months = [m[0] for m in sorted_months if m[1]["avg_risk"] >= 0.15]

            spring_months = [3, 4, 5]
            summer_months = [6, 7, 8]
            autumn_months = [9, 10, 11]
            winter_months = [12, 1, 2]

            spring_risk = sum(monthly_data[m]["avg_risk"] for m in spring_months) / 3
            summer_risk = sum(monthly_data[m]["avg_risk"] for m in summer_months) / 3
            autumn_risk = sum(monthly_data[m]["avg_risk"] for m in autumn_months) / 3
            winter_risk = sum(monthly_data[m]["avg_risk"] for m in winter_months) / 3

            season_risks = {
                "春季": round(spring_risk, 4),
                "夏季": round(summer_risk, 4),
                "秋季": round(autumn_risk, 4),
                "冬季": round(winter_risk, 4),
            }

            dominant_season = max(season_risks.items(), key=lambda x: x[1])[0]

            patterns[illness] = {
                "peak_months": peak_months,
                "high_risk_months": high_risk_months,
                "season_risks": season_risks,
                "dominant_season": dominant_season,
                "monthly_data": monthly_data,
            }

        return patterns

    def get_region_comparison(self, illness: str) -> Dict[str, Dict]:
        region_data = defaultdict(
            lambda: {"cases": 0, "risk": 0.0, "count": 0, "peak_month": None, "peak_risk": 0.0}
        )

        for record in self.daily_records:
            if record["illness"] != illness:
                continue

            region = record["region"]
            date = datetime.strptime(record["date"], "%Y-%m-%d")
            month = date.month

            region_data[region]["cases"] += record["case_count"]
            region_data[region]["risk"] += record["risk_level"]
            region_data[region]["count"] += 1

            if record["risk_level"] > region_data[region]["peak_risk"]:
                region_data[region]["peak_risk"] = record["risk_level"]
                region_data[region]["peak_month"] = month

        result = {}
        for region, data in region_data.items():
            if data["count"] > 0:
                result[region] = {
                    "total_cases": data["cases"],
                    "avg_risk": round(data["risk"] / data["count"], 4),
                    "peak_month": data["peak_month"],
                    "peak_risk": round(data["peak_risk"], 4),
                    "avg_daily_cases": round(data["cases"] / data["count"], 2),
                }

        return result

    def get_calendar_heatmap_data(
        self, illness: str, college: str = None, region: str = None
    ) -> List[Tuple[str, float]]:
        heatmap_data = []

        for record in self.daily_records:
            if record["illness"] != illness:
                continue
            if college and record["college"] != college:
                continue
            if region and record["region"] != region:
                continue

            heatmap_data.append((record["date"], record["risk_level"]))

        aggregated = defaultdict(list)
        for date_str, risk in heatmap_data:
            aggregated[date_str].append(risk)

        result = []
        for date_str in sorted(aggregated.keys()):
            avg_risk = sum(aggregated[date_str]) / len(aggregated[date_str])
            result.append([date_str, round(avg_risk, 4)])

        return result

    def get_high_risk_periods(
        self, threshold: float = 0.3, college: str = None
    ) -> List[Dict]:
        high_risk_periods = []

        for illness in COMMON_ILLNESSES:
            heatmap = self.get_calendar_heatmap_data(illness, college)

            consecutive_days = []
            for date_str, risk in heatmap:
                if risk >= threshold:
                    consecutive_days.append({"date": date_str, "risk": risk})
                else:
                    if len(consecutive_days) >= 3:
                        high_risk_periods.append(
                            {
                                "illness": illness,
                                "start_date": consecutive_days[0]["date"],
                                "end_date": consecutive_days[-1]["date"],
                                "duration_days": len(consecutive_days),
                                "avg_risk": round(
                                    sum(d["risk"] for d in consecutive_days)
                                    / len(consecutive_days),
                                    4,
                                ),
                                "peak_risk": round(
                                    max(d["risk"] for d in consecutive_days), 4
                                ),
                            }
                        )
                    consecutive_days = []

            if len(consecutive_days) >= 3:
                high_risk_periods.append(
                    {
                        "illness": illness,
                        "start_date": consecutive_days[0]["date"],
                        "end_date": consecutive_days[-1]["date"],
                        "duration_days": len(consecutive_days),
                        "avg_risk": round(
                            sum(d["risk"] for d in consecutive_days)
                            / len(consecutive_days),
                            4,
                        ),
                        "peak_risk": round(
                            max(d["risk"] for d in consecutive_days), 4
                        ),
                    }
                )

        return sorted(high_risk_periods, key=lambda x: x["peak_risk"], reverse=True)

    def get_monthly_summary(self, month: int, college: str = None) -> Dict:
        records = []
        for record in self.daily_records:
            date = datetime.strptime(record["date"], "%Y-%m-%d")
            if date.month != month:
                continue
            if college and record["college"] != college:
                continue
            records.append(record)

        illness_summary = defaultdict(
            lambda: {"cases": 0, "risk": 0.0, "count": 0}
        )

        for record in records:
            illness = record["illness"]
            illness_summary[illness]["cases"] += record["case_count"]
            illness_summary[illness]["risk"] += record["risk_level"]
            illness_summary[illness]["count"] += 1

        result = {
            "month": month,
            "month_name": [
                "一月", "二月", "三月", "四月", "五月", "六月",
                "七月", "八月", "九月", "十月", "十一月", "十二月"
            ][month - 1],
            "illnesses": [],
        }

        for illness, data in sorted(
            illness_summary.items(),
            key=lambda x: x[1]["risk"] / x[1]["count"] if x[1]["count"] > 0 else 0,
            reverse=True,
        ):
            if data["count"] > 0:
                avg_risk = round(data["risk"] / data["count"], 4)
                risk_level = "low"
                if avg_risk >= 0.3:
                    risk_level = "high"
                elif avg_risk >= 0.15:
                    risk_level = "medium"

                result["illnesses"].append(
                    {
                        "name": illness,
                        "total_cases": data["cases"],
                        "avg_risk": avg_risk,
                        "risk_level": risk_level,
                        "avg_daily_cases": round(data["cases"] / data["count"], 2),
                        "symptoms": COMMON_ILLNESSES[illness]["symptoms"],
                        "description": COMMON_ILLNESSES[illness]["description"],
                    }
                )

        return result

    def get_social_media_trends(self, limit_days: int = 30) -> List[Dict]:
        return self.social_media_trends[-limit_days:]

    def get_college_ranking(self, illness: str, month: int = None) -> List[Dict]:
        college_data = defaultdict(lambda: {"cases": 0, "risk": 0.0, "count": 0})

        for record in self.daily_records:
            if record["illness"] != illness:
                continue
            if month:
                date = datetime.strptime(record["date"], "%Y-%m-%d")
                if date.month != month:
                    continue

            college = record["college"]
            college_data[college]["cases"] += record["case_count"]
            college_data[college]["risk"] += record["risk_level"]
            college_data[college]["count"] += 1

        result = []
        for college, data in college_data.items():
            if data["count"] > 0:
                result.append(
                    {
                        "college": college,
                        "total_cases": data["cases"],
                        "avg_risk": round(data["risk"] / data["count"], 4),
                        "avg_daily_cases": round(data["cases"] / data["count"], 2),
                    }
                )

        return sorted(result, key=lambda x: x["avg_risk"], reverse=True)

    def validate_requirements(self) -> Dict:
        validation = {
            "autumn_influenza": False,
            "autumn_conjunctivitis": False,
            "winter_southern_flu": False,
            "details": {},
        }

        autumn_months = [9, 10]
        southern_colleges = [c["name"] for c in COLLEGES if c["region"] in ["south", "southwest"]]

        jialiu_autumn = []
        for month in autumn_months:
            data = self.get_illness_by_month("甲流")
            if month in data:
                jialiu_autumn.append(data[month]["avg_risk"])

        if jialiu_autumn and max(jialiu_autumn) >= 0.2:
            validation["autumn_influenza"] = True
            validation["details"]["autumn_influenza"] = {
                "peak_risk": max(jialiu_autumn),
                "threshold": 0.2,
                "months": autumn_months,
            }

        conjunctivitis_autumn = []
        for month in autumn_months:
            data = self.get_illness_by_month("结膜炎")
            if month in data:
                conjunctivitis_autumn.append(data[month]["avg_risk"])

        if conjunctivitis_autumn and max(conjunctivitis_autumn) >= 0.15:
            validation["autumn_conjunctivitis"] = True
            validation["details"]["autumn_conjunctivitis"] = {
                "peak_risk": max(conjunctivitis_autumn),
                "threshold": 0.15,
                "months": autumn_months,
            }

        winter_months = [12, 1, 2]
        southern_flu_winter = []
        for college in southern_colleges:
            for month in winter_months:
                data = self.get_illness_by_month("流感", college)
                if month in data:
                    southern_flu_winter.append(data[month]["avg_risk"])

        if southern_flu_winter and max(southern_flu_winter) >= 0.25:
            validation["winter_southern_flu"] = True
            validation["details"]["winter_southern_flu"] = {
                "peak_risk": max(southern_flu_winter),
                "threshold": 0.25,
                "months": winter_months,
                "southern_colleges": southern_colleges,
            }

        validation["all_passed"] = (
            validation["autumn_influenza"]
            and validation["autumn_conjunctivitis"]
            and validation["winter_southern_flu"]
        )

        return validation


if __name__ == "__main__":
    analyzer = SeasonalAnalyzer(2025)

    print("=== 秋季开学季验证 ===")
    sep_summary = analyzer.get_monthly_summary(9)
    print(f"9月高发疾病:")
    for illness in sep_summary["illnesses"][:3]:
        print(f"  {illness['name']}: 风险={illness['avg_risk']}, 等级={illness['risk_level']}")

    print("\n=== 冬季南方高校流感验证 ===")
    region_comp = analyzer.get_region_comparison("流感")
    for region, data in region_comp.items():
        print(f"  {region}: 平均风险={data['avg_risk']}, 峰值月份={data['peak_month']}月")

    print("\n=== 需求验证结果 ===")
    validation = analyzer.validate_requirements()
    print(f"秋季甲流高发: {'✓' if validation['autumn_influenza'] else '✗'}")
    print(f"秋季结膜炎高发: {'✓' if validation['autumn_conjunctivitis'] else '✗'}")
    print(f"冬季南方流感高风险: {'✓' if validation['winter_southern_flu'] else '✗'}")
    print(f"全部通过: {'✓' if validation['all_passed'] else '✗'}")
