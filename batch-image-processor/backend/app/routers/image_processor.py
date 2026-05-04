from fastapi import APIRouter, HTTPException, UploadFile, File, Form, Query
from fastapi.responses import FileResponse
from typing import List, Optional
from pydantic import BaseModel
import os
import uuid
import shutil
from datetime import datetime

from app.services.image_service import ImageService
from app.services.rule_engine import RuleEngine
from app.services.watermark_service import WatermarkService
from app.models.database import SessionLocal, ProcessingHistory
from app.config import settings

router = APIRouter()

class ImageProcessingOptions(BaseModel):
    resize_width: Optional[int] = None
    resize_height: Optional[int] = None
    resize_keep_aspect: bool = True
    
    crop_x: Optional[int] = None
    crop_y: Optional[int] = None
    crop_width: Optional[int] = None
    crop_height: Optional[int] = None
    
    rotation_angle: float = 0.0
    
    output_format: str = "original"
    output_quality: int = 90
    
    watermark_type: Optional[str] = None
    watermark_text: Optional[str] = None
    watermark_image_path: Optional[str] = None
    watermark_position: str = "bottom_right"
    watermark_opacity: float = 0.5
    watermark_size: int = 32
    
    rule_id: Optional[int] = None

class BatchProcessingRequest(BaseModel):
    image_paths: List[str]
    options: ImageProcessingOptions
    output_dir: Optional[str] = None

@router.post("/process/single")
async def process_single_image(
    file: UploadFile = File(...),
    options: str = Form(...)
):
    import json
    processing_options = ImageProcessingOptions(**json.loads(options))
    
    temp_id = str(uuid.uuid4())
    temp_path = os.path.join(settings.TEMP_DIR, f"{temp_id}_{file.filename}")
    
    try:
        with open(temp_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        result = process_image(temp_path, processing_options)
        
        db = SessionLocal()
        history = ProcessingHistory(
            original_filename=file.filename,
            new_filename=os.path.basename(result["output_path"]),
            original_path=temp_path,
            output_path=result["output_path"],
            resize_width=processing_options.resize_width,
            resize_height=processing_options.resize_height,
            resize_keep_aspect=processing_options.resize_keep_aspect,
            crop_x=processing_options.crop_x,
            crop_y=processing_options.crop_y,
            crop_width=processing_options.crop_width,
            crop_height=processing_options.crop_height,
            rotation_angle=processing_options.rotation_angle,
            output_format=processing_options.output_format,
            output_quality=processing_options.output_quality,
            watermark_type=processing_options.watermark_type,
            watermark_text=processing_options.watermark_text,
            watermark_image_path=processing_options.watermark_image_path,
            watermark_position=processing_options.watermark_position,
            watermark_opacity=processing_options.watermark_opacity,
            watermark_size=processing_options.watermark_size,
            rule_id=processing_options.rule_id,
            status="success"
        )
        db.add(history)
        db.commit()
        db.refresh(history)
        db.close()
        
        return {
            "success": True,
            "original_filename": file.filename,
            "output_filename": os.path.basename(result["output_path"]),
            "output_path": result["output_path"],
            "history_id": history.id
        }
        
    except Exception as e:
        if os.path.exists(temp_path):
            os.remove(temp_path)
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/process/batch")
async def process_batch_images(request: BatchProcessingRequest):
    results = []
    errors = []
    
    output_dir = request.output_dir or settings.OUTPUT_DIR
    os.makedirs(output_dir, exist_ok=True)
    
    rule_engine = None
    if request.options.rule_id:
        from app.models.database import SessionLocal, RenameRule
        db = SessionLocal()
        rule = db.query(RenameRule).filter(RenameRule.id == request.options.rule_id).first()
        db.close()
        if rule:
            rule_engine = RuleEngine(rule)
    
    for index, image_path in enumerate(request.image_paths):
        if not os.path.exists(image_path):
            errors.append({"path": image_path, "error": "File not found"})
            continue
        
        try:
            options = request.options.model_copy()
            
            if rule_engine:
                new_filename = rule_engine.generate_filename(
                    image_path, 
                    index + 1, 
                    len(request.image_paths)
                )
            else:
                base_name = os.path.splitext(os.path.basename(image_path))[0]
                ext = get_output_format(options.output_format, image_path)
                new_filename = f"{base_name}.{ext}"
            
            result = process_image(image_path, options, output_dir, new_filename)
            
            db = SessionLocal()
            history = ProcessingHistory(
                original_filename=os.path.basename(image_path),
                new_filename=new_filename,
                original_path=image_path,
                output_path=result["output_path"],
                resize_width=options.resize_width,
                resize_height=options.resize_height,
                resize_keep_aspect=options.resize_keep_aspect,
                crop_x=options.crop_x,
                crop_y=options.crop_y,
                crop_width=options.crop_width,
                crop_height=options.crop_height,
                rotation_angle=options.rotation_angle,
                output_format=options.output_format,
                output_quality=options.output_quality,
                watermark_type=options.watermark_type,
                watermark_text=options.watermark_text,
                watermark_image_path=options.watermark_image_path,
                watermark_position=options.watermark_position,
                watermark_opacity=options.watermark_opacity,
                watermark_size=options.watermark_size,
                rule_id=options.rule_id,
                status="success"
            )
            db.add(history)
            db.commit()
            db.refresh(history)
            db.close()
            
            results.append({
                "original_path": image_path,
                "output_path": result["output_path"],
                "history_id": history.id
            })
            
        except Exception as e:
            errors.append({"path": image_path, "error": str(e)})
    
    return {
        "success": len(errors) == 0,
        "processed_count": len(results),
        "error_count": len(errors),
        "results": results,
        "errors": errors
    }

@router.get("/history")
async def get_processing_history(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200)
):
    db = SessionLocal()
    history = db.query(ProcessingHistory).order_by(
        ProcessingHistory.processed_at.desc()
    ).offset(skip).limit(limit).all()
    db.close()
    
    return [
        {
            "id": h.id,
            "original_filename": h.original_filename,
            "new_filename": h.new_filename,
            "output_path": h.output_path,
            "processed_at": h.processed_at.isoformat() if h.processed_at else None,
            "status": h.status
        }
        for h in history
    ]

@router.get("/download/{history_id}")
async def download_processed_image(history_id: int):
    db = SessionLocal()
    history = db.query(ProcessingHistory).filter(ProcessingHistory.id == history_id).first()
    db.close()
    
    if not history:
        raise HTTPException(status_code=404, detail="History record not found")
    
    if not os.path.exists(history.output_path):
        raise HTTPException(status_code=404, detail="Processed file not found")
    
    return FileResponse(
        history.output_path,
        media_type="application/octet-stream",
        filename=history.new_filename
    )

def process_image(
    image_path: str, 
    options: ImageProcessingOptions, 
    output_dir: str = None,
    output_filename: str = None
) -> dict:
    output_dir = output_dir or settings.OUTPUT_DIR
    os.makedirs(output_dir, exist_ok=True)
    
    image_service = ImageService()
    
    img = image_service.load_image(image_path)
    if img is None:
        raise ValueError(f"Failed to load image: {image_path}")
    
    if options.rotation_angle != 0:
        img = image_service.rotate(img, options.rotation_angle)
    
    if options.crop_x is not None and options.crop_y is not None and \
       options.crop_width is not None and options.crop_height is not None:
        img = image_service.crop(
            img, 
            options.crop_x, 
            options.crop_y, 
            options.crop_width, 
            options.crop_height
        )
    
    if options.resize_width is not None or options.resize_height is not None:
        keep_aspect = options.resize_keep_aspect
        
        if options.resize_width and options.resize_height:
            if keep_aspect:
                h, w = img.shape[:2]
                ratio = min(options.resize_width / w, options.resize_height / h)
                new_w = int(w * ratio)
                new_h = int(h * ratio)
            else:
                new_w = options.resize_width
                new_h = options.resize_height
        elif options.resize_width:
            new_w = options.resize_width
            h, w = img.shape[:2]
            ratio = new_w / w
            new_h = int(h * ratio)
        else:
            new_h = options.resize_height
            h, w = img.shape[:2]
            ratio = new_h / h
            new_w = int(w * ratio)
        
        img = image_service.resize(img, new_w, new_h)
    
    if options.watermark_type:
        watermark_service = WatermarkService()
        
        if options.watermark_type == "text" and options.watermark_text:
            img = watermark_service.add_text_watermark(
                img,
                options.watermark_text,
                position=options.watermark_position,
                opacity=options.watermark_opacity,
                font_size=options.watermark_size
            )
        elif options.watermark_type == "image" and options.watermark_image_path:
            if os.path.exists(options.watermark_image_path):
                watermark_img = image_service.load_image(options.watermark_image_path)
                if watermark_img is not None:
                    img = watermark_service.add_image_watermark(
                        img,
                        watermark_img,
                        position=options.watermark_position,
                        opacity=options.watermark_opacity,
                        size=options.watermark_size
                    )
    
    if not output_filename:
        base_name = os.path.splitext(os.path.basename(image_path))[0]
        ext = get_output_format(options.output_format, image_path)
        output_filename = f"{base_name}.{ext}"
    
    output_path = os.path.join(output_dir, output_filename)
    
    success = image_service.save_image(img, output_path, options.output_quality)
    if not success:
        raise ValueError(f"Failed to save image: {output_path}")
    
    return {"output_path": output_path}

def get_output_format(requested_format: str, original_path: str) -> str:
    if requested_format == "original":
        ext = os.path.splitext(original_path)[1].lower().lstrip(".")
        return ext if ext else "jpg"
    
    format_map = {
        "jpeg": "jpg",
        "jpg": "jpg",
        "png": "png",
        "webp": "webp"
    }
    
    return format_map.get(requested_format.lower(), "jpg")
