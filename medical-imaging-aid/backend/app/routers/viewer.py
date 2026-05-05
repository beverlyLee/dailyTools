from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import List, Optional
import os
import uuid
import pydicom
from PIL import Image
import numpy as np

router = APIRouter()

UPLOAD_DIR = "./uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

class DicomInfo(BaseModel):
    patient_id: str
    patient_name: str
    study_date: str
    study_description: str
    series_number: int
    rows: int
    columns: int
    pixel_spacing: Optional[List[float]] = None
    slice_thickness: Optional[float] = None

@router.post("/upload-dicom")
async def upload_dicom(file: UploadFile = File(...)):
    file_id = str(uuid.uuid4())
    file_ext = os.path.splitext(file.filename)[1]
    save_path = os.path.join(UPLOAD_DIR, f"{file_id}{file_ext}")
    
    content = await file.read()
    with open(save_path, "wb") as f:
        f.write(content)
    
    try:
        ds = pydicom.dcmread(save_path)
        info = {
            "file_id": file_id,
            "patient_id": getattr(ds, 'PatientID', ''),
            "patient_name": str(getattr(ds, 'PatientName', '')),
            "study_date": getattr(ds, 'StudyDate', ''),
            "study_description": getattr(ds, 'StudyDescription', ''),
            "series_number": getattr(ds, 'SeriesNumber', 0),
            "rows": getattr(ds, 'Rows', 0),
            "columns": getattr(ds, 'Columns', 0),
            "modality": getattr(ds, 'Modality', '')
        }
        return JSONResponse(content={"success": True, "data": info})
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"无法解析 DICOM 文件: {str(e)}")

@router.get("/dicom-info/{file_id}")
async def get_dicom_info(file_id: str):
    dicom_files = [f for f in os.listdir(UPLOAD_DIR) if f.startswith(file_id)]
    if not dicom_files:
        raise HTTPException(status_code=404, detail="DICOM 文件不存在")
    
    file_path = os.path.join(UPLOAD_DIR, dicom_files[0])
    try:
        ds = pydicom.dcmread(file_path)
        info = {
            "file_id": file_id,
            "patient_id": getattr(ds, 'PatientID', ''),
            "patient_name": str(getattr(ds, 'PatientName', '')),
            "study_date": getattr(ds, 'StudyDate', ''),
            "study_description": getattr(ds, 'StudyDescription', ''),
            "series_number": getattr(ds, 'SeriesNumber', 0),
            "rows": getattr(ds, 'Rows', 0),
            "columns": getattr(ds, 'Columns', 0),
            "modality": getattr(ds, 'Modality', ''),
            "window_center": getattr(ds, 'WindowCenter', None),
            "window_width": getattr(ds, 'WindowWidth', None),
            "pixel_spacing": getattr(ds, 'PixelSpacing', None),
            "slice_thickness": getattr(ds, 'SliceThickness', None),
            "image_position_patient": getattr(ds, 'ImagePositionPatient', None),
            "image_orientation_patient": getattr(ds, 'ImageOrientationPatient', None)
        }
        return JSONResponse(content={"success": True, "data": info})
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"读取 DICOM 信息失败: {str(e)}")

@router.post("/adjust-window/{file_id}")
async def adjust_window(file_id: str, window_center: float, window_width: float):
    dicom_files = [f for f in os.listdir(UPLOAD_DIR) if f.startswith(file_id)]
    if not dicom_files:
        raise HTTPException(status_code=404, detail="DICOM 文件不存在")
    
    file_path = os.path.join(UPLOAD_DIR, dicom_files[0])
    try:
        ds = pydicom.dcmread(file_path)
        pixel_array = ds.pixel_array
        
        min_val = window_center - window_width / 2
        max_val = window_center + window_width / 2
        
        adjusted = np.clip(pixel_array, min_val, max_val)
        adjusted = ((adjusted - min_val) / (max_val - min_val) * 255).astype(np.uint8)
        
        output_path = os.path.join(UPLOAD_DIR, f"{file_id}_adjusted.png")
        Image.fromarray(adjusted).save(output_path)
        
        return JSONResponse(content={
            "success": True,
            "data": {
                "file_id": file_id,
                "window_center": window_center,
                "window_width": window_width,
                "output_path": output_path
            }
        })
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"窗宽窗位调整失败: {str(e)}")
