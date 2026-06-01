import time
import json
from playwright.sync_api import sync_playwright, TimeoutError as PlaywrightTimeoutError

IMG_DIR = "/Users/liboyang/trae/dailyTools/crystal-growth/img"
URL = "http://localhost:5184/"

results = {
    "page_load": False,
    "console_errors": [],
    "screenshots": [],
    "render_success": False,
    "webgl_info": None,
}

def run():
    with sync_playwright() as p:
        print("[*] 启动浏览器...", flush=True)
        try:
            browser = p.chromium.launch(headless=True, args=["--disable-gpu", "--no-sandbox"])
        except Exception as e:
            print(f"[!] 浏览器启动失败: {e}", flush=True)
            return

        context = browser.new_context(viewport={"width": 1280, "height": 800})
        page = context.new_page()

        def on_console(msg):
            if msg.type == "error":
                results["console_errors"].append({
                    "type": msg.type,
                    "text": msg.text,
                    "location": str(msg.location),
                })

        def on_pageerror(err):
            results["console_errors"].append({
                "type": "pageerror",
                "text": str(err),
            })

        page.on("console", on_console)
        page.on("pageerror", on_pageerror)

        print("[1] 正在加载页面...", flush=True)
        try:
            resp = page.goto(URL, timeout=20000)
            print(f"    响应状态: {resp.status if resp else 'None'}", flush=True)
            time.sleep(5)
            results["page_load"] = True
            print("    页面加载成功", flush=True)
        except PlaywrightTimeoutError:
            print("    页面加载超时", flush=True)
        except Exception as e:
            print(f"    页面加载失败: {e}", flush=True)

        if not results["page_load"]:
            browser.close()
            return

        print("[2] 初始状态截图(第4轮)...", flush=True)
        try:
            page.screenshot(path=f"{IMG_DIR}/r4_initial.png", timeout=15000)
            results["screenshots"].append("r4_initial.png")
            print("    截图成功", flush=True)
        except Exception as e:
            print(f"    截图失败: {e}", flush=True)

        print("[3] 等待 8 秒后截图(晶体生长中)...", flush=True)
        time.sleep(8)
        try:
            page.screenshot(path=f"{IMG_DIR}/r4_grown.png", timeout=15000)
            results["screenshots"].append("r4_grown.png")
            print("    截图成功", flush=True)
        except Exception as e:
            print(f"    截图失败: {e}", flush=True)

        print("[4] 等待 8 秒后截图(完全生长)...", flush=True)
        time.sleep(8)
        try:
            page.screenshot(path=f"{IMG_DIR}/r4_fully_grown.png", timeout=15000)
            results["screenshots"].append("r4_fully_grown.png")
            print("    截图成功", flush=True)
        except Exception as e:
            print(f"    截图失败: {e}", flush=True)

        print("[5] 测试空格键重置...", flush=True)
        try:
            page.keyboard.press("Space")
            time.sleep(2)
            page.screenshot(path=f"{IMG_DIR}/r4_after_reset.png", timeout=15000)
            results["screenshots"].append("r4_after_reset.png")
            print("    重置测试成功", flush=True)
        except Exception as e:
            print(f"    重置测试失败: {e}", flush=True)

        print("[6] 重置后重新生长...", flush=True)
        time.sleep(10)
        try:
            page.screenshot(path=f"{IMG_DIR}/r4_regrown.png", timeout=15000)
            results["screenshots"].append("r4_regrown.png")
            print("    截图成功", flush=True)
        except Exception as e:
            print(f"    截图失败: {e}", flush=True)

        print("[7] 测试 R 键切换自动旋转...", flush=True)
        try:
            page.keyboard.press("KeyR")
            time.sleep(2)
            page.screenshot(path=f"{IMG_DIR}/r4_after_R.png", timeout=15000)
            results["screenshots"].append("r4_after_R.png")
            print("    切换测试成功", flush=True)
        except Exception as e:
            print(f"    切换测试失败: {e}", flush=True)

        print("[8] 检测 WebGL 和 canvas...", flush=True)
        try:
            gl_info = page.evaluate("""() => {
                const canvas = document.querySelector('canvas');
                if (!canvas) return { error: 'no canvas' };
                const gl2 = canvas.getContext('webgl2');
                const gl = canvas.getContext('webgl');
                if (!gl2 && !gl) return { error: 'no webgl context' };
                return {
                    webgl2: !!gl2,
                    webgl: !!gl,
                    width: canvas.width,
                    height: canvas.height,
                };
            }""")
            print(f"    WebGL 信息: {json.dumps(gl_info)}", flush=True)
            results["webgl_info"] = gl_info
            results["render_success"] = "error" not in gl_info
        except Exception as e:
            print(f"    WebGL 检测失败: {e}", flush=True)
            results["render_success"] = False

        print("[9] 检测页面 title...", flush=True)
        try:
            title = page.title()
            print(f"    页面标题: {title}", flush=True)
            results["page_title"] = title
        except Exception as e:
            print(f"    标题检测失败: {e}", flush=True)

        print("[10] 控制台错误汇总...", flush=True)
        error_count = len(results["console_errors"])
        print(f"    控制台错误数量: {error_count}", flush=True)
        for err in results["console_errors"][:20]:
            print(f"    - [{err['type']}] {err['text']}", flush=True)

        browser.close()

    with open(f"{IMG_DIR}/test_results_r4.json", "w", encoding="utf-8") as f:
        json.dump(results, f, ensure_ascii=False, indent=2)

    print("\n========== 第4轮测试完成 ==========", flush=True)
    print(f"页面加载: {'成功' if results['page_load'] else '失败'}", flush=True)
    print(f"渲染成功: {'是' if results['render_success'] else '否'}", flush=True)
    print(f"控制台错误: {len(results['console_errors'])} 个", flush=True)
    print(f"截图: {len(results['screenshots'])} 张", flush=True)

if __name__ == "__main__":
    run()