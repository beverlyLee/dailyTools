#!/usr/bin/env python3
import requests
import json
import sys

def test_backend():
    print("=" * 60)
    print("测试后端API服务")
    print("=" * 60)
    
    base_url = "http://localhost:5001"
    
    # 1. 健康检查
    print("\n1. 健康检查接口...")
    try:
        r = requests.get(f"{base_url}/api/health", timeout=5)
        print(f"   状态码: {r.status_code}")
        print(f"   响应: {r.json()}")
        if r.status_code == 200:
            print("   ✓ 健康检查通过")
        else:
            print("   ✗ 健康检查失败")
            return False
    except Exception as e:
        print(f"   ✗ 健康检查异常: {e}")
        return False
    
    # 2. Dashboard接口
    print("\n2. Dashboard接口...")
    try:
        r = requests.get(f"{base_url}/api/dashboard", timeout=10)
        print(f"   状态码: {r.status_code}")
        if r.status_code == 200:
            data = r.json()
            print(f"   ✓ Dashboard数据加载成功")
            print(f"   - 疾病数量: {len(data.get('illnesses', {}))}")
            print(f"   - 高校数量: {len(data.get('colleges', []))}")
            print(f"   - 热力图数据: {list(data.get('heatmaps', {}).keys())}")
            print(f"   - 高风险期: {len(data.get('high_risk_periods', []))}")
        else:
            print(f"   ✗ Dashboard失败: {r.text}")
            return False
    except Exception as e:
        print(f"   ✗ Dashboard异常: {e}")
        return False
    
    # 3. 验证接口
    print("\n3. 需求验证接口...")
    try:
        r = requests.get(f"{base_url}/api/validate", timeout=10)
        print(f"   状态码: {r.status_code}")
        if r.status_code == 200:
            data = r.json()
            print(f"   秋季甲流高发: {'✓' if data.get('autumn_influenza') else '✗'}")
            print(f"   秋季结膜炎高发: {'✓' if data.get('autumn_conjunctivitis') else '✗'}")
            print(f"   冬季南方流感高风险: {'✓' if data.get('winter_southern_flu') else '✗'}")
            print(f"   全部通过: {'✓' if data.get('all_passed') else '✗'}")
        else:
            print(f"   ✗ 验证失败: {r.text}")
    except Exception as e:
        print(f"   ✗ 验证异常: {e}")
    
    # 4. 日历热力图接口
    print("\n4. 日历热力图接口...")
    try:
        r = requests.get(f"{base_url}/api/calendar-heatmap?illness=甲流", timeout=10)
        print(f"   状态码: {r.status_code}")
        if r.status_code == 200:
            data = r.json()
            print(f"   ✓ 热力图数据点: {len(data.get('data', []))}")
        else:
            print(f"   ✗ 热力图失败: {r.text}")
    except Exception as e:
        print(f"   ✗ 热力图异常: {e}")
    
    return True

def test_frontend():
    print("\n" + "=" * 60)
    print("测试前端服务")
    print("=" * 60)
    
    frontend_url = "http://localhost:3000"
    
    print(f"\n1. 前端页面访问...")
    try:
        r = requests.get(frontend_url, timeout=5)
        print(f"   状态码: {r.status_code}")
        if r.status_code == 200:
            print("   ✓ 前端页面可访问")
            if "Vite" in r.text or "React" in r.text or "script" in r.text:
                print("   ✓ 页面包含前端资源引用")
            else:
                print("   ? 页面内容需要验证")
        else:
            print(f"   ✗ 前端访问失败: {r.status_code}")
            return False
    except Exception as e:
        print(f"   ✗ 前端异常: {e}")
        return False
    
    return True

def main():
    print("\n校园健康预警系统 - 功能测试报告")
    print("=" * 60)
    
    backend_ok = test_backend()
    frontend_ok = test_frontend()
    
    print("\n" + "=" * 60)
    print("测试总结")
    print("=" * 60)
    print(f"后端服务: {'✓ 正常' if backend_ok else '✗ 异常'}")
    print(f"前端服务: {'✓ 正常' if frontend_ok else '✗ 异常'}")
    
    if backend_ok and frontend_ok:
        print("\n✓ 系统基本功能正常，可以进行页面交互测试")
    else:
        print("\n✗ 系统存在问题，需要修复")
        sys.exit(1)

if __name__ == "__main__":
    main()
