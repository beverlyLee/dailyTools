from fastapi import APIRouter, HTTPException, Depends, Query
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional, List
from sqlalchemy.orm import Session
import uuid
import io

from ..models.models import get_db, Composition
from ..services.music_generator import music_generator
from ..services.style_processor import style_processor

router = APIRouter(prefix="/api/music", tags=["music"])


class MusicGenerateRequest(BaseModel):
    keywords: str
    folk_ratio: float = 0.5
    modern_ratio: float = 0.5
    duration: int = 30
    title: Optional[str] = None


class StyleProcessRequest(BaseModel):
    midi_data: str
    folk_ratio: float
    modern_ratio: float


class CompositionUpdateRequest(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    midi_data: Optional[str] = None


@router.post("/generate")
async def generate_music(
    request: MusicGenerateRequest,
    db: Session = Depends(get_db)
):
    if not request.keywords:
        raise HTTPException(status_code=400, detail="关键词不能为空")
    
    if request.folk_ratio < 0 or request.folk_ratio > 1:
        raise HTTPException(status_code=400, detail="民乐占比必须在0-1之间")
    
    if request.modern_ratio < 0 or request.modern_ratio > 1:
        raise HTTPException(status_code=400, detail="现代感必须在0-1之间")
    
    result = await music_generator.generate_music(
        keywords=request.keywords,
        folk_ratio=request.folk_ratio,
        modern_ratio=request.modern_ratio,
        duration=request.duration
    )
    
    if result.get("status") == "completed" and result.get("midi_data"):
        processed_midi = style_processor.process_midi(
            midi_data=result["midi_data"],
            folk_ratio=request.folk_ratio,
            modern_ratio=request.modern_ratio
        )
        result["midi_data"] = processed_midi
        
        composition = Composition(
            title=request.title or f"国潮音乐 - {request.keywords[:20]}",
            keywords=request.keywords,
            folk_ratio=request.folk_ratio,
            modern_ratio=request.modern_ratio,
            midi_data=processed_midi
        )
        db.add(composition)
        db.commit()
        db.refresh(composition)
        
        result["composition_id"] = composition.id
    
    return result


@router.get("/task/{task_id}")
async def check_task_status(task_id: str):
    result = await music_generator.check_task_status(task_id)
    return result


@router.post("/style/process")
async def process_style(request: StyleProcessRequest):
    if not request.midi_data:
        raise HTTPException(status_code=400, detail="MIDI数据不能为空")
    
    try:
        processed_midi = style_processor.process_midi(
            midi_data=request.midi_data,
            folk_ratio=request.folk_ratio,
            modern_ratio=request.modern_ratio
        )
        
        analysis = style_processor.get_style_analysis(processed_midi)
        
        return {
            "status": "success",
            "midi_data": processed_midi,
            "analysis": analysis
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"风格处理失败: {str(e)}")


@router.get("/style/analyze")
async def analyze_style(midi_data: str = Query(...)):
    try:
        analysis = style_processor.get_style_analysis(midi_data)
        return {
            "status": "success",
            "analysis": analysis
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"分析失败: {str(e)}")


@router.post("/export/midi/{composition_id}")
async def export_midi(
    composition_id: int,
    db: Session = Depends(get_db)
):
    composition = db.query(Composition).filter(Composition.id == composition_id).first()
    
    if not composition:
        raise HTTPException(status_code=404, detail="作品不存在")
    
    if not composition.midi_data:
        raise HTTPException(status_code=400, detail="该作品没有MIDI数据")
    
    try:
        midi_bytes = style_processor.json_to_midi(composition.midi_data)
        
        return StreamingResponse(
            io.BytesIO(midi_bytes),
            media_type="audio/midi",
            headers={
                "Content-Disposition": f"attachment; filename={composition.title}.mid"
            }
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"导出失败: {str(e)}")


@router.post("/export/midi-raw")
async def export_midi_raw(midi_data: str):
    try:
        midi_bytes = style_processor.json_to_midi(midi_data)
        
        return StreamingResponse(
            io.BytesIO(midi_bytes),
            media_type="audio/midi",
            headers={
                "Content-Disposition": "attachment; filename=music.mid"
            }
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"导出失败: {str(e)}")
