from sqlalchemy import Column, Integer, String, Float, DateTime, Boolean, Text
from sqlalchemy.sql import func
from app.database import Base

class Invoice(Base):
    __tablename__ = "invoices"
    
    id = Column(Integer, primary_key=True, index=True)
    invoice_code = Column(String(20), index=True, comment="发票代码")
    invoice_number = Column(String(20), index=True, comment="发票号码")
    invoice_date = Column(DateTime, comment="开票日期")
    amount = Column(Float, comment="金额")
    tax_amount = Column(Float, comment="税额")
    total_amount = Column(Float, comment="价税合计")
    seller_name = Column(String(200), comment="销售方名称")
    seller_tax_id = Column(String(50), comment="销售方纳税人识别号")
    buyer_name = Column(String(200), comment="购买方名称")
    buyer_tax_id = Column(String(50), comment="购买方纳税人识别号")
    invoice_type = Column(String(50), comment="发票类型")
    remarks = Column(Text, comment="备注")
    is_verified = Column(Boolean, default=False, comment="是否已验真")
    verification_status = Column(String(50), default="pending", comment="验真状态")
    is_reimbursed = Column(Boolean, default=False, comment="是否已报销")
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    raw_ocr_data = Column(Text, comment="原始OCR数据")
    image_path = Column(String(500), comment="图片路径")

class TrainTicket(Base):
    __tablename__ = "train_tickets"
    
    id = Column(Integer, primary_key=True, index=True)
    ticket_number = Column(String(50), index=True, comment="车票号码")
    departure_station = Column(String(100), comment="出发站")
    arrival_station = Column(String(100), comment="到达站")
    departure_time = Column(DateTime, comment="出发时间")
    train_number = Column(String(20), comment="车次")
    seat_class = Column(String(20), comment="座位类型")
    price = Column(Float, comment="票价")
    passenger_name = Column(String(100), comment="乘客姓名")
    id_number = Column(String(50), comment="身份证号")
    is_verified = Column(Boolean, default=False, comment="是否已验真")
    verification_status = Column(String(50), default="pending", comment="验真状态")
    is_reimbursed = Column(Boolean, default=False, comment="是否已报销")
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    raw_ocr_data = Column(Text, comment="原始OCR数据")
    image_path = Column(String(500), comment="图片路径")

class AirTicket(Base):
    __tablename__ = "air_tickets"
    
    id = Column(Integer, primary_key=True, index=True)
    ticket_number = Column(String(50), index=True, comment="机票号码")
    departure_airport = Column(String(100), comment="出发机场")
    arrival_airport = Column(String(100), comment="到达机场")
    departure_time = Column(DateTime, comment="出发时间")
    flight_number = Column(String(20), comment="航班号")
    cabin_class = Column(String(20), comment="舱位类型")
    price = Column(Float, comment="票价")
    tax = Column(Float, comment="税费")
    total_amount = Column(Float, comment="合计金额")
    passenger_name = Column(String(100), comment="乘客姓名")
    id_number = Column(String(50), comment="身份证号")
    airline = Column(String(100), comment="航空公司")
    is_verified = Column(Boolean, default=False, comment="是否已验真")
    verification_status = Column(String(50), default="pending", comment="验真状态")
    is_reimbursed = Column(Boolean, default=False, comment="是否已报销")
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    raw_ocr_data = Column(Text, comment="原始OCR数据")
    image_path = Column(String(500), comment="图片路径")
