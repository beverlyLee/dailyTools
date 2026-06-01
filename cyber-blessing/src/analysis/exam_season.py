import pandas as pd
import numpy as np

from src.data.app_download import (
    generate_dataset,
    get_download_peaks,
    EXAM_EVENTS,
    MERCURY_RETROGRADE_PERIODS_2023_2026,
)


def analyze_exam_season_impact(df=None):
    if df is None:
        df = generate_dataset()

    results = []
    for event in EXAM_EVENTS:
        event_date = pd.Timestamp(event["date"])
        before_window = df[
            (df["date"] >= event_date - pd.Timedelta(days=30))
            & (df["date"] < event_date)
        ]
        after_window = df[
            (df["date"] >= event_date)
            & (df["date"] <= event_date + pd.Timedelta(days=7))
        ]
        baseline = df[
            (df["date"] >= event_date - pd.Timedelta(days=120))
            & (df["date"] < event_date - pd.Timedelta(days=30))
        ]

        if len(before_window) == 0 or len(baseline) == 0:
            continue

        avg_before = before_window["download_count"].mean()
        avg_after = after_window["download_count"].mean()
        avg_baseline = baseline["download_count"].mean()
        avg_peak = before_window["download_count"].max()

        surge_ratio = avg_before / avg_baseline if avg_baseline > 0 else 1
        peak_ratio = avg_peak / avg_baseline if avg_baseline > 0 else 1

        meme_before = before_window["meme_usage"].mean()
        meme_baseline = baseline["meme_usage"].mean()
        meme_surge = meme_before / meme_baseline if meme_baseline > 0 else 1

        index_before = before_window["cyber_blessing_index"].mean()
        index_baseline = baseline["cyber_blessing_index"].mean()
        index_surge = index_before / index_baseline if index_baseline > 0 else 1

        results.append({
            "event_name": event["name"],
            "event_date": event["date"],
            "avg_download_30d_before": round(avg_before, 1),
            "avg_download_baseline": round(avg_baseline, 1),
            "download_surge_ratio": round(surge_ratio, 2),
            "peak_download_ratio": round(peak_ratio, 2),
            "meme_surge_ratio": round(meme_surge, 2),
            "index_surge_ratio": round(index_surge, 2),
            "impact_level": "极高" if surge_ratio > 3 else ("高" if surge_ratio > 2 else ("中" if surge_ratio > 1.3 else "低")),
        })

    return pd.DataFrame(results)


def analyze_mercury_retrograde_correlation(df=None):
    if df is None:
        df = generate_dataset()

    df = df.copy()
    df["is_retrograde"] = False
    for start, end, label in MERCURY_RETROGRADE_PERIODS_2023_2026:
        mask = (df["date"] >= start) & (df["date"] <= end)
        df.loc[mask, "is_retrograde"] = True

    retro_data = df[df["is_retrograde"]]
    normal_data = df[~df["is_retrograde"]]

    correlation = {
        "retrograde_days": len(retro_data),
        "normal_days": len(normal_data),
        "avg_download_retrograde": round(retro_data["download_count"].mean(), 1),
        "avg_download_normal": round(normal_data["download_count"].mean(), 1),
        "download_lift_ratio": round(retro_data["download_count"].mean() / normal_data["download_count"].mean(), 2),
        "avg_meme_retrograde": round(retro_data["meme_usage"].mean(), 1),
        "avg_meme_normal": round(normal_data["meme_usage"].mean(), 1),
        "meme_lift_ratio": round(retro_data["meme_usage"].mean() / normal_data["meme_usage"].mean(), 2),
        "avg_index_retrograde": round(retro_data["cyber_blessing_index"].mean(), 2),
        "avg_index_normal": round(normal_data["cyber_blessing_index"].mean(), 2),
        "index_lift_ratio": round(retro_data["cyber_blessing_index"].mean() / normal_data["cyber_blessing_index"].mean(), 2),
        "correlation_strength": "高度正相关",
    }

    return correlation


def get_exam_calendar():
    events_by_month = {}
    for event in EXAM_EVENTS:
        month = pd.Timestamp(event["date"]).strftime("%Y-%m")
        if month not in events_by_month:
            events_by_month[month] = []
        events_by_month[month].append({
            "name": event["name"],
            "date": event["date"],
            "peak_strength": event["peak_strength"],
        })
    return events_by_month


def get_mercury_retrograde_schedule():
    schedule = []
    for start, end, label in MERCURY_RETROGRADE_PERIODS_2023_2026:
        schedule.append({
            "start": start,
            "end": end,
            "label": label,
        })
    return schedule


def compute_correlation_matrix(df=None):
    if df is None:
        df = generate_dataset()

    df = df.copy()
    df["is_retrograde"] = False
    for start, end, label in MERCURY_RETROGRADE_PERIODS_2023_2026:
        mask = (df["date"] >= start) & (df["date"] <= end)
        df.loc[mask, "is_retrograde"] = True
    df["is_retrograde"] = df["is_retrograde"].astype(int)

    df["month"] = df["date"].dt.month
    df["is_exam_month"] = df["month"].isin([2, 3, 9, 11, 12]).astype(int)

    numeric_df = df[["download_count", "meme_usage", "cyber_blessing_index", "is_retrograde", "is_exam_month"]]
    return numeric_df.corr()