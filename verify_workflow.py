#!/usr/bin/env python3
"""
验证工作流脚本 — 调用火山引擎大模型，按验证工作流输出三大产物：
  A. 验收结论
  B. 归因诊断
  C. 下一轮 Prompt

用法：
  # 交互式（会弹出文件选择器）
  python3 verify_workflow.py

  # 命令行指定
  python3 verify_workflow.py --screenshot path/to/img.png --requirement "需求描述" --round 1

  # 续作迭代
  python3 verify_workflow.py --screenshot result.png --requirement "需求同前" --round 3 --stage "物理碰撞检测"
"""

import argparse
import base64
import json
import os
import sys
import tkinter as tk
from pathlib import Path
from tkinter import filedialog

from dotenv import load_dotenv
from openai import OpenAI
from PIL import Image

# ── 从 .env 加载配置 ─────────────────────────────────────
load_dotenv(Path(__file__).resolve().parent / ".env")

VOLC_API_KEY = os.environ.get("VOLC_API_KEY", "")
VOLC_BASE_URL = os.environ.get("VOLC_BASE_URL", "https://ark.cn-beijing.volces.com/api/v3")
VOLC_MODEL = os.environ.get("VOLC_MODEL", "doubao-1-5-pro-256k-250115")

# ── 系统提示词 ────────────────────────────────────────────
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


def encode_image(image_path: str) -> str:
    """将图片编码为 base64，自动压缩超大的图片"""
    img = Image.open(image_path)

    # 如果图片超过 2048px 任意一边，等比缩放
    max_side = 2048
    if max(img.size) > max_side:
        ratio = max_side / max(img.size)
        new_size = (int(img.width * ratio), int(img.height * ratio))
        img = img.resize(new_size, Image.LANCZOS)

    # 如果是 RGBA 或 P 模式，转 RGB
    if img.mode in ("RGBA", "P"):
        background = Image.new("RGB", img.size, (255, 255, 255))
        if img.mode == "P":
            img = img.convert("RGBA")
        background.paste(img, mask=img.split()[-1])
        img = background
    elif img.mode != "RGB":
        img = img.convert("RGB")

    import io
    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=85)
    return base64.b64encode(buf.getvalue()).decode("utf-8")


def build_user_prompt(requirement: str, round_num: int, stage: str = "") -> str:
    """构造用户消息文本"""
    if round_num == 1:
        return f"需求：{requirement}\n这是第一轮的运行结果（见截图），请验收。"
    else:
        stage_info = f"，当前处于「{stage}」阶段" if stage else ""
        return f"需求同前：{requirement}\n这是第 {round_num} 轮结果{stage_info}（见截图），请验收。"


def call_volc_api(screenshot_path: str, requirement: str, round_num: int, stage: str = "") -> str:
    """调用火山引擎大模型，返回验证结果"""
    if not VOLC_API_KEY:
        print("错误：未配置 VOLC_API_KEY", file=sys.stderr)
        print("请在项目根目录 .env 文件中设置 VOLC_API_KEY=你的API_Key", file=sys.stderr)
        sys.exit(1)

    client = OpenAI(api_key=VOLC_API_KEY, base_url=VOLC_BASE_URL)

    b64_img = encode_image(screenshot_path)
    ext = os.path.splitext(screenshot_path)[1].lower()
    mime = "image/png" if ext == ".png" else "image/jpeg"

    user_text = build_user_prompt(requirement, round_num, stage)

    response = client.chat.completions.create(
        model=VOLC_MODEL,
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": user_text},
                    {
                        "type": "image_url",
                        "image_url": {"url": f"data:{mime};base64,{b64_img}"},
                    },
                ],
            },
        ],
        max_tokens=2048,
        temperature=0.3,
    )

    return response.choices[0].message.content


def pick_screenshot() -> str:
    """弹出文件选择器让用户选择截图"""
    root = tk.Tk()
    root.withdraw()
    path = filedialog.askopenfilename(
        title="选择运行结果截图",
        filetypes=[
            ("图片文件", "*.png *.jpg *.jpeg *.bmp *.gif *.webp"),
            ("所有文件", "*.*"),
        ],
    )
    root.destroy()
    if not path:
        print("未选择截图，退出。", file=sys.stderr)
        sys.exit(0)
    return path


def main():
    parser = argparse.ArgumentParser(description="验证工作流 — 火山引擎大模型驱动")
    parser.add_argument("--screenshot", "-s", help="运行结果截图路径")
    parser.add_argument("--requirement", "-r", help="核心需求描述")
    parser.add_argument("--round", "-n", type=int, default=1, help="当前第几轮（默认1）")
    parser.add_argument("--stage", help="当前阶段描述（如：物理碰撞检测）")
    parser.add_argument("--output", "-o", help="将结果保存到文件（可选）")
    args = parser.parse_args()

    # 获取截图路径
    screenshot = args.screenshot
    if not screenshot:
        screenshot = pick_screenshot()

    if not os.path.isfile(screenshot):
        print(f"错误：截图文件不存在 → {screenshot}", file=sys.stderr)
        sys.exit(1)

    # 获取需求
    requirement = args.requirement
    if not requirement:
        requirement = input("请输入核心需求（新项目简述目标，续作写"需求同前"）：\n> ").strip()
    if not requirement:
        requirement = "需求同前"

    stage = args.stage or ""

    print(f"\n{'='*60}")
    print(f"验证工作流 · 第 {args.round} 轮")
    print(f"截图: {screenshot}")
    print(f"需求: {requirement}")
    if stage:
        print(f"阶段: {stage}")
    print(f"模型: {VOLC_MODEL}")
    print(f"{'='*60}\n")

    print("正在调用火山引擎大模型进行验收...")
    result = call_volc_api(screenshot, requirement, args.round, stage)

    print(f"\n{'='*60}")
    print(result)
    print(f"{'='*60}\n")

    # 保存结果
    if args.output:
        with open(args.output, "w", encoding="utf-8") as f:
            f.write(f"# 验证工作流 · 第 {args.round} 轮\n\n")
            f.write(f"**需求**: {requirement}\n\n")
            if stage:
                f.write(f"**阶段**: {stage}\n\n")
            f.write(result)
        print(f"结果已保存到: {args.output}")


if __name__ == "__main__":
    main()
