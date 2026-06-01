#!/usr/bin/env python3
"""
验证工作流 Web 后端 — 代理火山引擎大模型 API 调用

启动: python3 server.py
端口: 默认 8980，可通过 --port 或 PORT 环境变量指定
"""

import base64
import io
import os
import sys
import subprocess
import asyncio
import webbrowser
import threading
import time
import re
from pathlib import Path
from typing import Optional

import uvicorn
from dotenv import load_dotenv, set_key
from fastapi import FastAPI, File, Form, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, HTMLResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from openai import OpenAI
from pydantic import BaseModel
from PIL import Image

running_process: Optional[subprocess.Popen] = None
running_processes: list = []
running_port: int = 0

# ── 配置 ──────────────────────────────────────────────────
ENV_PATH = Path(__file__).resolve().parent / ".env"
CONFIG_FILE = Path(__file__).resolve().parent / "config.json"
load_dotenv(ENV_PATH)

VOLC_API_KEY = os.environ.get("VOLC_API_KEY", "")
VOLC_BASE_URL = os.environ.get("VOLC_BASE_URL", "https://ark.cn-beijing.volces.com/api/v3")
VOLC_MODEL = os.environ.get("VOLC_MODEL", "doubao-1-5-pro-256k-250115")

DEFAULT_SYSTEM_PROMPT = """你是一位严格的人工测试员，负责验收 AI 编程助手的产出物。你必须仅通过视觉和逻辑判断结果是否符合需求，输出以下三个标准产物：

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

DEFAULT_USER_PROMPT_TEMPLATE = """工程：{project_name}
{requirement_text}
这是第 {round_num} 轮结果{stage_info}（见截图），请验收。"""

def load_config():
    import json
    if CONFIG_FILE.exists():
        try:
            with open(CONFIG_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            pass
    return {
        "system_prompt": DEFAULT_SYSTEM_PROMPT,
        "user_prompt_template": DEFAULT_USER_PROMPT_TEMPLATE,
    }

RUNTIME_CONFIG = load_config()

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


@app.api_route("/{path:path}", response_class=HTMLResponse, methods=["GET"])
async def catch_all(path: str):
    if path.startswith("api/"):
        return JSONResponse(status_code=404, content={"error": "Not Found"})
    return (STATIC_DIR / "index.html").read_text(encoding="utf-8")


def save_config_json(system_prompt: str, user_prompt_template: str):
    import json
    global RUNTIME_CONFIG
    RUNTIME_CONFIG = {
        "system_prompt": system_prompt or DEFAULT_SYSTEM_PROMPT,
        "user_prompt_template": user_prompt_template or DEFAULT_USER_PROMPT_TEMPLATE,
    }
    with open(CONFIG_FILE, "w", encoding="utf-8") as f:
        json.dump(RUNTIME_CONFIG, f, ensure_ascii=False, indent=2)


@app.get("/api/config")
async def config():
    return {
        "api_key": VOLC_API_KEY[:20] + "..." if VOLC_API_KEY else "",
        "base_url": VOLC_BASE_URL,
        "model": VOLC_MODEL,
        "has_key": bool(VOLC_API_KEY),
        "system_prompt": RUNTIME_CONFIG.get("system_prompt", DEFAULT_SYSTEM_PROMPT),
        "user_prompt_template": RUNTIME_CONFIG.get("user_prompt_template", DEFAULT_USER_PROMPT_TEMPLATE),
    }


@app.post("/api/config")
async def save_config(
    api_key: str = Form(""),
    base_url: str = Form(""),
    model: str = Form(""),
    system_prompt: str = Form(""),
    user_prompt_template: str = Form(""),
):
    global VOLC_API_KEY, VOLC_BASE_URL, VOLC_MODEL

    if api_key:
        VOLC_API_KEY = api_key
        if not ENV_PATH.exists():
            ENV_PATH.touch()
        set_key(str(ENV_PATH), "VOLC_API_KEY", api_key)

    if base_url:
        VOLC_BASE_URL = base_url
        if not ENV_PATH.exists():
            ENV_PATH.touch()
        set_key(str(ENV_PATH), "VOLC_BASE_URL", base_url)

    if model:
        VOLC_MODEL = model
        if not ENV_PATH.exists():
            ENV_PATH.touch()
        set_key(str(ENV_PATH), "VOLC_MODEL", model)

    if system_prompt or user_prompt_template:
        save_config_json(
            system_prompt or RUNTIME_CONFIG.get("system_prompt", DEFAULT_SYSTEM_PROMPT),
            user_prompt_template or RUNTIME_CONFIG.get("user_prompt_template", DEFAULT_USER_PROMPT_TEMPLATE),
        )

    return {
        "success": True,
        "api_key": VOLC_API_KEY[:20] + "..." if VOLC_API_KEY else "",
        "base_url": VOLC_BASE_URL,
        "model": VOLC_MODEL,
    }


@app.post("/api/test-model")
async def test_model(
    api_key: str = Form(""),
    base_url: str = Form(""),
    model: str = Form(""),
):
    key = api_key or VOLC_API_KEY
    url = base_url or VOLC_BASE_URL
    m = model or VOLC_MODEL

    if not key:
        return JSONResponse(
            status_code=400,
            content={"success": False, "error": "请先配置 API Key"},
        )

    try:
        client = OpenAI(api_key=key, base_url=url)
        response = client.chat.completions.create(
            model=m,
            messages=[
                {"role": "user", "content": "回复一句话：连接成功"},
            ],
            max_tokens=50,
            temperature=0.3,
        )
        result = response.choices[0].message.content
        return {"success": True, "message": result}
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"success": False, "error": str(e)},
        )


@app.post("/api/verify")
async def verify(
    project_name: str = Form(""),
    requirement: str = Form(""),
    round_num: int = Form(1),
    stage: str = Form(""),
    user_advice: str = Form(""),
    current_process: str = Form(""),
    api_key: str = Form(""),
    base_url: str = Form(""),
    model: str = Form(""),
    system_prompt: str = Form(""),
    user_prompt_template: str = Form(""),
    screenshots: list[UploadFile] = File(default=[]),
):
    print(f"收到验证请求: requirement='{requirement}', screenshots_count={len(screenshots)}")
    
    key = api_key or VOLC_API_KEY
    url = base_url or VOLC_BASE_URL
    m = model or VOLC_MODEL
    sys_prompt = system_prompt or RUNTIME_CONFIG.get("system_prompt", DEFAULT_SYSTEM_PROMPT)
    user_template = user_prompt_template or RUNTIME_CONFIG.get("user_prompt_template", DEFAULT_USER_PROMPT_TEMPLATE)

    if not key:
        return JSONResponse(
            status_code=500,
            content={"error": "未配置 API Key，请点击右上角 ⚙️ 配置火山引擎模型"},
        )

    if not requirement or not requirement.strip():
        return JSONResponse(
            status_code=400,
            content={"error": "请填写核心需求"},
        )

    valid_screenshots = [s for s in screenshots if s.size > 0]
    if not valid_screenshots:
        return JSONResponse(
            status_code=400,
            content={"error": "请上传至少一张运行结果截图"},
        )

    # 编码图片
    image_contents = []
    for f in valid_screenshots:
        try:
            data = await f.read()
            b64, mime = encode_image_bytes(data)
            image_contents.append({"b64": b64, "mime": mime})
        except Exception as e:
            print(f"[verify] 图片处理失败: {str(e)}")
            return JSONResponse(
                status_code=400,
                content={"error": f"图片处理失败: {str(e)}，请确保上传的是有效的图片文件"},
            )

    if not image_contents:
        return JSONResponse(
            status_code=400,
            content={"error": "截图处理失败，请重试"},
        )

    # 构造消息
    user_text = build_user_prompt(
        requirement, round_num, stage, project_name,
        user_advice=user_advice,
        current_process=current_process,
        template=user_template
    )

    content = [{"type": "text", "text": user_text}]
    for img in image_contents:
        content.append({
            "type": "image_url",
            "image_url": {"url": f"data:{img['mime']};base64,{img['b64']}"},
        })

    messages = [
        {"role": "system", "content": sys_prompt},
        {"role": "user", "content": content},
    ]

    print("\n" + "=" * 80)
    print("🚀 [模型调用] 开始")
    print("=" * 80)
    print(f"📦 项目: {project_name} | 轮次: {round_num} | 阶段: {stage}")
    print(f"🤖 模型: {m}")
    print(f"🔗 接口: {url}")
    print("-" * 80)
    print("📝 System Prompt (完整):")
    print("-" * 80)
    print(sys_prompt)
    print("-" * 80)
    print("💬 User Prompt (完整):")
    print("-" * 80)
    print(user_text)
    print("-" * 80)
    print(f"🖼️  图片数量: {len(image_contents)} 张")
    print("=" * 80)

    # 调用 API
    try:
        client = OpenAI(api_key=key, base_url=url)
        response = client.chat.completions.create(
            model=m,
            messages=messages,
            max_tokens=2048,
            temperature=0.3,
        )
        result_text = response.choices[0].message.content

        print("\n" + "=" * 80)
        print("✅ [模型调用] 成功")
        print("=" * 80)
        print(f"📋 验收结果 (长度: {len(result_text)} 字符):")
        print("-" * 80)
        print(result_text)
        print("=" * 80)
    except Exception as e:
        print("\n" + "=" * 80)
        print("❌ [模型调用] 失败")
        print("=" * 80)
        print(f"错误类型: {type(e).__name__}")
        print(f"错误信息: {str(e)}")
        print("=" * 80 + "\n")
        
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


@app.post("/api/save-result")
async def save_result(
    project_name: str = Form(""),
    project_path: str = Form("/Users/liboyang/trae/dailyTools"),
    requirement: str = Form(""),
    round_num: int = Form(1),
    stage: str = Form(""),
    user_advice: str = Form(""),
    model: str = Form(""),
    base_url: str = Form(""),
    result_text: str = Form(""),
):
    """保存验收结果到项目目录下的 data/工程名.md 文件"""
    
    if not project_name:
        return JSONResponse(
            status_code=400,
            content={"error": "请先输入工程名称"},
        )
    
    project_dir = Path(project_path) / project_name
    data_dir = project_dir / "data"
    
    try:
        data_dir.mkdir(parents=True, exist_ok=True)
        
        md_file = data_dir / f"{project_name}.md"
        
        new_content = f"""
## 第 {round_num} 轮验收结果

**时间**: {time.strftime('%Y-%m-%d %H:%M:%S')}

**阶段**: {stage}

### 核心需求
{requirement}

### 用户建议
{user_advice or '无'}

### 验收结果
{result_text}

### 模型配置
- 模型: {model}
- 接口: {base_url}

---

"""
        
        if md_file.exists():
            existing_content = md_file.read_text(encoding='utf-8')
            header_end = existing_content.find('\n## 第')
            if header_end == -1:
                header_end = existing_content.find('\n---\n')
            if header_end == -1:
                header_end = len(existing_content)
            
            header = existing_content[:header_end].strip()
            
            rounds_section = existing_content[header_end:].strip()
            
            parts = rounds_section.split('\n## 第')
            filtered_parts = [parts[0]]
            for part in parts[1:]:
                match = re.match(r'(\d+) 轮验收结果', part)
                if match and int(match.group(1)) >= round_num:
                    continue
                filtered_parts.append('\n## 第' + part)
            
            rounds_section = '\n'.join(filtered_parts)
            
            updated_content = f"{header}\n\n{new_content.strip()}\n\n{rounds_section}"
        else:
            header = f"""# {project_name} 验收记录

## 项目信息

**工程路径**: {project_dir}

**核心需求**: {requirement}

**创建时间**: {time.strftime('%Y-%m-%d %H:%M:%S')}

---

"""
            updated_content = header + new_content.strip()
        
        md_file.write_text(updated_content, encoding='utf-8')
        
        print(f"[save-result] 验收结果已保存到: {md_file}")
        
        return {
            "success": True,
            "message": f"验收结果已保存到 {md_file}",
            "file_path": str(md_file),
        }
        
    except Exception as e:
        print(f"[save-result] 保存失败: {str(e)}")
        import traceback
        print(f"[save-result] 错误详情:\n{traceback.format_exc()}")
        return JSONResponse(
            status_code=500,
            content={"error": f"保存失败: {str(e)}"},
        )


@app.post("/api/screenshot")
async def screenshot(url: str = Form("")):
    return JSONResponse(
        status_code=501,
        content={
            "error": "自动截图功能尚未实现",
            "hint": "此接口预留用于后续接入 Playwright/Puppeteer 实现浏览器自动截图",
        },
    )


class RunProjectRequest(BaseModel):
    project_name: str
    project_path: str = "/Users/liboyang/trae/dailyTools"
    port: int = 8980
    startup_script: str = ""
    backend_script: str = ""
    frontend_script: str = ""


@app.post("/api/run-project")
async def run_project(request: RunProjectRequest):
    global running_process, running_processes, running_port

    print(f"\n[run-project] 请求参数: project_name={request.project_name}, project_path={request.project_path}, port={request.port}")
    print(f"[run-project] 用户指定脚本: startup_script={request.startup_script}, backend_script={request.backend_script}, frontend_script={request.frontend_script}")

    if running_process is not None or len(running_processes) > 0:
        return JSONResponse(
            status_code=400,
            content={"error": "已有项目在运行中，请先停止当前项目"}
        )

    project_dir = Path(request.project_path) / request.project_name
    print(f"[run-project] 项目目录: {project_dir}, 存在: {project_dir.exists()}")
    
    if not project_dir.exists():
        return JSONResponse(
            status_code=404,
            content={"error": f"项目目录不存在: {project_dir}"}
        )

    is_full_stack = (project_dir / "dev.py").exists()
    print(f"[run-project] 是否全栈项目(dev.py): {is_full_stack}")
    
    backend_script = None
    frontend_script = None
    startup_script = None
    
    if request.startup_script:
        startup_script = request.startup_script
    else:
        for script in ["start-backend.sh", "start-backend"]:
            if (project_dir / script).exists():
                backend_script = script
                break
        
        for script in ["start-frontend.sh", "start-frontend"]:
            if (project_dir / script).exists():
                frontend_script = script
                break
    
    has_both_scripts = backend_script and frontend_script
    print(f"[run-project] 后端脚本: {backend_script}, 前端脚本: {frontend_script}, 整合脚本: {startup_script}")
    
    try:
        output_lines = []
        
        if request.startup_script:
            cmd = ["/bin/bash", request.startup_script]
            cwd = project_dir
            project_type = "custom_script"
            type_desc = f"自定义整合脚本(脚本: {request.startup_script})"
            
            print(f"[run-project] 使用用户指定的整合脚本启动")
            print(f"[run-project] 启动命令: {' '.join(cmd)}, 工作目录: {cwd}")
            
            running_process = subprocess.Popen(
                cmd,
                cwd=cwd,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True
            )
            running_processes.append(running_process)
            
            await asyncio.sleep(3)
            
            if running_process.poll() is not None:
                stdout, stderr = running_process.communicate()
                running_process = None
                running_processes.clear()
                print(f"[run-project] 启动失败 - stdout: {stdout[:500]}")
                print(f"[run-project] 启动失败 - stderr: {stderr[:500]}")
                return JSONResponse(
                    status_code=500,
                    content={
                        "error": "项目启动失败",
                        "output": stdout + stderr
                    }
                )
            
            running_port = request.port
            output_lines.append(f"✅ 项目已启动 (脚本: {request.startup_script})")
            
        elif request.backend_script or request.frontend_script:
            if request.backend_script:
                print(f"[run-project] 使用用户指定的后端脚本启动...")
                backend_cmd = ["/bin/bash", request.backend_script]
                running_process = subprocess.Popen(
                    backend_cmd,
                    cwd=project_dir,
                    stdout=subprocess.PIPE,
                    stderr=subprocess.PIPE,
                    text=True
                )
                running_processes.append(running_process)
                
                await asyncio.sleep(3)
                
                if running_process.poll() is not None:
                    stdout, stderr = running_process.communicate()
                    running_process = None
                    running_processes.clear()
                    return JSONResponse(
                        status_code=500,
                        content={
                            "error": "后端服务启动失败",
                            "output": stdout + stderr
                        }
                    )
                
                output_lines.append(f"✅ 后端服务已启动 (脚本: {request.backend_script})")
                print(f"[run-project] 后端服务启动成功")
            
            if request.frontend_script:
                print(f"[run-project] 使用用户指定的前端脚本启动...")
                frontend_cmd = ["/bin/bash", request.frontend_script]
                frontend_process = subprocess.Popen(
                    frontend_cmd,
                    cwd=project_dir,
                    stdout=subprocess.PIPE,
                    stderr=subprocess.PIPE,
                    text=True
                )
                running_processes.append(frontend_process)
                
                await asyncio.sleep(3)
                
                if frontend_process.poll() is not None:
                    stdout, stderr = frontend_process.communicate()
                    for p in running_processes:
                        try:
                            p.kill()
                        except:
                            pass
                    running_process = None
                    running_processes.clear()
                    return JSONResponse(
                        status_code=500,
                        content={
                            "error": "前端服务启动失败",
                            "output": stdout + stderr
                        }
                    )
                
                output_lines.append(f"✅ 前端服务已启动 (脚本: {request.frontend_script})")
                print(f"[run-project] 前端服务启动成功")
            
            running_port = 8980
            project_type = "custom_both"
            type_desc = "自定义前后端脚本启动"
            
        elif has_both_scripts:
            print(f"[run-project] 自动检测到前后端脚本，启动后端服务...")
            backend_cmd = ["/bin/bash", backend_script]
            running_process = subprocess.Popen(
                backend_cmd,
                cwd=project_dir,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True
            )
            running_processes.append(running_process)
            
            await asyncio.sleep(3)
            
            if running_process.poll() is not None:
                stdout, stderr = running_process.communicate()
                running_process = None
                running_processes.clear()
                print(f"[run-project] 后端启动失败 - stdout: {stdout[:500]}")
                print(f"[run-project] 后端启动失败 - stderr: {stderr[:500]}")
                return JSONResponse(
                    status_code=500,
                    content={
                        "error": "后端服务启动失败",
                        "output": stdout + stderr
                    }
                )
            
            output_lines.append(f"✅ 后端服务已启动 (脚本: {backend_script})")
            print(f"[run-project] 后端服务启动成功")
            
            print(f"[run-project] 启动前端服务...")
            frontend_cmd = ["/bin/bash", frontend_script]
            frontend_process = subprocess.Popen(
                frontend_cmd,
                cwd=project_dir,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True
            )
            running_processes.append(frontend_process)
            
            await asyncio.sleep(3)
            
            if frontend_process.poll() is not None:
                stdout, stderr = frontend_process.communicate()
                for p in running_processes:
                    try:
                        p.kill()
                    except:
                        pass
                running_process = None
                running_processes.clear()
                print(f"[run-project] 前端启动失败 - stdout: {stdout[:500]}")
                print(f"[run-project] 前端启动失败 - stderr: {stderr[:500]}")
                return JSONResponse(
                    status_code=500,
                    content={
                        "error": "前端服务启动失败",
                        "output": stdout + stderr
                    }
                )
            
            output_lines.append(f"✅ 前端服务已启动 (脚本: {frontend_script})")
            print(f"[run-project] 前端服务启动成功")
            
            running_port = 8980
            project_type = "fullstack_both"
            type_desc = "全栈工程(前后端同时启动)"
            
        elif backend_script:
            cmd = ["/bin/bash", backend_script]
            cwd = project_dir
            project_type = "backend_only"
            type_desc = f"后端服务(使用脚本: {backend_script})"
            
            print(f"[run-project] 启动命令: {' '.join(cmd)}, 工作目录: {cwd}")
            running_process = subprocess.Popen(
                cmd,
                cwd=cwd,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True
            )
            running_processes.append(running_process)
            
            await asyncio.sleep(2)
            
            if running_process.poll() is not None:
                stdout, stderr = running_process.communicate()
                running_process = None
                running_processes.clear()
                print(f"[run-project] 启动失败 - stdout: {stdout[:500]}")
                print(f"[run-project] 启动失败 - stderr: {stderr[:500]}")
                return JSONResponse(
                    status_code=500,
                    content={
                        "error": "项目启动失败",
                        "output": stdout + stderr
                    }
                )
            
            running_port = 8980
            output_lines.append(f"✅ 后端服务已启动")
            
        elif frontend_script:
            cmd = ["/bin/bash", frontend_script]
            cwd = project_dir
            project_type = "frontend_only"
            type_desc = f"前端服务(使用脚本: {frontend_script})"
            
            print(f"[run-project] 启动命令: {' '.join(cmd)}, 工作目录: {cwd}")
            running_process = subprocess.Popen(
                cmd,
                cwd=cwd,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True
            )
            running_processes.append(running_process)
            
            await asyncio.sleep(2)
            
            if running_process.poll() is not None:
                stdout, stderr = running_process.communicate()
                running_process = None
                running_processes.clear()
                print(f"[run-project] 启动失败 - stdout: {stdout[:500]}")
                print(f"[run-project] 启动失败 - stderr: {stderr[:500]}")
                return JSONResponse(
                    status_code=500,
                    content={
                        "error": "项目启动失败",
                        "output": stdout + stderr
                    }
                )
            
            running_port = request.port
            output_lines.append(f"✅ 前端服务已启动")
            
        elif is_full_stack:
            cmd = ["python", "dev.py", "-p", request.project_name]
            cwd = Path(request.project_path)
            project_type = "fullstack"
            type_desc = "全栈工程(使用 dev.py)"
            
            print(f"[run-project] 启动命令: {' '.join(cmd)}, 工作目录: {cwd}")
            running_process = subprocess.Popen(
                cmd,
                cwd=cwd,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True
            )
            running_processes.append(running_process)
            
            await asyncio.sleep(2)
            
            if running_process.poll() is not None:
                stdout, stderr = running_process.communicate()
                running_process = None
                running_processes.clear()
                return JSONResponse(
                    status_code=500,
                    content={
                        "error": "项目启动失败",
                        "output": stdout + stderr
                    }
                )
            
            running_port = request.port
            output_lines.append(f"✅ 全栈项目已启动")
            
        else:
            cmd = ["python3", "-m", "http.server", str(request.port)]
            cwd = project_dir
            project_type = "frontend"
            type_desc = "纯前端工程"
            
            print(f"[run-project] 启动命令: {' '.join(cmd)}, 工作目录: {cwd}")
            running_process = subprocess.Popen(
                cmd,
                cwd=cwd,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True
            )
            running_processes.append(running_process)
            
            await asyncio.sleep(1)
            
            if running_process.poll() is not None:
                stdout, stderr = running_process.communicate()
                running_process = None
                running_processes.clear()
                return JSONResponse(
                    status_code=500,
                    content={
                        "error": "项目启动失败",
                        "output": stdout + stderr
                    }
                )
            
            running_port = request.port
            output_lines.append(f"✅ 纯前端项目已启动")

        print(f"[run-project] 启动成功")
        return {
            "success": True,
            "port": running_port,
            "output": "\n".join(output_lines) + f"\n\n📋 项目类型: {type_desc}\n🌐 后端访问: http://localhost:8000\n🌐 前端访问: http://localhost:3000",
            "project_type": project_type
        }
    except Exception as e:
        print(f"[run-project] 异常错误: {type(e).__name__}: {str(e)}")
        import traceback
        print(f"[run-project] 异常堆栈:\n{traceback.format_exc()}")
        return JSONResponse(
            status_code=500,
            content={"error": str(e), "detail": traceback.format_exc()}
        )


@app.post("/api/stop-project")
async def stop_project():
    global running_process, running_processes, running_port

    if running_process is None and len(running_processes) == 0:
        return JSONResponse(
            status_code=400,
            content={"error": "没有运行中的项目"}
        )

    try:
        outputs = []
        for proc in running_processes:
            try:
                proc.terminate()
                proc.wait(timeout=5)
                stdout, stderr = proc.communicate()
                outputs.append(f"进程已正常终止")
            except subprocess.TimeoutExpired:
                proc.kill()
                outputs.append(f"进程已强制终止")
            except Exception as e:
                outputs.append(f"终止进程时出错: {str(e)}")
        
        running_process = None
        running_processes.clear()
        running_port = 0
        
        return {
            "success": True,
            "output": "\n".join(outputs)
        }
    except Exception as e:
        running_process = None
        running_processes.clear()
        running_port = 0
        return JSONResponse(
            status_code=500,
            content={"error": str(e)}
        )


class ExecuteTestPromptRequest(BaseModel):
    project_name: str
    first_round: str
    current_round: str
    current_process: str = ""


@app.post("/api/execute-test-prompt")
async def execute_test_prompt(request: ExecuteTestPromptRequest):
    """执行 generate_test_prompt.py 脚本"""
    try:
        script_path = Path(__file__).parent.parent / "/Users/liboyang/trae/dailyTools/generate_test_prompt.py"
        
        if not script_path.exists():
            return JSONResponse(
                status_code=500,
                content={"success": False, "error": f"找不到脚本文件: {script_path}"}
            )
        
        cmd = [
            sys.executable, str(script_path),
            "-n", request.project_name,
            "-f", request.first_round,
            "-c", request.current_round,
        ]
        
        if request.current_process:
            cmd.extend(["-pr", request.current_process])
        
        cmd.append("-p")
        
        print(f"[execute-test-prompt] 执行命令: {' '.join(cmd)}")
        
        result = subprocess.run(
            cmd,
            cwd=str(script_path.parent),
            capture_output=True,
            text=True,
            timeout=30
        )
        
        output = result.stdout
        if result.stderr:
            output += "\n" + result.stderr
        
        return JSONResponse(
            content={
                "success": result.returncode == 0,
                "output": output,
                "returncode": result.returncode
            }
        )
        
    except subprocess.TimeoutExpired:
        return JSONResponse(
            status_code=500,
            content={"success": False, "error": "执行超时"}
        )
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"success": False, "error": str(e)}
        )


class SyncFeishuRequest(BaseModel):
    project_name: str
    project_path: str
    requirement: str
    round_num: int
    stage: str
    result: str
    files: list = []


@app.post("/api/sync-feishu")
async def sync_feishu(request: SyncFeishuRequest):
    """同步验收结果到飞书文档"""
    try:
        from datetime import datetime
        
        feishu_doc_path = Path(__file__).parent.parent / "requirement" / "feishu_doc.py"
        
        if not feishu_doc_path.exists():
            return JSONResponse(
                status_code=500,
                content={"success": False, "error": "找不到 feishu_doc.py 文件"}
            )
        
        temp_dir = Path(__file__).parent / "temp_sync"
        temp_dir.mkdir(exist_ok=True)
        
        temp_md_path = temp_dir / f"result_{int(time.time())}.md"
        
        md_content = f"""# {request.project_name} 验收记录

---

## 第 {request.round_num} 轮验收结果

**时间**: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}

**阶段**: {request.stage}

### 核心需求
{request.requirement}

### 用户建议
无

### 验收结果
{request.result}

---
"""
        temp_md_path.write_text(md_content, encoding='utf-8')
        
        temp_image_paths = []
        if request.files:
            import base64
            for i, file_data in enumerate(request.files):
                if isinstance(file_data, dict) and file_data.get("dataUrl"):
                    try:
                        data_url = file_data["dataUrl"]
                        if "," in data_url:
                            header, base64_data = data_url.split(",", 1)
                            image_data = base64.b64decode(base64_data)
                            temp_img_path = temp_dir / f"screenshot_{i}.png"
                            temp_img_path.write_bytes(image_data)
                            temp_image_paths.append(str(temp_img_path))
                            print(f"[sync-feishu] 保存临时图片: {temp_img_path}")
                    except Exception as e:
                        print(f"[sync-feishu] 保存图片失败: {e}")
        
        screenshot_desc = f"已上传 {len(request.files)} 张截图" if request.files else ""
        
        cmd = [
            sys.executable, str(feishu_doc_path),
            "append-round",
            "--result-file", str(temp_md_path),
            "--round-num", str(request.round_num),
            "--project-name", request.project_name
        ]
        
        if screenshot_desc:
            cmd.extend(["--screenshot", screenshot_desc])
        
        for img_path in temp_image_paths:
            cmd.extend(["--screenshot-file", img_path])
        
        print(f"[sync-feishu] 执行命令: {' '.join(cmd)}")
        
        result = subprocess.run(
            cmd,
            cwd=str(feishu_doc_path.parent),
            capture_output=True,
            text=True,
            timeout=30
        )
        
        print(f"[sync-feishu] stdout: {result.stdout}")
        if result.stderr:
            print(f"[sync-feishu] stderr: {result.stderr}")
        
        for img_path in temp_image_paths:
            Path(img_path).unlink(missing_ok=True)
        temp_md_path.unlink(missing_ok=True)
        
        if result.returncode == 0:
            return {
                "success": True,
                "output": result.stdout
            }
        else:
            return JSONResponse(
                status_code=500,
                content={
                    "success": False,
                    "error": result.stderr or "执行失败",
                    "output": result.stdout
                }
            )
            
    except subprocess.TimeoutExpired:
        return JSONResponse(
            status_code=500,
            content={"success": False, "error": "执行超时"}
        )
    except Exception as e:
        import traceback
        print(f"[sync-feishu] 异常: {str(e)}")
        print(f"[sync-feishu] 堆栈: {traceback.format_exc()}")
        return JSONResponse(
            status_code=500,
            content={"success": False, "error": str(e)}
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


def build_user_prompt(
    requirement: str,
    round_num: int,
    stage: str = "",
    project_name: str = "",
    user_advice: str = "",
    current_process: str = "",
    template: str = "",
) -> str:
    if template:
        requirement_text = f"需求：{requirement}" if round_num == 1 else f"需求同前：{requirement}"
        stage_info = f"，当前处于「{stage}」阶段" if stage else ""
        user_text = template.format(
            project_name=project_name or "",
            requirement_text=requirement_text,
            round_num=round_num,
            stage_info=stage_info,
        )
    else:
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
        user_text = "\n".join(parts)

    if user_advice:
        user_text += f"\n\n用户建议：\n{user_advice}"

    if current_process:
        user_text += f"\n\n本轮过程：\n{current_process}"

    return user_text


# ── 启动 ──────────────────────────────────────────────────
def open_browser(port=8980):
    time.sleep(1.5)
    webbrowser.open(f"http://localhost:{port}")


if __name__ == "__main__":
    port = 8980  # 默认端口
    if len(sys.argv) > 1:
        for i, arg in enumerate(sys.argv):
            if arg == "--port" and i + 1 < len(sys.argv):
                port = int(sys.argv[i + 1])

    print(f"验证工作流 Web 服务启动: http://localhost:{port}")
    
    browser_thread = threading.Thread(target=open_browser, args=(port,), daemon=True)
    browser_thread.start()
    
    uvicorn.run(app, host="0.0.0.0", port=port)
