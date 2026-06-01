#!/usr/bin/env python3
"""诊断脚本 - 深入分析光轨不可见的问题"""

import time
import json
from playwright.sync_api import sync_playwright

IMG_DIR = "/Users/liboyang/trae/dailyTools/light-painter/img"

def run_diagnose():
    print("\n" + "="*80)
    print("🔬 光绘画板 - 深度诊断")
    print("="*80 + "\n")
    
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(
            viewport={"width": 1280, "height": 800},
            device_scale_factor=1
        )
        page = context.new_page()
        
        console_logs = []
        page.on("console", lambda msg: console_logs.append(f"[{msg.type}] {msg.text}"))
        page.on("pageerror", lambda exc: console_logs.append(f"[pageerror] {exc.message}\n{exc.stack}"))
        
        page.goto("http://localhost:5180", wait_until="domcontentloaded", timeout=30000)
        time.sleep(3)
        
        # 注入诊断代码
        diagnose_result = page.evaluate("""
            async () => {
                const result = {
                    config: {},
                    mouseEvents: [],
                    lineCreation: [],
                    pixelAnalysis: {},
                    calculations: {}
                };
                
                // 1. 获取源代码配置
                try {
                    const response = await fetch('/src/canvas/LightTrail.ts');
                    const source = await response.text();
                    
                    // 提取 linewidth (处理科学计数法)
                    const lwMatch = source.match(/linewidth\\s*:\\s*([0-9eE.\\-]+)/);
                    if (lwMatch) {
                        result.config.linewidth = parseFloat(lwMatch[1]);
                        result.config.linewidthStr = lwMatch[1];
                    }
                    
                    // 提取 blending
                    const blendMatch = source.match(/blending\\s*:\\s*THREE\\.(\\w+)/);
                    if (blendMatch) {
                        result.config.blending = blendMatch[1];
                    }
                    
                    // 提取距离阈值
                    const distMatch = source.match(/distance\\s*>\\s*([0-9.]+)/);
                    if (distMatch) {
                        result.config.distanceThreshold = parseFloat(distMatch[1]);
                    }
                } catch(e) {
                    result.config.error = e.message;
                }
                
                // 2. 计算世界单位到像素的转换
                // 相机参数: fov=60, z=5
                const fov = 60;
                const cameraZ = 5;
                const canvas = document.querySelector('canvas');
                const screenHeight = canvas ? canvas.height : window.innerHeight;
                
                // 在 z=0 平面上的可见高度 = 2 * tan(fov/2) * distance
                const visibleHeight = 2 * Math.tan(fov * Math.PI / 360) * cameraZ;
                const pixelsPerWorldUnit = screenHeight / visibleHeight;
                
                result.calculations = {
                    fov: fov,
                    cameraZ: cameraZ,
                    visibleHeight: visibleHeight,
                    screenHeight: screenHeight,
                    pixelsPerWorldUnit: pixelsPerWorldUnit,
                    linewidthInPixels: result.config.linewidth ? 
                        result.config.linewidth * pixelsPerWorldUnit : null
                };
                
                // 3. 监听鼠标事件和 Line 创建
                // 拦截 addPoint 方法
                window.__diagnostic__ = {
                    points: [],
                    lines: [],
                    eventLog: []
                };
                
                // 模拟鼠标绘制
                const centerX = window.innerWidth / 2;
                const centerY = window.innerHeight / 2;
                
                // 创建自定义事件
                function simulateMouseDown(x, y) {
                    const evt = new MouseEvent('mousedown', {
                        clientX: x, clientY: y,
                        bubbles: true, cancelable: true,
                        buttons: 1
                    });
                    canvas.dispatchEvent(evt);
                    window.__diagnostic__.eventLog.push({type: 'mousedown', x, y});
                }
                
                function simulateMouseMove(x, y) {
                    const evt = new MouseEvent('mousemove', {
                        clientX: x, clientY: y,
                        bubbles: true, cancelable: true,
                        buttons: 1
                    });
                    canvas.dispatchEvent(evt);
                    window.__diagnostic__.eventLog.push({type: 'mousemove', x, y});
                }
                
                function simulateMouseUp() {
                    const evt = new MouseEvent('mouseup', {
                        bubbles: true, cancelable: true
                    });
                    canvas.dispatchEvent(evt);
                    window.__diagnostic__.eventLog.push({type: 'mouseup'});
                }
                
                // 绘制一条明显的横线
                simulateMouseDown(100, centerY);
                await new Promise(r => setTimeout(r, 50));
                
                for (let i = 0; i <= 50; i++) {
                    const x = 100 + i * (window.innerWidth - 200) / 50;
                    simulateMouseMove(x, centerY);
                    await new Promise(r => setTimeout(r, 10));
                }
                
                simulateMouseUp();
                await new Promise(r => setTimeout(r, 500));
                
                // 4. 再次分析像素
                const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
                if (gl) {
                    const w = canvas.width;
                    const h = canvas.height;
                    const pixels = new Uint8Array(w * h * 4);
                    gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
                    
                    let nonBlack = 0;
                    let maxBright = 0;
                    let brightPixels = [];
                    
                    for (let y = 0; y < h; y++) {
                        for (let x = 0; x < w; x++) {
                            const idx = (y * w + x) * 4;
                            const r = pixels[idx];
                            const g = pixels[idx + 1];
                            const b = pixels[idx + 2];
                            const bright = Math.max(r, g, b);
                            if (bright > maxBright) maxBright = bright;
                            if (bright > 10) {
                                nonBlack++;
                                if (brightPixels.length < 20) {
                                    brightPixels.push({x, y, r, g, b, bright});
                                }
                            }
                        }
                    }
                    
                    result.pixelAnalysis = {
                        width: w,
                        height: h,
                        nonBlackPixels: nonBlack,
                        maxBrightness: maxBright,
                        samplePixels: brightPixels,
                        nonBlackRatio: nonBlack / (w * h)
                    };
                }
                
                // 5. 检查场景中的对象
                // 通过全局 Three.js 实例（如果有的话）
                if (window.__diagnostic__) {
                    result.diagnosticData = window.__diagnostic__;
                }
                
                return JSON.stringify(result, null, 2);
            }
        """)
        
        diag = json.loads(diagnose_result)
        
        print("📋 配置分析:")
        print(f"  源代码 linewidth: {diag['config'].get('linewidthStr')} = {diag['config'].get('linewidth')}")
        print(f"  源代码 blending: {diag['config'].get('blending')}")
        print(f"  距离阈值: {diag['config'].get('distanceThreshold')}")
        
        print(f"\n🔢 空间计算:")
        calc = diag['calculations']
        print(f"  相机 FOV: {calc['fov']}°")
        print(f"  相机 Z 距离: {calc['cameraZ']}")
        print(f"  Z=0 平面可见高度: {calc['visibleHeight']:.4f} 世界单位")
        print(f"  屏幕高度: {calc['screenHeight']} 像素")
        print(f"  换算比例: 1 世界单位 ≈ {calc['pixelsPerWorldUnit']:.1f} 像素")
        if calc['linewidthInPixels'] is not None:
            print(f"  线宽实际像素: {calc['linewidthInPixels']:.4f} 像素")
            if calc['linewidthInPixels'] < 1:
                print(f"  ❌ 线宽小于 1 像素，会被抗锯齿完全消除！")
            elif calc['linewidthInPixels'] < 2:
                print(f"  ⚠️  线宽约 1 像素，非常细，几乎不可见")
        
        print(f"\n📊 像素分析:")
        pa = diag['pixelAnalysis']
        print(f"  画布尺寸: {pa.get('width')}x{pa.get('height')}")
        print(f"  非黑色像素: {pa.get('nonBlackPixels'):,}")
        print(f"  非黑像素比例: {pa.get('nonBlackRatio', 0)*100:.6f}%")
        print(f"  最大亮度: {pa.get('maxBrightness')}/255")
        
        if pa.get('samplePixels'):
            print(f"  采样亮像素:")
            for sp in pa['samplePixels'][:5]:
                print(f"    ({sp['x']}, {sp['y']}): RGB({sp['r']},{sp['g']},{sp['b']}) = {sp['bright']}")
        
        print(f"\n🎯 诊断结论:")
        lw = diag['config'].get('linewidth')
        lw_px = calc.get('linewidthInPixels', 0)
        nb = pa.get('nonBlackPixels', 0)
        mb = pa.get('maxBrightness', 0)
        
        issues = []
        if lw is not None and lw < 0.01:
            issues.append(f"线宽严重不足: {lw} 世界单位 = {lw_px:.2f} 像素，小于抗锯齿阈值")
        if nb == 0:
            issues.append("光轨完全不可见，画布上没有任何非黑色像素")
        elif nb < 100:
            issues.append(f"光轨几乎不可见，仅 {nb} 个像素")
        if mb < 50:
            issues.append(f"亮度不足，最大亮度仅 {mb}/255")
        
        if len(issues) == 0:
            print("  ✅ 未发现明显问题")
        else:
            print("  ❌ 发现问题:")
            for issue in issues:
                print(f"    - {issue}")
        
        print(f"\n📝 建议:")
        print("  1. 增大 linewidth 到 0.05-0.2 世界单位范围")
        print("  2. 或者改用像素单位的线宽（LineMaterial 的 linewidth 实际是世界单位）")
        print("  3. 可以考虑叠加发光后期处理效果")
        
        # 保存截图
        page.screenshot(path=f"{IMG_DIR}/diagnose_result.png")
        
        browser.close()
    
    print("\n" + "="*80 + "\n")
    
    return diag

if __name__ == "__main__":
    result = run_diagnose()
