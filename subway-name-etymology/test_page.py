#!/usr/bin/env python3
from playwright.sync_api import sync_playwright
import time
import os

os.makedirs('img', exist_ok=True)

def run_test():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page()
        
        console_errors = []
        page.on('console', lambda msg: console_errors.append(msg) if msg.type == 'error' else None)
        
        print("=== 测试1: 访问首页 ====")
        page.goto('http://127.0.0.1:5001/')
        time.sleep(2)
        page.screenshot(path='img/round5_homepage.png', full_page=True)
        print("首页截图已保存")
        
        print("\n=== 检查控制台错误 ===")
        if console_errors:
            print(f"发现 {len(console_errors)} 个控制台错误:")
            for error in console_errors:
                print(f"  - {error.text}")
        else:
            print("无控制台错误")
        
        print("\n=== 测试2: 深圳树图分析 ===")
        console_errors.clear()
        page.select_option('#city-select', value='深圳')
        time.sleep(3)
        page.screenshot(path='img/round5_treemap_shenzhen.png', full_page=True)
        print("深圳树图分析截图已保存")
        
        print("\n=== 测试3: 上海树图分析 ===")
        page.select_option('#city-select', value='上海')
        time.sleep(3)
        page.screenshot(path='img/round5_treemap_shanghai.png', full_page=True)
        print("上海树图分析截图已保存")
        
        print("\n=== 测试4: 成都树图分析 ===")
        page.select_option('#city-select', value='成都')
        time.sleep(3)
        page.screenshot(path='img/round5_treemap_chengdu.png', full_page=True)
        print("成都树图分析截图已保存")
        
        print("\n=== 测试5: 城市对比（深圳vs西安） ===")
        page.click('button[data-tab="compare"]')
        time.sleep(1)
        page.select_option('#city-a-select', value='深圳')
        page.select_option('#city-b-select', value='西安')
        page.click('#compare-btn')
        time.sleep(3)
        page.screenshot(path='img/round5_compare.png', full_page=True)
        print("城市对比截图已保存")
        
        print("\n=== 测试6: 词汇网络 - 成都 ===")
        console_errors.clear()
        page.click('button[data-tab="forcegraph"]')
        time.sleep(1)
        page.select_option('#force-city-select', value='成都')
        page.click('#force-btn')
        time.sleep(4)
        page.screenshot(path='img/round5_forcegraph_chengdu.png', full_page=True)
        print("成都词汇网络截图已保存")
        
        if console_errors:
            print(f"发现 {len(console_errors)} 个错误:")
            for error in console_errors:
                print(f"  - {error.text}")
        
        browser.close()
        print("\n=== 测试完成 ===")

if __name__ == '__main__':
    run_test()
