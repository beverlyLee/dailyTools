from fastapi import APIRouter, HTTPException, UploadFile, File
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import List, Optional
import os
import uuid
import numpy as np
import pydicom
from PIL import Image

router = APIRouter()

class DetectionResult(BaseModel):
    id: str
    confidence: float
    bbox: List[float]
    lesion_type: str
    description: str

class AIResponse(BaseModel):
    success: bool
    message: str
    detections: List[DetectionResult]
    processing_time: float

@router.post("/detect-lesions")
async def detect_lesions(file: UploadFile = File(...)):
    file_id = str(uuid.uuid4())
    file_ext = os.path.splitext(file.filename)[1]
    upload_dir = "./uploads"
    os.makedirs(upload_dir, exist_ok=True)
    save_path = os.path.join(upload_dir, f"{file_id}{file_ext}")
    
    content = await file.read()
    with open(save_path, "wb") as f:
        f.write(content)
    
    try:
        ds = pydicom.dcmread(save_path)
        rows = getattr(ds, 'Rows', 512)
        cols = getattr(ds, 'Columns', 512)
        
        import time
        start_time = time.time()
        
        mock_detections = [
            {
                "id": str(uuid.uuid4()),
                "confidence": 0.92,
                "bbox": [100, 150, 200, 280],
                "lesion_type": "结节",
                "description": "可疑肺结节，边界清晰"
            },
            {
                "id": str(uuid.uuid4()),
                "confidence": 0.78,
                "bbox": [300, 200, 380, 320],
                "lesion_type": "钙化灶",
                "description": "微小钙化灶，建议随访"
            }
        ]
        
        processing_time = time.time() - start_time
        
        return JSONResponse(content={
            "success": True,
            "message": "AI 检测完成",
            "detections": mock_detections,
            "processing_time": round(processing_time, 2)
        })
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI 检测失败: {str(e)}")

@router.post("/segmentation")
async def perform_segmentation(file: UploadFile = File(...)):
    file_id = str(uuid.uuid4())
    file_ext = os.path.splitext(file.filename)[1]
    upload_dir = "./uploads"
    os.makedirs(upload_dir, exist_ok=True)
    save_path = os.path.join(upload_dir, f"{file_id}{file_ext}")
    
    content = await file.read()
    with open(save_path, "wb") as f:
        f.write(content)
    
    try:
        ds = pydicom.dcmread(save_path)
        rows = getattr(ds, 'Rows', 512)
        cols = getattr(ds, 'Columns', 512)
        
        import time
        start_time = time.time()
        
        mock_segmentation = {
            "organs": [
                {"name": "左肺", "volume": 1245.6, "units": "cm³"},
                {"name": "右肺", "volume": 1356.2, "units": "cm³"},
                {"name": "心脏", "volume": 345.8, "units": "cm³"}
            ],
            "lesions": [
                {
                    "id": str(uuid.uuid4()),
                    "volume": 12.3,
                    "location": "右肺上叶",
                    "max_diameter": 3.2
                }
            ]
        }
        
        processing_time = time.time() - start_time
        
        return JSONResponse(content={
            "success": True,
            "message": "分割完成",
            "data": mock_segmentation,
            "processing_time": round(processing_time, 2)
        })
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"分割失败: {str(e)}")

@router.get("/model-status")
async def get_model_status():
    return JSONResponse(content={
        "success": True,
        "models": [
            {
                "name": "病灶检测模型",
                "version": "1.0.0",
                "status": "ready",
                "type": "detection"
            },
            {
                "name": "器官分割模型",
                "version": "1.0.0",
                "status": "ready",
                "type": "segmentation"
            },
            {
                "name": "分类模型",
                "version": "1.0.0",
                "status": "ready",
                "type": "classification"
            }
        ]
    })
