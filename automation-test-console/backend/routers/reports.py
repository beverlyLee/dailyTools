from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List
from datetime import datetime

from database import get_db, TestReport
from schemas import TestReportResponse

router = APIRouter()


@router.get("/", response_model=List[TestReportResponse])
async def get_reports(
    report_type: str = None,
    environment: str = None,
    db: AsyncSession = Depends(get_db)
):
    query = select(TestReport).order_by(TestReport.created_at.desc())

    if report_type:
        query = query.where(TestReport.report_type == report_type)
    if environment:
        query = query.where(TestReport.environment == environment)

    result = await db.execute(query)
    return result.scalars().all()


@router.get("/{report_id}", response_model=TestReportResponse)
async def get_report(report_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(TestReport).where(TestReport.id == report_id))
    report = result.scalar_one_or_none()
    if not report:
        raise HTTPException(status_code=404, detail="测试报告不存在")
    return report


@router.get("/stats/summary")
async def get_report_summary(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(TestReport).order_by(TestReport.created_at.desc()).limit(100))
    reports = result.scalars().all()

    total_tests = sum(r.total_tests for r in reports)
    passed_tests = sum(r.passed_tests for r in reports)
    failed_tests = sum(r.failed_tests for r in reports)
    skipped_tests = sum(r.skipped_tests for r in reports)
    total_duration = sum(r.duration for r in reports)

    success_rate = (passed_tests / total_tests * 100) if total_tests > 0 else 0
    avg_duration = (total_duration / len(reports)) if reports else 0

    return {
        "total_executions": len(reports),
        "total_tests": total_tests,
        "passed_tests": passed_tests,
        "failed_tests": failed_tests,
        "skipped_tests": skipped_tests,
        "success_rate": round(success_rate, 2),
        "average_duration": round(avg_duration, 2)
    }


@router.get("/trends/daily")
async def get_daily_trends(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(TestReport).order_by(TestReport.created_at.desc()).limit(30))
    reports = result.scalars().all()

    daily_data = {}
    for report in reports:
        date_key = report.created_at.strftime("%Y-%m-%d")
        if date_key not in daily_data:
            daily_data[date_key] = {
                "date": date_key,
                "total": 0,
                "passed": 0,
                "failed": 0,
                "count": 0
            }
        daily_data[date_key]["total"] += report.total_tests
        daily_data[date_key]["passed"] += report.passed_tests
        daily_data[date_key]["failed"] += report.failed_tests
        daily_data[date_key]["count"] += 1

    return sorted(daily_data.values(), key=lambda x: x["date"])


@router.post("/{report_id}/compare/{other_report_id}")
async def compare_reports(
    report_id: int,
    other_report_id: int,
    db: AsyncSession = Depends(get_db)
):
    result1 = await db.execute(select(TestReport).where(TestReport.id == report_id))
    report1 = result1.scalar_one_or_none()
    if not report1:
        raise HTTPException(status_code=404, detail="第一个测试报告不存在")

    result2 = await db.execute(select(TestReport).where(TestReport.id == other_report_id))
    report2 = result2.scalar_one_or_none()
    if not report2:
        raise HTTPException(status_code=404, detail="第二个测试报告不存在")

    pass_rate1 = (report1.passed_tests / report1.total_tests * 100) if report1.total_tests > 0 else 0
    pass_rate2 = (report2.passed_tests / report2.total_tests * 100) if report2.total_tests > 0 else 0

    return {
        "report1": {
            "id": report1.id,
            "name": report1.name,
            "created_at": report1.created_at.isoformat(),
            "total_tests": report1.total_tests,
            "passed_tests": report1.passed_tests,
            "failed_tests": report1.failed_tests,
            "pass_rate": round(pass_rate1, 2),
            "duration": report1.duration
        },
        "report2": {
            "id": report2.id,
            "name": report2.name,
            "created_at": report2.created_at.isoformat(),
            "total_tests": report2.total_tests,
            "passed_tests": report2.passed_tests,
            "failed_tests": report2.failed_tests,
            "pass_rate": round(pass_rate2, 2),
            "duration": report2.duration
        },
        "comparison": {
            "pass_rate_diff": round(pass_rate1 - pass_rate2, 2),
            "test_count_diff": report1.total_tests - report2.total_tests,
            "duration_diff": round(report1.duration - report2.duration, 2)
        }
    }


@router.delete("/{report_id}")
async def delete_report(report_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(TestReport).where(TestReport.id == report_id))
    report = result.scalar_one_or_none()
    if not report:
        raise HTTPException(status_code=404, detail="测试报告不存在")

    await db.delete(report)
    await db.commit()
    return {"message": "测试报告已删除"}


@router.get("/{report_id}/download")
async def download_report(report_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(TestReport).where(TestReport.id == report_id))
    report = result.scalar_one_or_none()
    if not report:
        raise HTTPException(status_code=404, detail="测试报告不存在")

    pass_rate = (report.passed_tests / report.total_tests * 100) if report.total_tests > 0 else 0

    report_content = f"""# 测试报告: {report.name}

## 基本信息
- 报告类型: {report.report_type}
- 执行环境: {report.environment}
- 创建时间: {report.created_at.strftime('%Y-%m-%d %H:%M:%S')}

## 测试结果统计
- 总测试数: {report.total_tests}
- 通过: {report.passed_tests}
- 失败: {report.failed_tests}
- 跳过: {report.skipped_tests}
- 通过率: {pass_rate:.2f}%
- 执行时长: {report.duration:.2f} 秒

## 详细信息
{report.details if report.details else '无详细信息'}
"""

    return {
        "filename": f"report_{report.id}.md",
        "content": report_content,
        "content_type": "text/markdown"
    }
