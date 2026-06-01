from fastapi import FastAPI, Query
from datetime import date

from src.data.app_download import (
    generate_dataset,
    get_download_peaks,
    get_app_names,
    EXAM_EVENTS,
    MERCURY_RETROGRADE_PERIODS_2023_2026,
)
from src.analysis.exam_season import (
    analyze_exam_season_impact,
    analyze_mercury_retrograde_correlation,
    get_exam_calendar,
    get_mercury_retrograde_schedule,
    compute_correlation_matrix,
)
from src.visualization.charts import get_summary_statistics

app = FastAPI(
    title="赛博祈福数据可视化 API",
    description="分析电子木鱼下载量与转发锦鲤行为的周期性，探究与考试季、求职季等高压节点的相关性",
    version="1.0.0",
)


@app.get("/api/health")
def health_check():
    return {"status": "ok", "service": "cyber-blessing-api"}


@app.get("/api/data/downloads")
def get_download_data(
    start: date = Query(default=date(2023, 1, 1)),
    end: date = Query(default=date(2026, 6, 30)),
):
    df = generate_dataset()
    mask = (df["date"].dt.date >= start) & (df["date"].dt.date <= end)
    filtered = df[mask]
    return {
        "start": str(start),
        "end": str(end),
        "records": len(filtered),
        "data": [
            {
                "date": row["date"].strftime("%Y-%m-%d"),
                "download_count": int(row["download_count"]),
                "meme_usage": int(row["meme_usage"]),
                "cyber_blessing_index": float(row["cyber_blessing_index"]),
            }
            for _, row in filtered.iterrows()
        ],
    }


@app.get("/api/data/peaks")
def get_peaks(threshold: float = Query(default=0.75, ge=0.5, le=1.0)):
    df = generate_dataset()
    peaks = get_download_peaks(df, threshold=threshold)
    return {
        "threshold": threshold,
        "peak_count": len(peaks),
        "peaks": [
            {
                "date": row["date"].strftime("%Y-%m-%d"),
                "download_count": int(row["download_count"]),
                "peak_type": row["peak_type"],
            }
            for _, row in peaks.iterrows()
        ],
    }


@app.get("/api/analysis/exam-impact")
def exam_impact():
    df = generate_dataset()
    impact_df = analyze_exam_season_impact(df)
    return {
        "events_analyzed": len(impact_df),
        "results": [
            {
                "event_name": row["event_name"],
                "event_date": row["event_date"],
                "avg_download_30d_before": row["avg_download_30d_before"],
                "avg_download_baseline": row["avg_download_baseline"],
                "download_surge_ratio": row["download_surge_ratio"],
                "peak_download_ratio": row["peak_download_ratio"],
                "meme_surge_ratio": row["meme_surge_ratio"],
                "index_surge_ratio": row["index_surge_ratio"],
                "impact_level": row["impact_level"],
            }
            for _, row in impact_df.iterrows()
        ],
    }


@app.get("/api/analysis/mercury-retrograde")
def mercury_retrograde():
    df = generate_dataset()
    return analyze_mercury_retrograde_correlation(df)


@app.get("/api/analysis/correlation-matrix")
def correlation_matrix():
    df = generate_dataset()
    corr = compute_correlation_matrix(df)
    return {
        "columns": list(corr.columns),
        "matrix": corr.round(3).values.tolist(),
    }


@app.get("/api/calendar/exams")
def exam_calendar():
    return {"exam_events": get_exam_calendar()}


@app.get("/api/calendar/mercury-retrograde")
def mercury_retrograde_schedule():
    return {"mercury_retrograde_periods": get_mercury_retrograde_schedule()}


@app.get("/api/summary")
def summary():
    return get_summary_statistics()


@app.get("/api/apps")
def apps():
    return {"apps": get_app_names()}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("src.main:app", host="0.0.0.0", port=8000, reload=True)