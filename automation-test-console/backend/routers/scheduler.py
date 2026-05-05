from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List
from datetime import datetime
import uuid

from database import get_db, ScheduleTask
from schemas import (
    ScheduleTaskCreate, ScheduleTaskUpdate, ScheduleTaskResponse,
    ExecutionResponse, TestExecutionResult
)

router = APIRouter()


@router.get("/", response_model=List[ScheduleTaskResponse])
async def get_schedules(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(ScheduleTask).order_by(ScheduleTask.created_at.desc()))
    return result.scalars().all()


@router.get("/{task_id}", response_model=ScheduleTaskResponse)
async def get_schedule(task_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(ScheduleTask).where(ScheduleTask.id == task_id))
    task = result.scalar_one_or_none()
    if not task:
        raise HTTPException(status_code=404, detail="调度任务不存在")
    return task


@router.post("/", response_model=ScheduleTaskResponse)
async def create_schedule(task: ScheduleTaskCreate, db: AsyncSession = Depends(get_db)):
    new_task = ScheduleTask(
        name=task.name,
        task_type=task.task_type,
        test_cases=task.test_cases,
        environment=task.environment,
        schedule_type=task.schedule_type,
        cron_expression=task.cron_expression,
        interval=task.interval,
        interval_unit=task.interval_unit,
        enabled=task.enabled,
        notify_on_success=task.notify_on_success,
        notify_on_failure=task.notify_on_failure
    )
    db.add(new_task)
    await db.commit()
    await db.refresh(new_task)
    return new_task


@router.put("/{task_id}", response_model=ScheduleTaskResponse)
async def update_schedule(
    task_id: int,
    task: ScheduleTaskUpdate,
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(ScheduleTask).where(ScheduleTask.id == task_id))
    existing_task = result.scalar_one_or_none()
    if not existing_task:
        raise HTTPException(status_code=404, detail="调度任务不存在")

    update_data = task.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(existing_task, key, value)

    await db.commit()
    await db.refresh(existing_task)
    return existing_task


@router.delete("/{task_id}")
async def delete_schedule(task_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(ScheduleTask).where(ScheduleTask.id == task_id))
    task = result.scalar_one_or_none()
    if not task:
        raise HTTPException(status_code=404, detail="调度任务不存在")

    await db.delete(task)
    await db.commit()
    return {"message": "调度任务已删除"}


@router.post("/{task_id}/toggle")
async def toggle_schedule(task_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(ScheduleTask).where(ScheduleTask.id == task_id))
    task = result.scalar_one_or_none()
    if not task:
        raise HTTPException(status_code=404, detail="调度任务不存在")

    task.enabled = not task.enabled
    await db.commit()

    return {
        "message": f"调度任务已{'启用' if task.enabled else '禁用'}",
        "enabled": task.enabled
    }


@router.post("/{task_id}/run", response_model=ExecutionResponse)
async def run_schedule_now(task_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(ScheduleTask).where(ScheduleTask.id == task_id))
    task = result.scalar_one_or_none()
    if not task:
        raise HTTPException(status_code=404, detail="调度任务不存在")

    execution_id = str(uuid.uuid4())
    results = []

    if task.test_cases:
        for test_id in task.test_cases:
            results.append(
                TestExecutionResult(
                    test_case_id=test_id,
                    test_case_name=f"测试用例 {test_id}",
                    status="通过",
                    duration=1.5,
                    error_message=None
                )
            )

    task.last_run_at = datetime.utcnow()
    task.last_status = "通过"
    await db.commit()

    return ExecutionResponse(
        execution_id=execution_id,
        status="completed",
        message=f"调度任务 '{task.name}' 执行成功",
        results=results if results else None
    )


@router.get("/logs/recent")
async def get_recent_executions(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(ScheduleTask)
        .where(ScheduleTask.last_run_at.isnot(None))
        .order_by(ScheduleTask.last_run_at.desc())
        .limit(10)
    )
    tasks = result.scalars().all()

    return [
        {
            "task_name": task.name,
            "task_type": task.task_type,
            "environment": task.environment,
            "last_run_at": task.last_run_at.isoformat() if task.last_run_at else None,
            "last_status": task.last_status
        }
        for task in tasks
    ]


@router.get("/environments")
async def get_environments():
    return [
        {
            "name": "dev",
            "label": "开发环境 (Dev)",
            "base_url": "http://dev.example.com/api",
            "status": "正常"
        },
        {
            "name": "test",
            "label": "测试环境 (Test)",
            "base_url": "http://test.example.com/api",
            "status": "正常"
        },
        {
            "name": "prod",
            "label": "生产环境 (Prod)",
            "base_url": "http://prod.example.com/api",
            "status": "维护中"
        }
    ]
