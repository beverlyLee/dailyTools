from typing import List, Dict, Any
from fastapi import APIRouter, HTTPException, BackgroundTasks
from fastapi.responses import FileResponse
from datetime import datetime
import uuid
import json
import os
import asyncio
import aiosmtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.application import MIMEApplication
from jinja2 import Environment, FileSystemLoader
import schedule
import time
import threading
from app.models import (
    ReportTemplate, ReportTemplateCreate, ReportTemplateUpdate,
    ReportSchedule, ReportScheduleCreate, ReportScheduleUpdate,
    GeneratedReport, GenerateReportRequest, Parameter
)
from app.config import settings, create_directories

router = APIRouter()

create_directories()
TEMPLATES_FILE = os.path.join(settings.DATA_DIR, "report_templates.json")
SCHEDULES_FILE = os.path.join(settings.DATA_DIR, "report_schedules.json")
GENERATED_REPORTS_FILE = os.path.join(settings.DATA_DIR, "generated_reports.json")

jinja_env = Environment(
    loader=FileSystemLoader(settings.TEMPLATES_DIR),
    autoescape=True
)

scheduled_tasks: Dict[str, schedule.Job] = {}

def load_templates() -> List[ReportTemplate]:
    if not os.path.exists(TEMPLATES_FILE):
        return []
    with open(TEMPLATES_FILE, "r", encoding="utf-8") as f:
        data = json.load(f)
        return [ReportTemplate(**t) for t in data]

def save_templates(templates: List[ReportTemplate]):
    with open(TEMPLATES_FILE, "w", encoding="utf-8") as f:
        json.dump([t.model_dump() for t in templates], f, default=str, ensure_ascii=False, indent=2)

def load_schedules() -> List[ReportSchedule]:
    if not os.path.exists(SCHEDULES_FILE):
        return []
    with open(SCHEDULES_FILE, "r", encoding="utf-8") as f:
        data = json.load(f)
        return [ReportSchedule(**s) for s in data]

def save_schedules(schedules: List[ReportSchedule]):
    with open(SCHEDULES_FILE, "w", encoding="utf-8") as f:
        json.dump([s.model_dump() for s in schedules], f, default=str, ensure_ascii=False, indent=2)

def load_generated_reports() -> List[GeneratedReport]:
    if not os.path.exists(GENERATED_REPORTS_FILE):
        return []
    with open(GENERATED_REPORTS_FILE, "r", encoding="utf-8") as f:
        data = json.load(f)
        return [GeneratedReport(**r) for r in data]

def save_generated_reports(reports: List[GeneratedReport]):
    with open(GENERATED_REPORTS_FILE, "w", encoding="utf-8") as f:
        json.dump([r.model_dump() for r in reports], f, default=str, ensure_ascii=False, indent=2)

def generate_html_report(template: ReportTemplate, parameters: Dict[str, Any]) -> str:
    template_html = jinja_env.from_string(template.content)
    context = {
        "template_name": template.name,
        "generated_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        **parameters
    }
    return template_html.render(context)

def save_report_to_file(content: str, filename: str, format: str) -> str:
    filepath = os.path.join(settings.OUTPUT_DIR, f"{filename}.{format}")
    with open(filepath, "w", encoding="utf-8") as f:
        f.write(content)
    return filepath

async def send_email_with_attachment(
    recipients: List[str],
    subject: str,
    body: str,
    attachment_path: str,
    attachment_name: str
):
    message = MIMEMultipart()
    message["From"] = settings.SMTP_FROM_EMAIL
    message["To"] = ", ".join(recipients)
    message["Subject"] = subject
    
    message.attach(MIMEText(body, "html", "utf-8"))
    
    with open(attachment_path, "rb") as f:
        attachment = MIMEApplication(f.read(), _subtype="octet-stream")
        attachment.add_header("Content-Disposition", "attachment", filename=attachment_name)
        message.attach(attachment)
    
    await aiosmtplib.send(
        message,
        hostname=settings.SMTP_HOST,
        port=settings.SMTP_PORT,
        username=settings.SMTP_USER,
        password=settings.SMTP_PASSWORD,
        start_tls=True
    )

def run_scheduled_task(schedule_id: str):
    schedules = load_schedules()
    schedule_item = None
    for s in schedules:
        if s.id == schedule_id and s.enabled:
            schedule_item = s
            break
    
    if not schedule_item:
        return
    
    templates = load_templates()
    template = None
    for t in templates:
        if t.id == schedule_item.templateId:
            template = t
            break
    
    if not template:
        return
    
    html_content = generate_html_report(template, schedule_item.parameters)
    filename = f"report_{schedule_item.id}_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
    
    if schedule_item.format == "html":
        filepath = save_report_to_file(html_content, filename, "html")
    else:
        filepath = save_report_to_file(html_content, filename, "html")
    
    asyncio.run(
        send_email_with_attachment(
            recipients=schedule_item.emailRecipients,
            subject=f"定时报告: {template.name}",
            body=f"<p>您好，这是定时发送的报告：{template.name}</p><p>生成时间：{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}</p>",
            attachment_path=filepath,
            attachment_name=f"{filename}.{schedule_item.format}"
        )
    )

def start_scheduler():
    def run_continuously():
        while True:
            schedule.run_pending()
            time.sleep(1)
    
    scheduler_thread = threading.Thread(target=run_continuously, daemon=True)
    scheduler_thread.start()
    
    schedules = load_schedules()
    for s in schedules:
        if s.enabled:
            job = parse_schedule(s.schedule, s.id)
            if job:
                scheduled_tasks[s.id] = job

def parse_schedule(schedule_str: str, schedule_id: str):
    if schedule_str.startswith("daily"):
        _, time_str = schedule_str.split(" ")
        return schedule.every().day.at(time_str).do(run_scheduled_task, schedule_id)
    elif schedule_str.startswith("weekly"):
        _, day, time_str = schedule_str.split(" ")
        day_map = {
            "monday": schedule.every().monday,
            "tuesday": schedule.every().tuesday,
            "wednesday": schedule.every().wednesday,
            "thursday": schedule.every().thursday,
            "friday": schedule.every().friday,
            "saturday": schedule.every().saturday,
            "sunday": schedule.every().sunday,
        }
        if day.lower() in day_map:
            return day_map[day.lower()].at(time_str).do(run_scheduled_task, schedule_id)
    elif schedule_str.startswith("hourly"):
        return schedule.every().hour.do(run_scheduled_task, schedule_id)
    return None

start_scheduler()

@router.get("/templates", response_model=List[ReportTemplate])
def get_templates():
    return load_templates()

@router.get("/templates/{template_id}", response_model=ReportTemplate)
def get_template(template_id: str):
    templates = load_templates()
    for template in templates:
        if template.id == template_id:
            return template
    raise HTTPException(status_code=404, detail="模板不存在")

@router.post("/templates", response_model=ReportTemplate)
def create_template(template_create: ReportTemplateCreate):
    templates = load_templates()
    new_template = ReportTemplate(
        id=str(uuid.uuid4()),
        name=template_create.name,
        description=template_create.description,
        parameters=[],
        content="",
        createdAt=datetime.utcnow(),
        updatedAt=datetime.utcnow()
    )
    templates.append(new_template)
    save_templates(templates)
    return new_template

@router.put("/templates/{template_id}", response_model=ReportTemplate)
def update_template(template_id: str, template_update: ReportTemplateUpdate):
    templates = load_templates()
    for i, template in enumerate(templates):
        if template.id == template_id:
            update_data = template_update.model_dump(exclude_unset=True)
            for key, value in update_data.items():
                setattr(template, key, value)
            template.updatedAt = datetime.utcnow()
            save_templates(templates)
            return template
    raise HTTPException(status_code=404, detail="模板不存在")

@router.delete("/templates/{template_id}")
def delete_template(template_id: str):
    templates = load_templates()
    for i, template in enumerate(templates):
        if template.id == template_id:
            del templates[i]
            save_templates(templates)
            return {"message": "模板已删除"}
    raise HTTPException(status_code=404, detail="模板不存在")

@router.post("/generate", response_model=GeneratedReport)
async def generate_report(request: GenerateReportRequest, background_tasks: BackgroundTasks):
    templates = load_templates()
    template = None
    for t in templates:
        if t.id == request.templateId:
            template = t
            break
    
    if not template:
        raise HTTPException(status_code=404, detail="模板不存在")
    
    html_content = generate_html_report(template, request.parameters)
    filename = f"report_{template.id}_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
    
    if request.format == "html":
        filepath = save_report_to_file(html_content, filename, "html")
    else:
        filepath = save_report_to_file(html_content, filename, "html")
    
    generated_report = GeneratedReport(
        id=str(uuid.uuid4()),
        templateId=template.id,
        parameters=request.parameters,
        format=request.format,
        downloadUrl=f"/api/v1/reports/download/{filename}.{request.format}",
        createdAt=datetime.utcnow()
    )
    
    reports = load_generated_reports()
    reports.append(generated_report)
    save_generated_reports(reports)
    
    return generated_report

@router.get("/download/{filename}")
def download_report(filename: str):
    filepath = os.path.join(settings.OUTPUT_DIR, filename)
    if not os.path.exists(filepath):
        raise HTTPException(status_code=404, detail="报告不存在")
    return FileResponse(filepath, filename=filename)

@router.get("/schedules", response_model=List[ReportSchedule])
def get_schedules():
    return load_schedules()

@router.post("/schedules", response_model=ReportSchedule)
def create_schedule(schedule_create: ReportScheduleCreate):
    schedules = load_schedules()
    new_schedule = ReportSchedule(
        id=str(uuid.uuid4()),
        templateId=schedule_create.templateId,
        parameters=schedule_create.parameters,
        emailRecipients=schedule_create.emailRecipients,
        schedule=schedule_create.schedule,
        format=schedule_create.format,
        enabled=True
    )
    schedules.append(new_schedule)
    save_schedules(schedules)
    
    job = parse_schedule(new_schedule.schedule, new_schedule.id)
    if job:
        scheduled_tasks[new_schedule.id] = job
    
    return new_schedule

@router.put("/schedules/{schedule_id}", response_model=ReportSchedule)
def update_schedule(schedule_id: str, schedule_update: ReportScheduleUpdate):
    schedules = load_schedules()
    for i, s in enumerate(schedules):
        if s.id == schedule_id:
            old_schedule = s.schedule
            old_enabled = s.enabled
            
            update_data = schedule_update.model_dump(exclude_unset=True)
            for key, value in update_data.items():
                setattr(s, key, value)
            
            save_schedules(schedules)
            
            if schedule_id in scheduled_tasks:
                schedule.cancel_job(scheduled_tasks[schedule_id])
                del scheduled_tasks[schedule_id]
            
            if s.enabled:
                job = parse_schedule(s.schedule, s.id)
                if job:
                    scheduled_tasks[s.id] = job
            
            return s
    raise HTTPException(status_code=404, detail="调度不存在")

@router.delete("/schedules/{schedule_id}")
def delete_schedule(schedule_id: str):
    schedules = load_schedules()
    for i, s in enumerate(schedules):
        if s.id == schedule_id:
            del schedules[i]
            save_schedules(schedules)
            
            if schedule_id in scheduled_tasks:
                schedule.cancel_job(scheduled_tasks[schedule_id])
                del scheduled_tasks[schedule_id]
            
            return {"message": "调度已删除"}
    raise HTTPException(status_code=404, detail="调度不存在")

@router.post("/sample-templates")
def create_sample_templates():
    templates = load_templates()
    
    sample_template = ReportTemplate(
        id=str(uuid.uuid4()),
        name="月度销售报告",
        description="用于展示月度销售数据的报告模板",
        parameters=[
            Parameter(
                id=str(uuid.uuid4()),
                name="month",
                type="dropdown",
                label="月份",
                value="January",
                options=[{"label": "一月", "value": "January"}, {"label": "二月", "value": "February"}, {"label": "三月", "value": "March"}]
            ),
            Parameter(
                id=str(uuid.uuid4()),
                name="threshold",
                type="slider",
                label="销售额阈值",
                value=10000,
                min=5000,
                max=50000,
                step=1000
            )
        ],
        content="""
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>{{ template_name }}</title>
    <style>
        body { font-family: Arial, sans-serif; padding: 20px; }
        h1 { color: #2c3e50; }
        .report-info { color: #7f8c8d; margin-bottom: 20px; }
        .section { margin-bottom: 30px; padding: 20px; background: #f8f9fa; border-radius: 8px; }
        .metric { display: inline-block; margin: 10px; padding: 15px; background: white; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .metric-label { color: #7f8c8d; font-size: 14px; }
        .metric-value { color: #2c3e50; font-size: 24px; font-weight: bold; }
    </style>
</head>
<body>
    <h1>{{ template_name }}</h1>
    <div class="report-info">生成时间: {{ generated_at }}</div>
    
    <div class="section">
        <h2>报告参数</h2>
        <p>月份: {{ month }}</p>
        <p>销售额阈值: {{ threshold }}</p>
    </div>
    
    <div class="section">
        <h2>销售指标</h2>
        <div class="metric">
            <div class="metric-label">总销售额</div>
            <div class="metric-value">¥125,000</div>
        </div>
        <div class="metric">
            <div class="metric-label">订单数</div>
            <div class="metric-value">1,250</div>
        </div>
        <div class="metric">
            <div class="metric-label">客单价</div>
            <div class="metric-value">¥100</div>
        </div>
    </div>
</body>
</html>
        """,
        createdAt=datetime.utcnow(),
        updatedAt=datetime.utcnow()
    )
    
    templates.append(sample_template)
    save_templates(templates)
    
    return {"message": "示例模板已创建", "template_id": sample_template.id}
