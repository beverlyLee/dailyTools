import sys
import os
from flask import Flask, jsonify, request
from flask_cors import CORS

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from src.nlp.sentiment_miner import SentimentMiner
from src.index.resignation_index import ResignationIndexBuilder
from src.data.mock_data import (
    generate_posts,
    generate_time_heat_data,
    generate_industry_index,
    generate_city_index,
    generate_mouyu_ranking,
    validate_data_integrity,
)

app = Flask(__name__)
CORS(app)

miner = SentimentMiner()
builder = ResignationIndexBuilder()

_posts_cache = None


def _get_posts():
    global _posts_cache
    if _posts_cache is None:
        _posts_cache = generate_posts(count=500)
    return _posts_cache


@app.route("/api/health")
def health():
    return jsonify({"status": "ok", "service": "mental-resignation-api"})


@app.route("/api/posts")
def get_posts():
    posts = _get_posts()
    page = request.args.get("page", 1, type=int)
    per_page = request.args.get("per_page", 20, type=int)
    start = (page - 1) * per_page
    end = start + per_page
    return jsonify({
        "total": len(posts),
        "page": page,
        "per_page": per_page,
        "data": posts[start:end],
    })


@app.route("/api/keyword-frequency")
def keyword_frequency():
    posts = _get_posts()
    freq = miner.extract_keyword_freq(posts)
    return jsonify({"data": freq})


@app.route("/api/contexts")
def contexts():
    posts = _get_posts()
    kw = request.args.get("keyword", "摸鱼")
    window = request.args.get("window", 20, type=int)
    ctx = miner.extract_contexts(posts, target_kw=kw, window=window)
    return jsonify({"keyword": kw, "total": len(ctx), "data": ctx[:50]})


@app.route("/api/time-distribution")
def time_distribution():
    posts = _get_posts()
    td = miner.group_by_time_slot(posts)
    return jsonify({"data": td})


@app.route("/api/weekday-distribution")
def weekday_distribution():
    posts = _get_posts()
    wd = miner.group_by_weekday(posts)
    return jsonify({"data": wd})


@app.route("/api/industry-distribution")
def industry_distribution():
    posts = _get_posts()
    ind = miner.group_by_industry(posts)
    return jsonify({"data": ind})


@app.route("/api/full-analysis")
def full_analysis():
    posts = _get_posts()
    analysis = miner.full_analysis(posts)
    return jsonify(analysis)


@app.route("/api/industry-index")
def industry_index():
    posts = _get_posts()
    kw_freq = miner.extract_keyword_freq(posts)
    idx = builder.build_industry_index(posts, kw_freq)
    return jsonify({"data": idx})


@app.route("/api/city-index")
def city_index():
    posts = _get_posts()
    idx = builder.build_city_index(posts)
    return jsonify({"data": idx})


@app.route("/api/time-heatmap")
def time_heatmap():
    posts = _get_posts()
    heatmap = builder.build_time_heatmap(posts)
    return jsonify(heatmap)


@app.route("/api/overall-index")
def overall_index():
    posts = _get_posts()
    kw_freq = miner.extract_keyword_freq(posts)
    ind_idx = builder.build_industry_index(posts, kw_freq)
    city_idx = builder.build_city_index(posts)
    overall = builder.compute_overall_index(ind_idx, city_idx)
    return jsonify(overall)


@app.route("/api/mouyu-ranking")
def mouyu_ranking():
    ranking = generate_mouyu_ranking()
    return jsonify({"data": ranking})


@app.route("/api/peak-hours")
def peak_hours():
    posts = _get_posts()
    peaks = miner.detect_peak_hours(posts, top_n=5)
    return jsonify({"data": peaks})


@app.route("/api/time-heat-data")
def time_heat_data():
    data = generate_time_heat_data()
    return jsonify({"data": data})


@app.route("/api/data-validation")
def data_validation():
    posts = _get_posts()
    result = validate_data_integrity(posts, min_freq_per_kw=30)
    return jsonify(result)


if __name__ == "__main__":
    port = int(os.environ.get("API_PORT", 5001))
    app.run(host="0.0.0.0", port=port, debug=True)
