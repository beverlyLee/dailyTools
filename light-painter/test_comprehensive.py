#!/usr/bin/env python3
"""光绘画板 - 第2轮全面测试"""

import time
import math
from playwright.sync_api import sync_playwright
from PIL import Image
import io
import os

IMG_DIR = "/Users/liboyang/trae/dailyTools/light-painter/img"
os.makedirs(IMG_DIR, exist_ok=True)

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

def log_test(name, status, detail=""):
    icon = "✅" if status else "❌"
    print(f"{icon} | {name:<50} | {detail}")
    return (name, status, detail)

def run_tests():
    print("\n" + "="*90)
    print("🎨 光绘画板 - 第2轮全面测试")
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
        
        canvas = page.locator("canvas").first
        box = canvas.bounding_box()
        
        # ========== 测试1: 初始状态 ==========
        initial_img = page.screenshot()
        initial = analyze_screenshot(initial_img)
        log_test("1. 初始状态", True, f"非黑像素: {initial['non_black_pixels']:,}, 最大亮度: {initial['max_brightness']}/255")
        results.append(("初始状态", True, ""))
        
        # ========== 测试2: 绘制直线光轨 ==========
        print("\n🖱️  绘制直线光轨...")
        start_x = box["x"] + 200
        start_y = box["y"] + 200
        end_x = box["x"] + box["width"] - 200
        end_y = box["y"] + box["height"] - 200
        
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
        
        line_img = page.screenshot()
        line = analyze_screenshot(line_img)
        delta = line['non_black_pixels'] - initial['non_black_pixels']
        
        with open(f"{IMG_DIR}/round2_comprehensive_01_line.png", "wb") as f:
            f.write(line_img)
        
        if delta > 50000 and line['max_brightness'] >= 200:
            log_test("2. 直线光轨可见性", True, f"非黑增量: {delta:,}, 最大亮度: {line['max_brightness']}/255")
            results.append(("直线光轨可见性", True, f"delta={delta:,}"))
        else:
            log_test("2. 直线光轨可见性", False, f"非黑增量: {delta:,}, 最大亮度: {line['max_brightness']}/255")
            results.append(("直线光轨可见性", False, f"delta={delta:,}"))
        
        # ========== 测试3: 绘制圆形光轨 ==========
        print("\n🖱️  绘制圆形光轨...")
        center_x = box["x"] + box["width"] / 2
        center_y = box["y"] + box["height"] / 2
        radius = min(box["width"], box["height"]) / 5
        
        page.mouse.move(
            center_x + radius * math.cos(0),
            center_y + radius * math.sin(0)
        )
        page.mouse.down()
        
        for i in range(60):
            angle = 2 * math.pi * i / 60
            x = center_x + radius * math.cos(angle)
            y = center_y + radius * math.sin(angle)
            page.mouse.move(x, y)
            time.sleep(0.02)
        
        page.mouse.up()
        time.sleep(1)
        
        circle_img = page.screenshot()
        circle = analyze_screenshot(circle_img)
        delta2 = circle['non_black_pixels'] - line['non_black_pixels']
        
        with open(f"{IMG_DIR}/round2_comprehensive_02_circle.png", "wb") as f:
            f.write(circle_img)
        
        if delta2 > 50000:
            log_test("3. 圆形光轨可见性", True, f"非黑增量: {delta2:,}")
            results.append(("圆形光轨可见性", True, f"delta={delta2:,}"))
        else:
            log_test("3. 圆形光轨可见性", False, f"非黑增量: {delta2:,}")
            results.append(("圆形光轨可见性", False, f"delta={delta2:,}"))
        
        # ========== 测试4: 叠加发光效果 ==========
        print("\n🖱️  绘制多条光轨测试叠加效果...")
        for layer in range(3):
            sx = center_x - 150 + layer * 50
            sy = center_y - 150
            ex = center_x + 150
            ey = center_y + 150 - layer * 50
            
            page.mouse.move(sx, sy)
            page.mouse.down()
            
            for i in range(30):
                t = i / 30
                x = sx + (ex - sx) * t
                y = sy + (ey - sy) * t
                page.mouse.move(x, y)
                time.sleep(0.02)
            
            page.mouse.up()
            time.sleep(0.3)
        
        time.sleep(1)
        overlap_img = page.screenshot()
        overlap = analyze_screenshot(overlap_img)
        delta3 = overlap['non_black_pixels'] - circle['non_black_pixels']
        
        with open(f"{IMG_DIR}/round2_comprehensive_03_overlap.png", "wb") as f:
            f.write(overlap_img)
        
        # 检查叠加区域的亮度
        if overlap['very_bright_pixels'] > 100000:
            log_test("4. 叠加发光效果", True, f"极亮像素: {overlap['very_bright_pixels']:,}, 非黑增量: {delta3:,}")
            results.append(("叠加发光效果", True, f"极亮像素={overlap['very_bright_pixels']:,}"))
        else:
            log_test("4. 叠加发光效果", False, f"极亮像素: {overlap['very_bright_pixels']:,}, 非黑增量: {delta3:,}")
            results.append(("叠加发光效果", False, f"极亮像素={overlap['very_bright_pixels']:,}"))
        
        # ========== 测试5: 光轨保留测试 ==========
        print("\n⏳ 测试光轨保留...")
        time.sleep(3)
        persist_img = page.screenshot()
        persist = analyze_screenshot(persist_img)
        
        with open(f"{IMG_DIR}/round2_comprehensive_04_persist.png", "wb") as f:
            f.write(persist_img)
        
        # 比较3秒后的非黑像素数量
        persist_ratio = persist['non_black_pixels'] / max(overlap['non_black_pixels'], 1)
        
        if persist_ratio > 0.9:  # 保留90%以上
            log_test("5. 光轨保留", True, f"保留比例: {persist_ratio*100:.1f}%")
            results.append(("光轨保留", True, f"{persist_ratio*100:.1f}%"))
        elif persist_ratio > 0.5:
            log_test("5. 光轨保留", False, f"保留比例: {persist_ratio*100:.1f}%, 部分消失")
            results.append(("光轨保留", False, f"{persist_ratio*100:.1f}%"))
        else:
            log_test("5. 光轨保留", False, f"保留比例: {persist_ratio*100:.1f}%, 大量消失")
            results.append(("光轨保留", False, f"{persist_ratio*100:.1f}%"))
        
        # ========== 测试6: 多种颜色测试 ==========
        print("\n🎨 测试多种颜色...")
        # 绘制几条不同颜色的光轨
        for color_idx in range(4):
            y_start = 100 + color_idx * 150
            sx = box["x"] + 100
            sy = box["y"] + y_start
            ex = box["x"] + box["width"] - 100
            ey = sy
            
            page.mouse.move(sx, sy)
            page.mouse.down()
            
            for i in range(30):
                t = i / 30
                x = sx + (ex - sx) * t
                page.mouse.move(x, sy)
                time.sleep(0.02)
            
            page.mouse.up()
            time.sleep(0.2)
        
        time.sleep(1)
        color_img = page.screenshot()
        color = analyze_screenshot(color_img)
        
        with open(f"{IMG_DIR}/round2_comprehensive_05_colors.png", "wb") as f:
            f.write(color_img)
        
        # 检查是否有多种颜色（通过分析RGB分布）
        img = Image.open(io.BytesIO(color_img))
        img = img.convert('RGB')
        pixels = img.load()
        
        color_counts = {'red': 0, 'green': 0, 'blue': 0, 'yellow': 0, 'cyan': 0, 'magenta': 0}
        for y in range(0, img.height, 4):
            for x in range(0, img.width, 4):
                r, g, b = pixels[x, y]
                if max(r, g, b) > 100:
                    if r > g and r > b:
                        color_counts['red'] += 1
                    elif g > r and g > b:
                        color_counts['green'] += 1
                    elif b > r and b > g:
                        color_counts['blue'] += 1
                    elif r > 100 and g > 100 and b < 100:
                        color_counts['yellow'] += 1
        
        dominant_colors = [c for c, cnt in color_counts.items() if cnt > 100]
        if len(dominant_colors) >= 2:
            log_test("6. 多种颜色支持", True, f"检测到 {len(dominant_colors)} 种主色: {', '.join(dominant_colors)}")
            results.append(("多种颜色支持", True, f"{len(dominant_colors)} 种"))
        else:
            log_test("6. 多种颜色支持", False, f"仅检测到 {len(dominant_colors)} 种主色")
            results.append(("多种颜色支持", False, f"{len(dominant_colors)} 种"))
        
        # ========== 测试7: 锯齿检查 ==========
        print("\n🔍 检查锯齿...")
        # 通过分析边缘像素判断锯齿程度
        jagged_pixels = 0
        smooth_pixels = 0
        for y in range(1, img.height-1, 4):
            for x in range(1, img.width-1, 4):
                r, g, b = pixels[x, y]
                if max(r, g, b) > 100:
                    # 检查周围像素
                    neighbors = [pixels[x-1, y], pixels[x+1, y], pixels[x, y-1], pixels[x, y+1]]
                    bright_neighbors = sum(1 for nr, ng, nb in neighbors if max(nr, ng, nb) > 100)
                    if bright_neighbors < 2:
                        jagged_pixels += 1
                    else:
                        smooth_pixels += 1
        
        smooth_ratio = smooth_pixels / max(smooth_pixels + jagged_pixels, 1)
        if smooth_ratio > 0.7:
            log_test("7. 抗锯齿效果", True, f"平滑比例: {smooth_ratio*100:.1f}%")
            results.append(("抗锯齿效果", True, f"{smooth_ratio*100:.1f}%"))
        else:
            log_test("7. 抗锯齿效果", False, f"平滑比例: {smooth_ratio*100:.1f}%, 锯齿明显")
            results.append(("抗锯齿效果", False, f"{smooth_ratio*100:.1f}%"))
        
        # ========== 测试8: 控制台检查 ==========
        if len(console_errors) == 0:
            log_test("8. 控制台错误", True, "无错误")
            results.append(("控制台错误", True, "无"))
        else:
            log_test("8. 控制台错误", False, f"{len(console_errors)} 个错误")
            results.append(("控制台错误", False, f"{len(console_errors)} 个"))
        
        # 最终截图
        final_img = page.screenshot()
        with open(f"{IMG_DIR}/round2_comprehensive_06_final.png", "wb") as f:
            f.write(final_img)
        
        browser.close()
    
    # 总结
    print("\n" + "="*90)
    print("📊 第2轮全面测试总结")
    print("="*90)
    
    passed = sum(1 for r in results if r[1])
    total = len(results)
    
    print(f"\n通过: {passed}/{total} ({passed/total*100:.1f}%)")
    print(f"失败: {total-passed}/{total}\n")
    
    # 输出详细结果
    for name, status, detail in results:
        icon = "✅" if status else "❌"
        print(f"  {icon} {name}: {detail}")
    
    print(f"\n📸 截图已保存至: {IMG_DIR}")
    print("\n" + "="*90 + "\n")
    
    return results, console_errors

if __name__ == "__main__":
    results, errors = run_tests()
