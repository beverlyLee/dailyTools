from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
import os
import sys

sys.path.insert(0, os.path.dirname(__file__))

from src.stats.correlation import CorrelationAnalyzer

app = FastAPI(
    title="马拉松赛事与城市GDP相关性分析API",
    description="基于中国田径协会真实赛事数据和各地统计局GDP数据的相关性分析",
    version="2.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 挂载静态文件
static_dir = os.path.join(os.path.dirname(__file__), "static")
if os.path.exists(static_dir):
    app.mount("/static", StaticFiles(directory=static_dir), name="static")

# 全局分析器实例
analyzer_real = CorrelationAnalyzer(use_real_data=True)
analyzer_sample = CorrelationAnalyzer(use_real_data=False)


def get_analyzer(use_real_data: bool = True):
    """获取分析器实例"""
    return analyzer_real if use_real_data else analyzer_sample


@app.get("/", response_class=HTMLResponse)
async def root():
    """主页 - 数据可视化"""
    html_path = os.path.join(static_dir, "index.html")
    if os.path.exists(html_path):
        with open(html_path, "r", encoding="utf-8") as f:
            return f.read()
    return HTMLResponse("<h1>马拉松赛事与城市GDP相关性分析</h1><p>请访问 /docs 查看API文档</p>")


@app.get("/api/scatter-data")
async def get_scatter_data(use_real_data: bool = True):
    """获取散点图数据"""
    try:
        analyzer = get_analyzer(use_real_data)
        data = analyzer.get_scatter_data()
        data_source = analyzer.get_data_source_info()

        return JSONResponse({
            "success": True,
            "data": data,
            "data_source": data_source,
            "total_cities": len(data),
            "cities_with_events": len([d for d in data if d['event_count'] > 0])
        })
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取数据失败: {str(e)}")


@app.get("/api/correlation")
async def get_correlation(use_real_data: bool = True):
    """获取相关性分析结果"""
    try:
        analyzer = get_analyzer(use_real_data)
        correlations = analyzer.calculate_pearson_correlation()
        regression = analyzer.calculate_regression()
        data_source = analyzer.get_data_source_info()

        return JSONResponse({
            "success": True,
            "correlations": correlations,
            "regression": regression,
            "data_source": data_source
        })
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"相关性分析失败: {str(e)}")


@app.get("/api/cities")
async def get_cities_list(use_real_data: bool = True):
    """获取城市列表"""
    try:
        analyzer = get_analyzer(use_real_data)
        data = analyzer.get_scatter_data()
        cities = sorted([d["city"] for d in data])

        return JSONResponse({
            "success": True,
            "cities": cities,
            "total_count": len(cities),
            "data_source": analyzer.get_data_source_info()
        })
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取城市列表失败: {str(e)}")


@app.get("/api/top-cities")
async def get_top_cities(top_n: int = 10, use_real_data: bool = True):
    """获取排名前列的城市"""
    try:
        analyzer = get_analyzer(use_real_data)
        data = analyzer.get_scatter_data()

        # 按GDP排序
        sorted_by_gdp = sorted(data, key=lambda x: x["gdp"], reverse=True)[:top_n]

        # 按赛事数量排序
        sorted_by_events = sorted(data, key=lambda x: x["event_count"], reverse=True)[:top_n]

        # 按参赛人数排序
        sorted_by_participants = sorted(data, key=lambda x: x["total_participants"], reverse=True)[:top_n]

        return JSONResponse({
            "success": True,
            "by_gdp": sorted_by_gdp,
            "by_events": sorted_by_events,
            "by_participants": sorted_by_participants,
            "data_source": analyzer.get_data_source_info()
        })
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取排名失败: {str(e)}")


@app.get("/api/city/{city_name}")
async def get_city_detail(city_name: str, use_real_data: bool = True):
    """获取单个城市的详细信息"""
    try:
        analyzer = get_analyzer(use_real_data)
        data = analyzer.get_scatter_data()

        city_data = next((d for d in data if d["city"] == city_name), None)

        if not city_data:
            raise HTTPException(status_code=404, detail=f"未找到城市: {city_name}")

        return JSONResponse({
            "success": True,
            "city": city_data,
            "data_source": analyzer.get_data_source_info()
        })
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取城市详情失败: {str(e)}")


@app.get("/api/data-source")
async def get_data_source_info():
    """获取数据源信息"""
    try:
        real_info = analyzer_real.get_data_source_info()
        sample_info = analyzer_sample.get_data_source_info()

        return JSONResponse({
            "success": True,
            "real_data": real_info,
            "sample_data": sample_info
        })
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取数据源信息失败: {str(e)}")


@app.get("/api/stats-summary")
async def get_stats_summary(use_real_data: bool = True):
    """获取统计摘要"""
    try:
        analyzer = get_analyzer(use_real_data)
        data = analyzer.get_scatter_data()
        correlations = analyzer.calculate_pearson_correlation()

        # 计算统计指标
        total_events = sum(d["event_count"] for d in data)
        total_participants = sum(d["total_participants"] for d in data)
        cities_with_events = len([d for d in data if d["event_count"] > 0])
        avg_events_per_city = total_events / cities_with_events if cities_with_events > 0 else 0
        avg_gdp = sum(d["gdp"] for d in data) / len(data) if data else 0

        # 赛事最多的城市
        max_events_city = max(data, key=lambda x: x["event_count"])

        # GDP最高的城市
        max_gdp_city = max(data, key=lambda x: x["gdp"])

        return JSONResponse({
            "success": True,
            "summary": {
                "total_cities": len(data),
                "cities_with_events": cities_with_events,
                "total_events": total_events,
                "total_participants": total_participants,
                "avg_events_per_city": round(avg_events_per_city, 2),
                "avg_city_gdp": round(avg_gdp, 2),
                "max_events_city": {
                    "name": max_events_city["city"],
                    "events": max_events_city["event_count"]
                },
                "max_gdp_city": {
                    "name": max_gdp_city["city"],
                    "gdp": round(max_gdp_city["gdp"], 2)
                },
                "correlation_event_gdp": {
                    "value": round(correlations["event_count_vs_gdp"]["correlation"], 4),
                    "strength": correlations["event_count_vs_gdp"]["strength"]
                }
            },
            "data_source": analyzer.get_data_source_info()
        })
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取统计摘要失败: {str(e)}")


if __name__ == "__main__":
    import uvicorn

    print("=" * 70)
    print("马拉松赛事与城市GDP相关性分析系统")
    print("=" * 70)
    print("\n📊 数据源信息:")
    data_info = analyzer_real.get_data_source_info()
    print(f"  赛事数据: {data_info['event_data']['description']}")
    print(f"  GDP数据: {data_info['gdp_data']['description']}")
    print(f"  赛事总数: {data_info['event_data']['event_count']}场")
    print(f"  城市总数: {data_info['gdp_data']['city_count']}个")
    print("\n🚀 启动服务...")
    print("🌐 访问地址: http://localhost:8000")
    print("📖 API文档: http://localhost:8000/docs")
    print("=" * 70)

    uvicorn.run(app, host="0.0.0.0", port=8000)
