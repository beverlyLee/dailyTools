#!/usr/bin/env python3
"""第6轮测试 v4 - 3D空间绘制验证"""

import time
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
    print("第6轮测试 v4 - 3D空间绘制验证")
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
        
        # 关闭网格坐标轴
        page.evaluate("""() => {
            if (window.lightTrail) {
                window.lightTrail.toggleGrid(false);
            }
        }""")
        time.sleep(0.5)
        
        clear_btn = page.locator("#clearBtn")
        depth_slider = page.locator("#depthSlider")
        
        # ========== 测试: Z轴不同深度绘制 ==========
        print("\n🌐 测试: Z轴不同深度绘制")
        
        depths = [-3, 0, 3]
        depth_results = []
        
        for depth in depths:
            clear_btn.click()
            time.sleep(0.3)
            
            depth_slider.fill(str(depth))
            time.sleep(0.3)
            
            # 基准
            base_img = page.screenshot()
            base_pixels, _, _, _ = analyze_image(base_img)
            
            # 绘制
            y_offset = box["y"] + box["height"] / 2 + (depth + 3) * 80
            page.mouse.move(box["x"] + 200, y_offset)
            page.mouse.down()
            for i in range(40):
                t = i / 39.0
                page.mouse.move(box["x"] + 200 + 800 * t, y_offset)
                time.sleep(0.01)
            page.mouse.up()
            time.sleep(0.5)
            
            draw_img = page.screenshot()
            draw_pixels, _, _, _ = analyze_image(draw_img)
            
            delta = draw_pixels - base_pixels
            depth_results.append((depth, delta))
            print(f"Z={depth}: 增量 {delta:,} 像素")
        
        # 检查所有深度都有绘制
        all_drawn = all(delta > 1000 for _, delta in depth_results)
        if all_drawn:
            print("✅ 所有深度均能正常绘制")
            results.append(("3D空间绘制", True, "所有Z轴深度均能正常绘制"))
        else:
            failed = [d for d, delta in depth_results if delta <= 1000]
            print(f"❌ 部分深度绘制失败: {failed}")
            results.append(("3D空间绘制", False, f"失败深度: {failed}"))
        
        # ========== 测试: 旋转视角后绘制 ==========
        print("\n🔄 测试: 旋转视角后绘制")
        
        clear_btn.click()
        time.sleep(0.3)
        depth_slider.fill("0")
        time.sleep(0.3)
        
        # 旋转视角
        mid_x = box["x"] + box["width"] / 2
        mid_y = box["y"] + box["height"] / 2
        page.mouse.move(mid_x, mid_y)
        page.mouse.down(button="right")
        for i in range(25):
            page.mouse.move(mid_x + i * 6, mid_y - i * 4)
            time.sleep(0.04)
        page.mouse.up(button="right")
        time.sleep(0.5)
        
        rotated_base_img = page.screenshot()
        rotated_base, _, _, _ = analyze_image(rotated_base_img)
        
        # 在旋转后的视角下绘制
        page.mouse.move(box["x"] + 300, box["y"] + 300)
        page.mouse.down()
        for i in range(30):
            t = i / 29.0
            page.mouse.move(box["x"] + 300 + 600 * t, box["y"] + 300 + 200 * t)
            time.sleep(0.015)
        page.mouse.up()
        time.sleep(0.5)
        
        rotated_draw_img = page.screenshot()
        rotated_draw, _, _, _ = analyze_image(rotated_draw_img)
        with open(f"{IMG_DIR}/round6_v4_01_rotated_draw.png", "wb") as f:
            f.write(rotated_draw_img)
        
        rotated_delta = rotated_draw - rotated_base
        print(f"旋转视角后绘制增量: {rotated_delta:,}")
        
        if rotated_delta > 2000:
            print("✅ 旋转视角后仍能正常绘制")
            results.append(("旋转后绘制", True, f"增量: {rotated_delta:,}"))
        else:
            print("❌ 旋转视角后绘制异常")
            results.append(("旋转后绘制", False, f"增量: {rotated_delta:,}"))
        
        # ========== 测试: 控制台错误 ==========
        print("\n⚠️  测试: 控制台错误")
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
    print("📊 第6轮 v4 测试总结")
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
