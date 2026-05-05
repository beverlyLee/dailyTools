from typing import Dict, Any, List, Optional
from fastapi import FastAPI, HTTPException, UploadFile, File, Form, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
import json
import os
import uuid
from datetime import datetime
import asyncio

from openapi_importer import OpenAPIImporter, APITestCase
from test_executor import TestExecutor, TestResult
from assertion_engine import AssertionEngine
from data_driven import DataDrivenEngine
from environment_manager import EnvironmentManager
from allure_report import AllureReportGenerator, generate_allure_report_from_results


app = FastAPI(
    title="API Test Matrix",
    description="API 自动化测试矩阵 - 支持 OpenAPI 导入、数据驱动测试、多环境执行",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

openapi_importer = OpenAPIImporter()
test_executor = TestExecutor()
assertion_engine = AssertionEngine()
data_driven_engine = DataDrivenEngine()
environment_manager = EnvironmentManager()

test_cases_store: Dict[str, APITestCase] = {}
test_results_store: Dict[str, TestResult] = {}
running_tests: Dict[str, dict] = {}


class OpenAPIImportRequest(BaseModel):
    url: Optional[str] = None
    spec: Optional[Dict[str, Any]] = None


class TestCaseUpdateRequest(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    method: Optional[str] = None
    path: Optional[str] = None
    headers: Optional[Dict[str, str]] = None
    query_params: Optional[Dict[str, Any]] = None
    path_params: Optional[Dict[str, Any]] = None
    request_body: Optional[Dict[str, Any]] = None
    assertions: Optional[List[Dict[str, Any]]] = None
    tags: Optional[List[str]] = None


class EnvironmentCreateRequest(BaseModel):
    name: str
    display_name: Optional[str] = None
    description: Optional[str] = None
    base_url: str = ""
    is_default: bool = False
    headers: Optional[Dict[str, str]] = None
    variables: Optional[Dict[str, Any]] = None


class VariableRequest(BaseModel):
    key: str
    value: Any
    description: Optional[str] = None
    is_secret: bool = False


class DataSetLoadRequest(BaseModel):
    name: Optional[str] = None
    data: Optional[List[Dict[str, Any]]] = None


class TestExecutionRequest(BaseModel):
    test_case_ids: List[str]
    environment_name: Optional[str] = None
    concurrency: int = 5
    data_set_name: Optional[str] = None
    variable_overrides: Optional[Dict[str, Any]] = None


@app.get("/")
async def root():
    return {
        "name": "API Test Matrix",
        "version": "1.0.0",
        "status": "running",
        "features": [
            "OpenAPI/Swagger 文档导入",
            "数据驱动测试 (DDT)",
            "多环境支持",
            "Allure 报告生成",
            "丰富的断言引擎"
        ]
    }


@app.get("/api/openapi/supported-assertions")
async def get_supported_assertions():
    return {
        "success": True,
        "data": assertion_engine.get_supported_assertions()
    }


@app.post("/api/openapi/import/url")
async def import_openapi_from_url(request: OpenAPIImportRequest):
    if not request.url:
        raise HTTPException(status_code=400, detail="URL 不能为空")

    try:
        test_cases = openapi_importer.import_from_url(request.url)

        for tc in test_cases:
            test_cases_store[tc.id] = tc

        return {
            "success": True,
            "message": f"成功导入 {len(test_cases)} 个测试用例",
            "data": {
                "count": len(test_cases),
                "test_cases": [tc.to_dict() for tc in test_cases]
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"导入失败: {str(e)}")


@app.post("/api/openapi/import/file")
async def import_openapi_from_file(file: UploadFile = File(...)):
    try:
        content = await file.read()
        test_cases = openapi_importer.import_from_json(content.decode("utf-8"))

        for tc in test_cases:
            test_cases_store[tc.id] = tc

        return {
            "success": True,
            "message": f"成功导入 {len(test_cases)} 个测试用例",
            "data": {
                "count": len(test_cases),
                "test_cases": [tc.to_dict() for tc in test_cases]
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"导入失败: {str(e)}")


@app.get("/api/test-cases")
async def list_test_cases(
    tag: Optional[str] = Query(None),
    method: Optional[str] = Query(None)
):
    test_cases = list(test_cases_store.values())

    if tag:
        test_cases = [tc for tc in test_cases if tag in tc.tags]

    if method:
        test_cases = [tc for tc in test_cases if tc.method == method.upper()]

    return {
        "success": True,
        "data": {
            "count": len(test_cases),
            "test_cases": [tc.to_dict() for tc in test_cases]
        }
    }


@app.get("/api/test-cases/{test_case_id}")
async def get_test_case(test_case_id: str):
    if test_case_id not in test_cases_store:
        raise HTTPException(status_code=404, detail="测试用例不存在")

    return {
        "success": True,
        "data": test_cases_store[test_case_id].to_dict()
    }


@app.post("/api/test-cases")
async def create_test_case(test_case_data: Dict[str, Any]):
    try:
        test_case = APITestCase(
            name=test_case_data.get("name", "未命名测试用例"),
            description=test_case_data.get("description", ""),
            method=test_case_data.get("method", "GET"),
            path=test_case_data.get("path", "/"),
            headers=test_case_data.get("headers", {}),
            query_params=test_case_data.get("query_params", {}),
            path_params=test_case_data.get("path_params", {}),
            request_body=test_case_data.get("request_body"),
            request_content_type=test_case_data.get("request_content_type", "application/json"),
            assertions=test_case_data.get("assertions", []),
            tags=test_case_data.get("tags", []),
            created_at=datetime.now(),
            updated_at=datetime.now()
        )

        test_cases_store[test_case.id] = test_case

        return {
            "success": True,
            "message": "测试用例创建成功",
            "data": test_case.to_dict()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"创建失败: {str(e)}")


@app.put("/api/test-cases/{test_case_id}")
async def update_test_case(test_case_id: str, request: TestCaseUpdateRequest):
    if test_case_id not in test_cases_store:
        raise HTTPException(status_code=404, detail="测试用例不存在")

    test_case = test_cases_store[test_case_id]

    if request.name:
        test_case.name = request.name
    if request.description is not None:
        test_case.description = request.description
    if request.method:
        test_case.method = request.method
    if request.path:
        test_case.path = request.path
    if request.headers:
        test_case.headers = request.headers
    if request.query_params:
        test_case.query_params = request.query_params
    if request.path_params:
        test_case.path_params = request.path_params
    if request.request_body:
        test_case.request_body = request.request_body
    if request.assertions:
        test_case.assertions = request.assertions
    if request.tags:
        test_case.tags = request.tags

    test_case.updated_at = datetime.now()

    return {
        "success": True,
        "message": "测试用例更新成功",
        "data": test_case.to_dict()
    }


@app.delete("/api/test-cases/{test_case_id}")
async def delete_test_case(test_case_id: str):
    if test_case_id not in test_cases_store:
        raise HTTPException(status_code=404, detail="测试用例不存在")

    del test_cases_store[test_case_id]

    return {
        "success": True,
        "message": "测试用例删除成功"
    }


@app.get("/api/environments")
async def list_environments():
    return {
        "success": True,
        "data": environment_manager.list_environments()
    }


@app.get("/api/environments/{name}")
async def get_environment(name: str):
    env = environment_manager.get_environment(name)
    if not env:
        raise HTTPException(status_code=404, detail="环境不存在")

    variables = {
        key: {
            "key": var.key,
            "value": "***" if var.is_secret else var.value,
            "description": var.description,
            "is_secret": var.is_secret
        }
        for key, var in env.variables.items()
    }

    return {
        "success": True,
        "data": {
            "name": env.name,
            "display_name": env.display_name,
            "description": env.description,
            "base_url": env.base_url,
            "is_default": env.is_default,
            "headers": env.headers,
            "variables": variables,
            "is_active": env.name == environment_manager.active_environment
        }
    }


@app.post("/api/environments")
async def create_environment(request: EnvironmentCreateRequest):
    try:
        env = environment_manager.create_environment(
            name=request.name,
            display_name=request.display_name,
            description=request.description,
            base_url=request.base_url,
            is_default=request.is_default,
            headers=request.headers,
            variables=request.variables
        )

        return {
            "success": True,
            "message": "环境创建成功",
            "data": {
                "name": env.name,
                "display_name": env.display_name,
                "base_url": env.base_url
            }
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/api/environments/{name}/activate")
async def activate_environment(name: str):
    if not environment_manager.set_active_environment(name):
        raise HTTPException(status_code=404, detail="环境不存在")

    return {
        "success": True,
        "message": f"已切换到环境: {name}"
    }


@app.delete("/api/environments/{name}")
async def delete_environment(name: str):
    if not environment_manager.delete_environment(name):
        raise HTTPException(status_code=404, detail="环境不存在")

    return {
        "success": True,
        "message": "环境删除成功"
    }


@app.post("/api/environments/{name}/variables")
async def add_environment_variable(name: str, request: VariableRequest):
    if not environment_manager.add_variable(
        environment_name=name,
        key=request.key,
        value=request.value,
        description=request.description,
        is_secret=request.is_secret
    ):
        raise HTTPException(status_code=404, detail="环境不存在")

    return {
        "success": True,
        "message": "变量添加成功"
    }


@app.get("/api/data-sets")
async def list_data_sets():
    return {
        "success": True,
        "data": data_driven_engine.list_data_sets()
    }


@app.post("/api/data-sets/json")
async def load_data_set_from_json(request: DataSetLoadRequest):
    if not request.data:
        raise HTTPException(status_code=400, detail="数据不能为空")

    name = request.name or f"data_set_{datetime.now().strftime('%Y%m%d%H%M%S')}"
    data_set = data_driven_engine.parse_json_data(request.data, name)

    return {
        "success": True,
        "message": f"成功加载 {len(data_set.rows)} 行数据",
        "data": {
            "name": data_set.name,
            "headers": data_set.headers,
            "row_count": len(data_set.rows)
        }
    }


@app.post("/api/data-sets/csv")
async def load_data_set_from_csv(
    file: UploadFile = File(...),
    name: Optional[str] = None,
    has_header: bool = True
):
    try:
        content = await file.read()
        temp_path = f"/tmp/{uuid.uuid4()}.csv"

        with open(temp_path, "wb") as f:
            f.write(content)

        dataset_name = name or file.filename.replace(".csv", "")
        data_set = data_driven_engine.load_from_csv(
            temp_path,
            name=dataset_name,
            has_header=has_header
        )

        os.remove(temp_path)

        return {
            "success": True,
            "message": f"成功加载 {len(data_set.rows)} 行数据",
            "data": {
                "name": data_set.name,
                "headers": data_set.headers,
                "row_count": len(data_set.rows)
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"加载失败: {str(e)}")


@app.post("/api/data-sets/excel")
async def load_data_set_from_excel(
    file: UploadFile = File(...),
    name: Optional[str] = None,
    sheet_name: Optional[str] = None,
    has_header: bool = True
):
    try:
        content = await file.read()
        temp_path = f"/tmp/{uuid.uuid4()}.xlsx"

        with open(temp_path, "wb") as f:
            f.write(content)

        dataset_name = name or file.filename.replace(".xlsx", "").replace(".xls", "")
        data_set = data_driven_engine.load_from_excel(
            temp_path,
            name=dataset_name,
            sheet_name=sheet_name,
            has_header=has_header
        )

        os.remove(temp_path)

        return {
            "success": True,
            "message": f"成功加载 {len(data_set.rows)} 行数据",
            "data": {
                "name": data_set.name,
                "headers": data_set.headers,
                "row_count": len(data_set.rows)
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"加载失败: {str(e)}")


@app.post("/api/tests/execute")
async def execute_tests(request: TestExecutionRequest):
    test_cases = []
    for test_case_id in request.test_case_ids:
        if test_case_id not in test_cases_store:
            raise HTTPException(status_code=404, detail=f"测试用例不存在: {test_case_id}")
        test_cases.append(test_cases_store[test_case_id])

    base_url = ""
    headers = {}
    variables = {}

    if request.environment_name:
        env = environment_manager.get_environment(request.environment_name)
        if not env:
            raise HTTPException(status_code=404, detail="环境不存在")
        base_url = env.base_url
        headers = env.headers
        variables = environment_manager.get_all_variables(request.environment_name)
    else:
        active_env = environment_manager.get_active_environment()
        if active_env:
            base_url = active_env.base_url
            headers = active_env.headers
            variables = environment_manager.get_all_variables()

    executor = TestExecutor(
        base_url=base_url,
        default_headers=headers
    )

    run_id = str(uuid.uuid4())
    running_tests[run_id] = {
        "status": "running",
        "started_at": datetime.now(),
        "test_count": len(test_cases),
        "results": []
    }

    try:
        if request.data_set_name:
            active_rows = data_driven_engine.get_active_rows(request.data_set_name)
            if not active_rows:
                raise HTTPException(status_code=400, detail=f"数据集 {request.data_set_name} 没有活跃数据行")

            all_results = []
            for row in active_rows:
                row_results = await executor.execute_multiple(
                    test_cases,
                    concurrency=request.concurrency,
                    variable_overrides=row.variables
                )
                all_results.extend(row_results)

            for result in all_results:
                test_results_store[f"{run_id}_{result.test_case_id}"] = result

            running_tests[run_id]["status"] = "completed"
            running_tests[run_id]["results"] = [r.test_case_id for r in all_results]

            summary = executor.get_summary()
            summary["run_id"] = run_id
            summary["data_set_name"] = request.data_set_name
            summary["data_set_rows"] = len(active_rows)

            return {
                "success": True,
                "message": f"完成 {len(test_cases)} 个测试用例 x {len(active_rows)} 行数据的执行",
                "data": summary
            }
        else:
            results = await executor.execute_multiple(
                test_cases,
                concurrency=request.concurrency,
                variable_overrides=request.variable_overrides
            )

            for result in results:
                test_results_store[f"{run_id}_{result.test_case_id}"] = result

            running_tests[run_id]["status"] = "completed"
            running_tests[run_id]["results"] = [r.test_case_id for r in results]

            summary = executor.get_summary()
            summary["run_id"] = run_id

            return {
                "success": True,
                "message": f"完成 {len(results)} 个测试用例的执行",
                "data": summary
            }

    except Exception as e:
        running_tests[run_id]["status"] = "error"
        running_tests[run_id]["error"] = str(e)
        raise HTTPException(status_code=500, detail=f"执行失败: {str(e)}")


@app.get("/api/tests/runs/{run_id}")
async def get_test_run(run_id: str):
    if run_id not in running_tests:
        raise HTTPException(status_code=404, detail="运行记录不存在")

    run_info = running_tests[run_id]

    results = []
    for test_case_id in run_info.get("results", []):
        result_key = f"{run_id}_{test_case_id}"
        if result_key in test_results_store:
            result = test_results_store[result_key]
            results.append({
                "test_case_id": result.test_case_id,
                "test_case_name": result.test_case_name,
                "method": result.method,
                "path": result.path,
                "status": result.status,
                "response_status": result.response_status,
                "response_time_ms": result.response_time_ms,
                "error_message": result.error_message,
                "assertion_results": result.assertion_results
            })

    return {
        "success": True,
        "data": {
            "run_id": run_id,
            "status": run_info["status"],
            "started_at": run_info["started_at"].isoformat(),
            "test_count": run_info["test_count"],
            "results": results,
            "error": run_info.get("error")
        }
    }


@app.post("/api/reports/allure/generate/{run_id}")
async def generate_allure_report(run_id: str, output_dir: str = "./allure-results"):
    if run_id not in running_tests:
        raise HTTPException(status_code=404, detail="运行记录不存在")

    run_info = running_tests[run_id]

    results = []
    for test_case_id in run_info.get("results", []):
        result_key = f"{run_id}_{test_case_id}"
        if result_key in test_results_store:
            results.append(test_results_store[result_key])

    if not results:
        raise HTTPException(status_code=400, detail="没有找到测试结果")

    environment = None
    active_env = environment_manager.get_active_environment()
    if active_env:
        environment = {
            "Environment": active_env.display_name,
            "Base URL": active_env.base_url,
            "Test Type": "API Test",
            "Framework": "API Test Matrix"
        }

    summary = generate_allure_report_from_results(
        test_results=results,
        output_dir=output_dir,
        environment=environment
    )

    return {
        "success": True,
        "message": f"Allure 报告已生成到 {output_dir}",
        "data": {
            "output_directory": output_dir,
            "summary": summary
        }
    }


@app.post("/api/defaults/init")
async def initialize_defaults():
    environment_manager.create_default_environments()

    sample_test_cases = [
        APITestCase(
            name="示例: GET 请求测试",
            description="测试 GET 请求的基本功能",
            method="GET",
            path="/api/users",
            headers={"Content-Type": "application/json"},
            query_params={"page": 1, "limit": 10},
            assertions=[
                {"type": "status_code", "expected": 200, "description": "验证状态码为 200"},
                {"type": "response_time", "max_ms": 3000, "description": "验证响应时间 <= 3s"}
            ],
            tags=["示例", "GET"]
        ),
        APITestCase(
            name="示例: POST 请求测试",
            description="测试 POST 请求的基本功能",
            method="POST",
            path="/api/users",
            headers={"Content-Type": "application/json"},
            request_body={"name": "test_user", "email": "test@example.com"},
            assertions=[
                {"type": "status_code", "expected": 201, "description": "验证状态码为 201"},
                {"type": "response_time", "max_ms": 5000, "description": "验证响应时间 <= 5s"}
            ],
            tags=["示例", "POST"]
        )
    ]

    for tc in sample_test_cases:
        test_cases_store[tc.id] = tc

    return {
        "success": True,
        "message": "默认数据初始化成功",
        "data": {
            "environments": environment_manager.list_environments(),
            "sample_test_cases": len(sample_test_cases)
        }
    }


if __name__ == "__main__":
    import uvicorn

    print("=" * 60)
    print("  API Test Matrix - API 自动化测试矩阵")
    print("=" * 60)
    print()
    print("功能特性:")
    print("  - OpenAPI/Swagger 文档导入")
    print("  - 数据驱动测试 (DDT)")
    print("  - 多环境支持 (Dev/Test/Prod)")
    print("  - Allure 风格可视化报告")
    print("  - 丰富的断言引擎")
    print()
    print("启动方式:")
    print("  uvicorn main:app --host 0.0.0.0 --port 8001 --reload")
    print()
    print("API 文档:")
    print("  http://localhost:8001/docs")
    print("  http://localhost:8001/redoc")
    print()
    print("=" * 60)

    uvicorn.run(app, host="0.0.0.0", port=8001)
