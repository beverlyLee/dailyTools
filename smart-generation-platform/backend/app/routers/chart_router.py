from fastapi import APIRouter, Depends, Query
from fastapi.responses import JSONResponse
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel
from app.database import get_db
from app.services.chart_service import NL2SQLService

router = APIRouter(prefix="/api/chart", tags=["图表生成"])

nl2sql_service = NL2SQLService()


class QueryRequest(BaseModel):
    query: str


@router.post("/query")
async def process_natural_language_query(
    request: QueryRequest,
    db: AsyncSession = Depends(get_db),
):
    # 处理自然语言查询
    result = await nl2sql_service.process_query(
        db=db,
        user_query=request.query,
    )
    
    return JSONResponse(
        content=result
    )


@router.get("/query")
async def process_natural_language_query_get(
    query: str = Query(..., description="自然语言查询语句"),
    db: AsyncSession = Depends(get_db),
):
    # 处理自然语言查询（GET方法）
    result = await nl2sql_service.process_query(
        db=db,
        user_query=query,
    )
    
    return JSONResponse(
        content=result
    )


@router.get("/schema")
async def get_database_schema():
    # 获取数据库表结构
    return JSONResponse(
        content={
            "success": True,
            "schema": nl2sql_service.table_schema,
        }
    )


@router.post("/init-sample-data")
async def initialize_sample_data(
    db: AsyncSession = Depends(get_db),
):
    # 初始化示例数据
    try:
        await nl2sql_service.init_sample_data(db)
        return JSONResponse(
            content={
                "success": True,
                "message": "示例财报数据已成功初始化",
            }
        )
    except Exception as e:
        return JSONResponse(
            content={
                "success": False,
                "error": str(e),
            },
            status_code=500,
        )


@router.get("/example-queries")
async def get_example_queries():
    # 返回示例查询语句
    examples = [
        {
            "query": "显示过去一年各季度的营收和利润",
            "description": "查询上一年度各季度的财务数据",
            "expected_chart": "line",
        },
        {
            "query": "显示A公司2024年的净利润",
            "description": "查询特定公司特定年份的净利润",
            "expected_chart": "bar",
        },
        {
            "query": "显示所有公司的总资产和总负债",
            "description": "查询所有公司的资产负债情况",
            "expected_chart": "bar",
        },
        {
            "query": "显示2023年各季度的营收对比",
            "description": "比较2023年各季度的营收数据",
            "expected_chart": "bar",
        },
        {
            "query": "显示B金融服务集团的财务趋势",
            "description": "查询特定公司的财务数据趋势",
            "expected_chart": "line",
        },
    ]
    
    return JSONResponse(
        content={
            "success": True,
            "examples": examples,
        }
    )
