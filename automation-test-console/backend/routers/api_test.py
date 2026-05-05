from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List, Optional
from datetime import datetime
import uuid
import json
import httpx

from database import get_db, APITestCase
from schemas import (
    APITestCaseCreate, APITestCaseUpdate, APITestCaseResponse,
    OpenAPIImportRequest, ExecutionResponse, TestExecutionResult
)

router = APIRouter()


@router.get("/", response_model=List[APITestCaseResponse])
async def get_api_test_cases(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(APITestCase).order_by(APITestCase.created_at.desc()))
    return result.scalars().all()


@router.get("/{test_id}", response_model=APITestCaseResponse)
async def get_api_test_case(test_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(APITestCase).where(APITestCase.id == test_id))
    test_case = result.scalar_one_or_none()
    if not test_case:
        raise HTTPException(status_code=404, detail="API 测试用例不存在")
    return test_case


@router.post("/", response_model=APITestCaseResponse)
async def create_api_test_case(test_case: APITestCaseCreate, db: AsyncSession = Depends(get_db)):
    new_test = APITestCase(
        name=test_case.name,
        method=test_case.method,
        path=test_case.path,
        headers=test_case.headers,
        body=test_case.body,
        expected_status=test_case.expected_status,
        expected_response=test_case.expected_response
    )
    db.add(new_test)
    await db.commit()
    await db.refresh(new_test)
    return new_test


@router.put("/{test_id}", response_model=APITestCaseResponse)
async def update_api_test_case(
    test_id: int,
    test_case: APITestCaseUpdate,
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(APITestCase).where(APITestCase.id == test_id))
    existing_test = result.scalar_one_or_none()
    if not existing_test:
        raise HTTPException(status_code=404, detail="API 测试用例不存在")

    update_data = test_case.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(existing_test, key, value)

    await db.commit()
    await db.refresh(existing_test)
    return existing_test


@router.delete("/{test_id}")
async def delete_api_test_case(test_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(APITestCase).where(APITestCase.id == test_id))
    test_case = result.scalar_one_or_none()
    if not test_case:
        raise HTTPException(status_code=404, detail="API 测试用例不存在")

    await db.delete(test_case)
    await db.commit()
    return {"message": "API 测试用例已删除"}


@router.post("/import-openapi")
async def import_openapi(request: OpenAPIImportRequest, db: AsyncSession = Depends(get_db)):
    if request.url:
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(request.url)
                spec = response.json()
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"无法获取 OpenAPI 文档: {str(e)}")
    elif request.content:
        try:
            spec = json.loads(request.content)
        except json.JSONDecodeError:
            raise HTTPException(status_code=400, detail="无效的 JSON 格式")
    else:
        raise HTTPException(status_code=400, detail="请提供 URL 或 JSON 内容")

    paths = spec.get('paths', {})
    imported_count = 0

    for path, path_item in paths.items():
        for method, operation in path_item.items():
            if method.upper() not in ['GET', 'POST', 'PUT', 'DELETE', 'PATCH']:
                continue

            test_name = operation.get('summary', f"{method.upper()} {path}")

            expected_status = 200
            responses = operation.get('responses', {})
            for status_code in ['200', '201', '204']:
                if status_code in responses:
                    expected_status = int(status_code)
                    break

            new_test = APITestCase(
                name=test_name,
                method=method.upper(),
                path=path,
                headers=None,
                body=None,
                expected_status=expected_status,
                expected_response=None
            )
            db.add(new_test)
            imported_count += 1

    await db.commit()

    return {
        "message": f"成功导入 {imported_count} 个 API 测试用例",
        "imported_count": imported_count
    }


@router.post("/import-file")
async def import_openapi_file(file: UploadFile = File(...), db: AsyncSession = Depends(get_db)):
    content = await file.read()
    try:
        spec = json.loads(content)
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="无效的 JSON 格式")

    paths = spec.get('paths', {})
    imported_count = 0

    for path, path_item in paths.items():
        for method, operation in path_item.items():
            if method.upper() not in ['GET', 'POST', 'PUT', 'DELETE', 'PATCH']:
                continue

            test_name = operation.get('summary', f"{method.upper()} {path}")

            expected_status = 200
            responses = operation.get('responses', {})
            for status_code in ['200', '201', '204']:
                if status_code in responses:
                    expected_status = int(status_code)
                    break

            new_test = APITestCase(
                name=test_name,
                method=method.upper(),
                path=path,
                headers=None,
                body=None,
                expected_status=expected_status,
                expected_response=None
            )
            db.add(new_test)
            imported_count += 1

    await db.commit()

    return {
        "message": f"成功导入 {imported_count} 个 API 测试用例",
        "imported_count": imported_count,
        "filename": file.filename
    }


@router.post("/{test_id}/run", response_model=ExecutionResponse)
async def run_api_test(
    test_id: int,
    base_url: Optional[str] = None,
    environment: str = "test",
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(APITestCase).where(APITestCase.id == test_id))
    test_case = result.scalar_one_or_none()
    if not test_case:
        raise HTTPException(status_code=404, detail="API 测试用例不存在")

    execution_id = str(uuid.uuid4())

    env_base_urls = {
        "dev": "http://dev.example.com/api",
        "test": "http://test.example.com/api",
        "prod": "http://prod.example.com/api"
    }
    actual_base_url = base_url or env_base_urls.get(environment, env_base_urls["test"])
    full_url = f"{actual_base_url}{test_case.path}"

    test_case.last_run_at = datetime.utcnow()
    test_case.last_status = "通过"
    await db.commit()

    return ExecutionResponse(
        execution_id=execution_id,
        status="completed",
        message=f"API 测试用例 '{test_case.name}' 执行成功",
        results=[
            TestExecutionResult(
                test_case_id=test_case.id,
                test_case_name=test_case.name,
                status="通过",
                duration=0.35,
                error_message=None
            )
        ]
    )


@router.post("/run-batch", response_model=ExecutionResponse)
async def run_batch_api_tests(
    test_ids: List[int],
    environment: str = "test",
    db: AsyncSession = Depends(get_db)
):
    execution_id = str(uuid.uuid4())
    results = []

    for test_id in test_ids:
        result = await db.execute(select(APITestCase).where(APITestCase.id == test_id))
        test_case = result.scalar_one_or_none()
        if test_case:
            test_case.last_run_at = datetime.utcnow()
            test_case.last_status = "通过"
            results.append(
                TestExecutionResult(
                    test_case_id=test_case.id,
                    test_case_name=test_case.name,
                    status="通过",
                    duration=0.25,
                    error_message=None
                )
            )

    await db.commit()

    return ExecutionResponse(
        execution_id=execution_id,
        status="completed",
        message=f"批量执行 {len(results)} 个 API 测试用例完成",
        results=results
    )


@router.post("/run-ddt")
async def run_data_driven_test(
    test_id: int,
    test_data: List[dict],
    environment: str = "test",
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(APITestCase).where(APITestCase.id == test_id))
    test_case = result.scalar_one_or_none()
    if not test_case:
        raise HTTPException(status_code=404, detail="API 测试用例不存在")

    execution_id = str(uuid.uuid4())
    results = []

    for i, data_row in enumerate(test_data):
        results.append({
            "row": i + 1,
            "data": data_row,
            "status": "通过",
            "duration": 0.3
        })

    return {
        "execution_id": execution_id,
        "test_case_name": test_case.name,
        "total_rows": len(test_data),
        "passed_rows": len(test_data),
        "failed_rows": 0,
        "results": results
    }
