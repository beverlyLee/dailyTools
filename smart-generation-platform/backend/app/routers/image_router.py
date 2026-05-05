from fastapi import APIRouter, UploadFile, File, Form, Depends, BackgroundTasks, Query
from fastapi.responses import FileResponse, JSONResponse
from typing import Optional, List
from pathlib import Path
import uuid
import json
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel
from app.database import get_db
from app.services.image_service import ImageGenerationService

router = APIRouter(prefix="/api/image", tags=["图像生成"])

image_service = ImageGenerationService()
upload_dir = Path("uploads")
upload_dir.mkdir(exist_ok=True)


class Keypoint(BaseModel):
    id: int
    name: str
    x: float
    y: float
    confidence: float


class InpaintRequest(BaseModel):
    prompt: str
    strength: float = 0.75


@router.post("/upload")
async def upload_image(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db)
):
    file_id = str(uuid.uuid4())
    file_ext = Path(file.filename).suffix if file.filename else ".jpg"
    save_path = upload_dir / f"{file_id}{file_ext}"
    
    content = await file.read()
    with open(save_path, "wb") as f:
        f.write(content)
    
    return JSONResponse(
        content={
            "success": True,
            "file_id": file_id,
            "file_path": str(save_path),
            "filename": file.filename,
        }
    )


@router.post("/detect-keypoints")
async def detect_keypoints(
    file: UploadFile = File(...),
):
    image_data = await file.read()
    keypoints = await image_service.detect_keypoints(image_data)
    
    return JSONResponse(
        content={
            "success": True,
            "keypoints": keypoints,
        }
    )


@router.post("/generate")
async def generate_style_transfer(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    style_type: str = Form(...),
    keypoints: str = Form(...),
    user_id: Optional[int] = Form(None),
    db: AsyncSession = Depends(get_db),
):
    # 解析关键点数据
    try:
        keypoints_data = json.loads(keypoints)
    except json.JSONDecodeError:
        return JSONResponse(
            content={"success": False, "error": "关键点数据格式错误"},
            status_code=400,
        )
    
    # 保存上传的图像
    file_id = str(uuid.uuid4())
    file_ext = Path(file.filename).suffix if file.filename else ".jpg"
    original_path = upload_dir / f"{file_id}_original{file_ext}"
    
    image_data = await file.read()
    with open(original_path, "wb") as f:
        f.write(image_data)
    
    # 创建生成任务记录
    history = await image_service.create_generation_task(
        db_id=db,
        user_id=user_id,
        original_image_path=str(original_path),
        style_type=style_type,
        keypoints_data=keypoints_data,
    )
    
    # 后台处理图像生成
    async def process_generation():
        try:
            # 调用ControlNet进行风格迁移
            generated_data = await image_service.call_controlnet_api(
                image_data=image_data,
                keypoints=keypoints_data,
                style_type=style_type,
            )
            
            # 保存生成的图像
            generated_path = upload_dir / f"{file_id}_generated.png"
            with open(generated_path, "wb") as f:
                f.write(generated_data)
            
            # 更新任务状态
            await image_service.update_generation_status(
                db=db,
                history_id=history.id,
                status="completed",
                generated_image_path=str(generated_path),
            )
            
        except Exception as e:
            await image_service.update_generation_status(
                db=db,
                history_id=history.id,
                status="failed",
            )
            print(f"图像生成失败: {e}")
    
    background_tasks.add_task(process_generation)
    
    return JSONResponse(
        content={
            "success": True,
            "task_id": history.id,
            "status": "processing",
            "message": "图像生成任务已提交，请稍后查询结果",
        }
    )


@router.get("/task/{task_id}")
async def get_task_status(
    task_id: int,
    db: AsyncSession = Depends(get_db),
):
    history = await image_service.get_history_by_id(db, task_id)
    
    if not history:
        return JSONResponse(
            content={"success": False, "error": "任务不存在"},
            status_code=404,
        )
    
    return JSONResponse(
        content={
            "success": True,
            "task_id": history.id,
            "status": history.status,
            "style_type": history.style_type,
            "original_image": history.original_image_path,
            "generated_image": history.generated_image_path,
            "created_at": history.created_at.isoformat() if history.created_at else None,
            "completed_at": history.completed_at.isoformat() if history.completed_at else None,
        }
    )


@router.get("/history")
async def get_user_history(
    user_id: int = Query(...),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
):
    histories = await image_service.get_user_history(
        db=db,
        user_id=user_id,
        limit=limit,
        offset=offset,
    )
    
    return JSONResponse(
        content={
            "success": True,
            "data": [
                {
                    "id": h.id,
                    "style_type": h.style_type,
                    "status": h.status,
                    "original_image": h.original_image_path,
                    "generated_image": h.generated_image_path,
                    "created_at": h.created_at.isoformat() if h.created_at else None,
                }
                for h in histories
            ],
            "count": len(histories),
        }
    )


@router.post("/inpaint")
async def inpaint_details(
    background_tasks: BackgroundTasks,
    image_file: UploadFile = File(...),
    mask_file: UploadFile = File(...),
    prompt: str = Form(...),
    strength: float = Form(0.75),
    db: AsyncSession = Depends(get_db),
):
    # 读取图像和掩码
    image_data = await image_file.read()
    mask_data = await mask_file.read()
    
    # 后台处理重绘
    async def process_inpaint():
        try:
            result = await image_service.inpaint_details(
                image_data=image_data,
                mask_data=mask_data,
                prompt=prompt,
                strength=strength,
            )
            
            # 保存结果
            file_id = str(uuid.uuid4())
            result_path = upload_dir / f"{file_id}_inpaint.png"
            with open(result_path, "wb") as f:
                f.write(result)
            
            # 这里可以保存到数据库
            pass
            
        except Exception as e:
            print(f"局部重绘失败: {e}")
    
    background_tasks.add_task(process_inpaint)
    
    return JSONResponse(
        content={
            "success": True,
            "message": "局部重绘任务已提交",
            "prompt": prompt,
            "strength": strength,
        }
    )


@router.get("/download/{file_path:path}")
async def download_image(file_path: str):
    path = Path(file_path)
    if not path.exists():
        return JSONResponse(
            content={"success": False, "error": "文件不存在"},
            status_code=404,
        )
    
    return FileResponse(
        path=path,
        media_type="image/png",
        filename=path.name,
    )


@router.get("/styles")
async def get_available_styles():
    styles = [
        {"id": "hanfu", "name": "汉服", "description": "传统汉族服饰，包含襦裙、深衣等款式", "examples": ["曲裾", "直裾", "襦裙"]},
        {"id": "qipao", "name": "旗袍", "description": "民国时期流行的女性服饰，凸显东方韵味", "examples": ["高开叉", "立领", "盘扣"]},
        {"id": "tangzhuang", "name": "唐装", "description": "中式传统服饰的现代演绎", "examples": ["对襟", "盘扣", "刺绣"]},
        {"id": "kimono", "name": "和服", "description": "日本传统服饰，与汉服有渊源", "examples": ["振袖", "留袖", "浴衣"]},
    ]
    
    return JSONResponse(
        content={
            "success": True,
            "styles": styles,
        }
    )
