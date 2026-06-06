import os
import sys
from flask import Flask, jsonify, render_template

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from src.metric.vitality_scorer import VitalityScorer
from src.comparison.district_compare import DistrictCompare
from src.crawler.market_spider import MarketSpider

app = Flask(__name__, template_folder="templates", static_folder="static")

DATA_DIR = os.path.join(os.path.dirname(__file__), "data")


def _get_data_source():
    scored_file = os.path.join(DATA_DIR, "scored_markets.json")
    mock_file = os.path.join(DATA_DIR, "mock_markets.json")

    if os.path.exists(scored_file):
        return "scored_markets.json"
    elif os.path.exists(mock_file):
        return "mock_markets.json"
    return None


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/api/markets")
def get_markets():
    data_file = _get_data_source()
    if not data_file:
        return jsonify({"error": "暂无数据，请先运行爬虫或使用 Mock 数据"}), 404

    scorer = VitalityScorer()
    scorer.load_from_file(data_file)
    results = scorer.calculate_all()
    return jsonify(results)


@app.route("/api/districts")
def get_districts():
    data_file = _get_data_source()
    if not data_file:
        return jsonify({"error": "暂无数据"}), 404

    scorer = VitalityScorer()
    scorer.load_from_file(data_file)
    scored = scorer.calculate_all()

    comparer = DistrictCompare(scored)
    summary = comparer.district_summary()
    return jsonify(summary)


@app.route("/api/comparison")
def get_comparison():
    data_file = _get_data_source()
    if not data_file:
        return jsonify({"error": "暂无数据"}), 404

    scorer = VitalityScorer()
    scorer.load_from_file(data_file)
    scored = scorer.calculate_all()

    comparer = DistrictCompare(scored)
    comparison = comparer.old_vs_new_comparison()
    return jsonify(comparison)


@app.route("/api/sunburst")
def get_sunburst():
    data_file = _get_data_source()
    if not data_file:
        return jsonify({"error": "暂无数据"}), 404

    scorer = VitalityScorer()
    scorer.load_from_file(data_file)
    scored = scorer.calculate_all()

    comparer = DistrictCompare(scored)
    sunburst_data = comparer.build_sunburst_data()
    return jsonify(sunburst_data)


@app.route("/api/health")
def health():
    return jsonify({"status": "ok", "data_source": _get_data_source()})


if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=5001)
