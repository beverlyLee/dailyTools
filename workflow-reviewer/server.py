#!/usr/bin/env python3
"""
验证工作流 Web 后端 — 代理火山引擎大模型 API 调用

启动: python3 server.py
端口: 默认 8000，可通过 --port 或 PORT 环境变量指定
"""

import base64
import io
import os
import sys
from pathlib import Path

import uvicorn
from dotenv import load_dotenv
from fastapi import FastAPI, File, Form, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, HTMLResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from openai import OpenAI
from PIL import Image

# ── 配置 ──────────────────────────────────────────────────
load_dotenv(Path(__file__).resolve().parent / ".env")

VOLC_API_KEY = os.environ.get("VOLC_API_KEY", "")
VOLC_BASE_URL = os.environ.get("VOLC_BASE_URL", "https://ark.cn-beijing.volces.com/api/v3")
VOLC_MODEL = os.environ.get("VOLC_MODEL", "doubao-1-5-pro-256k-250115")

SYSTEM_PROMPT = """你是一位严格的人工测试员，负责验收 AI 编程助手的产出物。你必须仅通过视觉和逻辑判断结果是否符合需求，输出以下三个标准产物：

### 【验收结论】
- 形式：状态标签 + 一句话总结
- 状态集：
  - ✅ 达标：符合需求，可交付或进入下一阶段
  - ⚠️ 部分达标：大方向对，但有瑕疵（性能不足、边缘锯齿、偶发Bug等）
  - ❌ 严重偏离：核心逻辑错误，产出物不可用（白屏、数据全错、穿模等）
- 必须严格对照需求，拒绝"差不多"

### 【归因诊断】
- 形式：分点列举当前存在的逻辑/视觉问题
- 规则：
  - 由果溯因：基于截图现象反推可能的逻辑漏洞
  - 层层递进：比上一轮挖掘得更深
  - 去代码化：不讲具体API，讲逻辑（如：空间计算错误、状态同步延迟、抗锯齿失效）

### 【下一轮 Prompt (~220字)】
- 形式：给 AI 编程助手的整改指令
- Vibe Coding 风格：强调 Why（目的）和 What（效果），弱化 How（具体代码）
- 结构清晰：
  1. 否定：明确指出要废弃或规避的错误路径
  2. 修正：给出具体的逻辑调整方向或算法建议
  3. 锚定：描述期望达到的视觉效果或性能指标"""

# ── App ───────────────────────────────────────────────────
app = FastAPI(title="验证工作流")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

STATIC_DIR = Path(__file__).resolve().parent


@app.get("/", response_class=HTMLResponse)
async def index():
    return (STATIC_DIR / "index.html").read_text(encoding="utf-8")


@app.get("/styles.css")
async def styles():
    return FileResponse(str(STATIC_DIR / "styles.css"), media_type="text/css")


@app.get("/main.js")
async def main_js():
    return FileResponse(str(STATIC_DIR / "main.js"), media_type="application/javascript")


@app.get("/api/config")
async def config():
    return {"model": VOLC_MODEL, "has_key": bool(VOLC_API_KEY)}


@app.post("/api/verify")
async def verify(
    project_name: str = Form(""),
    requirement: str = Form(...),
    round_num: int = Form(1),
    stage: str = Form(""),
    screenshots: list[UploadFile] = File(...),
):
    if not VOLC_API_KEY:
        return JSONResponse(
            status_code=500,
            content={"error": "未配置 VOLC_API_KEY，请在 .env 文件中设置"},
        )

    if not screenshots or all(s.size == 0 for s in screenshots):
        return JSONResponse(
            status_code=400,
            content={"error": "请上传至少一张运行结果截图"},
        )

    # 编码图片
    image_contents = []
    for f in screenshots:
        if f.size == 0:
            continue
        data = await f.read()
        b64, mime = encode_image_bytes(data)
        image_contents.append({"b64": b64, "mime": mime})

    if not image_contents:
        return JSONResponse(
            status_code=400,
            content={"error": "截图处理失败，请重试"},
        )

    # 构造消息
    user_text = build_user_prompt(requirement, round_num, stage, project_name)

    content = [{"type": "text", "text": user_text}]
    for img in image_contents:
        content.append({
            "type": "image_url",
            "image_url": {"url": f"data:{img['mime']};base64,{img['b64']}"},
        })

    # 调用 API
    try:
        client = OpenAI(api_key=VOLC_API_KEY, base_url=VOLC_BASE_URL)
        response = client.chat.completions.create(
            model=VOLC_MODEL,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": content},
            ],
            max_tokens=2048,
            temperature=0.3,
        )
        result_text = response.choices[0].message.content
    except Exception as e:
        return JSONResponse(
            status_code=502,
            content={"error": f"API 调用失败: {str(e)}"},
        )

    return {
        "project_name": project_name,
        "requirement": requirement,
        "round": round_num,
        "stage": stage,
        "result": result_text,
    }


@app.post("/api/screenshot")
async def screenshot(url: str = Form("")):
    return JSONResponse(
        status_code=501,
        content={
            "error": "自动截图功能尚未实现",
            "hint": "此接口预留用于后续接入 Playwright/Puppeteer 实现浏览器自动截图",
        },
    )


# ── 工具函数 ──────────────────────────────────────────────

def encode_image_bytes(data: bytes) -> tuple[str, str]:
    """将图片字节编码为 base64，自动压缩超大图片"""
    img = Image.open(io.BytesIO(data))

    max_side = 2048
    if max(img.size) > max_side:
        ratio = max_side / max(img.size)
        new_size = (int(img.width * ratio), int(img.height * ratio))
        img = img.resize(new_size, Image.LANCZOS)

    if img.mode in ("RGBA", "P"):
        background = Image.new("RGB", img.size, (255, 255, 255))
        if img.mode == "P":
            img = img.convert("RGBA")
        background.paste(img, mask=img.split()[-1])
        img = background
    elif img.mode != "RGB":
        img = img.convert("RGB")

    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=85)
    return base64.b64encode(buf.getvalue()).decode("utf-8"), "image/jpeg"


def build_user_prompt(requirement: str, round_num: int, stage: str = "", project_name: str = "") -> str:
    parts = []
    if project_name:
        parts.append(f"工程：{project_name}")
    if round_num == 1:
        parts.append(f"需求：{requirement}")
        parts.append("这是第一轮的运行结果（见截图），请验收。")
    else:
        parts.append(f"需求同前：{requirement}")
        stage_info = f"，当前处于「{stage}」阶段" if stage else ""
        parts.append(f"这是第 {round_num} 轮结果{stage_info}（见截图），请验收。")
    return "\n".join(parts)


# ── 启动 ──────────────────────────────────────────────────
if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    if len(sys.argv) > 1:
        for i, arg in enumerate(sys.argv):
            if arg == "--port" and i + 1 < len(sys.argv):
                port = int(sys.argv[i + 1])

    print(f"验证工作流 Web 服务启动: http://localhost:{port}")
    uvicorn.run(app, host="0.0.0.0", port=port)
