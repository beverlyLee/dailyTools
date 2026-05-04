from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from fastapi.responses import FileResponse
from typing import Optional
import os
import uuid
import shutil
import base64

from app.services.image_service import ImageService
from app.services.watermark_service import WatermarkService
from app.config import settings

router = APIRouter()

class PreviewOptions:
    def __init__(
        self,
        resize_width: Optional[int] = None,
        resize_height: Optional[int] = None,
        resize_keep_aspect: bool = True,
        crop_x: Optional[int] = None,
        crop_y: Optional[int] = None,
        crop_width: Optional[int] = None,
        crop_height: Optional[int] = None,
        rotation_angle: float = 0.0,
        watermark_type: Optional[str] = None,
        watermark_text: Optional[str] = None,
        watermark_image_path: Optional[str] = None,
        watermark_position: str = "bottom_right",
        watermark_opacity: float = 0.5,
        watermark_size: int = 32
    ):
        self.resize_width = resize_width
        self.resize_height = resize_height
        self.resize_keep_aspect = resize_keep_aspect
        self.crop_x = crop_x
        self.crop_y = crop_y
        self.crop_width = crop_width
        self.crop_height = crop_height
        self.rotation_angle = rotation_angle
        self.watermark_type = watermark_type
        self.watermark_text = watermark_text
        self.watermark_image_path = watermark_image_path
        self.watermark_position = watermark_position
        self.watermark_opacity = watermark_opacity
        self.watermark_size = watermark_size

@router.post("/image")
async def preview_image_processing(
    file: UploadFile = File(...),
    options: str = Form(...)
):
    import json
    options_dict = json.loads(options)
    preview_options = PreviewOptions(**options_dict)
    
    temp_id = str(uuid.uuid4())
    temp_path = os.path.join(settings.TEMP_DIR, f"{temp_id}_{file.filename}")
    preview_path = os.path.join(settings.TEMP_DIR, f"{temp_id}_preview.jpg")
    
    try:
        with open(temp_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        image_service = ImageService()
        
        img = image_service.load_image(temp_path)
        if img is None:
            raise ValueError("Failed to load image")
        
        original_height, original_width = img.shape[:2]
        
        if preview_options.rotation_angle != 0:
            img = image_service.rotate(img, preview_options.rotation_angle)
        
        if preview_options.crop_x is not None and preview_options.crop_y is not None and \
           preview_options.crop_width is not None and preview_options.crop_height is not None:
            img = image_service.crop(
                img,
                preview_options.crop_x,
                preview_options.crop_y,
                preview_options.crop_width,
                preview_options.crop_height
            )
        
        if preview_options.resize_width is not None or preview_options.resize_height is not None:
            keep_aspect = preview_options.resize_keep_aspect
            
            if preview_options.resize_width and preview_options.resize_height:
                if keep_aspect:
                    h, w = img.shape[:2]
                    ratio = min(preview_options.resize_width / w, preview_options.resize_height / h)
                    new_w = int(w * ratio)
                    new_h = int(h * ratio)
                else:
                    new_w = preview_options.resize_width
                    new_h = preview_options.resize_height
            elif preview_options.resize_width:
                new_w = preview_options.resize_width
                h, w = img.shape[:2]
                ratio = new_w / w
                new_h = int(h * ratio)
            else:
                new_h = preview_options.resize_height
                h, w = img.shape[:2]
                ratio = new_h / h
                new_w = int(w * ratio)
            
            img = image_service.resize(img, new_w, new_h)
        
        if preview_options.watermark_type:
            watermark_service = WatermarkService()
            
            if preview_options.watermark_type == "text" and preview_options.watermark_text:
                img = watermark_service.add_text_watermark(
                    img,
                    preview_options.watermark_text,
                    position=preview_options.watermark_position,
                    opacity=preview_options.watermark_opacity,
                    font_size=preview_options.watermark_size
                )
            elif preview_options.watermark_type == "image" and preview_options.watermark_image_path:
                if os.path.exists(preview_options.watermark_image_path):
                    watermark_img = image_service.load_image(preview_options.watermark_image_path)
                    if watermark_img is not None:
                        img = watermark_service.add_image_watermark(
                            img,
                            watermark_img,
                            position=preview_options.watermark_position,
                            opacity=preview_options.watermark_opacity,
                            size=preview_options.watermark_size
                        )
        
        image_service.save_image(img, preview_path, 90)
        
        processed_height, processed_width = img.shape[:2]
        
        with open(preview_path, "rb") as f:
            preview_base64 = base64.b64encode(f.read()).decode("utf-8")
        
        if os.path.exists(temp_path):
            os.remove(temp_path)
        if os.path.exists(preview_path):
            os.remove(preview_path)
        
        return {
            "success": True,
            "original_dimensions": {
                "width": original_width,
                "height": original_height
            },
            "processed_dimensions": {
                "width": processed_width,
                "height": processed_height
            },
            "preview": f"data:image/jpeg;base64,{preview_base64}"
        }
        
    except Exception as e:
        if os.path.exists(temp_path):
            os.remove(temp_path)
        if os.path.exists(preview_path):
            os.remove(preview_path)
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/image/{preview_id}")
async def get_preview_image(preview_id: str):
    preview_path = os.path.join(settings.TEMP_DIR, f"{preview_id}_preview.jpg")
    
    if not os.path.exists(preview_path):
        raise HTTPException(status_code=404, detail="Preview not found")
    
    return FileResponse(
        preview_path,
        media_type="image/jpeg"
    )
