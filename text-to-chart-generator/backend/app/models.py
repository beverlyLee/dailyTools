from sqlalchemy import Column, Integer, String, Float, Date, ForeignKey, create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship
from .config import settings
import os

Base = declarative_base()

class Company(Base):
    __tablename__ = "companies"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    stock_code = Column(String(20), unique=True, index=True)
    industry = Column(String(100))

    financial_reports = relationship("FinancialReport", back_populates="company")

class FinancialReport(Base):
    __tablename__ = "financial_reports"

    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False)
    report_year = Column(Integer, nullable=False)
    report_quarter = Column(Integer, nullable=False)
    revenue = Column(Float, nullable=False)
    profit = Column(Float, nullable=False)
    net_profit = Column(Float)
    total_assets = Column(Float)
    total_liabilities = Column(Float)
    operating_cash_flow = Column(Float)

    company = relationship("Company", back_populates="financial_reports")

def get_engine():
    db_url = settings.DATABASE_URL
    if db_url.startswith("sqlite"):
        db_path = db_url.replace("sqlite:///", "")
        db_dir = os.path.dirname(db_path)
        if db_dir and not os.path.exists(db_dir):
            os.makedirs(db_dir)
    return create_engine(
        db_url,
        connect_args={"check_same_thread": False} if db_url.startswith("sqlite") else {}
    )

def get_session_local():
    engine = get_engine()
    return sessionmaker(autocommit=False, autoflush=False, bind=engine)

def init_db():
    engine = get_engine()
    Base.metadata.create_all(bind=engine)
