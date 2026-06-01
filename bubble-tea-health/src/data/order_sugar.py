from .mock_data import mock_orders, cities, obesity_rate_data, city_consumption

def get_sugar_distribution_by_city():
    distribution = {}
    for order in mock_orders:
        city = order["city"]
        sugar = order["sugar_option"]
        if city not in distribution:
            distribution[city] = {"无糖": 0, "三分糖": 0, "五分糖": 0, "七分糖": 0, "正常糖": 0}
        distribution[city][sugar] += 1
    return distribution

def get_low_sugar_ratio_by_city():
    distribution = get_sugar_distribution_by_city()
    low_sugar_ratio = {}
    for city, sugar_counts in distribution.items():
        total = sum(sugar_counts.values())
        if total == 0:
            low_sugar_ratio[city] = 0
        else:
            low_sugar_ratio[city] = (sugar_counts["无糖"] + sugar_counts["三分糖"]) / total * 100
    return low_sugar_ratio

def get_city_data_for_visualization():
    low_sugar_ratio = get_low_sugar_ratio_by_city()
    city_data = []
    for city_info in cities:
        city_name = city_info["name"]
        if city_name in obesity_rate_data and city_name in low_sugar_ratio and city_name in city_consumption:
            city_data.append({
                "name": city_name,
                "lat": city_info["lat"],
                "lon": city_info["lon"],
                "obesity_rate": obesity_rate_data[city_name],
                "low_sugar_ratio": low_sugar_ratio[city_name],
                "consumption": city_consumption[city_name]
            })
    return city_data

def get_tier_summary():
    from .mock_data import cities_by_tier
    low_sugar_ratio = get_low_sugar_ratio_by_city()
    tier_summary = {}
    for tier, cities_in_tier in cities_by_tier.items():
        ratios = [low_sugar_ratio.get(city, 0) for city in cities_in_tier]
        avg_ratio = sum(ratios) / len(ratios) if ratios else 0
        tier_summary[tier] = {
            "cities": cities_in_tier,
            "avg_low_sugar_ratio": avg_ratio
        }
    return tier_summary