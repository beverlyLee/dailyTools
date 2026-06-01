#!/usr/bin/env python3
"""光绘画板 - 第2轮视觉验证（截图分析）"""

import time
from playwright.sync_api import sync_playwright
from PIL import Image
import io
import os

IMG_DIR = "/Users/liboyang/trae/dailyTools/light-painter/img"

def analyze_screenshot(image_data, threshold=30):
    """分析截图中的非黑色像素"""
    img = Image.open(io.BytesIO(image_data))
    img = img.convert('RGB')
    pixels = img.load()
    
    width, height = img.size
    non_black = 0
    max_brightness = 0
    bright_pixels = 0
    very_bright = 0
    
    for y in range(0, height, 2):
        for x in range(0, width, 2):
            r, g, b = pixels[x, y]
            bright = max(r, g, b)
            if bright > max_brightness:
                max_brightness = bright
            if bright > threshold:
                non_black += 1
                if bright > 150:
                    bright_pixels += 1
                if bright > 220:
                    very_bright += 1
    
    return {
        'total_pixels': width * height,
        'non_black_pixels': non_black * 4,
        'max_brightness': max_brightness,
        'bright_pixels': bright_pixels * 4,
        'very_bright_pixels': very_bright * 4,
        'width': width,
        'height': height
    }

def run_test():
    print("\n" + "="*90)
    print("🔍 光绘画板 - 第2轮视觉验证")
    print("="*90 + "\n")
    
    results = []
    console_errors = []
    
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(
            viewport={"width": 1280, "height": 800},
            device_scale_factor=2
        )
        page = context.new_page()
        
        page.on("console", lambda msg: console_errors.append(f"[{msg.type}] {msg.text}") if msg.type == "error" else None)
        page.on("pageerror", lambda exc: console_errors.append(f"[pageerror] {exc.message}"))
        
        # 加载页面
        page.goto("http://localhost:5190", wait_until="domcontentloaded", timeout=30000)
        time.sleep(3)
        
        # 初始截图
        initial_img = page.screenshot()
        initial_analysis = analyze_screenshot(initial_img)
        print(f"📋 初始状态:")
        print(f"  非黑像素: {initial_analysis['non_black_pixels']:,}")
        print(f"  最大亮度: {initial_analysis['max_brightness']}/255")
        print(f"  高亮像素: {initial_analysis['bright_pixels']:,}")
        
        # 绘制光轨
        canvas = page.locator("canvas").first
        box = canvas.bounding_box()
        
        # 绘制一条斜线
        start_x = box["x"] + 150
        start_y = box["y"] + 150
        end_x = box["x"] + box["width"] - 150
        end_y = box["y"] + box["height"] - 150
        
        page.mouse.move(start_x, start_y)
        page.mouse.down()
        
        for i in range(50):
            t = i / 50
            x = start_x + (end_x - start_x) * t
            y = start_y + (end_y - start_y) * t
            page.mouse.move(x, y)
            time.sleep(0.02)
        
        page.mouse.up()
        time.sleep(1)
        
        # 绘制后的截图
        after_draw = page.screenshot()
        after_analysis = analyze_screenshot(after_draw)
        
        print(f"\n📋 绘制光轨后:")
        print(f"  非黑像素: {after_analysis['non_black_pixels']:,}")
        print(f"  最大亮度: {after_analysis['max_brightness']}/255")
        print(f"  高亮像素: {after_analysis['bright_pixels']:,}")
        print(f"  极亮像素(>220): {after_analysis['very_bright_pixels']:,}")
        
        # 计算增量
        delta_non_black = after_analysis['non_black_pixels'] - initial_analysis['non_black_pixels']
        delta_bright = after_analysis['bright_pixels'] - initial_analysis['bright_pixels']
        delta_max = after_analysis['max_brightness'] - initial_analysis['max_brightness']
        
        print(f"\n📊 变化量:")
        print(f"  非黑像素增量: {delta_non_black:,}")
        print(f"  高亮像素增量: {delta_bright:,}")
        print(f"  最大亮度增量: {delta_max}")
        
        # 验证
        issues = []
        
        if delta_non_black < 1000:
            issues.append(f"光轨可见性不足：非黑像素仅增加 {delta_non_black:,} 个")
        elif delta_non_black < 5000:
            issues.append(f"光轨偏暗：非黑像素增加 {delta_non_black:,} 个，发光效果不明显")
        
        if after_analysis['max_brightness'] < 150:
            issues.append(f"亮度不足：最大亮度仅 {after_analysis['max_brightness']}/255")
        
        if delta_bright < 500:
            issues.append(f"高亮区域不足：高亮像素仅增加 {delta_bright:,} 个")
        
        print(f"\n🎯 验证结果:")
        if len(issues) == 0:
            print("  ✅ 光轨可见，发光效果良好！")
        else:
            for issue in issues:
                print(f"  ❌ {issue}")
        
        # 保存截图
        with open(f"{IMG_DIR}/round2_visual_test.png", "wb") as f:
            f.write(after_draw)
        
        # 检查控制台错误
        if len(console_errors) > 0:
            print(f"\n⚠️  控制台错误: {len(console_errors)} 个")
            for err in console_errors[:5]:
                print(f"  {err}")
        
        browser.close()
    
    print("\n" + "="*90 + "\n")
    return delta_non_black > 1000 and after_analysis['max_brightness'] > 150

if __name__ == "__main__":
    result = run_test()
    print(f"最终判定: {'✅ 通过' if result else '❌ 失败'}")
