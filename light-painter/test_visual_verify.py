#!/usr/bin/env python3
"""光绘画板 - 视觉效果详细验证"""

import time
import os
from playwright.sync_api import sync_playwright

IMG_DIR = "/Users/liboyang/trae/dailyTools/light-painter/img"

def log_test(test_name, status, details=""):
    status_icon = "✅ PASS" if status else "❌ FAIL"
    print(f"{status_icon} | {test_name:<40} | {details}")

def run_visual_verify():
    print("\n" + "="*80)
    print("🔍 光绘画板 - 视觉效果详细验证")
    print("="*80 + "\n")
    
    test_results = []
    console_errors = []
    console_logs = []
    
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(
            viewport={"width": 1280, "height": 800},
            device_scale_factor=2
        )
        page = context.new_page()
        
        def on_console(msg):
            msg_text = f"[{msg.type}] {msg.text}"
            console_logs.append(msg_text)
            if msg.type in ["error"]:
                console_errors.append(msg_text)
                print(f"CONSOLE {msg_text}")
        
        page.on("console", on_console)
        
        def on_pageerror(exc):
            err_msg = f"[pageerror] {exc.message}"
            console_errors.append(err_msg)
            print(f"PAGEERROR: {exc.message}")
            if exc.stack:
                print(f"STACK:\n{exc.stack}")
        
        page.on("pageerror", on_pageerror)
        
        # 加载页面
        try:
            page.goto("http://localhost:5173", wait_until="networkidle", timeout=30000)
            time.sleep(3)
            print(f"✓ 页面加载完成")
        except Exception as e:
            print(f"✗ 页面加载失败: {e}")
            return
        
        # 分析源代码检查配置
        try:
            # 通过 fetch 获取源代码检查 linewidth 和 blending 配置
            source_check = page.evaluate("""
                async () => {
                    const result = {
                        canvasExists: false,
                        canvasWidth: 0,
                        canvasHeight: 0,
                        glContext: null,
                        sourceLineWidth: null,
                        sourceBlending: null
                    };
                    
                    // 检查 canvas
                    const canvas = document.querySelector('canvas');
                    if (canvas) {
                        result.canvasExists = true;
                        result.canvasWidth = canvas.width;
                        result.canvasHeight = canvas.height;
                        result.glContext = canvas.getContext('webgl2') ? 'webgl2' : 
                                          canvas.getContext('webgl') ? 'webgl' : 'none';
                    }
                    
                    // 尝试获取源代码分析配置
                    try {
                        const response = await fetch('/src/canvas/LightTrail.ts');
                        if (response.ok) {
                            const source = await response.text();
                            
                            // 提取 linewidth
                            const lwMatch = source.match(/linewidth\\s*:\\s*([0-9.]+)/);
                            if (lwMatch) {
                                result.sourceLineWidth = parseFloat(lwMatch[1]);
                            }
                            
                            // 提取 blending 模式
                            const blendMatch = source.match(/blending\s*:\s*THREE\.(\w+)/);
                            if (blendMatch) {
                                result.sourceBlending = blendMatch[1];
                            }
                        }
                    } catch (e) {
                        console.log('Failed to fetch source:', e);
                    }
                    
                    return JSON.stringify(result, null, 2);
                }
            """)
            
            import json
            source_data = json.loads(source_check)
            print(f"\n📊 Canvas 状态:")
            print(f"  - Canvas 存在: {source_data['canvasExists']}")
            print(f"  - Canvas 尺寸: {source_data['canvasWidth']}x{source_data['canvasHeight']}")
            print(f"  - WebGL 上下文: {source_data['glContext']}")
            
            if source_data['sourceLineWidth'] is not None:
                lw = source_data['sourceLineWidth']
                print(f"\n🎨 源代码配置:")
                print(f"  - linewidth: {lw}")
                print(f"  - blending: {source_data['sourceBlending']}")
                
                if lw < 0.01:
                    log_test("线宽检查", False, f"线宽过小: {lw}，世界单位下几乎不可见，建议增大到 0.05 以上或使用像素单位")
                    test_results.append(("线宽检查", False, f"linewidth: {lw}"))
                elif lw < 0.05:
                    log_test("线宽检查", False, f"线宽偏小: {lw}，可能导致光轨过细，发光效果不明显")
                    test_results.append(("线宽检查", False, f"linewidth: {lw}"))
                else:
                    log_test("线宽检查", True, f"线宽: {lw}")
                    test_results.append(("线宽检查", True, f"linewidth: {lw}"))
                
                if source_data['sourceBlending'] == 'AdditiveBlending':
                    log_test("混合模式检查", True, "AdditiveBlending 已正确设置")
                    test_results.append(("混合模式检查", True, "AdditiveBlending"))
                else:
                    log_test("混合模式检查", False, f"混合模式错误: {source_data['sourceBlending']}，应为 AdditiveBlending")
                    test_results.append(("混合模式检查", False, f"当前: {source_data['sourceBlending']}"))
            else:
                log_test("源代码检查", False, "无法从源代码提取配置")
                test_results.append(("源代码检查", False, "无法提取配置"))
            
        except Exception as e:
            print(f"检查错误: {e}")
            import traceback
            traceback.print_exc()
            log_test("环境检查", False, str(e))
            test_results.append(("环境检查", False, str(e)))
        
        # 现在进行鼠标绘制测试，并检查像素变化
        print(f"\n🖱️  开始绘制测试...")
        canvas = page.locator("canvas").first
        box = canvas.bounding_box()
        
        # 先截图初始状态
        page.screenshot(path=f"{IMG_DIR}/verify_01_blank.png")
        
        # 绘制一条粗线（来回多次叠加）
        center_x = box["x"] + box["width"] / 2
        center_y = box["y"] + box["height"] / 2
        
        for pass_num in range(10):
            start_x = box["x"] + 100
            start_y = center_y - 100 + pass_num * 20
            end_x = box["x"] + box["width"] - 100
            end_y = center_y + 100 - pass_num * 20
            
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
            time.sleep(0.2)
        
        time.sleep(1)
        page.screenshot(path=f"{IMG_DIR}/verify_02_after_drawing.png")
        
        # 再次检查像素
        try:
            pixel_result = page.evaluate("""
                () => {
                    const canvas = document.querySelector('canvas');
                    if (!canvas) return null;
                    
                    const ctx = canvas.getContext('webgl2') || canvas.getContext('webgl');
                    if (!ctx) return null;
                    
                    const pixels = new Uint8Array(canvas.width * canvas.height * 4);
                    ctx.readPixels(0, 0, canvas.width, canvas.height, ctx.RGBA, ctx.UNSIGNED_BYTE, pixels);
                    
                    let nonBlackCount = 0;
                    let maxBrightness = 0;
                    let totalBrightness = 0;
                    
                    for (let i = 0; i < pixels.length; i += 4) {
                        const r = pixels[i];
                        const g = pixels[i+1];
                        const b = pixels[i+2];
                        const brightness = Math.max(r, g, b);
                        totalBrightness += brightness;
                        if (brightness > 20) {
                            nonBlackCount++;
                            if (brightness > maxBrightness) maxBrightness = brightness;
                        }
                    }
                    
                    return {
                        totalPixels: pixels.length / 4,
                        nonBlackPixels: nonBlackCount,
                        maxBrightness: maxBrightness,
                        avgBrightness: totalBrightness / (pixels.length / 4),
                        nonBlackRatio: nonBlackCount / (pixels.length / 4)
                    };
                }
            """)
            
            if pixel_result:
                print(f"\n📈 绘制后像素分析:")
                print(f"  - 总像素数: {pixel_result['totalPixels']:,}")
                print(f"  - 非黑色像素: {pixel_result['nonBlackPixels']:,}")
                print(f"  - 非黑像素比例: {pixel_result['nonBlackRatio']*100:.2f}%")
                print(f"  - 最大亮度: {pixel_result['maxBrightness']}/255")
                print(f"  - 平均亮度: {pixel_result['avgBrightness']:.2f}/255")
                
                if pixel_result['nonBlackPixels'] < 100:
                    log_test("光轨可见性检查", False, 
                        f"绘制后非黑像素仅 {pixel_result['nonBlackPixels']} 个，光轨几乎不可见。"
                        f"最大亮度 {pixel_result['maxBrightness']}/255，线宽可能过小。")
                    test_results.append(("光轨可见性检查", False, 
                        f"非黑像素: {pixel_result['nonBlackPixels']}, 最大亮度: {pixel_result['maxBrightness']}"))
                elif pixel_result['maxBrightness'] < 100:
                    log_test("光轨可见性检查", False, 
                        f"光轨亮度不足，最大亮度仅 {pixel_result['maxBrightness']}/255，"
                        f"发光效果不明显。")
                    test_results.append(("光轨可见性检查", False, 
                        f"最大亮度: {pixel_result['maxBrightness']}"))
                else:
                    log_test("光轨可见性检查", True, 
                        f"光轨可见，非黑像素 {pixel_result['nonBlackPixels']:,} 个，"
                        f"最大亮度 {pixel_result['maxBrightness']}/255")
                    test_results.append(("光轨可见性检查", True, 
                        f"非黑像素: {pixel_result['nonBlackPixels']:,}, 最大亮度: {pixel_result['maxBrightness']}"))
        
        except Exception as e:
            print(f"像素分析错误: {e}")
            log_test("像素分析", False, str(e))
            test_results.append(("像素分析", False, str(e)))
        
        # 控制台错误检查
        if len(console_errors) == 0:
            log_test("控制台错误", True, "无错误")
            test_results.append(("控制台错误", True, "无"))
        else:
            log_test("控制台错误", False, f"发现 {len(console_errors)} 个错误")
            test_results.append(("控制台错误", False, f"{len(console_errors)} 个"))
        
        time.sleep(2)
        browser.close()
    
    print("\n" + "="*80)
    print("📊 视觉验证总结")
    print("="*80)
    
    passed = sum(1 for r in test_results if r[1])
    total = len(test_results)
    
    print(f"\n通过: {passed}/{total} ({passed/total*100:.1f}%)")
    print(f"失败: {total-passed}/{total}\n")
    
    return test_results, console_errors

if __name__ == "__main__":
    results, errors = run_visual_verify()
