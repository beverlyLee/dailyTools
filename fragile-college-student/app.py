from flask import Flask, jsonify, request
from flask_cors import CORS
import os
import sys
import socket

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from src.analysis.seasonal_illness import SeasonalAnalyzer
from src.data.illness_simulator import get_illness_info, get_college_list

app = Flask(__name__)
CORS(app)

analyzer = SeasonalAnalyzer(2025)


@app.route("/api/health", methods=["GET"])
def health_check():
    port = int(os.environ.get("PORT", 5001))
    return jsonify({"status": "ok", "year": 2025, "port": port})


@app.route("/api/config", methods=["GET"])
def get_config():
    port = int(os.environ.get("PORT", 5001))
    return jsonify({
        "port": port,
        "api_base": f"http://localhost:{port}",
        "year": 2025,
    })


@app.route("/api/illnesses", methods=["GET"])
def get_illnesses():
    return jsonify(get_illness_info())


@app.route("/api/colleges", methods=["GET"])
def get_colleges():
    return jsonify(get_college_list())


@app.route("/api/calendar-heatmap", methods=["GET"])
def get_calendar_heatmap():
    illness = request.args.get("illness", "甲流")
    college = request.args.get("college", None)
    region = request.args.get("region", None)

    data = analyzer.get_calendar_heatmap_data(illness, college, region)
    return jsonify({"illness": illness, "college": college, "region": region, "data": data})


@app.route("/api/seasonal-patterns", methods=["GET"])
def get_seasonal_patterns():
    college = request.args.get("college", None)
    data = analyzer.get_seasonal_patterns(college)
    return jsonify({"college": college, "patterns": data})


@app.route("/api/monthly-summary", methods=["GET"])
def get_monthly_summary():
    month = int(request.args.get("month", 1))
    college = request.args.get("college", None)
    data = analyzer.get_monthly_summary(month, college)
    return jsonify(data)


@app.route("/api/high-risk-periods", methods=["GET"])
def get_high_risk_periods():
    threshold = float(request.args.get("threshold", 0.3))
    college = request.args.get("college", None)
    data = analyzer.get_high_risk_periods(threshold, college)
    return jsonify({"threshold": threshold, "college": college, "periods": data})


@app.route("/api/region-comparison", methods=["GET"])
def get_region_comparison():
    illness = request.args.get("illness", "流感")
    data = analyzer.get_region_comparison(illness)
    return jsonify({"illness": illness, "regions": data})


@app.route("/api/college-ranking", methods=["GET"])
def get_college_ranking():
    illness = request.args.get("illness", "甲流")
    month = request.args.get("month", None)
    if month:
        month = int(month)
    data = analyzer.get_college_ranking(illness, month)
    return jsonify({"illness": illness, "month": month, "ranking": data})


@app.route("/api/social-media-trends", methods=["GET"])
def get_social_media_trends():
    limit_days = int(request.args.get("limit", 30))
    data = analyzer.get_social_media_trends(limit_days)
    return jsonify({"limit_days": limit_days, "trends": data})


@app.route("/api/illness-by-month", methods=["GET"])
def get_illness_by_month():
    illness = request.args.get("illness", "甲流")
    college = request.args.get("college", None)
    data = analyzer.get_illness_by_month(illness, college)
    return jsonify({"illness": illness, "college": college, "monthly_data": data})


@app.route("/api/validate", methods=["GET"])
def validate_requirements():
    result = analyzer.validate_requirements()
    return jsonify(result)


@app.route("/api/dashboard", methods=["GET"])
def get_dashboard():
    current_month = 9

    monthly_summary = analyzer.get_monthly_summary(current_month)
    high_risk_periods = analyzer.get_high_risk_periods(0.3)[:5]
    social_trends = analyzer.get_social_media_trends(7)

    all_illnesses = list(get_illness_info().keys())
    heatmaps = {}
    for illness in all_illnesses:
        heatmaps[illness] = analyzer.get_calendar_heatmap_data(illness)

    return jsonify(
        {
            "current_month": current_month,
            "monthly_summary": monthly_summary,
            "high_risk_periods": high_risk_periods,
            "social_trends": social_trends,
            "heatmaps": heatmaps,
            "illnesses": get_illness_info(),
            "colleges": get_college_list(),
        }
    )


def is_port_available(port: int) -> bool:
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            s.settimeout(1)
            result = s.connect_ex(("127.0.0.1", port))
            return result != 0
    except Exception:
        return True


def find_available_port(start_port: int = 5000, max_attempts: int = 100) -> int:
    port = start_port
    for _ in range(max_attempts):
        if is_port_available(port):
            return port
        port += 1
    raise RuntimeError(f"Could not find an available port after {max_attempts} attempts")


if __name__ == "__main__":
    desired_port = int(os.environ.get("PORT", 5001))

    if not is_port_available(desired_port):
        print(f"⚠️  Port {desired_port} is already in use.")
        print(f"🔍  Searching for an available port...")
        try:
            desired_port = find_available_port(desired_port + 1)
            print(f"✅  Found available port: {desired_port}")
            os.environ["PORT"] = str(desired_port)
        except RuntimeError as e:
            print(f"❌  {e}")
            print(f"💡  Try setting a different port with: PORT=5002 python3 app.py")
            sys.exit(1)

    print(f"🚀  Server starting on port {desired_port}")
    print(f"📡  API base URL: http://localhost:{desired_port}")
    print(f"🔍  Health check: http://localhost:{desired_port}/api/health")
    print()

    app.run(host="0.0.0.0", port=desired_port, debug=True)
