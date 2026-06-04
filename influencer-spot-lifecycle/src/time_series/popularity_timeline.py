import logging
from datetime import datetime, timedelta

import pandas as pd
import numpy as np

logger = logging.getLogger(__name__)


def build_timeline(notes: list[dict]) -> pd.DataFrame:
    if not notes:
        return pd.DataFrame(columns=["date", "note_count", "total_likes", "total_comments", "avg_likes", "avg_comments"])

    df = pd.DataFrame(notes)
    df["publish_time"] = pd.to_datetime(df["publish_time"], errors="coerce")
    df = df.dropna(subset=["publish_time"])
    df["date"] = df["publish_time"].dt.date

    timeline = df.groupby("date").agg(
        note_count=("note_id", "count"),
        total_likes=("likes", "sum"),
        total_comments=("comments", "sum"),
        avg_likes=("likes", "mean"),
        avg_comments=("comments", "mean"),
    ).reset_index()

    timeline["date"] = pd.to_datetime(timeline["date"])
    timeline = timeline.sort_values("date").reset_index(drop=True)

    date_range = pd.date_range(start=timeline["date"].min(), end=timeline["date"].max(), freq="D")
    timeline = timeline.set_index("date").reindex(date_range).fillna(0).reset_index()
    timeline = timeline.rename(columns={"index": "date"})
    timeline["note_count"] = timeline["note_count"].astype(int)
    timeline["total_likes"] = timeline["total_likes"].astype(int)
    timeline["total_comments"] = timeline["total_comments"].astype(int)

    return timeline


def build_multi_keyword_timeline(notes_by_keyword: dict[str, list[dict]]) -> dict[str, pd.DataFrame]:
    result = {}
    for keyword, notes in notes_by_keyword.items():
        result[keyword] = build_timeline(notes)
        logger.info(f"Built timeline for '{keyword}': {len(result[keyword])} days")
    return result


def compute_rolling_metrics(timeline: pd.DataFrame, window: int = 7) -> pd.DataFrame:
    if timeline.empty:
        return timeline

    timeline = timeline.copy()
    timeline["note_count_ma"] = timeline["note_count"].rolling(window=window, min_periods=1).mean()
    timeline["total_likes_ma"] = timeline["total_likes"].rolling(window=window, min_periods=1).mean()

    timeline["growth_rate"] = timeline["note_count_ma"].pct_change().replace([np.inf, -np.inf], np.nan).fillna(0)
    timeline["growth_rate"] = timeline["growth_rate"].clip(-10, 10)

    timeline["cumulative_notes"] = timeline["note_count"].cumsum()

    return timeline


def compute_popularity_score(timeline: pd.DataFrame) -> pd.DataFrame:
    if timeline.empty:
        return timeline

    timeline = timeline.copy()
    max_notes = timeline["note_count"].max() or 1
    max_likes = timeline["total_likes"].max() or 1

    timeline["popularity_score"] = (
        0.5 * (timeline["note_count"] / max_notes) +
        0.3 * (timeline["total_likes"] / max_likes) +
        0.2 * (timeline["note_count_ma"] / max(timeline["note_count_ma"].max(), 1))
    )

    return timeline
