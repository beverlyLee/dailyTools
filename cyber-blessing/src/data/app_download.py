import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from dateutil.relativedelta import relativedelta


APP_NAMES = ["电子木鱼", "赛博木鱼", "功德+1", "锦鲤护体", "电子祈福", "木鱼助手"]
MERCURY_RETROGRADE_PERIODS_2023_2026 = [
    ("2023-04-21", "2023-05-15", "水星逆行·金牛座"),
    ("2023-08-23", "2023-09-15", "水星逆行·处女座"),
    ("2023-12-13", "2024-01-02", "水星逆行·摩羯座"),
    ("2024-04-01", "2024-04-25", "水星逆行·金牛座"),
    ("2024-08-05", "2024-08-28", "水星逆行·处女座"),
    ("2024-11-25", "2024-12-15", "水星逆行·射手座"),
    ("2025-03-18", "2025-04-10", "水星逆行·白羊座"),
    ("2025-07-08", "2025-07-30", "水星逆行·狮子座"),
    ("2025-10-30", "2025-11-20", "水星逆行·天蝎座"),
    ("2026-02-16", "2026-03-10", "水星逆行·双鱼座"),
    ("2026-06-08", "2026-07-01", "水星逆行·巨蟹座"),
    ("2026-09-26", "2026-10-18", "水星逆行·天秤座"),
]

EXAM_EVENTS = [
    {"name": "全国硕士研究生招生考试(考研)", "date": "2023-12-24", "peak_strength": 5.0},
    {"name": "全国硕士研究生招生考试(考研)", "date": "2024-12-22", "peak_strength": 5.5},
    {"name": "全国硕士研究生招生考试(考研)", "date": "2025-12-21", "peak_strength": 5.2},
    {"name": "国家公务员考试(国考)", "date": "2023-11-26", "peak_strength": 3.5},
    {"name": "国家公务员考试(国考)", "date": "2024-12-01", "peak_strength": 3.8},
    {"name": "国家公务员考试(国考)", "date": "2025-11-30", "peak_strength": 3.6},
    {"name": "省级公务员考试(省考联考)", "date": "2023-02-25", "peak_strength": 2.5},
    {"name": "省级公务员考试(省考联考)", "date": "2024-03-16", "peak_strength": 2.8},
    {"name": "省级公务员考试(省考联考)", "date": "2025-03-16", "peak_strength": 2.6},
    {"name": "教师资格证考试", "date": "2023-09-16", "peak_strength": 1.8},
    {"name": "教师资格证考试", "date": "2024-09-15", "peak_strength": 2.0},
    {"name": "教师资格证考试", "date": "2025-09-14", "peak_strength": 1.9},
    {"name": "英语四六级考试", "date": "2023-12-16", "peak_strength": 1.5},
    {"name": "英语四六级考试", "date": "2024-12-14", "peak_strength": 1.6},
    {"name": "英语四六级考试", "date": "2025-12-13", "peak_strength": 1.5},
]


def _generate_date_range(start="2023-01-01", end="2026-06-30"):
    return pd.date_range(start=start, end=end, freq="D")


def _gaussian_peak(dates, center_date, strength, sigma_days=14):
    center = pd.Timestamp(center_date)
    days_diff = (dates - center).days
    return strength * np.exp(-(days_diff ** 2) / (2 * sigma_days ** 2))


def _mercury_retrograde_signal(dates):
    signal = pd.Series(0.0, index=dates)
    for start, end, label in MERCURY_RETROGRADE_PERIODS_2023_2026:
        mask = (dates >= start) & (dates <= end)
        signal[mask] = 1.5
    signal = signal.rolling(window=7, center=True, min_periods=1).mean()
    return signal


def _generate_download_series(dates):
    base = 800 + 150 * np.sin(2 * np.pi * np.arange(len(dates)) / 365.25)
    weekly = 50 * np.sin(2 * np.pi * np.arange(len(dates)) / 7)
    noise = np.random.normal(0, 80, len(dates))
    downloads = base + weekly + noise

    for event in EXAM_EVENTS:
        downloads += _gaussian_peak(dates, event["date"], event["peak_strength"] * 120, sigma_days=10)

    downloads += _mercury_retrograde_signal(dates) * 200
    return np.clip(downloads, 10, None)


def _generate_meme_series(dates):
    base = 1200 + 300 * np.sin(2 * np.pi * np.arange(len(dates)) / 365.25 + 1.5)
    weekly = 100 * np.sin(2 * np.pi * np.arange(len(dates)) / 7 + 0.5)
    noise = np.random.normal(0, 150, len(dates))
    meme_usage = base + weekly + noise

    for event in EXAM_EVENTS:
        meme_usage += _gaussian_peak(dates, event["date"], event["peak_strength"] * 180, sigma_days=8)

    meme_usage += _mercury_retrograde_signal(dates) * 350
    return np.clip(meme_usage, 50, None)


def _generate_cyber_blessing_index(downloads, meme_usage):
    d_norm = (downloads - downloads.min()) / (downloads.max() - downloads.min())
    m_norm = (meme_usage - meme_usage.min()) / (meme_usage.max() - meme_usage.min())
    return d_norm * 0.5 + m_norm * 0.5


def generate_dataset():
    dates = _generate_date_range()
    downloads = _generate_download_series(dates)
    meme_usage = _generate_meme_series(dates)
    index = _generate_cyber_blessing_index(downloads, meme_usage)

    df = pd.DataFrame({
        "date": dates,
        "download_count": downloads.round().astype(int),
        "meme_usage": meme_usage.round().astype(int),
        "cyber_blessing_index": (index * 100).round(2),
    })
    return df


def get_download_peaks(df, threshold=0.75):
    avg = df["download_count"].mean()
    peaks = df[df["download_count"] > avg * threshold].copy()
    peaks["peak_type"] = peaks["date"].apply(_classify_peak)
    return peaks


def _classify_peak(date):
    for event in EXAM_EVENTS:
        event_date = pd.Timestamp(event["date"])
        if abs((date - event_date).days) <= 14:
            return event["name"]
    for start, end, label in MERCURY_RETROGRADE_PERIODS_2023_2026:
        if pd.Timestamp(start) <= date <= pd.Timestamp(end):
            return label
    return "常规波动"


def get_app_names():
    return APP_NAMES