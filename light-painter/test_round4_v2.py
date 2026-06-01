#!/usr/bin/env python3
"""光绘画板 - 第4轮测试 v2 - 关闭网格和坐标轴后测试原点连线"""

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
    print("第4轮测试 v2 - 精确原点连线检测")
    print("="*80)
    
    results = []
    
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(
            viewport={"width": 1280, "height": 800},
            device_scale_factor=2
        )
        page = context.new_page()
        
        page.goto("http://localhost:5220", wait_until="networkidle", timeout=30000)
        time.sleep(2)
        
        canvas = page.locator("canvas").first
        box = canvas.bounding_box()
        
        # 通过JS关闭网格和坐标轴
        page.evaluate("""() => {
            if (window.lightTrail) {
                window.lightTrail.toggleGrid(false);
            }
        }""")
        time.sleep(0.5)
        
        # 截图 - 无网格无绘制
        empty_img = page.screenshot()
        with open(f"{IMG_DIR}/round4_v2_01_empty.png", "wb") as f:
            f.write(empty_img)
        empty_pixels, w, h, empty_pix = analyze_image(empty_img)
        print(f"\n空画布(无网格): {empty_pixels:,} 非黑像素 (阈值50)")
        
        # 绘制一条在右上角的短线
        start_x = box["x"] + box["width"] * 0.75
        start_y = box["y"] + box["height"] * 0.25
        end_x = box["x"] + box["width"] * 0.9
        end_y = box["y"] + box["height"] * 0.25
        
        print(f"\n绘制位置: ({start_x:.0f}, {start_y:.0f}) -> ({end_x:.0f}, {end_y:.0f})")
        
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
        with open(f"{IMG_DIR}/round4_v2_02_drawn.png", "wb") as f:
            f.write(draw_img)
        
        draw_pixels, dw, dh, draw_pix = analyze_image(draw_img)
        print(f"绘制后: {draw_pixels:,} 非黑像素")
        
        # 精确检测: 从屏幕中心到绘制起点之间的区域
        cx, cy = dw//2, dh//2
        draw_start_x_scr = int((start_x - box["x"]) * 2)  # scale factor
        draw_start_y_scr = int((start_y - box["y"]) * 2)
        
        print(f"\n屏幕中心: ({cx}, {cy})")
        print(f"绘制起点(屏幕坐标): ({draw_start_x_scr}, {draw_start_y_scr})")
        
        # 沿中心到绘制起点的线采样
        dx = draw_start_x_scr - cx
        dy = draw_start_y_scr - cy
        line_samples = []
        for i in range(0, 101):
            t = i / 100.0
            lx = int(cx + dx * t)
            ly = int(cy + dy * t)
            if 0 <= lx < dw and 0 <= ly < dh:
                r, g, b = draw_pix[lx, ly]
                line_samples.append((t, lx, ly, r, g, b, max(r, g, b)))
        
        # 统计连续亮段
        bright_segments = []
        current_seg = []
        for t, lx, ly, r, g, b, bright in line_samples:
            if bright > 50:
                current_seg.append((t, bright))
            else:
                if len(current_seg) > 0:
                    bright_segments.append(current_seg)
                current_seg = []
        if len(current_seg) > 0:
            bright_segments.append(current_seg)
        
        print(f"\n沿中心到起点的线采样:")
        print(f"  亮段数: {len(bright_segments)}")
        for i, seg in enumerate(bright_segments):
            if len(seg) >= 3:
                print(f"  段{i+1}: t=[{seg[0][0]:.2f}, {seg[-1][0]:.2f}], 长度={len(seg)}, 最亮={max(s[1] for s in seg)}")
        
        # 检查是否有连续亮段从中心延伸
        origin_line_detected = False
        for seg in bright_segments:
            if len(seg) >= 10 and seg[0][0] < 0.1:
                origin_line_detected = True
                print(f"\n⚠️  检测到从原点出发的连线！")
                print(f"  从 t={seg[0][0]:.2f} 延伸到 t={seg[-1][0]:.2f}")
                break
        
        if not origin_line_detected:
            print("\n✅ 未检测到从原点出发的连线")
        
        # 检查绘制区域的亮像素（排除中心附近）
        draw_region_bright = 0
        for y in range(draw_start_y_scr - 30, draw_start_y_scr + 30, 2):
            for x in range(draw_start_x_scr - 30, int(draw_start_x_scr + (end_x - start_x)*2) + 30, 2):
                if 0 <= x < dw and 0 <= y < dh:
                    r, g, b = draw_pix[x, y]
                    if max(r, g, b) > 50:
                        draw_region_bright += 1
        
        print(f"\n绘制区域亮像素: {draw_region_bright}")
        
        # 总结
        has_origin_line = origin_line_detected
        has_drawing = draw_region_bright > 50
        
        results.append(("原点连线检测", not has_origin_line, 
                       "检测到原点连线" if has_origin_line else "无原点连线"))
        results.append(("绘制检测", has_drawing, 
                       f"绘制区域亮像素: {draw_region_bright}"))
        
        # ========== 测试Z轴绘制 ==========
        print("\n" + "="*60)
        print("测试Z轴空间绘制")
        
        # 清空
        page.evaluate("""() => {
            if (window.lightTrail) {
                window.lightTrail.clear();
                window.lightTrail.toggleGrid(false);
            }
        }""")
        time.sleep(0.5)
        
        # 设置深度 Z = 2
        page.evaluate("""() => {
            if (window.lightTrail) {
                window.lightTrail.setDepth(2);
            }
        }""")
        time.sleep(0.3)
        
        # 绘制一条线
        mid_x = box["x"] + box["width"] / 2
        mid_y = box["y"] + box["height"] / 2
        
        page.mouse.move(mid_x - 200, mid_y - 100)
        page.mouse.down()
        for i in range(40):
            t = i / 40
            x = mid_x - 200 + 400 * t
            y = mid_y - 100 + 200 * t * 0
            page.mouse.move(x, y)
            time.sleep(0.02)
        page.mouse.up()
        time.sleep(1)
        
        z2_img = page.screenshot()
        with open(f"{IMG_DIR}/round4_v2_03_z2.png", "wb") as f:
            f.write(z2_img)
        z2_pixels, _, _, _ = analyze_image(z2_img)
        
        # 设置深度 Z = -2
        page.evaluate("""() => {
            if (window.lightTrail) {
                window.lightTrail.setDepth(-2);
            }
        }""")
        time.sleep(0.3)
        
        page.mouse.move(mid_x - 200, mid_y + 100)
        page.mouse.down()
        for i in range(40):
            t = i / 40
            x = mid_x - 200 + 400 * t
            y = mid_y + 100
            page.mouse.move(x, y)
            time.sleep(0.02)
        page.mouse.up()
        time.sleep(1)
        
        z_neg2_img = page.screenshot()
        with open(f"{IMG_DIR}/round4_v2_04_z_neg2.png", "wb") as f:
            f.write(z_neg2_img)
        z_neg2_pixels, _, _, _ = analyze_image(z_neg2_img)
        
        z2_delta = z2_pixels - empty_pixels
        z_neg2_delta = z_neg2_pixels - z2_pixels
        
        print(f"Z=2 非黑像素增量: {z2_delta:,}")
        print(f"Z=-2 非黑像素增量: {z_neg2_delta:,}")
        
        results.append(("Z=2绘制", z2_delta > 3000, f"增量: {z2_delta:,}"))
        results.append(("Z=-2绘制", z_neg2_delta > 3000, f"增量: {z_neg2_delta:,}"))
        
        # ========== 测试右键旋转 ==========
        print("\n" + "="*60)
        print("测试右键旋转视角")
        
        page.mouse.move(mid_x, mid_y)
        page.mouse.down(button="right")
        for i in range(20):
            page.mouse.move(mid_x + i * 8, mid_y - i * 5)
            time.sleep(0.05)
        page.mouse.up(button="right")
        time.sleep(1)
        
        rotate_img = page.screenshot()
        with open(f"{IMG_DIR}/round4_v2_05_rotated.png", "wb") as f:
            f.write(rotate_img)
        rotate_pixels, _, _, _ = analyze_image(rotate_img)
        
        results.append(("视角旋转", rotate_pixels > 5000, "旋转后可见"))
        
        browser.close()
    
    # 总结
    print("\n" + "="*80)
    print("第4轮 v2 测试总结")
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
