#!/usr/bin/env python3
"""
CORS 跨域测试脚本
"""
import subprocess
import time
import sys

print("=" * 60)
print("🔍 CORS 跨域配置测试")
print("=" * 60)

# 启动后端
print("\n🚀 启动后端服务...")
proc = subprocess.Popen(
    [sys.executable, "backend/app.py"],
    stdout=subprocess.PIPE,
    stderr=subprocess.PIPE,
    cwd="."
)

# 等待启动
time.sleep(3)

try:
    import requests
    
    base_url = "http://localhost:8001"
    
    # 测试 1: 健康检查
    print("\n📡 测试 1: 健康检查")
    resp = requests.get(f"{base_url}/api/health")
    print(f"   状态码: {resp.status_code}")
    print(f"   CORS Origin: {resp.headers.get('Access-Control-Allow-Origin')}")
    assert resp.status_code == 200
    assert resp.headers.get('Access-Control-Allow-Origin') == '*'
    print("   ✅ 通过")
    
    # 测试 2: 股票信息
    print("\n📡 测试 2: 股票信息接口")
    resp = requests.get(f"{base_url}/api/stock/600519")
    print(f"   状态码: {resp.status_code}")
    print(f"   CORS Origin: {resp.headers.get('Access-Control-Allow-Origin')}")
    data = resp.json()
    print(f"   股票名称: {data['data']['name']}")
    assert resp.status_code == 200
    print("   ✅ 通过")
    
    # 测试 3: OPTIONS 预检请求
    print("\n📡 测试 3: OPTIONS 预检请求")
    resp = requests.options(f"{base_url}/api/news/600519")
    print(f"   状态码: {resp.status_code}")
    print(f"   允许方法: {resp.headers.get('Access-Control-Allow-Methods')}")
    print(f"   允许头: {resp.headers.get('Access-Control-Allow-Headers')}")
    assert resp.status_code == 200
    print("   ✅ 通过")
    
    # 测试 4: 新闻情绪接口
    print("\n📡 测试 4: 新闻情绪分析接口")
    resp = requests.get(f"{base_url}/api/news/600519")
    print(f"   状态码: {resp.status_code}")
    data = resp.json()
    print(f"   新闻数量: {len(data['data'])}")
    print(f"   情绪统计: 利好={data['stats']['positive']}, 中性={data['stats']['neutral']}")
    assert resp.status_code == 200
    print("   ✅ 通过")
    
    print("\n" + "=" * 60)
    print("🎉 所有 CORS 测试通过！跨域配置已生效")
    print("=" * 60)
    print("\n📝 启动命令:")
    print("   后端: cd backend && python app.py")
    print("   前端: cd frontend && npm start")
    print("\n🌐 访问: http://localhost:3000")
    
finally:
    proc.terminate()
    proc.wait()
