from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import asyncio

from recorder import UIRecorder, StepRecorder
from script_generator import PlaywrightScriptGenerator
from locator_validator import LocatorValidator, AssertionGenerator
from player import TestPlayer, ParallelTestExecutor


app = FastAPI(
    title="Web UI 自动化设计器 API",
    description="提供录制回放、脚本生成、定位器验证等功能",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


recorder_instances: Dict[str, UIRecorder] = {}


class StartRecordingRequest(BaseModel):
    url: str
    headless: bool = False


class StopRecordingResponse(BaseModel):
    steps: List[Dict[str, Any]]
    step_count: int


class GenerateScriptRequest(BaseModel):
    steps: List[Dict[str, Any]]
    test_name: str = "test_ui"
    use_async: bool = True
    browser: str = "chromium"
    headless: bool = True


class GenerateScriptResponse(BaseModel):
    script: str
    test_name: str
    language: str


class ValidateLocatorRequest(BaseModel):
    url: str
    locator_type: str
    locator_value: str
    headless: bool = True


class ValidateLocatorResponse(BaseModel):
    valid: bool
    message: str
    element_count: int
    suggestions: List[str]
    details: Dict[str, Any]


class PlaybackRequest(BaseModel):
    steps: List[Dict[str, Any]]
    headless: bool = True
    browser: str = "chromium"
    slow_mo: int = 0
    timeout: int = 30000


class PlaybackResponse(BaseModel):
    total_steps: int
    passed: int
    failed: int
    total_duration: float
    success_rate: float
    results: List[Dict[str, Any]]


class AddAssertionRequest(BaseModel):
    recorder_id: str
    step_index: int
    assertion_type: str
    value: Optional[str] = None


class GenerateCICDRequest(BaseModel):
    test_files: List[str]
    browser: str = "chromium"
    python_version: str = "3.10"


class GenerateCICDResponse(BaseModel):
    yaml_content: str


@app.post("/recording/start")
async def start_recording(request: StartRecordingRequest):
    recorder_id = f"recorder_{id(recorder_instances)}"
    recorder = UIRecorder()

    try:
        await recorder.start_recording(request.url, headless=request.headless)
        recorder_instances[recorder_id] = recorder
        return {
            "recorder_id": recorder_id,
            "status": "recording",
            "message": f"开始录制: {request.url}"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"启动录制失败: {str(e)}")


@app.post("/recording/{recorder_id}/stop", response_model=StopRecordingResponse)
async def stop_recording(recorder_id: str):
    if recorder_id not in recorder_instances:
        raise HTTPException(status_code=404, detail="录制实例不存在")

    recorder = recorder_instances[recorder_id]
    steps = await recorder.stop_recording()
    del recorder_instances[recorder_id]

    return StopRecordingResponse(
        steps=steps,
        step_count=len(steps)
    )


@app.get("/recording/{recorder_id}/steps")
async def get_recorded_steps(recorder_id: str):
    if recorder_id not in recorder_instances:
        raise HTTPException(status_code=404, detail="录制实例不存在")

    recorder = recorder_instances[recorder_id]
    steps = recorder.get_steps()

    return {
        "recorder_id": recorder_id,
        "steps": steps,
        "step_count": len(steps)
    }


@app.post("/recording/{recorder_id}/add-assertion")
async def add_assertion_to_step(recorder_id: str, request: AddAssertionRequest):
    if recorder_id not in recorder_instances:
        raise HTTPException(status_code=404, detail="录制实例不存在")

    recorder = recorder_instances[recorder_id]
    await recorder.add_assertion(request.step_index, request.assertion_type, request.value)

    return {
        "message": f"已在步骤 {request.step_index} 添加断言: {request.assertion_type}"
    }


@app.post("/script/generate", response_model=GenerateScriptResponse)
async def generate_playwright_script(request: GenerateScriptRequest):
    generator = PlaywrightScriptGenerator()

    try:
        script = generator.generate(
            steps=request.steps,
            test_name=request.test_name,
            use_async=request.use_async,
            browser=request.browser,
            headless=request.headless
        )

        return GenerateScriptResponse(
            script=script,
            test_name=request.test_name,
            language="python"
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"生成脚本失败: {str(e)}")


@app.post("/script/generate-suite")
async def generate_test_suite(test_cases: List[Dict[str, Any]], suite_name: str = "test_suite"):
    generator = PlaywrightScriptGenerator()

    try:
        script = generator.generate_pytest_suite(
            test_cases=test_cases,
            suite_name=suite_name
        )

        return {
            "script": script,
            "suite_name": suite_name,
            "test_count": len(test_cases)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"生成测试套件失败: {str(e)}")


@app.post("/script/generate-cicd", response_model=GenerateCICDResponse)
async def generate_cicd_yaml(request: GenerateCICDRequest):
    generator = PlaywrightScriptGenerator()

    try:
        yaml_content = generator.generate_cicd_yaml(
            test_files=request.test_files,
            browser=request.browser,
            python_version=request.python_version
        )

        return GenerateCICDResponse(yaml_content=yaml_content)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"生成 CI/CD 配置失败: {str(e)}")


@app.post("/locator/validate", response_model=ValidateLocatorResponse)
async def validate_locator(request: ValidateLocatorRequest):
    validator = LocatorValidator()

    try:
        result = await validator.validate(
            url=request.url,
            locator_type=request.locator_type,
            locator_value=request.locator_value,
            headless=request.headless
        )

        return ValidateLocatorResponse(**result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"定位器验证失败: {str(e)}")


@app.get("/assertion/types")
async def get_assertion_types():
    generator = AssertionGenerator()
    types = generator.get_assertion_types()
    return {
        "assertion_types": types,
        "count": len(types)
    }


@app.post("/playback/run", response_model=PlaybackResponse)
async def run_playback(request: PlaybackRequest):
    player = TestPlayer()

    try:
        await player.play(
            steps=request.steps,
            headless=request.headless,
            browser=request.browser,
            slow_mo=request.slow_mo,
            timeout=request.timeout
        )

        summary = player.get_summary()
        return PlaybackResponse(**summary)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"回放测试失败: {str(e)}")


@app.post("/playback/run-parallel")
async def run_parallel_tests(
    test_cases: List[Dict[str, Any]],
    max_workers: int = 3
):
    executor = ParallelTestExecutor()

    try:
        results = await executor.execute_parallel(
            test_cases=test_cases,
            max_workers=max_workers
        )
        return results
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"并行执行失败: {str(e)}")


@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "service": "Web UI 自动化设计器",
        "version": "1.0.0"
    }


@app.get("/info")
async def get_service_info():
    return {
        "name": "Web UI 自动化设计器",
        "description": "提供录制回放、脚本生成、定位器验证等功能",
        "features": [
            "浏览器录制 - 实时录制用户操作",
            "脚本生成 - 自动生成 Playwright 脚本",
            "定位器验证 - 验证 CSS/XPath 等定位方式",
            "断言配置 - 支持多种断言类型",
            "回放测试 - 一键回放录制的测试用例",
            "CI/CD 集成 - 生成 GitHub Actions 配置"
        ],
        "endpoints": {
            "录制": [
                "POST /recording/start - 开始录制",
                "POST /recording/{id}/stop - 停止录制",
                "GET /recording/{id}/steps - 获取录制步骤",
                "POST /recording/{id}/add-assertion - 添加断言"
            ],
            "脚本生成": [
                "POST /script/generate - 生成单个测试脚本",
                "POST /script/generate-suite - 生成测试套件",
                "POST /script/generate-cicd - 生成 CI/CD 配置"
            ],
            "定位器验证": [
                "POST /locator/validate - 验证定位器",
                "GET /assertion/types - 获取断言类型列表"
            ],
            "回放测试": [
                "POST /playback/run - 执行回放测试",
                "POST /playback/run-parallel - 并行执行多个测试"
            ]
        }
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
