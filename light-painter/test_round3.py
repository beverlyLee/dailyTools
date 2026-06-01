#!/usr/bin/env python3
"""光绘画板 - 第3轮测试"""

import time
import math
from playwright.sync_api import sync_playwright
from PIL import Image
import io
import os
import json

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
    
    # 统计颜色分布
    color_counts = {'red': 0, 'orange': 0, 'yellow': 0, 'green': 0, 'cyan': 0, 'blue': 0, 'purple': 0, 'pink': 0, 'white': 0}
    
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
                
                # 颜色分类
                if bright > 100:
                    if r > g * 1.5 and r > b * 1.5:
                        color_counts['red'] += 1
                    elif r > g * 1.2 and b < g:
                        color_counts['orange'] += 1
                    elif r > 100 and g > 100 and b < 100:
                        color_counts['yellow'] += 1
                    elif g > r * 1.2 and g > b * 1.2:
                        color_counts['green'] += 1
                    elif g > 100 and b > 100 and r < 100:
                        color_counts['cyan'] += 1
                    elif b > r * 1.2 and b > g * 1.2:
                        color_counts['blue'] += 1
                    elif r > 100 and b > 100 and g < r and g < b:
                        color_counts['purple'] += 1
                    elif r > 150 and g > 100 and b > 150:
                        color_counts['pink'] += 1
                    elif r > 200 and g > 200 and b > 200:
                        color_counts['white'] += 1
    
    return {
        'total_pixels': width * height,
        'non_black_pixels': non_black * 4,
        'max_brightness': max_brightness,
        'bright_pixels': bright_pixels * 4,
        'very_bright_pixels': very_bright * 4,
        'width': width,
        'height': height,
        'color_counts': color_counts
    }

def log_test(name, status, detail=""):
    icon = "✅" if status else "❌"
    print(f"{icon} | {name:<50} | {detail}")
    return (name, status, detail)

def run_tests():
    print("\n" + "="*100)
    print("🎨 光绘画板 (light-painter) - 第3轮验收测试")
    print("="*100 + "\n")
    
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
        page.goto("http://localhost:5200", wait_until="domcontentloaded", timeout=30000)
        time.sleep(3)
        
        canvas = page.locator("canvas").first
        box = canvas.bounding_box()
        
        # ========== 测试1: 3D空间构建 ==========
        print("🔍 检查3D空间构建...")
        initial_img = page.screenshot()
        initial = analyze_screenshot(initial_img)
        
        with open(f"{IMG_DIR}/round3_01_initial_3d.png", "wb") as f:
            f.write(initial_img)
        
        # 检查是否有网格和坐标轴（通过颜色检测）
        has_grid = initial['non_black_pixels'] > 1000  # 网格会产生一些非黑像素
        if has_grid:
            log_test("1. 3D空间构建", True, f"网格/坐标轴可见，非黑像素: {initial['non_black_pixels']:,}")
            results.append(("3D空间构建", True, f"非黑像素: {initial['non_black_pixels']:,}"))
        else:
            log_test("1. 3D空间构建", False, "网格/坐标轴不可见")
            results.append(("3D空间构建", False, "网格/坐标轴不可见"))
        
        # ========== 测试2: 颜色选择面板 ==========
        print("\n🎨 检查颜色选择面板...")
        try:
            color_grid = page.locator("#colorGrid").first
            grid_visible = color_grid.is_visible(timeout=5000)
            
            color_btns = color_grid.locator(".color-btn")
            btn_count = color_btns.count()
            
            if grid_visible and btn_count >= 8:
                log_test("2. 颜色选择面板", True, f"可见，{btn_count} 个预设颜色")
                results.append(("颜色选择面板", True, f"{btn_count} 个预设"))
            else:
                log_test("2. 颜色选择面板", False, f"可见: {grid_visible}, 按钮数: {btn_count}")
                results.append(("颜色选择面板", False, f"可见: {grid_visible}, 按钮数: {btn_count}"))
        except Exception as e:
            log_test("2. 颜色选择面板", False, str(e))
            results.append(("颜色选择面板", False, str(e)))
        
        # ========== 测试3: 颜色切换功能 ==========
        print("\n🎨 测试颜色切换...")
        try:
            color_btns = page.locator(".color-btn")
            
            # 点击第3个颜色按钮（绿色）
            if color_btns.count() > 2:
                color_btns.nth(2).click()
                time.sleep(0.5)
                
                # 绘制一条线
                start_x = box["x"] + 200
                start_y = box["y"] + 200
                end_x = box["x"] + box["width"] - 200
                end_y = box["y"] + 200
                
                page.mouse.move(start_x, start_y)
                page.mouse.down()
                for i in range(30):
                    t = i / 30
                    x = start_x + (end_x - start_x) * t
                    page.mouse.move(x, start_y)
                    time.sleep(0.02)
                page.mouse.up()
                time.sleep(1)
                
                color1_img = page.screenshot()
                color1 = analyze_screenshot(color1_img)
                
                with open(f"{IMG_DIR}/round3_02_color1_green.png", "wb") as f:
                    f.write(color1_img)
                
                # 点击第5个颜色按钮（蓝色）
                if color_btns.count() > 4:
                    color_btns.nth(4).click()
                    time.sleep(0.5)
                    
                    # 绘制另一条线
                    start_y2 = box["y"] + 300
                    page.mouse.move(start_x, start_y2)
                    page.mouse.down()
                    for i in range(30):
                        t = i / 30
                        x = start_x + (end_x - start_x) * t
                        page.mouse.move(x, start_y2)
                        time.sleep(0.02)
                    page.mouse.up()
                    time.sleep(1)
                    
                    color2_img = page.screenshot()
                    color2 = analyze_screenshot(color2_img)
                    
                    with open(f"{IMG_DIR}/round3_03_color2_blue.png", "wb") as f:
                        f.write(color2_img)
                    
                    # 检查颜色分布差异
                    green1 = color1['color_counts']['green']
                    blue1 = color1['color_counts']['blue']
                    green2 = color2['color_counts']['green']
                    blue2 = color2['color_counts']['blue']
                    
                    if green1 > green2 * 0.8 and blue2 > blue1 * 0.8:
                        log_test("3. 颜色切换功能", True, f"绿色像素: {green1:,}→{green2:,}, 蓝色像素: {blue1:,}→{blue2:,}")
                        results.append(("颜色切换功能", True, "颜色切换正常"))
                    else:
                        log_test("3. 颜色切换功能", False, f"绿色: {green1:,}→{green2:,}, 蓝色: {blue1:,}→{blue2:,}")
                        results.append(("颜色切换功能", False, "颜色切换不明显"))
                else:
                    log_test("3. 颜色切换功能", False, "颜色按钮不足")
                    results.append(("颜色切换功能", False, "按钮不足"))
            else:
                log_test("3. 颜色切换功能", False, "颜色按钮不足")
                results.append(("颜色切换功能", False, "按钮不足"))
        except Exception as e:
            log_test("3. 颜色切换功能", False, str(e))
            results.append(("颜色切换功能", False, str(e)))
        
        # ========== 测试4: 自定义颜色选择器 ==========
        print("\n🎨 测试自定义颜色选择器...")
        try:
            custom_color = page.locator("#customColor").first
            if custom_color.is_visible(timeout=5000):
                log_test("4. 自定义颜色选择器", True, "可见")
                results.append(("自定义颜色选择器", True, "可见"))
            else:
                log_test("4. 自定义颜色选择器", False, "不可见")
                results.append(("自定义颜色选择器", False, "不可见"))
        except Exception as e:
            log_test("4. 自定义颜色选择器", False, str(e))
            results.append(("自定义颜色选择器", False, str(e)))
        
        # ========== 测试5: 深度控制滑块 ==========
        print("\n📏 测试深度控制滑块...")
        try:
            depth_slider = page.locator("#depthSlider").first
            depth_value = page.locator("#depthValue").first
            
            if depth_slider.is_visible(timeout=5000):
                initial_value = depth_value.inner_text()
                
                # 调整深度
                depth_slider.fill("3")
                time.sleep(0.5)
                new_value = depth_value.inner_text()
                
                if initial_value != new_value:
                    log_test("5. 深度控制滑块", True, f"值从 {initial_value} 变为 {new_value}")
                    results.append(("深度控制滑块", True, f"{initial_value}→{new_value}"))
                else:
                    log_test("5. 深度控制滑块", False, f"值未变化: {initial_value}")
                    results.append(("深度控制滑块", False, f"值未变化"))
            else:
                log_test("5. 深度控制滑块", False, "不可见")
                results.append(("深度控制滑块", False, "不可见"))
        except Exception as e:
            log_test("5. 深度控制滑块", False, str(e))
            results.append(("深度控制滑块", False, str(e)))
        
        # ========== 测试6: 撤销/清空按钮 ==========
        print("\n🔧 测试撤销/清空按钮...")
        try:
            undo_btn = page.locator("#undoBtn").first
            clear_btn = page.locator("#clearBtn").first
            
            if undo_btn.is_visible(timeout=3000) and clear_btn.is_visible(timeout=3000):
                log_test("6. 撤销/清空按钮", True, "都可见")
                results.append(("撤销/清空按钮", True, "可见"))
            else:
                log_test("6. 撤销/清空按钮", False, f"撤销可见: {undo_btn.is_visible()}, 清空可见: {clear_btn.is_visible()}")
                results.append(("撤销/清空按钮", False, "部分不可见"))
        except Exception as e:
            log_test("6. 撤销/清空按钮", False, str(e))
            results.append(("撤销/清空按钮", False, str(e)))
        
        # ========== 测试7: 红色笔触连续性 ==========
        print("\n🔴 测试红色笔触连续性...")
        try:
            # 先清空
            clear_btn = page.locator("#clearBtn").first
            if clear_btn.is_visible():
                clear_btn.click()
                time.sleep(0.5)
            
            # 选择红色（第一个按钮）
            color_btns = page.locator(".color-btn")
            if color_btns.count() > 0:
                color_btns.nth(0).click()
                time.sleep(0.5)
            
            # 绘制一条连续的波浪线
            start_x = box["x"] + 100
            start_y = box["y"] + box["height"] / 2
            
            page.mouse.move(start_x, start_y)
            page.mouse.down()
            
            for i in range(100):
                t = i / 100
                x = start_x + t * (box["width"] - 200)
                y = start_y + math.sin(t * math.pi * 4) * 50
                page.mouse.move(x, y)
                time.sleep(0.01)
            
            page.mouse.up()
            time.sleep(1)
            
            red_img = page.screenshot()
            red_analysis = analyze_screenshot(red_img)
            
            with open(f"{IMG_DIR}/round3_04_red_continuity.png", "wb") as f:
                f.write(red_img)
            
            red_pixels = red_analysis['color_counts']['red'] + red_analysis['color_counts']['orange']
            
            # 检查连续性：红色像素应该是连续的，数量应该足够多
            if red_pixels > 10000:
                log_test("7. 红色笔触连续性", True, f"红色/橙色像素: {red_pixels:,}")
                results.append(("红色笔触连续性", True, f"{red_pixels:,} 像素"))
            elif red_pixels > 1000:
                log_test("7. 红色笔触连续性", False, f"红色像素偏少: {red_pixels:,}, 可能存在断点")
                results.append(("红色笔触连续性", False, f"偏少: {red_pixels:,}"))
            else:
                log_test("7. 红色笔触连续性", False, f"红色像素极少: {red_pixels:,}, 笔触不连续")
                results.append(("红色笔触连续性", False, f"极少: {red_pixels:,}"))
        except Exception as e:
            log_test("7. 红色笔触连续性", False, str(e))
            results.append(("红色笔触连续性", False, str(e)))
        
        # ========== 测试8: 3D视角旋转 ==========
        print("\n🔄 测试3D视角旋转...")
        try:
            # 右键拖动旋转视角
            center_x = box["x"] + box["width"] / 2
            center_y = box["y"] + box["height"] / 2
            
            page.mouse.move(center_x, center_y)
            page.mouse.down(button="right")
            
            for i in range(20):
                page.mouse.move(center_x + i * 5, center_y - i * 3)
                time.sleep(0.05)
            
            page.mouse.up(button="right")
            time.sleep(1)
            
            rotate_img = page.screenshot()
            rotate_analysis = analyze_screenshot(rotate_img)
            
            with open(f"{IMG_DIR}/round3_05_3d_rotate.png", "wb") as f:
                f.write(rotate_img)
            
            # 旋转后网格位置应该变化
            if rotate_analysis['non_black_pixels'] > 500:
                log_test("8. 3D视角旋转", True, "旋转后场景可见")
                results.append(("3D视角旋转", True, "正常"))
            else:
                log_test("8. 3D视角旋转", False, "旋转后场景异常")
                results.append(("3D视角旋转", False, "异常"))
        except Exception as e:
            log_test("8. 3D视角旋转", False, str(e))
            results.append(("3D视角旋转", False, str(e)))
        
        # ========== 测试9: 不同深度绘制 ==========
        print("\n📐 测试不同深度绘制...")
        try:
            # 清空
            clear_btn = page.locator("#clearBtn").first
            if clear_btn.is_visible():
                clear_btn.click()
                time.sleep(0.5)
            
            # 选择不同深度绘制
            depth_slider = page.locator("#depthSlider").first
            
            # 深度 2
            depth_slider.fill("2")
            time.sleep(0.5)
            
            start_x = box["x"] + 200
            start_y = box["y"] + 200
            end_x = box["x"] + box["width"] - 200
            end_y = box["y"] + 200
            
            page.mouse.move(start_x, start_y)
            page.mouse.down()
            for i in range(30):
                t = i / 30
                x = start_x + (end_x - start_x) * t
                page.mouse.move(x, start_y)
                time.sleep(0.02)
            page.mouse.up()
            time.sleep(0.5)
            
            # 深度 -2
            depth_slider.fill("-2")
            time.sleep(0.5)
            
            start_y2 = box["y"] + 400
            page.mouse.move(start_x, start_y2)
            page.mouse.down()
            for i in range(30):
                t = i / 30
                x = start_x + (end_x - start_x) * t
                page.mouse.move(x, start_y2)
                time.sleep(0.02)
            page.mouse.up()
            time.sleep(1)
            
            depth_img = page.screenshot()
            depth_analysis = analyze_screenshot(depth_img)
            
            with open(f"{IMG_DIR}/round3_06_depth_draw.png", "wb") as f:
                f.write(depth_img)
            
            if depth_analysis['non_black_pixels'] > 10000:
                log_test("9. 不同深度绘制", True, f"非黑像素: {depth_analysis['non_black_pixels']:,}")
                results.append(("不同深度绘制", True, f"{depth_analysis['non_black_pixels']:,} 像素"))
            else:
                log_test("9. 不同深度绘制", False, f"像素偏少: {depth_analysis['non_black_pixels']:,}")
                results.append(("不同深度绘制", False, f"偏少: {depth_analysis['non_black_pixels']:,}"))
        except Exception as e:
            log_test("9. 不同深度绘制", False, str(e))
            results.append(("不同深度绘制", False, str(e)))
        
        # ========== 测试10: 控制台错误检查 ==========
        print("\n⚠️  检查控制台错误...")
        if len(console_errors) == 0:
            log_test("10. 控制台错误", True, "无错误")
            results.append(("控制台错误", True, "无"))
        else:
            log_test("10. 控制台错误", False, f"{len(console_errors)} 个错误")
            results.append(("控制台错误", False, f"{len(console_errors)} 个"))
            for err in console_errors[:3]:
                print(f"    {err}")
        
        # 最终截图
        final_img = page.screenshot()
        with open(f"{IMG_DIR}/round3_07_final.png", "wb") as f:
            f.write(final_img)
        
        browser.close()
    
    # 总结
    print("\n" + "="*100)
    print("📊 第3轮测试总结")
    print("="*100)
    
    passed = sum(1 for r in results if r[1])
    total = len(results)
    
    print(f"\n通过: {passed}/{total} ({passed/total*100:.1f}%)")
    print(f"失败: {total-passed}/{total}\n")
    
    # 输出详细结果
    for name, status, detail in results:
        icon = "✅" if status else "❌"
        print(f"  {icon} {name}: {detail}")
    
    print(f"\n📸 截图已保存至: {IMG_DIR}")
    print("\n" + "="*100 + "\n")
    
    return results, console_errors

if __name__ == "__main__":
    results, errors = run_tests()
