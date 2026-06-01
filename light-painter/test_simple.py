#!/usr/bin/env python3
"""简单测试 - 检查光轨可见性和配置"""

import time
from playwright.sync_api import sync_playwright

IMG_DIR = "/Users/liboyang/trae/dailyTools/light-painter/img"

def run_test():
    print("\n" + "="*80)
    print("🔍 光绘画板 - 简单测试")
    print("="*80 + "\n")
    
    network_errors = []
    
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(
            viewport={"width": 1280, "height": 800},
            device_scale_factor=1
        )
        page = context.new_page()
        
        # 监听网络请求
        def on_response(response):
            if response.status >= 400:
                network_errors.append({
                    "url": response.url,
                    "status": response.status,
                    "status_text": response.status_text
                })
        
        page.on("response", on_response)
        
        console_errors = []
        page.on("console", lambda msg: console_errors.append(f"[{msg.type}] {msg.text}") if msg.type == "error" else None)
        page.on("pageerror", lambda exc: console_errors.append(f"[pageerror] {exc.message}"))
        
        # 加载页面
        print("加载页面...")
        page.goto("http://localhost:5180", wait_until="domcontentloaded", timeout=30000)
        time.sleep(3)
        
        print(f"\n📋 网络错误:")
        for err in network_errors:
            print(f"  {err['status']} {err['status_text']}: {err['url']}")
        
        print(f"\n📋 控制台错误:")
        for err in console_errors:
            print(f"  {err}")
        
        # 检查源代码配置
        print(f"\n🔧 检查代码配置...")
        source_info = page.evaluate("""
            async () => {
                try {
                    const response = await fetch('/src/canvas/LightTrail.ts');
                    const source = await response.text();
                    
                    // 查找 linewidth
                    let linewidth = null;
                    const lwLines = source.split('\\n').filter(l => l.includes('linewidth'));
                    if (lwLines.length > 0) {
                        const match = lwLines[0].match(/linewidth\\s*:\\s*([0-9.]+)/);
                        if (match) linewidth = parseFloat(match[1]);
                    }
                    
                    // 查找 blending
                    let blending = null;
                    const blendLines = source.split('\\n').filter(l => l.includes('blending') && l.includes('THREE'));
                    if (blendLines.length > 0) {
                        const match = blendLines[0].match(/THREE\\.(\\w+Blending)/);
                        if (match) blending = match[1];
                    }
                    
                    return { linewidth, blending, sourcePreview: lwLines.concat(blendLines) };
                } catch(e) {
                    return { error: e.message };
                }
            }
        """)
        
        print(f"  源代码 linewidth: {source_info.get('linewidth')}")
        print(f"  源代码 blending: {source_info.get('blending')}")
        if source_info.get('sourcePreview'):
            print(f"  相关代码行:")
            for line in source_info['sourcePreview']:
                print(f"    {line.strip()}")
        
        # 进行鼠标绘制
        print(f"\n🖱️  进行鼠标绘制测试...")
        canvas = page.locator("canvas").first
        box = canvas.bounding_box()
        
        # 绘制一条粗线 - 多次来回
        for i in range(20):
            start_x = box["x"] + 200
            start_y = box["y"] + 200 + i * 2
            end_x = box["x"] + box["width"] - 200
            end_y = box["y"] + box["height"] - 200 - i * 2
            
            page.mouse.move(start_x, start_y)
            page.mouse.down()
            
            steps = 50
            for s in range(steps + 1):
                t = s / steps
                x = start_x + (end_x - start_x) * t
                y = start_y + (end_y - start_y) * t
                page.mouse.move(x, y)
            
            page.mouse.up()
            time.sleep(0.1)
        
        time.sleep(1)
        
        # 截图
        page.screenshot(path=f"{IMG_DIR}/simple_test_drawing.png")
        print(f"  截图已保存: {IMG_DIR}/simple_test_drawing.png")
        
        # 分析像素
        pixel_info = page.evaluate("""
            () => {
                const canvas = document.querySelector('canvas');
                if (!canvas) return { error: 'no canvas' };
                
                const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
                if (!gl) return { error: 'no gl context' };
                
                const w = canvas.width;
                const h = canvas.height;
                const pixels = new Uint8Array(w * h * 4);
                gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
                
                let nonBlack = 0;
                let maxBright = 0;
                let totalBright = 0;
                
                for (let i = 0; i < pixels.length; i += 4) {
                    const r = pixels[i];
                    const g = pixels[i+1];
                    const b = pixels[i+2];
                    const bright = Math.max(r, g, b);
                    totalBright += bright;
                    if (bright > 20) {
                        nonBlack++;
                        if (bright > maxBright) maxBright = bright;
                    }
                }
                
                return {
                    width: w,
                    height: h,
                    nonBlackPixels: nonBlack,
                    maxBrightness: maxBright,
                    avgBrightness: totalBright / (w * h),
                    nonBlackRatio: nonBlack / (w * h)
                };
            }
        """)
        
        print(f"\n📊 像素分析结果:")
        print(f"  画布尺寸: {pixel_info.get('width')}x{pixel_info.get('height')}")
        print(f"  非黑色像素: {pixel_info.get('nonBlackPixels'):,}")
        print(f"  非黑像素比例: {pixel_info.get('nonBlackRatio', 0)*100:.4f}%")
        print(f"  最大亮度: {pixel_info.get('maxBrightness')}/255")
        print(f"  平均亮度: {pixel_info.get('avgBrightness', 0):.4f}/255")
        
        # 评估结果
        print(f"\n🎯 评估:")
        lw = source_info.get('linewidth')
        if lw is not None:
            if lw < 0.01:
                print(f"  ❌ 线宽严重不足: {lw} 世界单位，约 {lw * 138:.1f} 像素（1世界单位≈138像素）")
                print(f"     建议增大到 0.05-0.2 范围，或使用像素单位的线宽")
            elif lw < 0.05:
                print(f"  ⚠️  线宽偏小: {lw} 世界单位，约 {lw * 138:.1f} 像素")
            else:
                print(f"  ✅ 线宽合适: {lw} 世界单位")
        
        nb = pixel_info.get('nonBlackPixels', 0)
        mb = pixel_info.get('maxBrightness', 0)
        if nb < 100:
            print(f"  ❌ 光轨几乎不可见！仅 {nb} 个非黑像素")
        elif mb < 100:
            print(f"  ⚠️  光轨亮度不足: 最大亮度仅 {mb}/255")
        else:
            print(f"  ✅ 光轨可见，亮度正常")
        
        if source_info.get('blending') == 'AdditiveBlending':
            print(f"  ✅ 混合模式正确: AdditiveBlending")
        else:
            print(f"  ❌ 混合模式错误: {source_info.get('blending')}")
        
        if len(network_errors) > 0:
            print(f"  ❌ 存在 {len(network_errors)} 个网络错误")
        else:
            print(f"  ✅ 无网络错误")
        
        if len(console_errors) > 0:
            print(f"  ❌ 存在 {len(console_errors)} 个控制台错误")
        else:
            print(f"  ✅ 无控制台错误")
        
        browser.close()
    
    print("\n" + "="*80 + "\n")

if __name__ == "__main__":
    run_test()
