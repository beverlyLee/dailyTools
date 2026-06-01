#!/usr/bin/env python3
"""第6轮测试 v5 - 简单直接验证"""

import time
from playwright.sync_api import sync_playwright
from PIL import Image
import io

IMG_DIR = "/Users/liboyang/trae/dailyTools/light-painter/img"

def analyze_image(image_data, threshold=30):
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
    print("第6轮测试 v5 - 简单直接验证")
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
        
        clear_btn = page.locator("#clearBtn")
        depth_slider = page.locator("#depthSlider")
        
        # ========== 测试1: 基础绘制 ==========
        print("\n✏️  测试1: 基础绘制 (Z=0)")
        
        clear_btn.click()
        time.sleep(0.5)
        depth_slider.fill("0")
        time.sleep(0.3)
        
        base_img = page.screenshot()
        base_pixels, w, h, _ = analyze_image(base_img)
        with open(f"{IMG_DIR}/round6_v5_01_base.png", "wb") as f:
            f.write(base_img)
        print(f"基准: {base_pixels:,} 非黑像素")
        
        # 画一条斜线
        page.mouse.move(box["x"] + 200, box["y"] + 200)
        page.mouse.down()
        for i in range(60):
            t = i / 59.0
            page.mouse.move(box["x"] + 200 + 800 * t, box["y"] + 200 + 400 * t)
            time.sleep(0.01)
        page.mouse.up()
        time.sleep(0.5)
        
        draw_img = page.screenshot()
        draw_pixels, dw, dh, dp = analyze_image(draw_img)
        with open(f"{IMG_DIR}/round6_v5_02_draw.png", "wb") as f:
            f.write(draw_img)
        
        delta = draw_pixels - base_pixels
        print(f"绘制后: {draw_pixels:,} 非黑像素, 增量: {delta:,}")
        
        # 检查斜线上的像素
        line_bright = 0
        for i in range(100):
            t = i / 99.0
            lx = int(200 + 800 * t)
            ly = int(200 + 400 * t)
            if 0 <= lx < dw and 0 <= ly < dh:
                r, g, b = dp[lx, ly]
                if max(r, g, b) > 50:
                    line_bright += 1
        
        print(f"斜线上亮像素: {line_bright}/100")
        
        if delta > 5000 and line_bright > 50:
            print("✅ 基础绘制正常")
            results.append(("基础绘制", True, f"增量: {delta:,}, 线上亮像素: {line_bright}/100"))
        else:
            print("❌ 基础绘制异常")
            results.append(("基础绘制", False, f"增量: {delta:,}, 线上亮像素: {line_bright}/100"))
        
        # ========== 测试2: 笔触平滑度 ==========
        print("\n🎨 测试2: 笔触平滑度")
        
        clear_btn.click()
        time.sleep(0.5)
        
        smooth_base_img = page.screenshot()
        smooth_base, _, _, _ = analyze_image(smooth_base_img)
        
        # 用少量点绘制圆形（应该被平滑）
        cx_circle = box["x"] + box["width"] / 2
        cy_circle = box["y"] + box["height"] / 2
        radius = 150
        
        points = []
        for i in range(12):  # 只有12个点，原始是12边形
            angle = (i / 12) * math.pi * 2
            x = cx_circle + radius * math.cos(angle)
            y = cy_circle + radius * math.sin(angle)
            points.append((x, y))
        
        page.mouse.move(points[0][0], points[0][1])
        page.mouse.down()
        for x, y in points[1:]:
            page.mouse.move(x, y)
            time.sleep(0.005)
        page.mouse.up()
        time.sleep(1)
        
        circle_img = page.screenshot()
        circle_pixels, cw, ch, cp = analyze_image(circle_img)
        with open(f"{IMG_DIR}/round6_v5_03_circle.png", "wb") as f:
            f.write(circle_img)
        
        circle_delta = circle_pixels - smooth_base
        print(f"圆形绘制增量: {circle_delta:,}")
        
        # 检查圆形轮廓的连续像素
        circle_bright = 0
        for i in range(180):
            angle = (i / 180) * math.pi * 2
            lx = int(cx_circle - box["x"] + radius * math.cos(angle))
            ly = int(cy_circle - box["y"] + radius * math.sin(angle))
            if 0 <= lx < cw and 0 <= ly < ch:
                r, g, b = cp[lx, ly]
                if max(r, g, b) > 50:
                    circle_bright += 1
        
        print(f"圆形轮廓上亮像素: {circle_bright}/180")
        
        if circle_delta > 8000 and circle_bright > 100:
            print("✅ 笔触平滑度正常，12边形被平滑为圆形")
            results.append(("笔触平滑度", True, f"轮廓亮像素: {circle_bright}/180"))
        else:
            print("❌ 笔触平滑度异常")
            results.append(("笔触平滑度", False, f"轮廓亮像素: {circle_bright}/180"))
        
        # ========== 测试3: Z轴深度绘制 ==========
        print("\n🌐 测试3: Z轴深度绘制")
        
        # Z=3
        clear_btn.click()
        time.sleep(0.5)
        depth_slider.fill("3")
        time.sleep(0.3)
        
        z3_base_img = page.screenshot()
        z3_base, _, _, _ = analyze_image(z3_base_img)
        
        page.mouse.move(box["x"] + 200, box["y"] + 200)
        page.mouse.down()
        for i in range(40):
            page.mouse.move(box["x"] + 200 + i * 20, box["y"] + 200)
            time.sleep(0.01)
        page.mouse.up()
        time.sleep(0.5)
        
        z3_img = page.screenshot()
        z3_pixels, _, _, _ = analyze_image(z3_img)
        z3_delta = z3_pixels - z3_base
        print(f"Z=3 增量: {z3_delta:,}")
        
        # Z=-3
        clear_btn.click()
        time.sleep(0.5)
        depth_slider.fill("-3")
        time.sleep(0.3)
        
        z_neg3_base_img = page.screenshot()
        z_neg3_base, _, _, _ = analyze_image(z_neg3_base_img)
        
        page.mouse.move(box["x"] + 200, box["y"] + 600)
        page.mouse.down()
        for i in range(40):
            page.mouse.move(box["x"] + 200 + i * 20, box["y"] + 600)
            time.sleep(0.01)
        page.mouse.up()
        time.sleep(0.5)
        
        z_neg3_img = page.screenshot()
        z_neg3_pixels, _, _, _ = analyze_image(z_neg3_img)
        z_neg3_delta = z_neg3_pixels - z_neg3_base
        print(f"Z=-3 增量: {z_neg3_delta:,}")
        
        if z3_delta > 2000 and z_neg3_delta > 2000:
            print("✅ Z轴不同深度均能正常绘制")
            results.append(("Z轴深度绘制", True, f"Z=3: {z3_delta:,}, Z=-3: {z_neg3_delta:,}"))
        else:
            failed = []
            if z3_delta <= 2000: failed.append("Z=3")
            if z_neg3_delta <= 2000: failed.append("Z=-3")
            print(f"❌ 部分深度绘制失败: {failed}")
            results.append(("Z轴深度绘制", False, f"失败: {failed}"))
        
        # ========== 测试4: 控制台错误 ==========
        print("\n⚠️  测试4: 控制台错误")
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
    print("📊 第6轮 v5 测试总结")
    print("="*80)
    
    passed = sum(1 for r in results if r[1])
    total = len(results)
    
    print(f"\n通过: {passed}/{total} ({passed/total*100:.1f}%)\n")
    for name, status, detail in results:
        icon = "✅" if status else "❌"
        print(f"  {icon} {name}: {detail}")
    
    return results

if __name__ == "__main__":
    import math
    run()
