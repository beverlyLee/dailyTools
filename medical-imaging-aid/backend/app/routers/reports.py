from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime

router = APIRouter()

class ReportTemplate(BaseModel):
    id: str
    name: str
    category: str
    description: str
    fields: List[Dict[str, Any]]

class ReportSection(BaseModel):
    title: str
    content: str

class Report(BaseModel):
    id: str
    patient_id: str
    patient_name: str
    study_id: str
    template_id: str
    sections: List[ReportSection]
    images: List[Dict[str, Any]]
    status: str
    created_at: str
    updated_at: str

class CreateReportRequest(BaseModel):
    patient_id: str
    patient_name: str
    study_id: str
    template_id: str
    sections: List[ReportSection]
    images: Optional[List[Dict[str, Any]]] = None

MOCK_TEMPLATES = [
    {
        "id": "template-001",
        "name": "胸部CT常规报告",
        "category": "CT",
        "description": "胸部CT检查的标准报告模板",
        "fields": [
            {"name": "检查所见", "type": "text", "required": True},
            {"name": "诊断意见", "type": "text", "required": True},
            {"name": "建议", "type": "text", "required": False}
        ]
    },
    {
        "id": "template-002",
        "name": "头颅MRI报告",
        "category": "MRI",
        "description": "头颅MRI检查的标准报告模板",
        "fields": [
            {"name": "检查所见", "type": "text", "required": True},
            {"name": "诊断意见", "type": "text", "required": True},
            {"name": "印象", "type": "text", "required": False}
        ]
    },
    {
        "id": "template-003",
        "name": "腹部超声报告",
        "category": "超声",
        "description": "腹部超声检查的标准报告模板",
        "fields": [
            {"name": "肝脏", "type": "text", "required": True},
            {"name": "胆囊", "type": "text", "required": True},
            {"name": "胰腺", "type": "text", "required": True},
            {"name": "脾脏", "type": "text", "required": True},
            {"name": "双肾", "type": "text", "required": True},
            {"name": "诊断意见", "type": "text", "required": True}
        ]
    }
]

reports_db = {}

@router.get("/templates")
async def get_templates(category: Optional[str] = None):
    if category:
        filtered = [t for t in MOCK_TEMPLATES if t["category"] == category]
        return JSONResponse(content={"success": True, "data": filtered})
    return JSONResponse(content={"success": True, "data": MOCK_TEMPLATES})

@router.get("/templates/{template_id}")
async def get_template(template_id: str):
    template = next((t for t in MOCK_TEMPLATES if t["id"] == template_id), None)
    if not template:
        raise HTTPException(status_code=404, detail="模板不存在")
    return JSONResponse(content={"success": True, "data": template})

@router.post("/create")
async def create_report(request: CreateReportRequest):
    report_id = str(uuid.uuid4())
    now = datetime.now().isoformat()
    
    report = {
        "id": report_id,
        "patient_id": request.patient_id,
        "patient_name": request.patient_name,
        "study_id": request.study_id,
        "template_id": request.template_id,
        "sections": [s.dict() for s in request.sections],
        "images": request.images or [],
        "status": "draft",
        "created_at": now,
        "updated_at": now
    }
    
    reports_db[report_id] = report
    return JSONResponse(content={"success": True, "data": report, "message": "报告创建成功"})

@router.get("/{report_id}")
async def get_report(report_id: str):
    report = reports_db.get(report_id)
    if not report:
        raise HTTPException(status_code=404, detail="报告不存在")
    return JSONResponse(content={"success": True, "data": report})

@router.put("/{report_id}")
async def update_report(report_id: str, request: CreateReportRequest):
    if report_id not in reports_db:
        raise HTTPException(status_code=404, detail="报告不存在")
    
    report = reports_db[report_id]
    now = datetime.now().isoformat()
    
    report.update({
        "patient_id": request.patient_id,
        "patient_name": request.patient_name,
        "study_id": request.study_id,
        "template_id": request.template_id,
        "sections": [s.dict() for s in request.sections],
        "images": request.images or report.get("images", []),
        "updated_at": now
    })
    
    return JSONResponse(content={"success": True, "data": report, "message": "报告更新成功"})

@router.post("/{report_id}/submit")
async def submit_report(report_id: str):
    if report_id not in reports_db:
        raise HTTPException(status_code=404, detail="报告不存在")
    
    report = reports_db[report_id]
    report["status"] = "submitted"
    report["updated_at"] = datetime.now().isoformat()
    
    return JSONResponse(content={"success": True, "data": report, "message": "报告已提交"})

@router.post("/{report_id}/add-image")
async def add_image_to_report(report_id: str, image_data: Dict[str, Any]):
    if report_id not in reports_db:
        raise HTTPException(status_code=404, detail="报告不存在")
    
    report = reports_db[report_id]
    image_id = str(uuid.uuid4())
    image = {
        "id": image_id,
        **image_data,
        "added_at": datetime.now().isoformat()
    }
    
    report.setdefault("images", []).append(image)
    report["updated_at"] = datetime.now().isoformat()
    
    return JSONResponse(content={"success": True, "data": image, "message": "影像已添加"})

@router.get("/patient/{patient_id}")
async def get_patient_reports(patient_id: str):
    patient_reports = [r for r in reports_db.values() if r["patient_id"] == patient_id]
    return JSONResponse(content={"success": True, "data": patient_reports})

@router.post("/{report_id}/export-his")
async def export_to_his(report_id: str):
    if report_id not in reports_db:
        raise HTTPException(status_code=404, detail="报告不存在")
    
    report = reports_db[report_id]
    
    mock_his_response = {
        "success": True,
        "his_system": "HIS-System-v2.0",
        "transaction_id": f"HIS-{uuid.uuid4().hex[:8]}",
        "report_id": report_id,
        "status": "exported",
        "exported_at": datetime.now().isoformat()
    }
    
    return JSONResponse(content={
        "success": True,
        "data": mock_his_response,
        "message": "报告已成功导出到 HIS 系统"
    })

@router.post("/{report_id}/export-ris")
async def export_to_ris(report_id: str):
    if report_id not in reports_db:
        raise HTTPException(status_code=404, detail="报告不存在")
    
    report = reports_db[report_id]
    
    mock_ris_response = {
        "success": True,
        "ris_system": "RIS-System-v1.5",
        "transaction_id": f"RIS-{uuid.uuid4().hex[:8]}",
        "report_id": report_id,
        "study_id": report["study_id"],
        "status": "exported",
        "exported_at": datetime.now().isoformat()
    }
    
    return JSONResponse(content={
        "success": True,
        "data": mock_ris_response,
        "message": "报告已成功导出到 RIS 系统"
    })
