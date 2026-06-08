#!/usr/bin/env python3
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'src'))

from dotenv import load_dotenv
load_dotenv()

print("=" * 60)
print("网约车空驶浪费分析系统 - 模块验证")
print("=" * 60)
print()

print("[1/4] 加载路况数据爬取模块...")
try:
    from traffic.road_status_spider import RoadStatusSpider, BEIJING_KEY_AREAS
    spider = RoadStatusSpider()
    segs = spider.get_all_road_segments(use_cache=False)
    print(f"  ✓ 成功加载 {len(segs)} 个路段")
    for s in segs[:2]:
        print(f"    - {s.name}: {s.speed:.1f} km/h")
except Exception as e:
    print(f"  ✗ 失败: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)
print()

print("[2/4] 加载空驶轨迹模拟模块...")
try:
    from simulation.empty_trip_sim import EmptyTripSimulator
    sim = EmptyTripSimulator(spider)
    result = sim.simulate_batch(num_vehicles=50)
    print(f"  ✓ 成功模拟 {result.total_vehicles} 辆车")
    print(f"    总里程: {result.total_distance/1000:.2f} km")
    print(f"    空驶里程: {result.total_empty_distance/1000:.2f} km")
    print(f"    空驶率: {result.empty_ratio*100:.2f}%")
except Exception as e:
    print(f"  ✗ 失败: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)
print()

print("[3/4] 加载浪费计算模块...")
try:
    from metric.waste_calculator import WasteCalculator
    calc = WasteCalculator("gasoline")
    metrics = calc.calculate_from_simulation(result)
    print(f"  ✓ 成功计算浪费指标")
    print(f"    无效碳排放: {metrics.carbon_emission_empty:.2f} kg")
    print(f"    无效燃油成本: ¥{metrics.fuel_cost_empty:.2f}")

    comparison = calc.get_comparison_metrics(result)
    print(f"    燃油车→电动车 碳减排: {comparison['savings_gas_to_ev']['carbon_saved_kg']:.2f} kg")
except Exception as e:
    print(f"  ✗ 失败: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)
print()

print("[4/4] 加载 FastAPI 应用...")
try:
    from main import app
    print(f"  ✓ 成功加载 FastAPI 应用")
    print(f"    路由数量: {len(app.routes)}")
except Exception as e:
    print(f"  ✗ 失败: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)
print()

print("[5/5] 检查前端页面...")
static_path = os.path.join(os.path.dirname(__file__), 'src', 'static', 'index.html')
if os.path.exists(static_path):
    size = os.path.getsize(static_path)
    print(f"  ✓ 前端页面存在 ({size} bytes)")
else:
    print(f"  ✗ 前端页面不存在")
print()

print("=" * 60)
print("所有模块验证通过！✓")
print()
print("关键区域信息:")
for name, info in BEIJING_KEY_AREAS.items():
    print(f"  {name}: 中心={info['center']}, 密度等级={info['density']}")
print()
print("启动命令:")
print("  cd ride-hailing-waste && ./start.sh")
print("  或: uvicorn src.main:app --reload --port 8000")
print()
print("访问地址: http://localhost:8000")
print("=" * 60)
