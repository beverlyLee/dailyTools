import random
import math
from datetime import datetime, timedelta
from typing import Dict, List, Tuple

random.seed(42)

COMMON_ILLNESSES = {
    "甲流": {
        "base_rate": 0.08,
        "seasonal_peaks": [
            {"month": 3, "intensity": 2.5},
            {"month": 4, "intensity": 2.0},
            {"month": 9, "intensity": 3.0},
            {"month": 10, "intensity": 2.2},
        ],
        "symptoms": ["发热", "咳嗽", "咽痛", "肌肉酸痛", "头痛"],
        "description": "甲型流感病毒感染，春秋季高发",
    },
    "肠胃炎": {
        "base_rate": 0.06,
        "seasonal_peaks": [
            {"month": 1, "intensity": 2.0},
            {"month": 2, "intensity": 1.8},
            {"month": 7, "intensity": 1.5},
            {"month": 8, "intensity": 1.6},
            {"month": 12, "intensity": 2.2},
        ],
        "symptoms": ["腹泻", "呕吐", "腹痛", "发热", "乏力"],
        "description": "胃肠道炎症，冬季和夏季高发",
    },
    "膝盖损伤": {
        "base_rate": 0.05,
        "seasonal_peaks": [
            {"month": 4, "intensity": 1.4},
            {"month": 5, "intensity": 1.5},
            {"month": 9, "intensity": 1.6},
            {"month": 10, "intensity": 1.4},
        ],
        "symptoms": ["膝盖疼痛", "肿胀", "活动受限", "弹响"],
        "description": "运动相关膝关节损伤，春秋运动会季高发",
    },
    "结膜炎": {
        "base_rate": 0.04,
        "seasonal_peaks": [
            {"month": 8, "intensity": 1.5},
            {"month": 9, "intensity": 2.8},
            {"month": 10, "intensity": 2.0},
        ],
        "symptoms": ["眼睛红肿", "流泪", "畏光", "分泌物增多"],
        "description": "传染性结膜炎，秋季开学季高发",
    },
    "流感": {
        "base_rate": 0.07,
        "seasonal_peaks": [
            {"month": 11, "intensity": 1.8},
            {"month": 12, "intensity": 2.8},
            {"month": 1, "intensity": 3.0},
            {"month": 2, "intensity": 2.0},
        ],
        "symptoms": ["高热", "头痛", "全身酸痛", "咳嗽", "乏力"],
        "description": "季节性流感，冬季高发，南方高校更明显",
    },
    "上呼吸道感染": {
        "base_rate": 0.10,
        "seasonal_peaks": [
            {"month": 3, "intensity": 1.8},
            {"month": 4, "intensity": 1.5},
            {"month": 10, "intensity": 1.6},
            {"month": 11, "intensity": 1.8},
        ],
        "symptoms": ["鼻塞", "流涕", "咽痛", "咳嗽", "低热"],
        "description": "上呼吸道感染，换季时节高发",
    },
    "运动损伤": {
        "base_rate": 0.06,
        "seasonal_peaks": [
            {"month": 4, "intensity": 1.7},
            {"month": 5, "intensity": 1.8},
            {"month": 9, "intensity": 1.9},
            {"month": 10, "intensity": 1.6},
        ],
        "symptoms": ["肌肉拉伤", "关节扭伤", "擦伤", "骨折"],
        "description": "体育运动相关损伤，春秋运动会季高发",
    },
    "失眠": {
        "base_rate": 0.09,
        "seasonal_peaks": [
            {"month": 1, "intensity": 1.3},
            {"month": 6, "intensity": 1.8},
            {"month": 12, "intensity": 1.4},
        ],
        "symptoms": ["入睡困难", "睡眠浅", "早醒", "白天嗜睡"],
        "description": "睡眠障碍，考试季高发",
    },
    "焦虑": {
        "base_rate": 0.08,
        "seasonal_peaks": [
            {"month": 6, "intensity": 2.0},
            {"month": 12, "intensity": 1.8},
            {"month": 1, "intensity": 1.5},
        ],
        "symptoms": ["紧张不安", "心悸", "出汗", "注意力不集中"],
        "description": "焦虑症状，考试季和毕业季高发",
    },
}

COLLEGES = [
    {"name": "清华大学", "region": "north", "student_count": 50000},
    {"name": "北京大学", "region": "north", "student_count": 45000},
    {"name": "复旦大学", "region": "south", "student_count": 40000},
    {"name": "上海交通大学", "region": "south", "student_count": 42000},
    {"name": "浙江大学", "region": "south", "student_count": 48000},
    {"name": "南京大学", "region": "south", "student_count": 38000},
    {"name": "武汉大学", "region": "central", "student_count": 43000},
    {"name": "中山大学", "region": "south", "student_count": 46000},
    {"name": "西安交通大学", "region": "northwest", "student_count": 41000},
    {"name": "四川大学", "region": "southwest", "student_count": 44000},
]

REGION_MULTIPLIERS = {
    "north": {"流感": 1.1, "甲流": 1.0, "肠胃炎": 1.0},
    "south": {"流感": 1.4, "甲流": 1.1, "肠胃炎": 1.2, "结膜炎": 1.3},
    "central": {"流感": 1.2, "甲流": 1.0, "肠胃炎": 1.1},
    "northwest": {"流感": 1.1, "甲流": 0.9, "肠胃炎": 0.9},
    "southwest": {"流感": 1.3, "甲流": 1.0, "肠胃炎": 1.1, "结膜炎": 1.1},
}


def get_seasonal_multiplier(month: int, illness: str) -> float:
    illness_config = COMMON_ILLNESSES.get(illness, {})
    peaks = illness_config.get("seasonal_peaks", [])
    base_rate = illness_config.get("base_rate", 0.05)

    for peak in peaks:
        if peak["month"] == month:
            return base_rate * peak["intensity"]

    nearest_peak = min(
        peaks,
        key=lambda p: min(abs(p["month"] - month), 12 - abs(p["month"] - month)),
    )
    distance = min(abs(nearest_peak["month"] - month), 12 - abs(nearest_peak["month"] - month))
    decay = math.exp(-0.3 * distance)
    return base_rate * (1 + (nearest_peak["intensity"] - 1) * decay)


def get_region_multiplier(region: str, illness: str) -> float:
    region_config = REGION_MULTIPLIERS.get(region, {})
    return region_config.get(illness, 1.0)


def generate_daily_data(
    date: datetime, college: Dict, illness: str
) -> Tuple[int, float, List[str]]:
    month = date.month
    region = college["region"]
    student_count = college["student_count"]

    base_multiplier = get_seasonal_multiplier(month, illness)
    region_multiplier = get_region_multiplier(region, illness)

    weekend_factor = 0.9 if date.weekday() >= 5 else 1.0
    exam_factor = 1.0
    if month in [6, 12]:
        exam_factor = random.uniform(1.1, 1.3) if illness in ["失眠", "焦虑"] else 1.0

    daily_probability = base_multiplier * region_multiplier * weekend_factor * exam_factor
    daily_probability = min(daily_probability, 0.5)

    case_count = int(student_count * daily_probability * random.uniform(0.8, 1.2))
    risk_level = min(daily_probability * 3, 1.0)

    symptoms = COMMON_ILLNESSES[illness]["symptoms"]
    reported_symptoms = random.sample(
        symptoms, random.randint(2, min(4, len(symptoms)))
    )

    return case_count, risk_level, reported_symptoms


def generate_yearly_data(year: int = 2025) -> Dict:
    start_date = datetime(year, 1, 1)
    end_date = datetime(year, 12, 31)

    result = {
        "metadata": {
            "year": year,
            "total_colleges": len(COLLEGES),
            "total_illnesses": len(COMMON_ILLNESSES),
        },
        "colleges": [],
        "daily_records": [],
        "social_media_trends": [],
    }

    for college in COLLEGES:
        college_data = {
            "name": college["name"],
            "region": college["region"],
            "student_count": college["student_count"],
            "illness_summary": {},
        }

        for illness in COMMON_ILLNESSES:
            college_data["illness_summary"][illness] = {
                "total_cases": 0,
                "peak_month": None,
                "peak_cases": 0,
                "avg_daily_cases": 0.0,
            }

        result["colleges"].append(college_data)

    current_date = start_date
    while current_date <= end_date:
        date_str = current_date.strftime("%Y-%m-%d")

        for college_idx, college in enumerate(COLLEGES):
            for illness in COMMON_ILLNESSES:
                case_count, risk_level, symptoms = generate_daily_data(
                    current_date, college, illness
                )

                record = {
                    "date": date_str,
                    "college": college["name"],
                    "region": college["region"],
                    "illness": illness,
                    "case_count": case_count,
                    "risk_level": round(risk_level, 4),
                    "symptoms": symptoms,
                    "incidence_rate": round(
                        case_count / college["student_count"] * 1000, 3
                    ),
                }

                result["daily_records"].append(record)

                summary = result["colleges"][college_idx]["illness_summary"][illness]
                summary["total_cases"] += case_count
                if case_count > summary["peak_cases"]:
                    summary["peak_cases"] = case_count
                    summary["peak_month"] = current_date.month

        day_trend = {
            "date": date_str,
            "topics": [],
        }

        trending_illnesses = sorted(
            COMMON_ILLNESSES.keys(),
            key=lambda x: get_seasonal_multiplier(current_date.month, x),
            reverse=True,
        )[:3]

        for illness in trending_illnesses:
            day_trend["topics"].append(
                {
                    "illness": illness,
                    "mention_count": random.randint(100, 1000),
                    "sentiment": random.uniform(0.2, 0.6),
                    "trending_score": round(
                        get_seasonal_multiplier(current_date.month, illness) * 10, 2
                    ),
                }
            )

        result["social_media_trends"].append(day_trend)

        current_date += timedelta(days=1)

    for college in result["colleges"]:
        for illness_data in college["illness_summary"].values():
            illness_data["avg_daily_cases"] = round(
                illness_data["total_cases"] / 365, 2
            )

    return result


def get_illness_info() -> Dict:
    return COMMON_ILLNESSES


def get_college_list() -> List[Dict]:
    return COLLEGES


if __name__ == "__main__":
    data = generate_yearly_data(2025)
    print(f"Generated data for year {data['metadata']['year']}")
    print(f"Total records: {len(data['daily_records'])}")
    print(f"Colleges: {[c['name'] for c in data['colleges']]}")
    print(f"Illnesses: {list(COMMON_ILLNESSES.keys())}")
