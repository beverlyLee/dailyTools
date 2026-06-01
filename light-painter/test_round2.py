#!/usr/bin/env python3
"""光绘画板 - 第2轮测试"""

import time
import json
import os
from playwright.sync_api import sync_playwright

IMG_DIR = "/Users/liboyang/trae/dailyTools/light-painter/img"
os.makedirs(IMG_DIR, exist_ok=True)

def log_test(test_name, status, details=""):
    icon = "✅" if status else "❌"
    print(f"{icon} | {test_name:<50} | {details}")

def run_tests():
    print("\n" + "="*90)
    print("🎨 光绘画板 (light-painter) - 第2轮验收测试")
    print("="*90 + "\n")
    
    test_results = []
    console_errors = []
    console_warnings = []
    network_errors = []
    
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(
            viewport={"width": 1280, "height": 800},
            device_scale_factor=2
        )
        page = context.new_page()
        
        # 监听控制台
        def on_console(msg):
            text = f"[{msg.type}] {msg.text}"
            if msg.type == "error":
                console_errors.append(text)
                print(f"  ⚠️  控制台错误: {text}")
            elif msg.type == "warning":
                console_warnings.append(text)
        
        page.on("console", on_console)
        page.on("pageerror", lambda exc: console_errors.append(f"[pageerror] {exc.message}\n{exc.stack}"))
        
        # 监听网络
        def on_response(response):
            if response.status >= 400:
                network_errors.append(f"{response.status} {response.url}")
        
        page.on("response", on_response)
        
        # ========== 测试1: 页面加载 ==========
        print("📦 加载页面...")
        start = time.time()
        try:
            page.goto("http://localhost:5190", wait_until="domcontentloaded", timeout=30000)
            load_time = time.time() - start
            time.sleep(3)
            
            # 初始截图
            page.screenshot(path=f"{IMG_DIR}/round2_01_initial.png")
            log_test("1. 页面加载", True, f"{load_time:.2f}s")
            test_results.append(("页面加载", True, f"{load_time:.2f}s"))
        except Exception as e:
            page.screenshot(path=f"{IMG_DIR}/round2_01_load_error.png")
            log_test("1. 页面加载", False, str(e))
            test_results.append(("页面加载", False, str(e)))
            browser.close()
            return test_results, console_errors, network_errors
        
        # ========== 测试2: 标题 ==========
        try:
            title = page.title()
            if "Light Painter" in title or "光绘画板" in title:
                log_test("2. 标题渲染", True, title)
                test_results.append(("标题渲染", True, title))
            else:
                log_test("2. 标题渲染", False, f"实际: {title}")
                test_results.append(("标题渲染", False, f"实际: {title}"))
        except Exception as e:
            log_test("2. 标题渲染", False, str(e))
            test_results.append(("标题渲染", False, str(e)))
        
        # ========== 测试3: Canvas 存在 ==========
        try:
            canvas = page.locator("canvas").first
            exists = canvas.is_visible(timeout=5000)
            if exists:
                box = canvas.bounding_box()
                log_test("3. Canvas 渲染", True, f"{box['width']:.0f}x{box['height']:.0f}")
                test_results.append(("Canvas 渲染", True, f"{box['width']:.0f}x{box['height']:.0f}"))
            else:
                log_test("3. Canvas 渲染", False, "不可见")
                test_results.append(("Canvas 渲染", False, "不可见"))
        except Exception as e:
            log_test("3. Canvas 渲染", False, str(e))
            test_results.append(("Canvas 渲染", False, str(e)))
        
        # ========== 测试4: 提示文字 ==========
        try:
            tip = page.locator(".tip").first
            tip_text = tip.inner_text(timeout=5000)
            log_test("4. 提示文字", True, tip_text)
            test_results.append(("提示文字", True, tip_text))
        except Exception as e:
            log_test("4. 提示文字", False, str(e))
            test_results.append(("提示文字", False, str(e)))
        
        # ========== 测试5: 源代码配置检查 ==========
        print("\n🔍 检查源代码配置...")
        try:
            source_info = page.evaluate("""
                async () => {
                    const response = await fetch('/src/canvas/LightTrail.ts');
                    const source = await response.text();
                    
                    // 提取配置
                    const config = {};
                    
                    // linewidth
                    const lwMatch = source.match(/linewidth\\s*:\\s*([0-9.eE+-]+)/);
                    if (lwMatch) config.linewidth = parseFloat(lwMatch[1]);
                    
                    // blending
                    const blendMatch = source.match(/blending\\s*:\\s*THREE\\.(\\w+)/);
                    if (blendMatch) config.blending = blendMatch[1];
                    
                    // alphaToCoverage
                    config.hasAlphaToCoverage = source.includes('alphaToCoverage');
                    
                    // EffectComposer
                    config.hasEffectComposer = source.includes('EffectComposer');
                    
                    // UnrealBloomPass
                    config.hasBloomPass = source.includes('UnrealBloomPass');
                    
                    // toneMapping
                    const tmMatch = source.match(/toneMapping\\s*:\\s*THREE\\.(\\w+)/);
                    if (tmMatch) config.toneMapping = tmMatch[1];
                    
                    // 颜色值
                    const colorMatch = source.match(/colors\\s*:\\s*\\[([\\s\\S]+?)\\]/);
                    if (colorMatch) {
                        const colorNums = colorMatch[1].match(/[0-9.]+/g);
                        if (colorNums) {
                            config.sampleColor = parseFloat(colorNums[0]);
                        }
                    }
                    
                    return JSON.stringify(config);
                }
            """)
            
            config = json.loads(source_info)
            print(f"  📋 源代码配置:")
            print(f"    - linewidth: {config.get('linewidth')}")
            print(f"    - blending: {config.get('blending')}")
            print(f"    - alphaToCoverage: {config.get('hasAlphaToCoverage')}")
            print(f"    - EffectComposer: {config.get('hasEffectComposer')}")
            print(f"    - UnrealBloomPass: {config.get('hasBloomPass')}")
            print(f"    - toneMapping: {config.get('toneMapping')}")
            print(f"    - sampleColor: {config.get('sampleColor')}")
            
            # 验证配置改进
            lw = config.get('linewidth', 0)
            if lw > 0.5:
                log_test("5. 线宽配置", True, f"linewidth: {lw}")
                test_results.append(("线宽配置", True, f"linewidth: {lw}"))
            else:
                log_test("5. 线宽配置", False, f"linewidth: {lw}，仍然过小")
                test_results.append(("线宽配置", False, f"linewidth: {lw}"))
            
            if config.get('blending') == 'AdditiveBlending':
                log_test("6. 混合模式", True, "AdditiveBlending")
                test_results.append(("混合模式", True, "AdditiveBlending"))
            else:
                log_test("6. 混合模式", False, f"实际: {config.get('blending')}")
                test_results.append(("混合模式", False, f"实际: {config.get('blending')}"))
            
            if config.get('hasBloomPass'):
                log_test("7. 发光后期处理", True, "UnrealBloomPass 已添加")
                test_results.append(("发光后期处理", True, "已添加"))
            else:
                log_test("7. 发光后期处理", False, "未添加")
                test_results.append(("发光后期处理", False, "未添加"))
            
            if config.get('hasAlphaToCoverage'):
                log_test("8. 抗锯齿处理", True, "alphaToCoverage 已添加")
                test_results.append(("抗锯齿处理", True, "已添加"))
            else:
                log_test("8. 抗锯齿处理", False, "未添加")
                test_results.append(("抗锯齿处理", False, "未添加"))
            
        except Exception as e:
            print(f"  ⚠️  源代码检查失败: {e}")
            log_test("5-8. 配置检查", False, str(e))
            test_results.append(("配置检查", False, str(e)))
        
        # ========== 测试9: 绘制光轨并验证可见性 ==========
        print("\n🖱️  开始绘制测试...")
        canvas = page.locator("canvas").first
        box = canvas.bounding_box()
        
        # 绘制一条斜线
        try:
            start_x = box["x"] + 150
            start_y = box["y"] + 150
            end_x = box["x"] + box["width"] - 150
            end_y = box["y"] + box["height"] - 150
            
            page.mouse.move(start_x, start_y)
            page.mouse.down()
            
            steps = 40
            for i in range(steps + 1):
                t = i / steps
                x = start_x + (end_x - start_x) * t
                y = start_y + (end_y - start_y) * t
                page.mouse.move(x, y)
                time.sleep(0.03)
            
            page.mouse.up()
            time.sleep(1)
            
            page.screenshot(path=f"{IMG_DIR}/round2_02_draw_line.png")
            
            # 像素分析
            pixel_info = page.evaluate("""
                () => {
                    const canvas = document.querySelector('canvas');
                    if (!canvas) return {error: 'no canvas'};
                    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
                    if (!gl) return {error: 'no gl'};
                    
                    const w = canvas.width;
                    const h = canvas.height;
                    const pixels = new Uint8Array(w * h * 4);
                    gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
                    
                    let nonBlack = 0;
                    let maxBright = 0;
                    let over200 = 0;
                    let brightPixels = [];
                    
                    for (let y = 0; y < h; y += 2) {
                        for (let x = 0; x < w; x += 2) {
                            const idx = (y * w + x) * 4;
                            const r = pixels[idx];
                            const g = pixels[idx + 1];
                            const b = pixels[idx + 2];
                            const bright = Math.max(r, g, b);
                            if (bright > maxBright) maxBright = bright;
                            if (bright > 30) {
                                nonBlack++;
                                if (bright > 200) over200++;
                                if (brightPixels.length < 10) {
                                    brightPixels.push({x, y, r, g, b, bright});
                                }
                            }
                        }
                    }
                    
                    return {
                        width: w,
                        height: h,
                        nonBlackPixels: nonBlack * 4,
                        maxBrightness: maxBright,
                        over200Pixels: over200 * 4,
                        samplePixels: brightPixels
                    };
                }
            """)
            
            nb = pixel_info.get('nonBlackPixels', 0)
            mb = pixel_info.get('maxBrightness', 0)
            over200 = pixel_info.get('over200Pixels', 0)
            
            print(f"  📊 像素分析: 非黑像素={nb:,}, 最大亮度={mb}/255, 高亮像素={over200:,}")
            
            if nb > 1000 and mb > 100:
                log_test("9. 光轨可见性", True, f"非黑像素: {nb:,}, 最大亮度: {mb}/255")
                test_results.append(("光轨可见性", True, f"非黑像素: {nb:,}, 最大亮度: {mb}/255"))
            elif nb > 100:
                log_test("9. 光轨可见性", False, f"光轨太暗，非黑像素: {nb:,}, 最大亮度: {mb}/255")
                test_results.append(("光轨可见性", False, f"太暗: {nb}, {mb}/255"))
            else:
                log_test("9. 光轨可见性", False, f"光轨不可见，非黑像素: {nb}")
                test_results.append(("光轨可见性", False, f"不可见: {nb}"))
            
            if over200 > 500:
                log_test("10. 发光效果", True, f"高亮像素: {over200:,}")
                test_results.append(("发光效果", True, f"高亮像素: {over200:,}"))
            else:
                log_test("10. 发光效果", False, f"高亮像素不足: {over200:,}")
                test_results.append(("发光效果", False, f"高亮像素: {over200:,}"))
            
        except Exception as e:
            log_test("9-10. 光轨绘制测试", False, str(e))
            test_results.append(("光轨绘制测试", False, str(e)))
        
        # ========== 测试11: 绘制圆形 ==========
        try:
            import math
            
            center_x = box["x"] + box["width"] / 2
            center_y = box["y"] + box["height"] / 2
            radius = min(box["width"], box["height"]) / 4
            
            start_angle = 0
            page.mouse.move(
                center_x + radius * math.cos(start_angle),
                center_y + radius * math.sin(start_angle)
            )
            page.mouse.down()
            
            for i in range(60):
                angle = start_angle + 2 * math.pi * i / 60
                x = center_x + radius * math.cos(angle)
                y = center_y + radius * math.sin(angle)
                page.mouse.move(x, y)
                time.sleep(0.02)
            
            page.mouse.up()
            time.sleep(1)
            
            page.screenshot(path=f"{IMG_DIR}/round2_03_draw_circle.png")
            log_test("11. 绘制圆形", True, "圆形绘制完成")
            test_results.append(("绘制圆形", True, "完成"))
        except Exception as e:
            log_test("11. 绘制圆形", False, str(e))
            test_results.append(("绘制圆形", False, str(e)))
        
        # ========== 测试12: 多层叠加效果 ==========
        try:
            center_x = box["x"] + box["width"] / 2
            center_y = box["y"] + box["height"] / 2
            
            for layer in range(5):
                start_x = center_x - 200
                start_y = center_y - 150 + layer * 50
                end_x = center_x + 200
                end_y = center_y + 150 - layer * 50
                
                page.mouse.move(start_x, start_y)
                page.mouse.down()
                
                steps = 30
                for i in range(steps + 1):
                    t = i / steps
                    x = start_x + (end_x - start_x) * t
                    y = start_y + (end_y - start_y) * t
                    page.mouse.move(x, y)
                    time.sleep(0.02)
                
                page.mouse.up()
                time.sleep(0.3)
            
            time.sleep(1)
            page.screenshot(path=f"{IMG_DIR}/round2_04_overlap.png")
            
            # 再次像素分析
            pixel_info2 = page.evaluate("""
                () => {
                    const canvas = document.querySelector('canvas');
                    if (!canvas) return {error: 'no canvas'};
                    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
                    if (!gl) return {error: 'no gl'};
                    
                    const w = canvas.width;
                    const h = canvas.height;
                    const pixels = new Uint8Array(w * h * 4);
                    gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
                    
                    let nonBlack = 0;
                    let maxBright = 0;
                    let over200 = 0;
                    let over150 = 0;
                    
                    for (let y = 0; y < h; y += 2) {
                        for (let x = 0; x < w; x += 2) {
                            const idx = (y * w + x) * 4;
                            const r = pixels[idx];
                            const g = pixels[idx + 1];
                            const b = pixels[idx + 2];
                            const bright = Math.max(r, g, b);
                            if (bright > maxBright) maxBright = bright;
                            if (bright > 30) nonBlack++;
                            if (bright > 150) over150++;
                            if (bright > 200) over200++;
                        }
                    }
                    
                    return {
                        nonBlackPixels: nonBlack * 4,
                        maxBrightness: maxBright,
                        over150Pixels: over150 * 4,
                        over200Pixels: over200 * 4
                    };
                }
            """)
            
            nb2 = pixel_info2.get('nonBlackPixels', 0)
            mb2 = pixel_info2.get('maxBrightness', 0)
            over200_2 = pixel_info2.get('over200Pixels', 0)
            
            print(f"  📊 叠加后像素: 非黑像素={nb2:,}, 最大亮度={mb2}/255, 高亮像素={over200_2:,}")
            
            if over200_2 > 1000:
                log_test("12. 叠加发光效果", True, f"高亮像素: {over200_2:,}")
                test_results.append(("叠加发光效果", True, f"高亮像素: {over200_2:,}"))
            else:
                log_test("12. 叠加发光效果", False, f"高亮像素不足: {over200_2:,}")
                test_results.append(("叠加发光效果", False, f"高亮像素: {over200_2:,}"))
            
        except Exception as e:
            log_test("12. 叠加发光效果", False, str(e))
            test_results.append(("叠加发光效果", False, str(e)))
        
        # ========== 测试13: 光轨保留 ==========
        try:
            time.sleep(2)
            page.screenshot(path=f"{IMG_DIR}/round2_05_persist.png")
            
            # 再次检查像素
            pixel_info3 = page.evaluate("""
                () => {
                    const canvas = document.querySelector('canvas');
                    if (!canvas) return {error: 'no canvas'};
                    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
                    if (!gl) return {error: 'no gl'};
                    
                    const w = canvas.width;
                    const h = canvas.height;
                    const pixels = new Uint8Array(w * h * 4);
                    gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
                    
                    let nonBlack = 0;
                    for (let y = 0; y < h; y += 4) {
                        for (let x = 0; x < w; x += 4) {
                            const idx = (y * w + x) * 4;
                            const r = pixels[idx];
                            const g = pixels[idx + 1];
                            const b = pixels[idx + 2];
                            if (Math.max(r, g, b) > 30) nonBlack++;
                        }
                    }
                    return nonBlack * 16;
                }
            """)
            
            if pixel_info3 > 1000:
                log_test("13. 光轨保留", True, f"2秒后仍有 {pixel_info3:,} 个非黑像素")
                test_results.append(("光轨保留", True, "保留"))
            else:
                log_test("13. 光轨保留", False, "光轨消失")
                test_results.append(("光轨保留", False, "消失"))
        except Exception as e:
            log_test("13. 光轨保留", False, str(e))
            test_results.append(("光轨保留", False, str(e)))
        
        # ========== 测试14: 控制台和网络检查 ==========
        if len(console_errors) == 0:
            log_test("14. 控制台错误", True, "无错误")
            test_results.append(("控制台错误", True, "无"))
        else:
            log_test("14. 控制台错误", False, f"{len(console_errors)} 个错误")
            test_results.append(("控制台错误", False, f"{len(console_errors)} 个"))
        
        if len(network_errors) == 0:
            log_test("15. 网络请求", True, "无错误")
            test_results.append(("网络请求", True, "无"))
        else:
            log_test("15. 网络请求", False, f"{len(network_errors)} 个错误")
            test_results.append(("网络请求", False, f"{len(network_errors)} 个"))
        
        # 最终截图
        page.screenshot(path=f"{IMG_DIR}/round2_06_final.png")
        
        browser.close()
    
    # 测试总结
    print("\n" + "="*90)
    print("📊 第2轮测试总结")
    print("="*90)
    
    passed = sum(1 for r in test_results if r[1])
    total = len(test_results)
    
    print(f"\n通过: {passed}/{total} ({passed/total*100:.1f}%)")
    print(f"失败: {total-passed}/{total}\n")
    
    print(f"📸 截图已保存至: {IMG_DIR}")
    print("\n" + "="*90 + "\n")
    
    return test_results, console_errors, network_errors

if __name__ == "__main__":
    results, errors, network = run_tests()
