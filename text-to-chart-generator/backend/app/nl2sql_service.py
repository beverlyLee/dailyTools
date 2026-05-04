from langchain_openai import ChatOpenAI
from langchain.chains import LLMChain
from langchain.prompts import PromptTemplate
from .config import settings
from .models import get_session_local, Company, FinancialReport
from sqlalchemy import text

class NL2SQLService:
    def __init__(self):
        self.llm = ChatOpenAI(
            model=settings.OPENAI_MODEL,
            temperature=0,
            openai_api_key=settings.OPENAI_API_KEY
        )
        self.db = get_session_local()
        self.db_schema = self._get_db_schema()
        self.chain = self._create_chain()

    def _get_db_schema(self):
        return """
数据库包含以下两个表：

1. companies 表（公司信息表）：
   - id: INTEGER, 主键
   - name: VARCHAR(255), 公司名称
   - stock_code: VARCHAR(20), 股票代码
   - industry: VARCHAR(100), 行业

2. financial_reports 表（财务报表表）：
   - id: INTEGER, 主键
   - company_id: INTEGER, 外键，关联 companies.id
   - report_year: INTEGER, 报告年份
   - report_quarter: INTEGER, 报告季度 (1-4)
   - revenue: FLOAT, 营业收入（单位：万元）
   - profit: FLOAT, 利润总额（单位：万元）
   - net_profit: FLOAT, 净利润（单位：万元）
   - total_assets: FLOAT, 总资产（单位：万元）
   - total_liabilities: FLOAT, 总负债（单位：万元）
   - operating_cash_flow: FLOAT, 经营活动现金流量（单位：万元）

表关联关系：financial_reports.company_id = companies.id
"""

    def _create_chain(self):
        template = """你是一个专业的SQL分析师。根据用户的自然语言查询，将其转换为SQLite兼容的SQL语句。

数据库结构：
{db_schema}

用户查询：{user_query}

请只返回SQL语句本身，不要包含任何解释、markdown格式或其他内容。如果无法转换为有效的SQL查询，请返回"ERROR: 无法理解的查询"。

SQL语句："""

        prompt = PromptTemplate(
            input_variables=["db_schema", "user_query"],
            template=template
        )

        return LLMChain(llm=self.llm, prompt=prompt)

    def natural_language_to_sql(self, user_query: str) -> str:
        try:
            result = self.chain.run({
                "db_schema": self.db_schema,
                "user_query": user_query
            })
            return result.strip()
        except Exception as e:
            return f"ERROR: {str(e)}"

    def execute_query(self, sql: str):
        try:
            if sql.startswith("ERROR"):
                return {"success": False, "error": sql}

            if not self._is_safe_query(sql):
                return {"success": False, "error": "ERROR: 不允许执行的操作"}

            result = self.db.execute(text(sql))
            self.db.commit()

            if sql.strip().upper().startswith("SELECT"):
                rows = result.fetchall()
                columns = result.keys() if result.keys() else []
                return {
                    "success": True,
                    "columns": list(columns),
                    "data": [dict(zip(columns, row)) for row in rows]
                }
            else:
                return {"success": True, "affected_rows": result.rowcount}

        except Exception as e:
            self.db.rollback()
            return {"success": False, "error": f"ERROR: {str(e)}"}

    def _is_safe_query(self, sql: str) -> bool:
        dangerous_keywords = ["DROP", "DELETE", "TRUNCATE", "ALTER", "UPDATE", "INSERT", "CREATE", "GRANT", "REVOKE"]
        sql_upper = sql.upper().strip()
        for keyword in dangerous_keywords:
            if keyword in sql_upper and not sql_upper.startswith("SELECT"):
                return False
        return True

    def process_query(self, user_query: str):
        sql = self.natural_language_to_sql(user_query)
        if sql.startswith("ERROR"):
            return {"success": False, "error": sql, "sql": None, "data": None}
        
        result = self.execute_query(sql)
        if result["success"]:
            return {
                "success": True,
                "sql": sql,
                "columns": result.get("columns", []),
                "data": result.get("data", [])
            }
        else:
            return {"success": False, "error": result["error"], "sql": sql, "data": None}

    def close(self):
        self.db.close()
