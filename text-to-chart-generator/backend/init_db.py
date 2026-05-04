import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.models import init_db, get_session_local, Company, FinancialReport

def populate_sample_data():
    session = get_session_local()
    
    companies = [
        Company(name="腾讯控股", stock_code="0700.HK", industry="互联网科技"),
        Company(name="阿里巴巴", stock_code="9988.HK", industry="电商"),
        Company(name="字节跳动", stock_code="PRIVATE", industry="互联网科技"),
        Company(name="美团", stock_code="3690.HK", industry="本地生活"),
        Company(name="京东", stock_code="9618.HK", industry="电商"),
    ]
    
    for company in companies:
        session.add(company)
    
    session.commit()
    
    financial_data = []
    
    company_data = {
        "腾讯控股": {
            "base_revenue": 1500000,
            "base_profit": 500000,
            "growth_rate": 0.08
        },
        "阿里巴巴": {
            "base_revenue": 2000000,
            "base_profit": 450000,
            "growth_rate": 0.05
        },
        "字节跳动": {
            "base_revenue": 800000,
            "base_profit": 200000,
            "growth_rate": 0.15
        },
        "美团": {
            "base_revenue": 600000,
            "base_profit": 50000,
            "growth_rate": 0.12
        },
        "京东": {
            "base_revenue": 2500000,
            "base_profit": 100000,
            "growth_rate": 0.06
        }
    }
    
    for company in session.query(Company).all():
        data = company_data.get(company.name, {
            "base_revenue": 500000,
            "base_profit": 100000,
            "growth_rate": 0.05
        })
        
        for year in [2022, 2023, 2024]:
            for quarter in [1, 2, 3, 4]:
                year_factor = (year - 2022) * data["growth_rate"]
                quarter_factor = 1 + (quarter - 1) * 0.05
                
                revenue = data["base_revenue"] * (1 + year_factor) * quarter_factor
                profit = data["base_profit"] * (1 + year_factor * 0.8) * quarter_factor
                net_profit = profit * 0.75
                
                report = FinancialReport(
                    company_id=company.id,
                    report_year=year,
                    report_quarter=quarter,
                    revenue=round(revenue, 2),
                    profit=round(profit, 2),
                    net_profit=round(net_profit, 2),
                    total_assets=round(revenue * 3, 2),
                    total_liabilities=round(revenue * 1.5, 2),
                    operating_cash_flow=round(profit * 1.2, 2)
                )
                financial_data.append(report)
    
    for fd in financial_data:
        session.add(fd)
    
    session.commit()
    session.close()
    
    print("数据库初始化完成，已添加样本数据")

if __name__ == "__main__":
    init_db()
    populate_sample_data()
