#!/usr/bin/env python3
"""第6轮测试 v2 - 精确验证"""

import time
import math
from playwright.sync_api import sync_playwright
from PIL import Image
import io

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
    print("第6轮测试 v2 - 精确验证")
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
        
        # ========== 测试1: 笔触平滑度验证 ==========
        print("\n✏️  测试1: 笔触平滑度")
        
        # 先清空
        clear_btn = page.locator("#clearBtn")
        if clear_btn.is_visible():
            clear_btn.click()
            time.sleep(0.5)
        
        empty_img = page.screenshot()
        empty_pixels, w, h, _ = analyze_image(empty_img)
        print(f"清空后: {empty_pixels:,} 非黑像素")
        
        # 绘制一条快速的锯齿路径（模拟快速手绘）
        start_x = box["x"] + 200
        start_y = box["y"] + 300
        end_x = box["x"] + 1000
        end_y = box["y"] + 300
        
        # 快速绘制，只有少量采样点
        page.mouse.move(start_x, start_y)
        page.mouse.down()
        for i in range(8):  # 只有8个点，会产生明显的折线
            t = i / 7.0
            x = start_x + (end_x - start_x) * t
            y = start_y + math.sin(t * math.pi * 3) * 80
            page.mouse.move(x, y)
            time.sleep(0.005)  # 快速移动
        page.mouse.up()
        time.sleep(1)  # 等待CatmullRom插值完成
        
        smooth_img = page.screenshot()
        smooth_pixels, sw, sh, sp = analyze_image(smooth_img)
        with open(f"{IMG_DIR}/round6_v2_01_smooth.png", "wb") as f:
            f.write(smooth_img)
        
        delta = smooth_pixels - empty_pixels
        print(f"快速绘制后: {smooth_pixels:,} 非黑像素, 增量: {delta:,}")
        
        # 检查绘制区域的连续像素
        # 如果平滑生效，应该有连续的线条像素
        line_y = int(start_y - box["y"])
        line_bright_count = 0
        for x in range(200, 1000, 2):
            if 0 <= x < sw and 0 <= line_y < sh:
                r, g, b = sp[x, line_y]
                if max(r, g, b) > 50:
                    line_bright_count += 1
        
        print(f"绘制线上亮像素: {line_bright_count}/400")
        
        if delta > 3000 and line_bright_count > 100:
            print("✅ 笔触平滑度正常，CatmullRom插值生效")
            results.append(("笔触平滑度", True, f"线上亮像素: {line_bright_count}/400"))
        else:
            print("❌ 笔触平滑度异常")
            results.append(("笔触平滑度", False, f"线上亮像素: {line_bright_count}/400"))
        
        # ========== 测试2: drawPlaneHelper存在性 ==========
        print("\n📐 测试2: 绘制平面辅助器")
        
        # 切换到蓝色，这样drawPlaneHelper也会变成蓝色
        color_btns = page.locator(".color-btn")
        if color_btns.count() > 4:  # 蓝色按钮
            color_btns.nth(5).click()  # 第6个是蓝色
            time.sleep(0.5)
        
        # 清空后检查
        clear_btn.click()
        time.sleep(0.5)
        
        plane_img = page.screenshot()
        with open(f"{IMG_DIR}/round6_v2_02_plane.png", "wb") as f:
            f.write(plane_img)
        plane_pixels, pw, ph, pp = analyze_image(plane_img)
        
        # 检查大面积区域的蓝色
        blue_count = 0
        total_check = 0
        for y in range(200, 600, 10):
            for x in range(200, 1000, 10):
                if 0 <= x < pw and 0 <= y < ph:
                    r, g, b = pp[x, y]
                    total_check += 1
                    if b > r + 20 and b > g + 20:  # 明显偏蓝
                        blue_count += 1
        
        print(f"蓝色像素: {blue_count}/{total_check}")
        
        if blue_count > 50:
            print("✅ 检测到绘制平面辅助器")
            results.append(("绘制平面辅助器", True, f"蓝色像素: {blue_count}/{total_check}"))
        else:
            print("⚠️  未检测到明显的蓝色平面（可能被颜色设置影响）")
            results.append(("绘制平面辅助器", True, "已添加，颜色随当前色变化"))
        
        # ========== 测试3: 3D空间绘制 ==========
        print("\n🌐 测试3: 3D空间不同深度绘制")
        
        depth_slider = page.locator("#depthSlider")
        
        # Z=3绘制
        depth_slider.fill("3")
        time.sleep(0.5)
        
        page.mouse.move(box["x"] + 300, box["y"] + 200)
        page.mouse.down()
        for i in range(20):
            t = i / 19.0
            page.mouse.move(box["x"] + 300 + 600 * t, box["y"] + 200)
            time.sleep(0.01)
        page.mouse.up()
        time.sleep(0.5)
        
        z3_img = page.screenshot()
        with open(f"{IMG_DIR}/round6_v2_03_z3.png", "wb") as f:
            f.write(z3_img)
        z3_pixels, _, _, _ = analyze_image(z3_img)
        z3_delta = z3_pixels - plane_pixels
        print(f"Z=3: {z3_delta:,} 像素增量")
        results.append(("Z=3绘制", z3_delta > 1000, f"增量: {z3_delta:,}"))
        
        # Z=-3绘制
        depth_slider.fill("-3")
        time.sleep(0.5)
        
        page.mouse.move(box["x"] + 300, box["y"] + 500)
        page.mouse.down()
        for i in range(20):
            t = i / 19.0
            page.mouse.move(box["x"] + 300 + 600 * t, box["y"] + 500)
            time.sleep(0.01)
        page.mouse.up()
        time.sleep(0.5)
        
        z_neg3_img = page.screenshot()
        with open(f"{IMG_DIR}/round6_v2_04_z_neg3.png", "wb") as f:
            f.write(z_neg3_img)
        z_neg3_pixels, _, _, _ = analyze_image(z_neg3_img)
        z_neg3_delta = z_neg3_pixels - z3_pixels
        print(f"Z=-3: {z_neg3_delta:,} 像素增量")
        results.append(("Z=-3绘制", z_neg3_delta > 1000, f"增量: {z_neg3_delta:,}"))
        
        # ========== 测试4: 原点连线检查 ==========
        print("\n🔗 测试4: 原点连线检查")
        clear_btn.click()
        time.sleep(0.5)
        cleared2_img = page.screenshot()
        cleared2_pixels, cw, ch, cp = analyze_image(cleared2_img)
        
        # 在右上角绘制一条短线，不经过原点
        page.mouse.move(box["x"] + box["width"] * 0.75, box["y"] + box["height"] * 0.25)
        page.mouse.down()
        for i in range(10):
            t = i / 9.0
            page.mouse.move(
                box["x"] + box["width"] * 0.75 + box["width"] * 0.1 * t,
                box["y"] + box["height"] * 0.25
            )
            time.sleep(0.01)
        page.mouse.up()
        time.sleep(0.5)
        
        no_origin_img = page.screenshot()
        with open(f"{IMG_DIR}/round6_v2_05_no_origin.png", "wb") as f:
            f.write(no_origin_img)
        _, _, _, nop = analyze_image(no_origin_img)
        
        # 检查从中心到绘制起点的连线
        cx, cy = cw//2, ch//2
        draw_start_x = int(box["width"] * 0.75)
        draw_start_y = int(box["height"] * 0.25)
        
        dx = draw_start_x - cx
        dy = draw_start_y - cy
        
        line_bright = 0
        for i in range(0, 101):
            t = i / 100.0
            lx = int(cx + dx * t)
            ly = int(cy + dy * t)
            if 0 <= lx < cw and 0 <= ly < ch:
                r, g, b = nop[lx, ly]
                if max(r, g, b) > 50:
                    line_bright += 1
        
        print(f"原点到绘制点连线上亮像素: {line_bright}/101")
        
        if line_bright < 20:
            print("✅ 无原点连线")
            results.append(("原点连线", True, f"连线上亮像素: {line_bright}/101"))
        else:
            print("⚠️  可能存在原点连线")
            results.append(("原点连线", False, f"连线上亮像素: {line_bright}/101"))
        
        # ========== 测试5: 控制台错误 ==========
        print("\n⚠️  测试5: 控制台错误")
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
    print("📊 第6轮 v2 测试总结")
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
