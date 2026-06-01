import numpy as np
from scipy.stats import pearsonr

def calculate_correlation(city_data):
    obesity_rates = [city["obesity_rate"] for city in city_data]
    low_sugar_ratios = [city["low_sugar_ratio"] for city in city_data]
    
    correlation, p_value = pearsonr(obesity_rates, low_sugar_ratios)
    
    return {
        "correlation_coefficient": correlation,
        "p_value": p_value,
        "sample_size": len(city_data),
        "interpretation": interpret_correlation(correlation)
    }

def interpret_correlation(correlation):
    abs_corr = abs(correlation)
    if abs_corr >= 0.7:
        direction = "负" if correlation < 0 else "正"
        return f"{direction}强相关 (r={correlation:.2f})"
    elif abs_corr >= 0.4:
        direction = "负" if correlation < 0 else "正"
        return f"{direction}中等相关 (r={correlation:.2f})"
    elif abs_corr >= 0.2:
        direction = "负" if correlation < 0 else "正"
        return f"{direction}弱相关 (r={correlation:.2f})"
    else:
        return f"几乎无相关 (r={correlation:.2f})"

def get_health_insights(city_data):
    insights = []
    
    sorted_by_consumption = sorted(city_data, key=lambda x: x["consumption"], reverse=True)
    top_consumers = sorted_by_consumption[:5]
    
    sorted_by_obesity = sorted(city_data, key=lambda x: x["obesity_rate"])
    lowest_obesity = sorted_by_obesity[:5]
    
    sorted_by_low_sugar = sorted(city_data, key=lambda x: x["low_sugar_ratio"], reverse=True)
    highest_low_sugar = sorted_by_low_sugar[:5]
    
    for city in top_consumers:
        if city in lowest_obesity:
            insights.append(f"{city['name']}: 奶茶消费量高但肥胖率低 ({city['obesity_rate']}%)")
    
    correlation = calculate_correlation(city_data)
    insights.append(f"糖分选择与肥胖率相关性: {correlation['interpretation']}")
    
    from ..src.data.mock_data import cities_by_tier
    tier_summary = {}
    for tier, cities_in_tier in cities_by_tier.items():
        tier_cities = [c for c in city_data if c["name"] in cities_in_tier]
        if tier_cities:
            avg_low_sugar = sum(c["low_sugar_ratio"] for c in tier_cities) / len(tier_cities)
            tier_summary[tier] = avg_low_sugar
    
    tier_order = ["tier1", "tier2", "tier3", "tier4"]
    tier_names = ["一线城市", "新一线/二线城市", "三线城市", "四线及以下城市"]
    for i in range(len(tier_order)-1):
        current = tier_summary.get(tier_order[i], 0)
        next_tier = tier_summary.get(tier_order[i+1], 0)
        if current > next_tier:
            insights.append(f"{tier_names[i]}无糖/三分糖比例({current:.1f}%)高于{tier_names[i+1]}({next_tier:.1f}%)")
    
    return insights

def get_city_comparison(city_name):
    from ..src.data.order_sugar import get_city_data_for_visualization
    city_data = get_city_data_for_visualization()
    city = next((c for c in city_data if c["name"] == city_name), None)
    if not city:
        return None
    
    avg_obesity = sum(c["obesity_rate"] for c in city_data) / len(city_data)
    avg_low_sugar = sum(c["low_sugar_ratio"] for c in city_data) / len(city_data)
    avg_consumption = sum(c["consumption"] for c in city_data) / len(city_data)
    
    return {
        "city": city_name,
        "obesity_rate": city["obesity_rate"],
        "obesity_rank": sum(1 for c in city_data if c["obesity_rate"] < city["obesity_rate"]) + 1,
        "low_sugar_ratio": city["low_sugar_ratio"],
        "low_sugar_rank": sum(1 for c in city_data if c["low_sugar_ratio"] > city["low_sugar_ratio"]) + 1,
        "consumption": city["consumption"],
        "consumption_rank": sum(1 for c in city_data if c["consumption"] > city["consumption"]) + 1,
        "avg_obesity": avg_obesity,
        "avg_low_sugar": avg_low_sugar,
        "avg_consumption": avg_consumption
    }