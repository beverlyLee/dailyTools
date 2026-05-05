from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy import (
    Column, Integer, String, Text, DateTime, 
    Numeric, Boolean, ForeignKey, Index, func
)
from sqlalchemy.orm import relationship
from datetime import datetime
from config import settings

engine = create_async_engine(settings.DATABASE_URL, echo=settings.DEBUG)
async_session_maker = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

class Base(DeclarativeBase):
    pass

class Company(Base):
    __tablename__ = "companies"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False, comment="公司名称")
    tax_id = Column(String(50), unique=True, index=True, comment="统一社会信用代码")
    address = Column(String(500), comment="地址")
    phone = Column(String(50), comment="电话")
    bank_name = Column(String(200), comment="开户行")
    bank_account = Column(String(100), comment="银行账号")
    is_active = Column(Boolean, default=True, comment="是否启用")
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    
    invoices = relationship("Invoice", back_populates="company")

class Invoice(Base):
    __tablename__ = "invoices"
    
    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=True, index=True)
    
    invoice_type = Column(String(50), default="vat_invoice", comment="票据类型")
    invoice_code = Column(String(50), index=True, comment="发票代码")
    invoice_number = Column(String(50), index=True, comment="发票号码")
    
    invoice_date = Column(DateTime, comment="开票日期")
    check_code = Column(String(100), comment="校验码")
    machine_number = Column(String(50), comment="机器编号")
    
    seller_name = Column(String(200), comment="销售方名称")
    seller_tax_id = Column(String(50), index=True, comment="销售方纳税人识别号")
    seller_address = Column(String(500), comment="销售方地址电话")
    seller_bank = Column(String(300), comment="销售方开户行及账号")
    
    buyer_name = Column(String(200), index=True, comment="购买方名称")
    buyer_tax_id = Column(String(50), index=True, comment="购买方纳税人识别号")
    buyer_address = Column(String(500), comment="购买方地址电话")
    buyer_bank = Column(String(300), comment="购买方开户行及账号")
    
    total_amount = Column(Numeric(15, 2), default=0, comment="金额")
    total_tax = Column(Numeric(15, 2), default=0, comment="税额")
    total_amount_with_tax = Column(Numeric(15, 2), default=0, comment="价税合计")
    
    remarks = Column(Text, comment="备注")
    payee = Column(String(100), comment="收款人")
    reviewer = Column(String(100), comment="复核")
    drawer = Column(String(100), comment="开票人")
    seller_seal = Column(Boolean, default=False, comment="是否有销售方章")
    
    is_verified = Column(Boolean, default=False, comment="是否已核验")
    verification_status = Column(String(50), default="pending", comment="核验状态")
    verification_message = Column(Text, comment="核验信息")
    verified_at = Column(DateTime, nullable=True, comment="核验时间")
    
    is_reimbursed = Column(Boolean, default=False, comment="是否已报销")
    reimbursed_at = Column(DateTime, nullable=True, comment="报销时间")
    reimbursed_by = Column(String(100), comment="报销人")
    
    image_path = Column(String(500), comment="图片路径")
    raw_ocr_data = Column(Text, comment="原始OCR数据(JSON)")
    
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    
    company = relationship("Company", back_populates="invoices")
    items = relationship("InvoiceItem", back_populates="invoice", cascade="all, delete-orphan")
    verification_records = relationship("VerificationRecord", back_populates="invoice", cascade="all, delete-orphan")
    
    __table_args__ = (
        Index('idx_invoice_code_number', 'invoice_code', 'invoice_number'),
        Index('idx_invoice_date', 'invoice_date'),
    )
    
    def to_dict(self):
        return {
            "id": self.id,
            "company_id": self.company_id,
            "invoice_type": self.invoice_type,
            "invoice_code": self.invoice_code,
            "invoice_number": self.invoice_number,
            "invoice_date": self.invoice_date.isoformat() if self.invoice_date else None,
            "check_code": self.check_code,
            "machine_number": self.machine_number,
            "seller_name": self.seller_name,
            "seller_tax_id": self.seller_tax_id,
            "seller_address": self.seller_address,
            "seller_bank": self.seller_bank,
            "buyer_name": self.buyer_name,
            "buyer_tax_id": self.buyer_tax_id,
            "buyer_address": self.buyer_address,
            "buyer_bank": self.buyer_bank,
            "total_amount": float(self.total_amount) if self.total_amount else 0,
            "total_tax": float(self.total_tax) if self.total_tax else 0,
            "total_amount_with_tax": float(self.total_amount_with_tax) if self.total_amount_with_tax else 0,
            "remarks": self.remarks,
            "payee": self.payee,
            "reviewer": self.reviewer,
            "drawer": self.drawer,
            "seller_seal": self.seller_seal,
            "is_verified": self.is_verified,
            "verification_status": self.verification_status,
            "verification_message": self.verification_message,
            "verified_at": self.verified_at.isoformat() if self.verified_at else None,
            "is_reimbursed": self.is_reimbursed,
            "reimbursed_at": self.reimbursed_at.isoformat() if self.reimbursed_at else None,
            "reimbursed_by": self.reimbursed_by,
            "image_path": self.image_path,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None
        }

class InvoiceItem(Base):
    __tablename__ = "invoice_items"
    
    id = Column(Integer, primary_key=True, index=True)
    invoice_id = Column(Integer, ForeignKey("invoices.id"), nullable=False, index=True)
    
    item_number = Column(Integer, comment="项目序号")
    item_name = Column(String(500), comment="货物或应税劳务、服务名称")
    specification = Column(String(200), comment="规格型号")
    unit = Column(String(50), comment="单位")
    quantity = Column(Numeric(15, 4), default=0, comment="数量")
    unit_price = Column(Numeric(15, 6), default=0, comment="单价")
    amount = Column(Numeric(15, 2), default=0, comment="金额")
    tax_rate = Column(String(20), comment="税率")
    tax_amount = Column(Numeric(15, 2), default=0, comment="税额")
    
    created_at = Column(DateTime, server_default=func.now())
    
    invoice = relationship("Invoice", back_populates="items")
    
    def to_dict(self):
        return {
            "id": self.id,
            "invoice_id": self.invoice_id,
            "item_number": self.item_number,
            "item_name": self.item_name,
            "specification": self.specification,
            "unit": self.unit,
            "quantity": float(self.quantity) if self.quantity else 0,
            "unit_price": float(self.unit_price) if self.unit_price else 0,
            "amount": float(self.amount) if self.amount else 0,
            "tax_rate": self.tax_rate,
            "tax_amount": float(self.tax_amount) if self.tax_amount else 0
        }

class VerificationRecord(Base):
    __tablename__ = "verification_records"
    
    id = Column(Integer, primary_key=True, index=True)
    invoice_id = Column(Integer, ForeignKey("invoices.id"), nullable=False, index=True)
    
    check_type = Column(String(50), comment="检查类型")
    check_name = Column(String(200), comment="检查名称")
    is_passed = Column(Boolean, default=False, comment="是否通过")
    message = Column(Text, comment="检查信息")
    details = Column(Text, comment="详细信息(JSON)")
    
    created_at = Column(DateTime, server_default=func.now())
    
    invoice = relationship("Invoice", back_populates="verification_records")
    
    def to_dict(self):
        return {
            "id": self.id,
            "invoice_id": self.invoice_id,
            "check_type": self.check_type,
            "check_name": self.check_name,
            "is_passed": self.is_passed,
            "message": self.message,
            "details": self.details,
            "created_at": self.created_at.isoformat() if self.created_at else None
        }

class ReimbursementBatch(Base):
    __tablename__ = "reimbursement_batches"
    
    id = Column(Integer, primary_key=True, index=True)
    batch_number = Column(String(50), unique=True, index=True, comment="批次号")
    description = Column(String(500), comment="描述")
    total_amount = Column(Numeric(15, 2), default=0, comment="总金额")
    invoice_count = Column(Integer, default=0, comment="发票数量")
    status = Column(String(50), default="pending", comment="状态")
    created_by = Column(String(100), comment="创建人")
    approved_by = Column(String(100), comment="审批人")
    approved_at = Column(DateTime, nullable=True, comment="审批时间")
    
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    
    def to_dict(self):
        return {
            "id": self.id,
            "batch_number": self.batch_number,
            "description": self.description,
            "total_amount": float(self.total_amount) if self.total_amount else 0,
            "invoice_count": self.invoice_count,
            "status": self.status,
            "created_by": self.created_by,
            "approved_by": self.approved_by,
            "approved_at": self.approved_at.isoformat() if self.approved_at else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None
        }

async def init_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

async def get_db():
    async with async_session_maker() as session:
        try:
            yield session
        finally:
            await session.close()
