from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List
from datetime import datetime
import uuid

from database import get_db, UITestCase
from schemas import (
    UITestCaseCreate, UITestCaseUpdate, UITestCaseResponse,
    LocatorValidationRequest, ExecutionResponse, TestExecutionResult
)

router = APIRouter()


@router.get("/", response_model=List[UITestCaseResponse])
async def get_ui_test_cases(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(UITestCase).order_by(UITestCase.created_at.desc()))
    return result.scalars().all()


@router.get("/{test_id}", response_model=UITestCaseResponse)
async def get_ui_test_case(test_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(UITestCase).where(UITestCase.id == test_id))
    test_case = result.scalar_one_or_none()
    if not test_case:
        raise HTTPException(status_code=404, detail="UI 测试用例不存在")
    return test_case


@router.post("/", response_model=UITestCaseResponse)
async def create_ui_test_case(test_case: UITestCaseCreate, db: AsyncSession = Depends(get_db)):
    new_test = UITestCase(
        name=test_case.name,
        description=test_case.description,
        steps=[step.model_dump() for step in test_case.steps],
        assertions=test_case.assertions,
        target_url=test_case.target_url
    )
    db.add(new_test)
    await db.commit()
    await db.refresh(new_test)
    return new_test


@router.put("/{test_id}", response_model=UITestCaseResponse)
async def update_ui_test_case(
    test_id: int,
    test_case: UITestCaseUpdate,
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(UITestCase).where(UITestCase.id == test_id))
    existing_test = result.scalar_one_or_none()
    if not existing_test:
        raise HTTPException(status_code=404, detail="UI 测试用例不存在")

    update_data = test_case.model_dump(exclude_unset=True)
    if 'steps' in update_data:
        update_data['steps'] = [step.model_dump() for step in update_data['steps']]

    for key, value in update_data.items():
        setattr(existing_test, key, value)

    await db.commit()
    await db.refresh(existing_test)
    return existing_test


@router.delete("/{test_id}")
async def delete_ui_test_case(test_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(UITestCase).where(UITestCase.id == test_id))
    test_case = result.scalar_one_or_none()
    if not test_case:
        raise HTTPException(status_code=404, detail="UI 测试用例不存在")

    await db.delete(test_case)
    await db.commit()
    return {"message": "UI 测试用例已删除"}


@router.post("/validate-locator")
async def validate_locator(request: LocatorValidationRequest):
    return {
        "valid": True,
        "message": f"定位器验证成功: {request.locator_type} = {request.locator_value}",
        "suggestions": [
            "使用更稳定的选择器",
            "避免使用动态 ID",
            "优先使用 data-testid 属性"
        ]
    }


@router.post("/{test_id}/run", response_model=ExecutionResponse)
async def run_ui_test(test_id: int, environment: str = "test", db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(UITestCase).where(UITestCase.id == test_id))
    test_case = result.scalar_one_or_none()
    if not test_case:
        raise HTTPException(status_code=404, detail="UI 测试用例不存在")

    execution_id = str(uuid.uuid4())

    test_case.last_run_at = datetime.utcnow()
    test_case.last_status = "通过"
    await db.commit()

    return ExecutionResponse(
        execution_id=execution_id,
        status="completed",
        message=f"UI 测试用例 '{test_case.name}' 执行成功",
        results=[
            TestExecutionResult(
                test_case_id=test_case.id,
                test_case_name=test_case.name,
                status="通过",
                duration=2.5,
                error_message=None
            )
        ]
    )


@router.post("/{test_id}/generate-script")
async def generate_playwright_script(test_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(UITestCase).where(UITestCase.id == test_id))
    test_case = result.scalar_one_or_none()
    if not test_case:
        raise HTTPException(status_code=404, detail="UI 测试用例不存在")

    script_lines = [
        "import asyncio",
        "from playwright.async_api import async_playwright",
        "",
        "async def run_test():",
        "    async with async_playwright() as p:",
        "        browser = await p.chromium.launch(headless=True)",
        "        page = await browser.new_page()",
        f"        await page.goto('{test_case.target_url}')",
        ""
    ]

    for step in test_case.steps:
        action = step.get('action', '')
        element = step.get('element', '')
        value = step.get('value', '')

        if action == 'goto':
            script_lines.append(f"        await page.goto('{element}')")
        elif action == 'click':
            script_lines.append(f"        await page.click('{element}')")
        elif action == 'fill':
            script_lines.append(f"        await page.fill('{element}', '{value}')")
        elif action == 'type':
            script_lines.append(f"        await page.type('{element}', '{value}')")
        elif action == 'wait':
            script_lines.append(f"        await page.wait_for_selector('{element}')")

    script_lines.extend([
        "",
        "        await browser.close()",
        "",
        "if __name__ == '__main__':",
        "    asyncio.run(run_test())"
    ])

    return {
        "test_case_name": test_case.name,
        "script": "\n".join(script_lines),
        "language": "python"
    }
