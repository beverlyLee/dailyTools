from fastapi import APIRouter, Form, Depends, BackgroundTasks, Query
from fastapi.responses import FileResponse, JSONResponse
from typing import Optional, List, Dict, Any
from pathlib import Path
import uuid
import json
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel, Field
from app.database import get_db
from app.services.music_service import MusicGenerationService

router = APIRouter(prefix="/api/music", tags=["音乐生成"])

music_service = MusicGenerationService()
output_dir = Path("generated_music")
output_dir.mkdir(exist_ok=True)


class MusicGenerationRequest(BaseModel):
    prompt: str
    folk_ratio: float = Field(0.5, ge=0, le=1)
    modernity: float = Field(0.5, ge=0, le=1)
    model: str = Field("ernie", regex="^(ernie|skymusic)$")


class MidiAdjustment(BaseModel):
    note_index: int
    action: str
    new_pitch: Optional[int] = None
    new_velocity: Optional[int] = None


@router.post("/generate")
async def generate_music(
    background_tasks: BackgroundTasks,
    request: MusicGenerationRequest,
    user_id: Optional[int] = Query(None),
    db: AsyncSession = Depends(get_db),
):
    # 创建生成任务记录
    history = await music_service.create_generation_task(
        db=db,
        user_id=user_id,
        prompt=request.prompt,
        folk_ratio=request.folk_ratio,
        modernity=request.modernity,
    )
    
    # 后台处理音乐生成
    async def process_generation():
        try:
            # 调用音乐生成模型
            result = await music_service.generate_music(
                prompt=request.prompt,
                folk_ratio=request.folk_ratio,
                modernity=request.modernity,
                model=request.model,
            )
            
            # 保存MIDI数据
            midi_data = result.get("midi_data", {})
            
            # 模拟生成音频文件路径
            file_id = str(uuid.uuid4())
            audio_path = output_dir / f"{file_id}.mp3"
            
            # 更新任务状态
            await music_service.update_generation_status(
                db=db,
                history_id=history.id,
                status="completed",
                generated_audio_path=str(audio_path) if audio_path.exists() else None,
                midi_data=midi_data,
            )
            
        except Exception as e:
            await music_service.update_generation_status(
                db=db,
                history_id=history.id,
                status="failed",
            )
            print(f"音乐生成失败: {e}")
    
    background_tasks.add_task(process_generation)
    
    return JSONResponse(
        content={
            "success": True,
            "task_id": history.id,
            "status": "processing",
            "message": "音乐生成任务已提交，请稍后查询结果",
            "prompt": request.prompt,
            "folk_ratio": request.folk_ratio,
            "modernity": request.modernity,
        }
    )


@router.get("/task/{task_id}")
async def get_task_status(
    task_id: int,
    db: AsyncSession = Depends(get_db),
):
    history = await music_service.get_history_by_id(db, task_id)
    
    if not history:
        return JSONResponse(
            content={"success": False, "error": "任务不存在"},
            status_code=404,
        )
    
    # 解析MIDI数据
    midi_data = None
    if history.midi_data:
        try:
            midi_data = json.loads(history.midi_data)
        except json.JSONDecodeError:
            midi_data = None
    
    return JSONResponse(
        content={
            "success": True,
            "task_id": history.id,
            "status": history.status,
            "prompt": history.prompt,
            "folk_ratio": history.folk_ratio,
            "modernity": history.modernity,
            "midi_data": midi_data,
            "audio_path": history.generated_audio_path,
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
    histories = await music_service.get_user_history(
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
                    "prompt": h.prompt,
                    "folk_ratio": h.folk_ratio,
                    "modernity": h.modernity,
                    "status": h.status,
                    "audio_path": h.generated_audio_path,
                    "created_at": h.created_at.isoformat() if h.created_at else None,
                }
                for h in histories
            ],
            "count": len(histories),
        }
    )


@router.post("/adjust-midi")
async def adjust_midi(
    midi_data: Dict[str, Any],
    adjustments: List[MidiAdjustment],
):
    # 调整MIDI数据
    adjusted_data = await music_service.adjust_midi(midi_data, [a.dict() for a in adjustments])
    
    return JSONResponse(
        content={
            "success": True,
            "original_midi": midi_data,
            "adjusted_midi": adjusted_data,
            "adjustments_count": len(adjustments),
        }
    )


@router.get("/download/{file_path:path}")
async def download_audio(file_path: str):
    path = Path(file_path)
    if not path.exists():
        return JSONResponse(
            content={"success": False, "error": "文件不存在"},
            status_code=404,
        )
    
    return FileResponse(
        path=path,
        media_type="audio/mpeg",
        filename=path.name,
    )


@router.get("/models")
async def get_available_models():
    models = [
        {
            "id": "ernie",
            "name": "百度 ERNIE-Music",
            "description": "基于百度文心大模型的音乐生成能力，支持多种风格融合",
            "features": ["中文描述支持", "民乐风格优化", "多风格融合"],
        },
        {
            "id": "skymusic",
            "name": "昆仑万维 SkyMusic",
            "description": "昆仑万维推出的专业音乐生成模型，擅长现代流行风格",
            "features": ["现代感强", "节奏多样", "可定制程度高"],
        },
    ]
    
    return JSONResponse(
        content={
            "success": True,
            "models": models,
        }
    )
