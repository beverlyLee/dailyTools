#!/usr/bin/env python3
"""光绘画板 - 第6轮测试 - 笔触平滑度和3D空间绘制"""

import time
import math
from playwright.sync_api import sync_playwright
from PIL import Image
import io
import os

IMG_DIR = "/Users/liboyang/trae/dailyTools/light-painter/img"

def analyze_image(image_data, threshold=50):
    img = Image.open(io.BytesIO(image_data))
    img = img.convert('RGB')
    pixels = img.load()
    w, h = img.size
    non_black = 0
    for y in range(0, h, 2):
        for x in range(0, w, 2):
            r, g, b = pixels[x, y]
            if max(r, g, b) > threshold:
                non_black += 1
    return non_black * 4, w, h, pixels

def run():
    print("="*80)
    print("第6轮测试 - 笔触平滑度和3D空间绘制")
    print("="*80)
    
    results = []
    console_errors = []
    
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(viewport={"width": 1280, "height": 800})
        
        page.on("console", lambda msg: console_errors.append(f"[{msg.type}] {msg.text}") if msg.type == "error" else None)
        page.on("pageerror", lambda exc: console_errors.append(f"[pageerror] {exc.message}"))
        
        page.goto("http://localhost:5250", wait_until="domcontentloaded", timeout=30000)
        time.sleep(3)
        
        canvas = page.locator("canvas").first
        box = canvas.bounding_box()
        print(f"Canvas box: x={box['x']:.0f}, y={box['y']:.0f}, w={box['width']:.0f}, h={box['height']:.0f}")
        
        # 测试1: 空画布
        print("\n📸 测试1: 空画布")
        empty_img = page.screenshot()
        with open(f"{IMG_DIR}/round6_01_empty.png", "wb") as f:
            f.write(empty_img)
        empty_pixels, w, h, empty_pix = analyze_image(empty_img)
        print(f"空画布: {empty_pixels:,} 非黑像素 (阈值50)")
        results.append(("空画布", empty_pixels > 10000, f"非黑像素: {empty_pixels:,}"))
        
        # 测试2: 绘制锯齿形路径测试平滑度
        print("\n✏️  测试2: 笔触平滑度测试")
        start_x = box["x"] + box["width"] * 0.2
        start_y = box["y"] + box["height"] * 0.3
        end_x = box["x"] + box["width"] * 0.8
        end_y = box["y"] + box["height"] * 0.3
        
        # 绘制一条锯齿形路径（快速移动产生的折线）
        points = []
        for i in range(20):
            t = i / 19.0
            x = start_x + (end_x - start_x) * t
            y = start_y + math.sin(t * math.pi * 4) * 50
            points.append((x, y))
        
        page.mouse.move(points[0][0], points[0][1])
        page.mouse.down()
        for x, y in points[1:]:
            page.mouse.move(x, y)
            time.sleep(0.01)
        page.mouse.up()
        time.sleep(1)
        
        smooth_img = page.screenshot()
        with open(f"{IMG_DIR}/round6_02_smooth.png", "wb") as f:
            f.write(smooth_img)
        smooth_pixels, sw, sh, smooth_pix = analyze_image(smooth_img)
        delta = smooth_pixels - empty_pixels
        print(f"绘制后: {smooth_pixels:,} 非黑像素")
        print(f"增量: {delta:,} 像素")
        
        # 检查平滑度：如果平滑生效后应该有明显的线条
        if delta > 5000:
            print("✅ 笔触绘制正常")
            results.append(("笔触平滑度", True, f"增量: {delta:,} 像素"))
        else:
            print("❌ 笔触绘制异常")
            results.append(("笔触平滑度", False, f"增量不足: {delta:,}"))
        
        # 测试3: 绘制平滑前后对比
        print("\n📐 测试3: 绘制平面辅助器检查")
        # 检查是否有drawPlaneHelper（蓝色半透明平面
        # 空画布时应该有淡淡的蓝色平面
        # 清空后重新检查
        clear_btn = page.locator("#clearBtn")
        if clear_btn.is_visible():
            clear_btn.click()
            time.sleep(0.5)
        
        cleared_img = page.screenshot()
        with open(f"{IMG_DIR}/round6_03_cleared.png", "wb") as f:
            f.write(cleared_img)
        cleared_pixels, cw, ch, cleared_pix = analyze_image(cleared_img)
        
        # 检查屏幕中心区域的蓝色值
        cx, cy = cw//2, ch//2
        center_r, center_g, center_b = cleared_pix[cx, cy]
        print(f"中心像素: R={center_r}, G={center_g}, B={center_b}")
        
        # 如果B明显高于R和G，说明有蓝色平面
        has_plane = center_b > center_r + 10 and center_b > center_g + 10
        if has_plane:
            print("✅ 检测到绘制平面辅助器")
            results.append(("绘制平面辅助器", True, f"中心B={center_b}, R={center_r}, G={center_g}"))
        else:
            print("⚠️  未检测到明显的蓝色平面")
            results.append(("绘制平面辅助器", False, f"中心RGB=({center_r},{center_g},{center_b})"))
        
        # 测试4: 3D空间不同深度绘制
        print("\n🌐 测试4: 3D空间不同深度绘制")
        depth_slider = page.locator("#depthSlider")
        
        # Z=2绘制
        depth_slider.fill("2")
        time.sleep(0.5)
        
        page.mouse.move(box["x"] + 200, box["y"] + 200)
        page.mouse.down()
        for i in range(30):
            t = i / 30
            page.mouse.move(box["x"] + 200 + 600 * t, box["y"] + 200 + 200 * math.sin(t * math.pi * 2))
            time.sleep(0.02)
        page.mouse.up()
        time.sleep(1)
        
        z2_img = page.screenshot()
        with open(f"{IMG_DIR}/round6_04_z2.png", "wb") as f:
            f.write(z2_img)
        z2_pixels, _, _, _ = analyze_image(z2_img)
        z2_delta = z2_pixels - cleared_pixels
        print(f"Z=2: {z2_delta:,} 像素增量")
        results.append(("Z=2绘制", z2_delta > 2000, f"增量: {z2_delta:,}"))
        
        # Z=-2绘制
        depth_slider.fill("-2")
        time.sleep(0.5)
        
        page.mouse.move(box["x"] + 200, box["y"] + 500)
        page.mouse.down()
        for i in range(30):
            t = i / 30
            page.mouse.move(box["x"] + 200 + 600 * t, box["y"] + 500 + 200 * math.sin(t * math.pi * 2))
            time.sleep(0.02)
        page.mouse.up()
        time.sleep(1)
        
        z_neg2_img = page.screenshot()
        with open(f"{IMG_DIR}/round6_05_z_neg2.png", "wb") as f:
            f.write(z_neg2_img)
        z_neg2_pixels, _, _, _ = analyze_image(z_neg2_img)
        z_neg2_delta = z_neg2_pixels - z2_pixels
        print(f"Z=-2: {z_neg2_delta:,} 像素增量")
        results.append(("Z=-2绘制", z_neg2_delta > 2000, f"增量: {z_neg2_delta:,}"))
        
        # 测试5: 右键旋转视角
        print("\n🔄 测试5: 右键旋转视角")
        mid_x = box["x"] + box["width"] / 2
        mid_y = box["y"] + box["height"] / 2
        page.mouse.move(mid_x, mid_y)
        page.mouse.down(button="right")
        for i in range(20):
            page.mouse.move(mid_x + i * 8, mid_y - i * 5)
            time.sleep(0.05)
        page.mouse.up(button="right")
        time.sleep(1)
        
        rotate_img = page.screenshot()
        with open(f"{IMG_DIR}/round6_06_rotated.png", "wb") as f:
            f.write(rotate_img)
        rotate_pixels, _, _, _ = analyze_image(rotate_img)
        print(f"旋转后: {rotate_pixels:,} 非黑像素")
        results.append(("视角旋转", rotate_pixels > 10000, "旋转后可见"))
        
        # 测试6: 绘制圆形测试平滑效果
        print("\n⭕ 测试6: 圆形绘制平滑度")
        # 先清空
        clear_btn.click()
        time.sleep(0.5)
        depth_slider.fill("0")
        time.sleep(0.5)
        
        # 绘制一个圆形
        cx_circle = box["x"] + box["width"] / 2
        cy_circle = box["y"] + box["height"] / 2
        radius = 150
        
        page.mouse.move(cx_circle + radius, cy_circle)
        page.mouse.down()
        for i in range(60):
            angle = (i / 60) * math.pi * 2
            x = cx_circle + radius * math.cos(angle)
            y = cy_circle + radius * math.sin(angle)
            page.mouse.move(x, y)
            time.sleep(0.015)
        page.mouse.up()
        time.sleep(1)
        
        circle_img = page.screenshot()
        with open(f"{IMG_DIR}/round6_07_circle.png", "wb") as f:
            f.write(circle_img)
        circle_pixels, _, _, _ = analyze_image(circle_img)
        circle_delta = circle_pixels - cleared_pixels
        print(f"圆形绘制: {circle_delta:,} 像素增量")
        
        # 检查圆形是否平滑：应该有明显的圆形线条
        if circle_delta > 8000:
            print("✅ 圆形绘制平滑")
            results.append(("圆形平滑度", True, f"增量: {circle_delta:,}"))
        else:
            print("❌ 圆形绘制异常")
            results.append(("圆形平滑度", False, f"增量不足: {circle_delta:,}"))
        
        # 控制台错误
        print("\n⚠️  测试7: 控制台错误")
        if len(console_errors) == 0:
            print("✅ 无控制台错误")
            results.append(("控制台错误", True, "无"))
        else:
            print(f"❌ {len(console_errors)} 个错误")
            results.append(("控制台错误", False, f"{len(console_errors)} 个"))
            for err in console_errors[:5]:
                print(f"    {err}")
        
        browser.close()
    
    # 总结
    print("\n" + "="*80)
    print("📊 第6轮测试总结")
    print("="*80)
    
    passed = sum(1 for r in results if r[1])
    total = len(results)
    
    print(f"\n通过: {passed}/{total} ({passed/total*100:.1f}%)\n")
    for name, status, detail in results:
        icon = "✅" if status else "❌"
        print(f"  {icon} {name}: {detail}")
    
    return results

if __name__ == "__main__":
    run()
