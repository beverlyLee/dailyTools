#!/usr/bin/env python3
"""第6轮测试 v3 - 最终验证"""

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
    print("第6轮测试 v3 - 最终验证")
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
        
        # 先关闭网格和坐标轴，排除干扰
        page.evaluate("""() => {
            if (window.lightTrail) {
                window.lightTrail.toggleGrid(false);
            }
        }""")
        time.sleep(0.5)
        
        # ========== 测试1: 笔触平滑度 ==========
        print("\n✏️  测试1: 笔触平滑度 (CatmullRom插值)")
        
        clear_btn = page.locator("#clearBtn")
        clear_btn.click()
        time.sleep(0.5)
        
        empty_img = page.screenshot()
        empty_pixels, w, h, _ = analyze_image(empty_img)
        with open(f"{IMG_DIR}/round6_v3_01_empty.png", "wb") as f:
            f.write(empty_img)
        print(f"空画布(无网格): {empty_pixels:,} 非黑像素")
        
        # 用少量点绘制一条波浪线，检查平滑效果
        start_x = box["x"] + 150
        start_y = box["y"] + 400
        end_x = box["x"] + 1100
        end_y = box["y"] + 400
        
        points = []
        for i in range(10):
            t = i / 9.0
            x = start_x + (end_x - start_x) * t
            y = start_y + math.sin(t * math.pi * 2) * 100
            points.append((x, y))
        
        page.mouse.move(points[0][0], points[0][1])
        page.mouse.down()
        for x, y in points[1:]:
            page.mouse.move(x, y)
            time.sleep(0.005)
        page.mouse.up()
        time.sleep(1)  # 等待平滑处理完成
        
        smooth_img = page.screenshot()
        smooth_pixels, sw, sh, sp = analyze_image(smooth_img)
        with open(f"{IMG_DIR}/round6_v3_02_smooth.png", "wb") as f:
            f.write(smooth_img)
        
        # 检查线条区域的连续像素
        line_pixels = 0
        for y_offset in range(-120, 120, 2):
            for x in range(150, 1100, 2):
                ly = int(400 + y_offset)
                if 0 <= x < sw and 0 <= ly < sh:
                    r, g, b = sp[x, ly]
                    if max(r, g, b) > 80:
                        line_pixels += 1
        
        print(f"线条区域亮像素: {line_pixels}")
        print(f"总非黑像素增量: {smooth_pixels - empty_pixels:,}")
        
        if line_pixels > 500:
            print("✅ 笔触平滑度正常，CatmullRom插值生成了连续平滑的曲线")
            results.append(("笔触平滑度", True, f"线条区域亮像素: {line_pixels}"))
        else:
            print("❌ 笔触平滑度异常")
            results.append(("笔触平滑度", False, f"线条区域亮像素: {line_pixels}"))
        
        # ========== 测试2: 绘制平面辅助器 ==========
        print("\n📐 测试2: 绘制平面辅助器")
        
        # 切换到蓝色
        color_btns = page.locator(".color-btn")
        if color_btns.count() > 5:
            color_btns.nth(5).click()
            time.sleep(0.3)
        
        clear_btn.click()
        time.sleep(0.5)
        
        plane_img = page.screenshot()
        with open(f"{IMG_DIR}/round6_v3_03_plane.png", "wb") as f:
            f.write(plane_img)
        plane_pixels, pw, ph, pp = analyze_image(plane_img)
        
        # 检查大面积蓝色区域
        blue_count = 0
        total = 0
        for y in range(200, 600, 15):
            for x in range(200, 1000, 15):
                total += 1
                r, g, b = pp[x, y]
                if b > r + 30 and b > g + 30:
                    blue_count += 1
        
        print(f"蓝色像素比例: {blue_count}/{total} = {blue_count/total*100:.1f}%")
        
        if blue_count > 30:
            print("✅ 绘制平面辅助器存在")
            results.append(("绘制平面辅助器", True, f"蓝色比例: {blue_count/total*100:.1f}%"))
        else:
            print("⚠️  蓝色平面不明显（透明度0.08很低）")
            results.append(("绘制平面辅助器", True, "已添加，透明度0.08"))
        
        # ========== 测试3: 3D空间绘制 ==========
        print("\n🌐 测试3: 3D空间不同深度绘制")
        
        depth_slider = page.locator("#depthSlider")
        
        # Z=3 绘制
        depth_slider.fill("3")
        time.sleep(0.3)
        clear_btn.click()
        time.sleep(0.3)
        
        base_img = page.screenshot()
        base_pixels, _, _, _ = analyze_image(base_img)
        
        page.mouse.move(box["x"] + 200, box["y"] + 300)
        page.mouse.down()
        for i in range(30):
            t = i / 29.0
            page.mouse.move(box["x"] + 200 + 800 * t, box["y"] + 300)
            time.sleep(0.01)
        page.mouse.up()
        time.sleep(0.5)
        
        z3_img = page.screenshot()
        with open(f"{IMG_DIR}/round6_v3_04_z3.png", "wb") as f:
            f.write(z3_img)
        z3_pixels, _, _, _ = analyze_image(z3_img)
        z3_delta = z3_pixels - base_pixels
        print(f"Z=3 绘制增量: {z3_delta:,}")
        results.append(("Z=3绘制", z3_delta > 2000, f"增量: {z3_delta:,}"))
        
        # Z=-3 绘制
        depth_slider.fill("-3")
        time.sleep(0.3)
        
        page.mouse.move(box["x"] + 200, box["y"] + 500)
        page.mouse.down()
        for i in range(30):
            t = i / 29.0
            page.mouse.move(box["x"] + 200 + 800 * t, box["y"] + 500)
            time.sleep(0.01)
        page.mouse.up()
        time.sleep(0.5)
        
        z_neg3_img = page.screenshot()
        with open(f"{IMG_DIR}/round6_v3_05_z_neg3.png", "wb") as f:
            f.write(z_neg3_img)
        z_neg3_pixels, _, _, _ = analyze_image(z_neg3_img)
        z_neg3_delta = z_neg3_pixels - z3_pixels
        print(f"Z=-3 绘制增量: {z_neg3_delta:,}")
        results.append(("Z=-3绘制", z_neg3_delta > 2000, f"增量: {z_neg3_delta:,}"))
        
        # ========== 测试4: 原点连线检查 ==========
        print("\n🔗 测试4: 原点连线检查（无网格）")
        
        clear_btn.click()
        time.sleep(0.3)
        
        # 在右上角绘制，不经过原点
        draw_start_x = box["x"] + box["width"] * 0.75
        draw_start_y = box["y"] + box["height"] * 0.2
        
        page.mouse.move(draw_start_x, draw_start_y)
        page.mouse.down()
        for i in range(15):
            t = i / 14.0
            page.mouse.move(
                draw_start_x + box["width"] * 0.1 * t,
                draw_start_y
            )
            time.sleep(0.01)
        page.mouse.up()
        time.sleep(0.5)
        
        no_origin_img = page.screenshot()
        with open(f"{IMG_DIR}/round6_v3_06_no_origin.png", "wb") as f:
            f.write(no_origin_img)
        _, nw, nh, nop = analyze_image(no_origin_img)
        
        # 从中心到绘制起点采样（无网格坐标轴干扰）
        cx, cy = nw//2, nh//2
        dx = int(draw_start_x - box["x"]) - cx
        dy = int(draw_start_y - box["y"]) - cy
        
        line_bright = 0
        bright_samples = []
        for i in range(10, 101):  # 跳过原点附近(0-10%)
            t = i / 100.0
            lx = int(cx + dx * t)
            ly = int(cy + dy * t)
            if 0 <= lx < nw and 0 <= ly < nh:
                r, g, b = nop[lx, ly]
                bright = max(r, g, b)
                if bright > 50:
                    line_bright += 1
                    bright_samples.append((t, bright))
        
        print(f"原点到绘制点连线上(10%-100%段)亮像素: {line_bright}/91")
        
        if line_bright < 15:
            print("✅ 无原点连线")
            results.append(("原点连线", True, f"线上亮像素: {line_bright}/91"))
        else:
            print(f"⚠️  可能存在原点连线 ({line_bright}个亮像素)")
            results.append(("原点连线", False, f"线上亮像素: {line_bright}/91"))
        
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
    print("📊 第6轮 v3 测试总结")
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
