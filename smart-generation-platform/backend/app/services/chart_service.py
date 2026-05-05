import os
import json
from typing import Optional, List, Dict, Any
from datetime import datetime
import aiohttp
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, text
from app.config import get_settings
from app.models import FinancialReport

settings = get_settings()


class NL2SQLService:
    def __init__(self):
        self.table_schema = {
            "financial_reports": {
                "columns": [
                    {"name": "id", "type": "INTEGER", "description": "主键ID"},
                    {"name": "company", "type": "VARCHAR(100)", "description": "公司名称"},
                    {"name": "year", "type": "INTEGER", "description": "年份"},
                    {"name": "quarter", "type": "INTEGER", "description": "季度(1-4)"},
                    {"name": "revenue", "type": "FLOAT", "description": "营收(单位:万元)"},
                    {"name": "profit", "type": "FLOAT", "description": "利润(单位:万元)"},
                    {"name": "net_income", "type": "FLOAT", "description": "净利润(单位:万元)"},
                    {"name": "total_assets", "type": "FLOAT", "description": "总资产(单位:万元)"},
                    {"name": "total_liabilities", "type": "FLOAT", "description": "总负债(单位:万元)"},
                    {"name": "created_at", "type": "DATETIME", "description": "创建时间"},
                ],
                "description": "上市公司财报数据表，包含各季度的营收、利润等财务数据",
            }
        }
    
    def build_prompt(self, user_query: str) -> str:
        schema_info = json.dumps(self.table_schema, ensure_ascii=False, indent=2)
        
        prompt = f"""你是一个SQL专家。根据用户的自然语言查询，将其转换为SQL查询语句。

数据库表结构：
{schema_info}

用户查询：{user_query}

请只返回SQL查询语句，不要返回其他内容。如果无法理解查询，请返回"ERROR: 无法解析查询"。

示例：
用户查询：显示过去一年各季度的营收和利润
SQL: SELECT quarter, revenue, profit FROM financial_reports WHERE year = strftime('%Y', 'now', '-1 year') ORDER BY quarter;

用户查询：显示A公司2024年的净利润
SQL: SELECT net_income FROM financial_reports WHERE company = 'A公司' AND year = 2024;

用户查询：显示所有公司的总资产和总负债
SQL: SELECT company, total_assets, total_liabilities FROM financial_reports;
"""
        return prompt
    
    async def call_langchain_openai(self, prompt: str) -> str:
        # 模拟LangChain OpenAI调用
        # 实际项目中应该使用真实的LangChain OpenAI集成
        
        # 这里使用简单的规则匹配来模拟SQL生成
        # 实际项目中应该：
        # 1. 使用langchain-openai包
        # 2. 配置OpenAI API密钥
        # 3. 使用SQLDatabaseChain等组件
        
        import asyncio
        await asyncio.sleep(1)
        
        # 简单的规则匹配模拟
        query_lower = prompt.lower()
        
        if "营收" in query_lower and "利润" in query_lower:
            if "过去一年" in query_lower or "去年" in query_lower:
                return "SELECT company, year, quarter, revenue, profit FROM financial_reports WHERE year = strftime('%Y', date('now', '-1 year')) ORDER BY company, year, quarter;"
            else:
                return "SELECT company, year, quarter, revenue, profit FROM financial_reports ORDER BY company, year, quarter;"
        
        if "净利润" in query_lower:
            if "2024" in query_lower:
                return "SELECT company, quarter, net_income FROM financial_reports WHERE year = 2024 ORDER BY company, quarter;"
            else:
                return "SELECT company, year, quarter, net_income FROM financial_reports ORDER BY company, year, quarter;"
        
        if "总资产" in query_lower or "总负债" in query_lower:
            return "SELECT company, year, quarter, total_assets, total_liabilities FROM financial_reports ORDER BY company, year, quarter;"
        
        # 默认返回所有数据
        return "SELECT * FROM financial_reports ORDER BY company, year, quarter;"
    
    async def natural_language_to_sql(self, user_query: str) -> str:
        if settings.OPENAI_API_KEY:
            # 如果配置了OpenAI API，使用真实的LangChain调用
            try:
                from langchain_openai import ChatOpenAI
                from langchain_core.prompts import ChatPromptTemplate
                from langchain_core.output_parsers import StrOutputParser
                
                llm = ChatOpenAI(
                    model_name="gpt-3.5-turbo",
                    api_key=settings.OPENAI_API_KEY,
                    temperature=0,
                )
                
                prompt = ChatPromptTemplate.from_template(self.build_prompt(user_query))
                chain = prompt | llm | StrOutputParser()
                
                sql = await chain.ainvoke({"user_query": user_query})
                return sql
            except Exception as e:
                print(f"LangChain调用失败，使用模拟模式: {e}")
        
        # 使用模拟模式
        return await self.call_langchain_openai(user_query)
    
    async def execute_sql(
        self,
        db: AsyncSession,
        sql: str
    ) -> Dict[str, Any]:
        # 执行SQL查询
        # 注意：实际项目中应该对SQL进行安全检查，防止SQL注入
        
        try:
            result = await db.execute(text(sql))
            rows = result.fetchall()
            
            # 获取列名
            columns = result.keys() if hasattr(result, 'keys') else []
            
            # 转换为字典列表
            data = []
            for row in rows:
                row_dict = {}
                for i, col in enumerate(columns):
                    row_dict[col] = row[i]
                data.append(row_dict)
            
            return {
                "success": True,
                "columns": list(columns),
                "data": data,
                "row_count": len(data),
            }
        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "columns": [],
                "data": [],
                "row_count": 0,
            }
    
    def recommend_chart_type(
        self,
        data: List[Dict[str, Any]],
        columns: List[str]
    ) -> Dict[str, Any]:
        # 根据数据特征推荐图表类型
        
        if not data or len(data) == 0:
            return {
                "recommended_type": "table",
                "reason": "没有数据，推荐使用表格展示",
                "possible_types": ["table"],
            }
        
        # 分析数据特征
        has_numeric = False
        has_categorical = False
        has_time = False
        
        numeric_columns = []
        categorical_columns = []
        
        for col in columns:
            # 检查第一行数据来判断列类型
            if len(data) > 0 and col in data[0]:
                value = data[0][col]
                if isinstance(value, (int, float)):
                    has_numeric = True
                    numeric_columns.append(col)
                elif isinstance(value, str):
                    if col.lower() in ["year", "quarter", "month", "date", "time"]:
                        has_time = True
                    else:
                        has_categorical = True
                        categorical_columns.append(col)
        
        # 推荐逻辑
        if has_time and has_numeric:
            # 有时间序列和数值数据，推荐折线图
            return {
                "recommended_type": "line",
                "reason": "包含时间序列和数值数据，推荐使用折线图展示趋势",
                "possible_types": ["line", "bar", "area"],
                "x_axis": [col for col in ["year", "quarter", "month", "date"] if col in columns][0] if has_time else None,
                "y_axis": numeric_columns,
            }
        elif has_categorical and has_numeric:
            # 有分类和数值数据，推荐柱状图
            return {
                "recommended_type": "bar",
                "reason": "包含分类和数值数据，推荐使用柱状图进行比较",
                "possible_types": ["bar", "pie", "horizontal_bar"],
                "categories": categorical_columns,
                "values": numeric_columns,
            }
        elif len(numeric_columns) >= 2:
            # 多个数值列，推荐散点图
            return {
                "recommended_type": "scatter",
                "reason": "包含多个数值列，推荐使用散点图展示相关性",
                "possible_types": ["scatter", "bubble"],
                "x_axis": numeric_columns[0] if numeric_columns else None,
                "y_axis": numeric_columns[1] if len(numeric_columns) > 1 else None,
            }
        else:
            # 其他情况，推荐表格
            return {
                "recommended_type": "table",
                "reason": "数据特征不明确，推荐使用表格展示",
                "possible_types": ["table"],
            }
    
    async def process_query(
        self,
        db: AsyncSession,
        user_query: str
    ) -> Dict[str, Any]:
        # 完整的NL2SQL处理流程
        
        # 1. 生成SQL
        sql = await self.natural_language_to_sql(user_query)
        
        # 检查是否生成失败
        if sql.startswith("ERROR"):
            return {
                "success": False,
                "error": sql,
                "user_query": user_query,
                "sql": None,
                "result": None,
                "chart_recommendation": None,
            }
        
        # 2. 执行SQL
        result = await self.execute_sql(db, sql)
        
        if not result["success"]:
            return {
                "success": False,
                "error": f"SQL执行失败: {result['error']}",
                "user_query": user_query,
                "sql": sql,
                "result": result,
                "chart_recommendation": None,
            }
        
        # 3. 推荐图表类型
        chart_recommendation = self.recommend_chart_type(
            result["data"],
            result["columns"]
        )
        
        return {
            "success": True,
            "user_query": user_query,
            "sql": sql,
            "result": result,
            "chart_recommendation": chart_recommendation,
        }
    
    async def init_sample_data(self, db: AsyncSession) -> None:
        # 初始化示例财报数据
        sample_data = [
            # A公司数据
            {"company": "A科技有限公司", "year": 2023, "quarter": 1, "revenue": 50000, "profit": 8500, "net_income": 6800, "total_assets": 250000, "total_liabilities": 80000},
            {"company": "A科技有限公司", "year": 2023, "quarter": 2, "revenue": 55000, "profit": 9200, "net_income": 7360, "total_assets": 260000, "total_liabilities": 85000},
            {"company": "A科技有限公司", "year": 2023, "quarter": 3, "revenue": 60000, "profit": 10500, "net_income": 8400, "total_assets": 275000, "total_liabilities": 90000},
            {"company": "A科技有限公司", "year": 2023, "quarter": 4, "revenue": 75000, "profit": 15000, "net_income": 12000, "total_assets": 300000, "total_liabilities": 95000},
            {"company": "A科技有限公司", "year": 2024, "quarter": 1, "revenue": 65000, "profit": 11000, "net_income": 8800, "total_assets": 310000, "total_liabilities": 98000},
            
            # B公司数据
            {"company": "B金融服务集团", "year": 2023, "quarter": 1, "revenue": 120000, "profit": 25000, "net_income": 20000, "total_assets": 1500000, "total_liabilities": 800000},
            {"company": "B金融服务集团", "year": 2023, "quarter": 2, "revenue": 135000, "profit": 28000, "net_income": 22400, "total_assets": 1600000, "total_liabilities": 850000},
            {"company": "B金融服务集团", "year": 2023, "quarter": 3, "revenue": 150000, "profit": 32000, "net_income": 25600, "total_assets": 1750000, "total_liabilities": 900000},
            {"company": "B金融服务集团", "year": 2023, "quarter": 4, "revenue": 180000, "profit": 40000, "net_income": 32000, "total_assets": 2000000, "total_liabilities": 1000000},
            {"company": "B金融服务集团", "year": 2024, "quarter": 1, "revenue": 160000, "profit": 35000, "net_income": 28000, "total_assets": 2100000, "total_liabilities": 1050000},
            
            # C公司数据
            {"company": "C智能制造股份", "year": 2023, "quarter": 1, "revenue": 80000, "profit": 12000, "net_income": 9600, "total_assets": 500000, "total_liabilities": 200000},
            {"company": "C智能制造股份", "year": 2023, "quarter": 2, "revenue": 90000, "profit": 13500, "net_income": 10800, "total_assets": 520000, "total_liabilities": 210000},
            {"company": "C智能制造股份", "year": 2023, "quarter": 3, "revenue": 100000, "profit": 15000, "net_income": 12000, "total_assets": 550000, "total_liabilities": 220000},
            {"company": "C智能制造股份", "year": 2023, "quarter": 4, "revenue": 120000, "profit": 20000, "net_income": 16000, "total_assets": 600000, "total_liabilities": 230000},
            {"company": "C智能制造股份", "year": 2024, "quarter": 1, "revenue": 95000, "profit": 14000, "net_income": 11200, "total_assets": 610000, "total_liabilities": 235000},
        ]
        
        for data in sample_data:
            report = FinancialReport(**data)
            db.add(report)
        
        await db.commit()
