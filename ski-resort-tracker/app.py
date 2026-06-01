from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
from dotenv import load_dotenv
from datetime import datetime
import os
import sys

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from src.weather.weather_api import WeatherAPI
from src.simulation.snow_quality import SnowQualitySimulator

load_dotenv()

app = Flask(__name__, static_folder='frontend', static_url_path='')
CORS(app)

weather_api = WeatherAPI()
snow_simulator = SnowQualitySimulator()


@app.route('/')
def index():
    return send_from_directory('frontend', 'index.html')


@app.route('/api/resorts', methods=['GET'])
def get_resorts():
    resorts = weather_api.get_all_resorts()
    return jsonify({
        "success": True,
        "data": resorts
    })


@app.route('/api/resorts/<resort_id>', methods=['GET'])
def get_resort_info(resort_id):
    info = weather_api.get_resort_info(resort_id)
    if not info:
        return jsonify({"success": False, "error": "Resort not found"}), 404
    return jsonify({
        "success": True,
        "data": info
    })


@app.route('/api/weather/monthly/<resort_id>/<int:year>/<int:month>', methods=['GET'])
def get_monthly_weather(resort_id, year, month):
    try:
        weather_data = weather_api.get_monthly_weather(resort_id, year, month)
        return jsonify({
            "success": True,
            "data": weather_data
        })
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@app.route('/api/weather/forecast/<resort_id>', methods=['GET'])
def get_forecast(resort_id):
    try:
        start_date_str = request.args.get('start_date')
        days = int(request.args.get('days', 7))
        
        if start_date_str:
            start_date = datetime.strptime(start_date_str, '%Y-%m-%d')
        else:
            start_date = None
        
        forecast = weather_api.get_weekly_forecast(resort_id, start_date, days)
        return jsonify({
            "success": True,
            "data": forecast
        })
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@app.route('/api/weather/calendar/<resort_id>/<int:year>', methods=['GET'])
def get_yearly_calendar(resort_id, year):
    try:
        calendar = weather_api.get_yearly_calendar(resort_id, year)
        return jsonify({
            "success": True,
            "data": calendar
        })
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@app.route('/api/snow-quality/monthly/<resort_id>/<int:year>/<int:month>', methods=['GET'])
def get_monthly_snow_quality(resort_id, year, month):
    try:
        weather_data = weather_api.get_monthly_weather(resort_id, year, month)
        quality_data = snow_simulator.calculate_monthly_score(weather_data)
        return jsonify({
            "success": True,
            "data": quality_data
        })
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@app.route('/api/snow-quality/forecast/<resort_id>', methods=['GET'])
def get_snow_quality_forecast(resort_id):
    try:
        start_date_str = request.args.get('start_date')
        days = int(request.args.get('days', 7))
        
        if start_date_str:
            start_date = datetime.strptime(start_date_str, '%Y-%m-%d')
        else:
            start_date = None
        
        forecast = weather_api.get_weekly_forecast(resort_id, start_date, days)
        daily_quality = snow_simulator.predict_daily_snow_quality(forecast["forecast"])
        return jsonify({
            "success": True,
            "data": {
                "resort_id": resort_id,
                "resort_name": forecast["resort_name"],
                "forecast_period": forecast["forecast_period"],
                "start_date": forecast["start_date"],
                "end_date": forecast["end_date"],
                "forecast": daily_quality
            }
        })
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@app.route('/api/optimal-window/<resort_id>/<int:year>', methods=['GET'])
def get_optimal_window(resort_id, year):
    try:
        yearly_data = weather_api.get_yearly_calendar(resort_id, year)
        optimal = snow_simulator.get_optimal_skiing_window(yearly_data)
        return jsonify({
            "success": True,
            "data": optimal
        })
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@app.route('/api/calendar-heatmap/<int:year>', methods=['GET'])
def get_calendar_heatmap(year):
    try:
        resorts = weather_api.get_all_resorts()
        heatmap_data = []
        
        for resort_id, resort_info in resorts.items():
            yearly_data = weather_api.get_yearly_calendar(resort_id, year)
            optimal = snow_simulator.get_optimal_skiing_window(yearly_data)
            
            resort_heatmap = {
                "resort_id": resort_id,
                "resort_name": resort_info["name"],
                "province": resort_info["province"],
                "city": resort_info["city"],
                "monthly_scores": optimal["monthly_scores"],
                "best_months": optimal["best_months"],
                "peak_month": optimal["peak_month"],
                "recommendation": optimal["recommendation"]
            }
            heatmap_data.append(resort_heatmap)
        
        return jsonify({
            "success": True,
            "data": heatmap_data
        })
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@app.route('/api/data-consistency-check', methods=['GET'])
def data_consistency_check():
    try:
        results = {}
        for resort_id in weather_api.get_all_resorts().keys():
            data1 = weather_api.get_yearly_calendar(resort_id, 2024)
            data2 = weather_api.get_yearly_calendar(resort_id, 2024)
            
            is_consistent = True
            for m1, m2 in zip(data1["monthly_data"], data2["monthly_data"]):
                if m1["avg_temperature"] != m2["avg_temperature"] or m1["total_snowfall"] != m2["total_snowfall"]:
                    is_consistent = False
                    break
            
            results[resort_id] = {
                "name": data1["resort_name"],
                "is_consistent": is_consistent
            }
        
        all_consistent = all(r["is_consistent"] for r in results.values())
        
        return jsonify({
            "success": True,
            "data": {
                "all_consistent": all_consistent,
                "results": results
            }
        })
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({
        "success": True,
        "status": "healthy",
        "service": "ski-resort-tracker",
        "data_source": "real_based_simulation"
    })


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8000, debug=True)
