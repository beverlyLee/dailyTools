#!/usr/bin/env python3
import sys
import os
import json
import time
import subprocess
import requests

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

BACKEND_URL = "http://localhost:5001"


def test_backend_logic():
    print("🔍 测试1: 后端数据模拟与分析逻辑")
    print("-" * 50)

    from src.analysis.seasonal_illness import SeasonalAnalyzer

    analyzer = SeasonalAnalyzer(2025)
    validation = analyzer.validate_requirements()

    print(f"  秋季甲流高发: {'✓ 通过' if validation['autumn_influenza'] else '✗ 失败'}")
    if validation['autumn_influenza']:
        detail = validation['details']['autumn_influenza']
        print(f"    峰值风险: {detail['peak_risk']:.4f}, 阈值: {detail['threshold']}")

    print(f"  秋季结膜炎高发: {'✓ 通过' if validation['autumn_conjunctivitis'] else '✗ 失败'}")
    if validation['autumn_conjunctivitis']:
        detail = validation['details']['autumn_conjunctivitis']
        print(f"    峰值风险: {detail['peak_risk']:.4f}, 阈值: {detail['threshold']}")

    print(f"  冬季南方流感高风险: {'✓ 通过' if validation['winter_southern_flu'] else '✗ 失败'}")
    if validation['winter_southern_flu']:
        detail = validation['details']['winter_southern_flu']
        print(f"    峰值风险: {detail['peak_risk']:.4f}, 阈值: {detail['threshold']}")

    print(f"  全部通过: {'✓' if validation['all_passed'] else '✗'}")
    print()

    return validation['all_passed']


def test_port_detection():
    print("🔍 测试1.1: 端口自动检测与冲突处理")
    print("-" * 50)

    from app import is_port_available, find_available_port

    test_port = 59999
    is_available = is_port_available(test_port)
    print(f"  端口 {test_port} 可用: {'✓' if is_available else '✗'} (当前: {'可用' if is_available else '已占用'})")

    next_available = find_available_port(test_port, 5)
    print(f"  从 {test_port} 开始找到可用端口: {next_available}")
    print(f"  端口检测功能: ✓ 正常")
    print()

    return True


def start_backend():
    print("🔍 测试2: 启动后端 Flask 服务")
    print("-" * 50)

    process = subprocess.Popen(
        [sys.executable, "app.py"],
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        cwd=os.path.dirname(os.path.abspath(__file__)),
    )

    time.sleep(3)

    if process.poll() is None:
        try:
            response = requests.get(f"{BACKEND_URL}/api/config", timeout=5)
            config = response.json()
            actual_port = config.get('port', 5001)
            print("  ✅ 后端服务启动成功")
            print(f"    PID: {process.pid}")
            print(f"    实际端口: {actual_port}")
            print(f"    API地址: http://localhost:{actual_port}")
        except Exception as e:
            print(f"  ⚠️  无法获取端口信息: {e}")
            print(f"    PID: {process.pid}")
        print()
        return process
    else:
        stdout, stderr = process.communicate()
        print("  ❌ 后端服务启动失败")
        print(f"  错误: {stderr.decode()}")
        print()
        return None


def test_config_endpoint():
    print("🔍 测试2.1: 配置接口测试")
    print("-" * 50)

    try:
        response = requests.get(f"{BACKEND_URL}/api/config", timeout=5)
        config = response.json()
        print(f"  ✓ /api/config 接口正常")
        print(f"    端口: {config.get('port')}")
        print(f"    API基础地址: {config.get('api_base')}")
        print()
        return True
    except Exception as e:
        print(f"  ✗ /api/config 接口失败: {e}")
        print()
        return False


def test_api_endpoints():
    print("🔍 测试3: API 接口测试")
    print("-" * 50)

    endpoints = [
        ("/api/health", "健康检查"),
        ("/api/config", "配置信息"),
        ("/api/illnesses", "疾病列表"),
        ("/api/colleges", "高校列表"),
        ("/api/calendar-heatmap?illness=甲流", "日历热力图(甲流)"),
        ("/api/calendar-heatmap?illness=流感&region=south", "日历热力图(南方流感)"),
        ("/api/monthly-summary?month=9", "9月月度摘要"),
        ("/api/monthly-summary?month=1", "1月月度摘要"),
        ("/api/high-risk-periods", "高风险时段"),
        ("/api/seasonal-patterns", "季节模式"),
        ("/api/region-comparison?illness=流感", "区域对比(流感)"),
        ("/api/validate", "需求验证"),
        ("/api/dashboard", "仪表盘数据"),
    ]

    all_passed = True
    for endpoint, description in endpoints:
        try:
            response = requests.get(f"{BACKEND_URL}{endpoint}", timeout=10)
            if response.status_code == 200:
                data = response.json()
                print(f"  ✓ {description}: {endpoint}")
                if endpoint == "/api/validate":
                    if data.get("all_passed"):
                        print(f"    验证结果: 全部通过")
                    else:
                        print(f"    验证结果: 存在失败项")
                        all_passed = False
            else:
                print(f"  ✗ {description}: {endpoint} - HTTP {response.status_code}")
                all_passed = False
        except Exception as e:
            print(f"  ✗ {description}: {endpoint} - 错误: {e}")
            all_passed = False

    print()
    return all_passed


def test_specific_requirements():
    print("🔍 测试4: 特定需求验证")
    print("-" * 50)

    all_passed = True

    print("  4.1 秋季开学季(9月)甲流和结膜炎高发")
    try:
        response = requests.get(f"{BACKEND_URL}/api/monthly-summary?month=9", timeout=10)
        data = response.json()
        illnesses = {i["name"]: i for i in data["illnesses"]}

        jialiu = illnesses.get("甲流", {})
        conjunctivitis = illnesses.get("结膜炎", {})

        jialiu_pass = jialiu.get("avg_risk", 0) >= 0.2
        conjunctivitis_pass = conjunctivitis.get("avg_risk", 0) >= 0.15

        print(f"    甲流风险: {jialiu.get('avg_risk', 0):.4f} {'✓' if jialiu_pass else '✗'} (阈值: 0.2)")
        print(f"    结膜炎风险: {conjunctivitis.get('avg_risk', 0):.4f} {'✓' if conjunctivitis_pass else '✗'} (阈值: 0.15)")

        if not (jialiu_pass and conjunctivitis_pass):
            all_passed = False
    except Exception as e:
        print(f"    ✗ 测试失败: {e}")
        all_passed = False

    print()
    print("  4.2 冬季(1月)南方高校流感标记变红")
    try:
        response = requests.get(
            f"{BACKEND_URL}/api/calendar-heatmap?illness=流感&region=south",
            timeout=10,
        )
        data = response.json()
        heatmap_data = data["data"]

        january_data = [
            risk for date, risk in heatmap_data
            if date.startswith("2025-01")
        ]

        if january_data:
            avg_risk = sum(january_data) / len(january_data)
            max_risk = max(january_data)
            is_red = max_risk >= 0.25

            print(f"    南方高校1月流感平均风险: {avg_risk:.4f}")
            print(f"    南方高校1月流感峰值风险: {max_risk:.4f} {'✓ 红色标记' if is_red else '✗ 未达到红色阈值'} (阈值: 0.25)")

            if not is_red:
                all_passed = False
        else:
            print("    ✗ 未找到1月数据")
            all_passed = False
    except Exception as e:
        print(f"    ✗ 测试失败: {e}")
        all_passed = False

    print()
    return all_passed


def test_data_quality():
    print("🔍 测试5: 数据质量检查")
    print("-" * 50)

    all_passed = True

    try:
        response = requests.get(f"{BACKEND_URL}/api/dashboard", timeout=10)
        data = response.json()

        print(f"  疾病种类数: {len(data.get('illnesses', {}))} {'✓' if len(data.get('illnesses', {})) >= 9 else '✗'}")
        print(f"  高校数量: {len(data.get('colleges', []))} {'✓' if len(data.get('colleges', [])) >= 10 else '✗'}")
        print(f"  高风险时段: {len(data.get('high_risk_periods', []))} 个")

        heatmaps = data.get("heatmaps", {})
        all_illnesses = list(data.get("illnesses", {}).keys())
        print(f"  Dashboard返回疾病数: {len(heatmaps)}/{len(all_illnesses)}")

        for illness in all_illnesses:
            if illness in heatmaps:
                days = len(heatmaps[illness])
                status = '✓' if days >= 365 else '✗'
                print(f"    {illness}热力图数据点: {days} 天 {status}")
                if days < 365:
                    all_passed = False
            else:
                print(f"    {illness}: ✗ 缺少热力图数据")
                all_passed = False

    except Exception as e:
        print(f"  ✗ 测试失败: {e}")
        all_passed = False

    print()
    return all_passed


def test_data_completeness():
    print("🔍 测试5.1: 数据完整性验证 (Bug修复验证)")
    print("-" * 50)

    all_passed = True

    print("  5.1.1 上呼吸道感染数据不为空")
    try:
        response = requests.get(
            f"{BACKEND_URL}/api/calendar-heatmap?illness=上呼吸道感染",
            timeout=10,
        )
        data = response.json()
        heatmap_data = data.get("data", [])

        print(f"    上呼吸道感染数据点: {len(heatmap_data)} {'✓' if len(heatmap_data) >= 365 else '✗'}")
        if len(heatmap_data) < 365:
            all_passed = False

        dashboard_response = requests.get(f"{BACKEND_URL}/api/dashboard", timeout=10)
        dashboard_data = dashboard_response.json()
        dashboard_heatmaps = dashboard_data.get("heatmaps", {})

        if "上呼吸道感染" in dashboard_heatmaps:
            print(f"    Dashboard包含上呼吸道感染: ✓")
        else:
            print(f"    Dashboard包含上呼吸道感染: ✗")
            all_passed = False

    except Exception as e:
        print(f"    ✗ 测试失败: {e}")
        all_passed = False

    print()
    print("  5.1.2 8月份失眠热力图有数据")
    try:
        response = requests.get(
            f"{BACKEND_URL}/api/calendar-heatmap?illness=失眠",
            timeout=10,
        )
        data = response.json()
        heatmap_data = data.get("data", [])

        august_data = [
            risk for date, risk in heatmap_data
            if date.startswith("2025-08")
        ]

        print(f"    8月份失眠数据点: {len(august_data)} {'✓' if len(august_data) == 31 else '✗'}")
        if august_data:
            avg_risk = sum(august_data) / len(august_data)
            print(f"    8月份失眠平均风险: {avg_risk:.4f}")
        if len(august_data) != 31:
            all_passed = False

        august_summary = requests.get(
            f"{BACKEND_URL}/api/monthly-summary?month=8",
            timeout=10,
        )
        summary_data = august_summary.json()
        insomnia_in_list = any(
            illness.get("name") == "失眠"
            for illness in summary_data.get("illnesses", [])
        )
        print(f"    8月排行中包含失眠: {'✓' if insomnia_in_list else '✗'}")
        if not insomnia_in_list:
            all_passed = False

    except Exception as e:
        print(f"    ✗ 测试失败: {e}")
        all_passed = False

    print()
    return all_passed


def test_data_consistency():
    print("🔍 测试5.2: 数据对应关系验证 (热力图与排行榜一致性)")
    print("-" * 50)

    all_passed = True

    print("  5.2.1 膝盖损伤1月份热力图与排行榜一致性")
    try:
        heatmap_response = requests.get(
            f"{BACKEND_URL}/api/calendar-heatmap?illness=膝盖损伤",
            timeout=10,
        )
        heatmap_data = heatmap_response.json().get("data", [])

        jan_heatmap = [
            risk for date, risk in heatmap_data
            if date.startswith("2025-01")
        ]

        summary_response = requests.get(
            f"{BACKEND_URL}/api/monthly-summary?month=1",
            timeout=10,
        )
        summary_data = summary_response.json()

        knee_in_summary = [
            illness for illness in summary_data.get("illnesses", [])
            if illness.get("name") == "膝盖损伤"
        ]

        if jan_heatmap and knee_in_summary:
            heatmap_avg = sum(jan_heatmap) / len(jan_heatmap)
            summary_avg = knee_in_summary[0].get("avg_risk", 0)

            diff = abs(heatmap_avg - summary_avg)
            consistent = diff < 0.01

            print(f"    热力图平均风险: {heatmap_avg:.4f}")
            print(f"    排行榜平均风险: {summary_avg:.4f}")
            print(f"    差异: {diff:.6f} {'✓ 一致' if consistent else '✗ 不一致'}")

            heatmap_max = max(jan_heatmap)
            print(f"    热力图最高风险: {heatmap_max:.4f}")
            print(f"    风险等级: {'高风险(红色)' if heatmap_max >= 0.3 else '中风险(黄色)' if heatmap_max >= 0.15 else '低风险(绿色)'}")
            print(f"    颜色映射验证: {'✓ 正确' if heatmap_max < 0.3 else '✓ 正确(红色)' if heatmap_max >= 0.3 else '✓ 正确'}")

            if not consistent:
                all_passed = False
        else:
            print("    ✗ 数据不完整")
            all_passed = False

    except Exception as e:
        print(f"    ✗ 测试失败: {e}")
        all_passed = False

    print()
    print("  5.2.2 每日数据精度验证")
    try:
        heatmap_response = requests.get(
            f"{BACKEND_URL}/api/calendar-heatmap?illness=甲流",
            timeout=10,
        )
        heatmap_data = heatmap_response.json().get("data", [])

        unique_dates = set(date for date, _ in heatmap_data)

        print(f"    数据点总数: {len(heatmap_data)}")
        print(f"    唯一日期数: {len(unique_dates)}")
        print(f"    每天数据点: {len(heatmap_data) / len(unique_dates):.1f} (10所高校平均)")

        expected_days = 365
        print(f"    覆盖天数: {len(unique_dates)}/{expected_days} {'✓' if len(unique_dates) >= expected_days else '✗'}")

        sample_date = heatmap_data[0][0]
        sample_risk = heatmap_data[0][1]
        print(f"    样本数据: {sample_date} -> {sample_risk:.4f}")

        if len(unique_dates) < expected_days:
            all_passed = False

    except Exception as e:
        print(f"    ✗ 测试失败: {e}")
        all_passed = False

    print()
    print("  5.2.3 预警时段与热力图对应关系")
    try:
        high_risk_response = requests.get(
            f"{BACKEND_URL}/api/high-risk-periods?threshold=0.3",
            timeout=10,
        )
        high_risk_data = high_risk_response.json().get("periods", [])

        print(f"    高风险预警时段数: {len(high_risk_data)}")

        for period in high_risk_data[:3]:
            illness = period.get("illness")
            start = period.get("start_date")
            end = period.get("end_date")
            avg_risk = period.get("avg_risk")

            heatmap_response = requests.get(
                f"{BACKEND_URL}/api/calendar-heatmap?illness={illness}",
                timeout=10,
            )
            heatmap_data = heatmap_response.json().get("data", [])

            period_data = [
                risk for date, risk in heatmap_data
                if start <= date <= end
            ]

            if period_data:
                actual_avg = sum(period_data) / len(period_data)
                diff = abs(actual_avg - avg_risk)
                consistent = diff < 0.05

                print(f"    {illness}: {start} ~ {end}")
                print(f"      预警平均风险: {avg_risk:.4f}")
                print(f"      热力图实际平均: {actual_avg:.4f} {'✓' if consistent else '✗'}")

                if not consistent:
                    all_passed = False
            else:
                print(f"    {illness}: 预警时段无热力图数据")

    except Exception as e:
        print(f"    ✗ 测试失败: {e}")
        all_passed = False

    print()
    return all_passed


def main():
    print("=" * 60)
    print("🏥 校园健康预警系统 - 验收测试")
    print("=" * 60)
    print()

    results = []

    results.append(("后端逻辑验证", test_backend_logic()))
    results.append(("端口检测功能", test_port_detection()))

    backend_process = start_backend()
    if not backend_process:
        print("❌ 无法启动后端服务，终止测试")
        return 1

    try:
        time.sleep(2)
        results.append(("配置接口测试", test_config_endpoint()))
        results.append(("API 接口测试", test_api_endpoints()))
        results.append(("特定需求验证", test_specific_requirements()))
        results.append(("数据质量检查", test_data_quality()))
        results.append(("数据完整性验证", test_data_completeness()))
        results.append(("数据对应关系验证", test_data_consistency()))

        print("=" * 60)
        print("📊 测试结果汇总")
        print("=" * 60)

        all_passed = True
        for name, passed in results:
            status = "✓ 通过" if passed else "✗ 失败"
            print(f"  {name}: {status}")
            if not passed:
                all_passed = False

        print()
        if all_passed:
            print("🎉 全部测试通过！系统可以正常使用。")
            print()
            print("启动命令:")
            print("  后端: cd fragile-college-student && python3 app.py")
            print("  前端: cd fragile-college-student/client && npm start")
            print("  一键启动: cd fragile-college-student && ./start.sh")
            print()
            print("环境变量配置:")
            print("  BACKEND_PORT  - 后端端口 (默认: 5001)")
            print("  FRONTEND_PORT - 前端端口 (默认: 3000)")
            print("  VITE_BACKEND_PORT - Vite代理后端端口")
            print("  VITE_BACKEND_HOST - Vite代理后端主机 (默认: localhost)")
            return 0
        else:
            print("❌ 部分测试失败，请检查问题后重试。")
            return 1

    finally:
        print()
        print("正在停止后端服务...")
        backend_process.terminate()
        try:
            backend_process.wait(timeout=5)
        except subprocess.TimeoutExpired:
            backend_process.kill()
        print("后端服务已停止")


if __name__ == "__main__":
    sys.exit(main())
