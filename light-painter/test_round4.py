#!/usr/bin/env python3
"""光绘画板 - 第4轮测试"""

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
    
    return {
        'total_pixels': width * height,
        'non_black_pixels': non_black * 4,
        'max_brightness': max_brightness,
        'bright_pixels': bright_pixels * 4,
        'width': width,
        'height': height
    }

def log_test(name, status, detail=""):
    icon = "✅" if status else "❌"
    print(f"{icon} | {name:<55} | {detail}")
    return (name, status, detail)

def run_tests():
    print("\n" + "="*100)
    print("🎨 光绘画板 (light-painter) - 第4轮验收测试")
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
        page.goto("http://localhost:5210", wait_until="domcontentloaded", timeout=30000)
        time.sleep(3)
        
        canvas = page.locator("canvas").first
        box = canvas.bounding_box()
        
        # ========== 测试1: 初始3D空间 ==========
        print("🔍 检查初始3D空间...")
        initial_img = page.screenshot()
        initial = analyze_screenshot(initial_img)
        
        with open(f"{IMG_DIR}/round4_01_initial.png", "wb") as f:
            f.write(initial_img)
        
        # 检查是否有网格和坐标轴
        has_grid = initial['non_black_pixels'] > 5000
        if has_grid:
            log_test("1. 初始3D空间", True, f"网格/坐标轴可见，非黑像素: {initial['non_black_pixels']:,}")
            results.append(("初始3D空间", True, f"非黑像素: {initial['non_black_pixels']:,}"))
        else:
            log_test("1. 初始3D空间", False, "网格/坐标轴不可见")
            results.append(("初始3D空间", False, "网格/坐标轴不可见"))
        
        # ========== 测试2: Z轴深度绘制 ==========
        print("\n📐 测试Z轴深度绘制...")
        try:
            depth_slider = page.locator("#depthSlider").first
            
            # 设置深度为 3
            depth_slider.fill("3")
            time.sleep(0.5)
            
            # 绘制一条线
            start_x = box["x"] + 200
            start_y = box["y"] + box["height"] / 2
            end_x = box["x"] + box["width"] - 200
            end_y = box["y"] + box["height"] / 2
            
            page.mouse.move(start_x, start_y)
            page.mouse.down()
            for i in range(40):
                t = i / 40
                x = start_x + (end_x - start_x) * t
                y = start_y + (end_y - start_y) * t
                page.mouse.move(x, y)
                time.sleep(0.02)
            page.mouse.up()
            time.sleep(1)
            
            depth3_img = page.screenshot()
            depth3 = analyze_screenshot(depth3_img)
            
            with open(f"{IMG_DIR}/round4_02_depth3.png", "wb") as f:
                f.write(depth3_img)
            
            # 检查是否有绘制的线条（非黑像素增量应该明显大于0）
            delta1 = depth3['non_black_pixels'] - initial['non_black_pixels']
            if delta1 > 5000:
                log_test("2. Z轴深度绘制 (Z=3)", True, f"非黑像素增量: {delta1:,}")
                results.append(("Z轴深度绘制(Z=3)", True, f"增量: {delta1:,}"))
            else:
                log_test("2. Z轴深度绘制 (Z=3)", False, f"非黑像素增量不足: {delta1:,}")
                results.append(("Z轴深度绘制(Z=3)", False, f"增量: {delta1:,}"))
            
            # 设置深度为 -3
            depth_slider.fill("-3")
            time.sleep(0.5)
            
            # 绘制另一条线
            start_y2 = box["y"] + box["height"] / 2 + 100
            page.mouse.move(start_x, start_y2)
            page.mouse.down()
            for i in range(40):
                t = i / 40
                x = start_x + (end_x - start_x) * t
                y = start_y2
                page.mouse.move(x, y)
                time.sleep(0.02)
            page.mouse.up()
            time.sleep(1)
            
            depth_neg3_img = page.screenshot()
            depth_neg3 = analyze_screenshot(depth_neg3_img)
            
            with open(f"{IMG_DIR}/round4_03_depth_neg3.png", "wb") as f:
                f.write(depth_neg3_img)
            
            delta2 = depth_neg3['non_black_pixels'] - depth3['non_black_pixels']
            if delta2 > 5000:
                log_test("3. Z轴深度绘制 (Z=-3)", True, f"非黑像素增量: {delta2:,}")
                results.append(("Z轴深度绘制(Z=-3)", True, f"增量: {delta2:,}"))
            else:
                log_test("3. Z轴深度绘制 (Z=-3)", False, f"非黑像素增量不足: {delta2:,}")
                results.append(("Z轴深度绘制(Z=-3)", False, f"增量: {delta2:,}"))
                
        except Exception as e:
            log_test("2-3. Z轴深度绘制", False, str(e))
            results.append(("Z轴深度绘制", False, str(e)))
        
        # ========== 测试4: 检查原点连线问题 ==========
        print("\n🔗 检查原点连线问题...")
        try:
            # 清空画布
            clear_btn = page.locator("#clearBtn").first
            if clear_btn.is_visible():
                clear_btn.click()
                time.sleep(0.5)
            
            # 重置深度为0
            depth_slider = page.locator("#depthSlider").first
            depth_slider.fill("0")
            time.sleep(0.5)
            
            # 绘制一条短的、不经过原点的线（在右上角区域）
            start_x = box["x"] + box["width"] * 0.7
            start_y = box["y"] + box["height"] * 0.2
            end_x = box["x"] + box["width"] * 0.9
            end_y = box["y"] + box["height"] * 0.2
            
            page.mouse.move(start_x, start_y)
            page.mouse.down()
            for i in range(20):
                t = i / 20
                x = start_x + (end_x - start_x) * t
                y = start_y
                page.mouse.move(x, y)
                time.sleep(0.03)
            page.mouse.up()
            time.sleep(1)
            
            no_origin_img = page.screenshot()
            no_origin = analyze_screenshot(no_origin_img)
            
            with open(f"{IMG_DIR}/round4_04_no_origin_line.png", "wb") as f:
                f.write(no_origin_img)
            
            # 关键检查：分析左上角区域（原点附近）是否有非预期的线条
            # 我们绘制的是右上角的线，如果左上角也有亮像素，说明有原点连线
            img_check = Image.open(io.BytesIO(no_origin_img))
            img_check = img_check.convert('RGB')
            pixels_check = img_check.load()
            
            # 检查左上角区域（原点附近，大约屏幕中心区域是原点）
            center_x = img_check.width // 2
            center_y = img_check.height // 2
            
            # 检查从中心到右上角的区域应该有亮像素（我们绘制的线）
            # 但从中心到左上角不应该有亮像素（如果有就是原点连线）
            
            origin_area_bright = 0
            draw_area_bright = 0
            
            for y in range(center_y - 50, center_y + 50, 4):
                for x in range(center_x - 200, center_x + 300, 4):
                    if 0 <= x < img_check.width and 0 <= y < img_check.height:
                        r, g, b = pixels_check[x, y]
                        bright = max(r, g, b)
                        if bright > 50:
                            if x < center_x:  # 原点左侧
                                origin_area_bright += 1
                            else:  # 原点右侧（我们绘制的区域）
                                draw_area_bright += 1
            
            # 我们绘制的是右上角的线，所以：
            # - 原点右侧(center_x ~ 右上角)应该有亮像素 ✅
            # - 原点左侧不应该有亮像素（除非有原点连线）❌
            
            if origin_area_bright > 100:
                log_test("4. 原点连线检查", False, 
                        f"原点左侧有 {origin_area_bright} 个亮像素，可能存在原点连线！"
                        f"绘制区域亮像素: {draw_area_bright}")
                results.append(("原点连线检查", False, 
                              f"原点左侧亮像素: {origin_area_bright}, 可能存在原点连线"))
            elif draw_area_bright > 50:
                log_test("4. 原点连线检查", True, 
                        f"原点左侧无异常亮像素({origin_area_bright})，"
                        f"绘制区域正常({draw_area_bright})")
                results.append(("原点连线检查", True, "无原点连线"))
            else:
                log_test("4. 原点连线检查", False, 
                        f"绘制区域亮像素不足: {draw_area_bright}，线条可能不可见")
                results.append(("原点连线检查", False, f"绘制区域亮像素: {draw_area_bright}"))
                
        except Exception as e:
            log_test("4. 原点连线检查", False, str(e))
            results.append(("原点连线检查", False, str(e)))
        
        # ========== 测试5: 绘制不经过原点的封闭形状 ==========
        print("\n⭕ 测试不经过原点的绘制...")
        try:
            # 清空
            clear_btn = page.locator("#clearBtn").first
            if clear_btn.is_visible():
                clear_btn.click()
                time.sleep(0.5)
            
            # 重置深度
            depth_slider = page.locator("#depthSlider").first
            depth_slider.fill("0")
            time.sleep(0.5)
            
            # 绘制一个不经过原点的三角形（在屏幕右上角）
            cx = box["x"] + box["width"] * 0.75
            cy = box["y"] + box["height"] * 0.3
            size = 80
            
            # 顶点1
            page.mouse.move(cx, cy - size)
            page.mouse.down()
            
            # 顶点2
            page.mouse.move(cx + size, cy + size)
            time.sleep(0.05)
            
            # 顶点3
            page.mouse.move(cx - size, cy + size)
            time.sleep(0.05)
            
            # 回到顶点1
            page.mouse.move(cx, cy - size)
            time.sleep(0.05)
            
            page.mouse.up()
            time.sleep(1)
            
            triangle_img = page.screenshot()
            triangle = analyze_screenshot(triangle_img)
            
            with open(f"{IMG_DIR}/round4_05_triangle.png", "wb") as f:
                f.write(triangle_img)
            
            # 检查：三角形应该在右上角，不应该有从原点到三角形的连线
            img_tri = Image.open(io.BytesIO(triangle_img))
            img_tri = img_tri.convert('RGB')
            pixels_tri = img_tri.load()
            
            center_x2 = img_tri.width // 2
            center_y2 = img_tri.height // 2
            
            # 检查从原点(屏幕中心)到三角形左上角之间的区域
            # 如果有原点连线，这条线上会有连续的亮像素
            mid_bright = 0
            for y in range(center_y2 - 30, center_y2 + 30, 3):
                for x in range(center_x2, center_x2 + 200, 3):
                    if 0 <= x < img_tri.width and 0 <= y < img_tri.height:
                        r, g, b = pixels_tri[x, y]
                        if max(r, g, b) > 40:
                            mid_bright += 1
            
            # 三角形区域的亮像素
            tri_bright = 0
            for y in range(int(cy - size - 20), int(cy + size + 20), 3):
                for x in range(int(cx - size - 20), int(cx + size + 20), 3):
                    if 0 <= x < img_tri.width and 0 <= y < img_tri.height:
                        r, g, b = pixels_tri[x, y]
                        if max(r, g, b) > 40:
                            tri_bright += 1
            
            # 如果中间区域有大量连续亮像素，可能是原点连线
            # 但如果三角形区域亮像素更多，说明主要是三角形
            if mid_bright > tri_bright * 0.5 and mid_bright > 100:
                log_test("5. 无额外连线检查", False, 
                        f"中间区域亮像素: {mid_bright}, 三角形区域: {tri_bright},"
                        f"可能存在从原点到三角形的连线")
                results.append(("无额外连线检查", False, f"中间亮像素: {mid_bright}"))
            elif tri_bright > 50:
                log_test("5. 无额外连线检查", True, 
                        f"三角形区域亮像素: {tri_bright}, 无明显原点连线")
                results.append(("无额外连线检查", True, f"三角形亮像素: {tri_bright}"))
            else:
                log_test("5. 无额外连线检查", False, 
                        f"三角形亮像素不足: {tri_bright}")
                results.append(("无额外连线检查", False, f"三角形亮像素: {tri_bright}"))
                
        except Exception as e:
            log_test("5. 无额外连线检查", False, str(e))
            results.append(("无额外连线检查", False, str(e)))
        
        # ========== 测试6: 右键旋转视角 ==========
        print("\n🔄 测试3D视角旋转...")
        try:
            # 先清空
            clear_btn = page.locator("#clearBtn").first
            if clear_btn.is_visible():
                clear_btn.click()
                time.sleep(0.5)
            
            # 绘制一条线
            depth_slider = page.locator("#depthSlider").first
            depth_slider.fill("0")
            time.sleep(0.5)
            
            start_x = box["x"] + 200
            start_y = box["y"] + box["height"] / 2
            end_x = box["x"] + box["width"] - 200
            end_y = box["y"] + box["height"] / 2
            
            page.mouse.move(start_x, start_y)
            page.mouse.down()
            for i in range(30):
                t = i / 30
                x = start_x + (end_x - start_x) * t
                page.mouse.move(x, start_y)
                time.sleep(0.02)
            page.mouse.up()
            time.sleep(0.5)
            
            # 右键旋转
            page.mouse.move(box["x"] + box["width"] / 2, box["y"] + box["height"] / 2)
            page.mouse.down(button="right")
            for i in range(15):
                page.mouse.move(
                    box["x"] + box["width"] / 2 + i * 5,
                    box["y"] + box["height"] / 2 - i * 3
                )
                time.sleep(0.05)
            page.mouse.up(button="right")
            time.sleep(1)
            
            rotate_img = page.screenshot()
            rotate = analyze_screenshot(rotate_img)
            
            with open(f"{IMG_DIR}/round4_06_rotate.png", "wb") as f:
                f.write(rotate_img)
            
            if rotate['non_black_pixels'] > 5000:
                log_test("6. 3D视角旋转", True, "旋转后场景可见")
                results.append(("3D视角旋转", True, "正常"))
            else:
                log_test("6. 3D视角旋转", False, "旋转后场景异常")
                results.append(("3D视角旋转", False, "异常"))
                
        except Exception as e:
            log_test("6. 3D视角旋转", False, str(e))
            results.append(("3D视角旋转", False, str(e)))
        
        # ========== 测试7: 控制台错误检查 ==========
        print("\n⚠️  检查控制台错误...")
        if len(console_errors) == 0:
            log_test("7. 控制台错误", True, "无错误")
            results.append(("控制台错误", True, "无"))
        else:
            log_test("7. 控制台错误", False, f"{len(console_errors)} 个错误")
            results.append(("控制台错误", False, f"{len(console_errors)} 个"))
            for err in console_errors[:5]:
                print(f"    {err}")
        
        # 最终截图
        final_img = page.screenshot()
        with open(f"{IMG_DIR}/round4_07_final.png", "wb") as f:
            f.write(final_img)
        
        browser.close()
    
    # 总结
    print("\n" + "="*100)
    print("📊 第4轮测试总结")
    print("="*100)
    
    passed = sum(1 for r in results if r[1])
    total = len(results)
    
    print(f"\n通过: {passed}/{total} ({passed/total*100:.1f}%)")
    print(f"失败: {total-passed}/{total}\n")
    
    for name, status, detail in results:
        icon = "✅" if status else "❌"
        print(f"  {icon} {name}: {detail}")
    
    print(f"\n📸 截图已保存至: {IMG_DIR}")
    print("\n" + "="*100 + "\n")
    
    return results, console_errors

if __name__ == "__main__":
    results, errors = run_tests()
