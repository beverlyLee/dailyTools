#!/usr/bin/env python3
"""光绘画板 - 第4轮测试 v3 - 简化版"""

import time
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
    print("第4轮测试 v3 - 精确原点连线检测")
    print("="*80)
    
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
        
        page.goto("http://localhost:5220", wait_until="domcontentloaded", timeout=30000)
        time.sleep(3)
        
        # 等待canvas出现
        canvas = page.locator("canvas")
        canvas.wait_for(state="visible", timeout=10000)
        box = canvas.bounding_box()
        
        # ========== 测试1: 空画布 ==========
        print("\n📸 测试1: 空画布")
        empty_img = page.screenshot()
        with open(f"{IMG_DIR}/round4_v3_01_empty.png", "wb") as f:
            f.write(empty_img)
        empty_pixels, w, h, empty_pix = analyze_image(empty_img)
        print(f"空画布: {empty_pixels:,} 非黑像素 (阈值50)")
        
        # ========== 测试2: 绘制右上角的线 ==========
        print("\n✏️  测试2: 绘制右上角的线")
        start_x = box["x"] + box["width"] * 0.75
        start_y = box["y"] + box["height"] * 0.25
        end_x = box["x"] + box["width"] * 0.9
        end_y = box["y"] + box["height"] * 0.25
        
        page.mouse.move(start_x, start_y)
        page.mouse.down()
        for i in range(30):
            t = i / 30
            x = start_x + (end_x - start_x) * t
            y = start_y + (end_y - start_y) * t
            page.mouse.move(x, y)
            time.sleep(0.02)
        page.mouse.up()
        time.sleep(1)
        
        draw_img = page.screenshot()
        with open(f"{IMG_DIR}/round4_v3_02_drawn.png", "wb") as f:
            f.write(draw_img)
        draw_pixels, dw, dh, draw_pix = analyze_image(draw_img)
        print(f"绘制后: {draw_pixels:,} 非黑像素")
        
        # 精确检测原点连线
        cx, cy = dw//2, dh//2
        draw_start_x_scr = int((start_x - box["x"]) * 2)
        draw_start_y_scr = int((start_y - box["y"]) * 2)
        
        dx = draw_start_x_scr - cx
        dy = draw_start_y_scr - cy
        
        # 沿中心到绘制起点采样
        bright_count = 0
        origin_adjacent_bright = False
        for i in range(0, 101):
            t = i / 100.0
            lx = int(cx + dx * t)
            ly = int(cy + dy * t)
            if 0 <= lx < dw and 0 <= ly < dh:
                r, g, b = draw_pix[lx, ly]
                bright = max(r, g, b)
                if bright > 50:
                    bright_count += 1
                    if t < 0.15:
                        origin_adjacent_bright = True
        
        print(f"\n原点连线检测:")
        print(f"  沿线上亮像素: {bright_count}/101")
        print(f"  原点附近有连续亮段: {origin_adjacent_bright}")
        
        if bright_count > 30 and origin_adjacent_bright:
            print("⚠️  检测到原点连线！")
            results.append(("原点连线", False, f"沿线上{bright_count}个亮像素，原点附近有连续亮段"))
        else:
            print("✅ 无原点连线")
            results.append(("原点连线", True, "无原点连线"))
        
        # ========== 测试3: 清空后Z=2绘制 ==========
        print("\n📐 测试3: Z轴深度绘制")
        clear_btn = page.locator("#clearBtn")
        if clear_btn.is_visible():
            clear_btn.click()
            time.sleep(0.5)
        
        depth_slider = page.locator("#depthSlider")
        depth_slider.fill("2")
        time.sleep(0.5)
        
        mid_x = box["x"] + box["width"] / 2
        mid_y = box["y"] + box["height"] / 2
        
        page.mouse.move(mid_x - 200, mid_y - 100)
        page.mouse.down()
        for i in range(40):
            t = i / 40
            x = mid_x - 200 + 400 * t
            page.mouse.move(x, mid_y - 100)
            time.sleep(0.02)
        page.mouse.up()
        time.sleep(1)
        
        z2_img = page.screenshot()
        with open(f"{IMG_DIR}/round4_v3_03_z2.png", "wb") as f:
            f.write(z2_img)
        z2_pixels, _, _, _ = analyze_image(z2_img)
        z2_delta = z2_pixels - empty_pixels
        print(f"Z=2 非黑像素增量: {z2_delta:,}")
        results.append(("Z=2绘制", z2_delta > 3000, f"增量: {z2_delta:,}"))
        
        # ========== 测试4: Z=-2绘制 ==========
        print("\n📐 测试4: Z=-2绘制")
        depth_slider.fill("-2")
        time.sleep(0.5)
        
        page.mouse.move(mid_x - 200, mid_y + 100)
        page.mouse.down()
        for i in range(40):
            t = i / 40
            x = mid_x - 200 + 400 * t
            page.mouse.move(x, mid_y + 100)
            time.sleep(0.02)
        page.mouse.up()
        time.sleep(1)
        
        z_neg2_img = page.screenshot()
        with open(f"{IMG_DIR}/round4_v3_04_z_neg2.png", "wb") as f:
            f.write(z_neg2_img)
        z_neg2_pixels, _, _, _ = analyze_image(z_neg2_img)
        z_neg2_delta = z_neg2_pixels - z2_pixels
        print(f"Z=-2 非黑像素增量: {z_neg2_delta:,}")
        results.append(("Z=-2绘制", z_neg2_delta > 3000, f"增量: {z_neg2_delta:,}"))
        
        # ========== 测试5: 右键旋转 ==========
        print("\n🔄 测试5: 右键旋转视角")
        page.mouse.move(mid_x, mid_y)
        page.mouse.down(button="right")
        for i in range(20):
            page.mouse.move(mid_x + i * 8, mid_y - i * 5)
            time.sleep(0.05)
        page.mouse.up(button="right")
        time.sleep(1)
        
        rotate_img = page.screenshot()
        with open(f"{IMG_DIR}/round4_v3_05_rotated.png", "wb") as f:
            f.write(rotate_img)
        rotate_pixels, _, _, _ = analyze_image(rotate_img)
        print(f"旋转后: {rotate_pixels:,} 非黑像素")
        results.append(("视角旋转", rotate_pixels > 5000, "旋转后可见"))
        
        # ========== 测试6: 控制台错误 ==========
        print("\n⚠️  测试6: 控制台错误")
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
    print("📊 第4轮 v3 测试总结")
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
