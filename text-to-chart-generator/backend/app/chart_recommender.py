from typing import List, Dict, Any
from enum import Enum

class ChartType(Enum):
    COLUMN = "column"
    LINE = "line"
    WATERFALL = "waterfall"
    PIE = "pie"

class ChartRecommender:
    @staticmethod
    def analyze_data_structure(data: List[Dict[str, Any]], columns: List[str]) -> Dict[str, Any]:
        if not data or not columns:
            return {"has_time_series": False, "has_categories": False, "has_multiple_metrics": False, "has_progressive": False}

        sample = data[0]
        has_time_series = False
        has_categories = False
        has_multiple_metrics = False
        has_progressive = False

        time_keywords = ["year", "quarter", "month", "date", "time", "报告年", "报告季", "年份", "季度"]
        category_keywords = ["name", "company", "industry", "stock_code", "名称", "公司", "行业", "股票代码"]
        metric_keywords = ["revenue", "profit", "net_profit", "assets", "liabilities", "cash_flow",
                           "营收", "利润", "净利润", "资产", "负债", "现金流", "营业收入", "利润总额"]

        time_columns = []
        category_columns = []
        metric_columns = []

        for col in columns:
            col_lower = col.lower()
            if any(kw in col_lower for kw in time_keywords):
                time_columns.append(col)
            if any(kw in col_lower for kw in category_keywords):
                category_columns.append(col)
            if any(kw in col_lower for kw in metric_keywords):
                metric_columns.append(col)

        has_time_series = len(time_columns) > 0
        has_categories = len(category_columns) > 0
        has_multiple_metrics = len(metric_columns) >= 2

        if has_time_series and len(data) >= 2:
            values = []
            for d in data:
                for col in metric_columns:
                    if col in d and d[col] is not None:
                        values.append(d[col])
            if len(values) >= 2:
                has_progressive = any(v < 0 for v in values) or len(values) >= 3

        return {
            "has_time_series": has_time_series,
            "has_categories": has_categories,
            "has_multiple_metrics": has_multiple_metrics,
            "has_progressive": has_progressive,
            "time_columns": time_columns,
            "category_columns": category_columns,
            "metric_columns": metric_columns
        }

    @staticmethod
    def recommend_chart(data: List[Dict[str, Any]], columns: List[str], user_query: str = "") -> Dict[str, Any]:
        analysis = ChartRecommender.analyze_data_structure(data, columns)
        recommendations = []

        query_lower = user_query.lower()
        user_preference = None

        if "瀑布" in query_lower or "waterfall" in query_lower:
            user_preference = ChartType.WATERFALL
        elif "折线" in query_lower or "line" in query_lower or "趋势" in query_lower:
            user_preference = ChartType.LINE
        elif "柱状" in query_lower or "bar" in query_lower or "column" in query_lower or "对比" in query_lower:
            user_preference = ChartType.COLUMN
        elif "饼图" in query_lower or "pie" in query_lower or "占比" in query_lower:
            user_preference = ChartType.PIE

        if analysis["has_time_series"] and analysis["has_multiple_metrics"]:
            recommendations.append({
                "type": ChartType.LINE.value,
                "name": "折线图",
                "confidence": 0.9,
                "reason": "时间序列数据且存在多个指标，折线图适合展示趋势变化"
            })
            recommendations.append({
                "type": ChartType.COLUMN.value,
                "name": "柱状图",
                "confidence": 0.7,
                "reason": "柱状图适合对比不同时间点的指标值"
            })

        elif analysis["has_time_series"]:
            recommendations.append({
                "type": ChartType.LINE.value,
                "name": "折线图",
                "confidence": 0.85,
                "reason": "时间序列数据，折线图适合展示趋势变化"
            })
            recommendations.append({
                "type": ChartType.COLUMN.value,
                "name": "柱状图",
                "confidence": 0.75,
                "reason": "柱状图适合展示各时间点的数值对比"
            })

        elif analysis["has_categories"] and analysis["has_multiple_metrics"]:
            recommendations.append({
                "type": ChartType.COLUMN.value,
                "name": "柱状图",
                "confidence": 0.85,
                "reason": "分类数据且存在多个指标，柱状图适合分类对比"
            })
            recommendations.append({
                "type": ChartType.LINE.value,
                "name": "折线图",
                "confidence": 0.6,
                "reason": "折线图可展示不同分类的指标趋势"
            })

        elif analysis["has_categories"]:
            recommendations.append({
                "type": ChartType.COLUMN.value,
                "name": "柱状图",
                "confidence": 0.8,
                "reason": "分类数据，柱状图适合各分类的数值对比"
            })
            if len(data) >= 2 and len(data) <= 10:
                recommendations.append({
                    "type": ChartType.PIE.value,
                    "name": "饼图",
                    "confidence": 0.65,
                    "reason": "分类较少时，饼图适合展示占比关系"
                })

        if analysis["has_progressive"]:
            recommendations.append({
                "type": ChartType.WATERFALL.value,
                "name": "瀑布图",
                "confidence": 0.8,
                "reason": "数据存在正负值或需要展示累积变化，瀑布图适合展示逐步变化"
            })

        if len(recommendations) == 0:
            recommendations.append({
                "type": ChartType.COLUMN.value,
                "name": "柱状图",
                "confidence": 0.5,
                "reason": "默认推荐柱状图"
            })

        recommendations.sort(key=lambda x: x["confidence"], reverse=True)

        if user_preference:
            for rec in recommendations:
                if rec["type"] == user_preference.value:
                    rec["confidence"] = 1.0
                    rec["reason"] = "用户明确指定使用该图表类型"
                    recommendations.remove(rec)
                    recommendations.insert(0, rec)
                    break

        return {
            "recommendations": recommendations,
            "analysis": analysis,
            "recommended": recommendations[0] if recommendations else None
        }

    @staticmethod
    def generate_chart_config(chart_type: str, data: List[Dict[str, Any]], columns: List[str], analysis: Dict[str, Any]) -> Dict[str, Any]:
        time_columns = analysis.get("time_columns", [])
        category_columns = analysis.get("category_columns", [])
        metric_columns = analysis.get("metric_columns", [])

        x_field = None
        y_fields = []

        if time_columns:
            x_field = time_columns[0]
        elif category_columns:
            x_field = category_columns[0]
        elif columns:
            x_field = columns[0]

        if metric_columns:
            y_fields = metric_columns
        else:
            for col in columns:
                if col != x_field:
                    y_fields.append(col)

        if not y_fields:
            y_fields = [x_field] if x_field else [columns[0] if columns else "value"]

        config = {
            "type": chart_type,
            "data": data,
            "config": {}
        }

        if chart_type == ChartType.COLUMN.value:
            config["config"] = {
                "xField": x_field,
                "yField": y_fields[0] if len(y_fields) == 1 else y_fields,
                "isGroup": len(y_fields) > 1,
                "label": {
                    "position": "top"
                },
                "tooltip": {
                    "showMarkers": False
                }
            }
        elif chart_type == ChartType.LINE.value:
            config["config"] = {
                "xField": x_field,
                "yField": y_fields[0] if len(y_fields) == 1 else y_fields,
                "point": {
                    "size": 5,
                    "shape": "diamond"
                },
                "label": {
                    "style": {
                        "fill": "#aaa"
                    }
                }
            }
        elif chart_type == ChartType.WATERFALL.value:
            config["config"] = {
                "xField": x_field,
                "yField": y_fields[0] if y_fields else "value",
                "total": {
                    "label": "总计",
                    "style": {
                        "fill": "#333"
                    }
                },
                "labelMode": "difference"
            }
        elif chart_type == ChartType.PIE.value:
            config["config"] = {
                "angleField": y_fields[0] if y_fields else "value",
                "colorField": x_field,
                "radius": 0.8,
                "label": {
                    "type": "inner",
                    "offset": "-30%",
                    "content": "{percentage}"
                },
                "interactions": [
                    {
                        "type": "pie-legend-active"
                    },
                    {
                        "type": "element-active"
                    }
                ]
            }

        return config
