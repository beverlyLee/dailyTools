from pydantic import BaseModel, Field
from typing import Optional, List, Dict
from datetime import datetime
from decimal import Decimal
from enum import Enum

class InvoiceTypeEnum(str, Enum):
    VAT_INVOICE = "vat_invoice"
    TRAIN_TICKET = "train_ticket"
    FLIGHT_TICKET = "flight_ticket"
    RECEIPT = "receipt"

class VerificationStatusEnum(str, Enum):
    PENDING = "pending"
    PASSED = "passed"
    FAILED = "failed"
    WARNING = "warning"

class InvoiceItemCreate(BaseModel):
    item_number: int = 1
    item_name: str = ""
    specification: Optional[str] = None
    unit: Optional[str] = None
    quantity: Optional[Decimal] = None
    unit_price: Optional[Decimal] = None
    amount: Optional[Decimal] = None
    tax_rate: Optional[str] = None
    tax_amount: Optional[Decimal] = None

class InvoiceCreate(BaseModel):
    invoice_type: InvoiceTypeEnum = InvoiceTypeEnum.VAT_INVOICE
    invoice_code: Optional[str] = None
    invoice_number: Optional[str] = None
    invoice_date: Optional[datetime] = None
    check_code: Optional[str] = None
    machine_number: Optional[str] = None
    
    seller_name: Optional[str] = None
    seller_tax_id: Optional[str] = None
    seller_address: Optional[str] = None
    seller_bank: Optional[str] = None
    
    buyer_name: Optional[str] = None
    buyer_tax_id: Optional[str] = None
    buyer_address: Optional[str] = None
    buyer_bank: Optional[str] = None
    
    total_amount: Optional[Decimal] = None
    total_tax: Optional[Decimal] = None
    total_amount_with_tax: Optional[Decimal] = None
    
    remarks: Optional[str] = None
    payee: Optional[str] = None
    reviewer: Optional[str] = None
    drawer: Optional[str] = None
    seller_seal: bool = False
    
    items: List[InvoiceItemCreate] = []

class InvoiceResponse(BaseModel):
    id: int
    company_id: Optional[int] = None
    invoice_type: str
    invoice_code: Optional[str] = None
    invoice_number: Optional[str] = None
    invoice_date: Optional[str] = None
    check_code: Optional[str] = None
    machine_number: Optional[str] = None
    
    seller_name: Optional[str] = None
    seller_tax_id: Optional[str] = None
    seller_address: Optional[str] = None
    seller_bank: Optional[str] = None
    
    buyer_name: Optional[str] = None
    buyer_tax_id: Optional[str] = None
    buyer_address: Optional[str] = None
    buyer_bank: Optional[str] = None
    
    total_amount: float = 0
    total_tax: float = 0
    total_amount_with_tax: float = 0
    
    remarks: Optional[str] = None
    payee: Optional[str] = None
    reviewer: Optional[str] = None
    drawer: Optional[str] = None
    seller_seal: bool = False
    
    is_verified: bool = False
    verification_status: str = "pending"
    verification_message: Optional[str] = None
    verified_at: Optional[str] = None
    
    is_reimbursed: bool = False
    reimbursed_at: Optional[str] = None
    reimbursed_by: Optional[str] = None
    
    created_at: Optional[str] = None
    updated_at: Optional[str] = None

class InvoiceItemResponse(BaseModel):
    id: int
    invoice_id: int
    item_number: int
    item_name: str
    specification: Optional[str] = None
    unit: Optional[str] = None
    quantity: float = 0
    unit_price: float = 0
    amount: float = 0
    tax_rate: Optional[str] = None
    tax_amount: float = 0

class VerificationRecordResponse(BaseModel):
    id: int
    invoice_id: int
    check_type: Optional[str] = None
    check_name: Optional[str] = None
    is_passed: bool
    message: Optional[str] = None
    details: Optional[str] = None
    created_at: Optional[str] = None

class OCRResult(BaseModel):
    invoice_type: str = "unknown"
    confidence: float = 0.0
    raw_text: str = ""
    extracted_fields: Dict = {}
    ocr_engine: str = ""
    processing_time: float = 0.0

class VerificationResult(BaseModel):
    invoice_id: int
    overall_status: str
    total_checks: int = 0
    passed_checks: int = 0
    failed_checks: int = 0
    warning_checks: int = 0
    checks: List[VerificationRecordResponse] = []
    message: Optional[str] = None

class PaginatedResponse(BaseModel):
    total: int
    page: int
    page_size: int
    items: List

class CompanyCreate(BaseModel):
    name: str
    tax_id: str
    address: Optional[str] = None
    phone: Optional[str] = None
    bank_name: Optional[str] = None
    bank_account: Optional[str] = None

class CompanyResponse(BaseModel):
    id: int
    name: str
    tax_id: str
    address: Optional[str] = None
    phone: Optional[str] = None
    bank_name: Optional[str] = None
    bank_account: Optional[str] = None
    is_active: bool
    created_at: Optional[str] = None
    updated_at: Optional[str] = None

class ReimbursementBatchCreate(BaseModel):
    description: Optional[str] = None
    invoice_ids: List[int] = []
    created_by: Optional[str] = None

class ReimbursementBatchResponse(BaseModel):
    id: int
    batch_number: str
    description: Optional[str] = None
    total_amount: float = 0
    invoice_count: int = 0
    status: str
    created_by: Optional[str] = None
    approved_by: Optional[str] = None
    approved_at: Optional[str] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None

class UploadResponse(BaseModel):
    success: bool
    message: str
    invoice_id: Optional[int] = None
    ocr_result: Optional[OCRResult] = None
