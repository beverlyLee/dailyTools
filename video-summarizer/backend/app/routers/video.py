import os
import uuid
import asyncio
from fastapi import APIRouter, UploadFile, File, Form, HTTPException, BackgroundTasks, Depends
from fastapi.responses import FileResponse, JSONResponse
from typing import List, Optional
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Video, Transcript, TranscriptSegment, Keyframe, Summary
from app.config import settings
from app.services.video_processor import video_processor
from app.services.asr_service import asr_service
from app.services.keyframe_extractor import keyframe_extractor
from app.services.summarizer import text_rank_summarizer

router = APIRouter(prefix="/api/videos", tags=["videos"])


def format_duration(seconds: float) -> str:
    minutes = int(seconds // 60)
    secs = int(seconds % 60)
    return f"{minutes:02d}:{secs:02d}"


async def process_video_background(video_id: int, db: Session):
    try:
        video = db.query(Video).filter(Video.id == video_id).first()
        if not video:
            return
        
        video.status = "processing"
        db.commit()
        
        video_path = video.file_path
        
        audio_path = video_processor.extract_audio(video_path)
        
        try:
            asr_result = asr_service.transcribe(audio_path)
            
            transcript = Transcript(
                video_id=video.id,
                full_text=asr_result["full_text"],
                language=asr_result["language"],
            )
            db.add(transcript)
            db.commit()
            db.refresh(transcript)
            
            for segment in asr_result["segments"]:
                seg = TranscriptSegment(
                    transcript_id=transcript.id,
                    start_time=segment["start_time"],
                    end_time=segment["end_time"],
                    text=segment["text"],
                    confidence=segment["confidence"],
                )
                db.add(seg)
            db.commit()
        except Exception as e:
            print(f"ASR Error: {e}")
            asr_result = {"full_text": "", "language": "zh", "segments": []}
        
        if os.path.exists(audio_path):
            os.remove(audio_path)
        
        output_dir = os.path.join(settings.OUTPUT_DIR, str(video_id))
        os.makedirs(output_dir, exist_ok=True)
        
        try:
            keyframes = keyframe_extractor.extract_keyframes(
                video_path, output_dir, asr_result.get("segments", [])
            )
            
            for kf in keyframes:
                keyframe = Keyframe(
                    video_id=video.id,
                    timestamp=kf["timestamp"],
                    frame_path=kf["frame_path"],
                    frame_number=kf["frame_number"],
                    similarity_score=kf["similarity_score"],
                )
                db.add(keyframe)
            db.commit()
        except Exception as e:
            print(f"Keyframe Extraction Error: {e}")
        
        try:
            if asr_result.get("full_text"):
                summary_result = text_rank_summarizer.summarize(
                    asr_result["full_text"], 
                    top_n=settings.TEXTRANK_TOP_N
                )
                
                summary = Summary(
                    video_id=video.id,
                    summary_text=summary_result["summary"],
                    key_points=str(summary_result["key_points"]),
                )
                db.add(summary)
                db.commit()
        except Exception as e:
            print(f"Summarization Error: {e}")
        
        video.status = "completed"
        db.commit()
        
    except Exception as e:
        video = db.query(Video).filter(Video.id == video_id).first()
        if video:
            video.status = "failed"
            video.error_message = str(e)
            db.commit()
        print(f"Processing Error: {e}")


@router.post("/upload")
async def upload_video(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    os.makedirs(settings.OUTPUT_DIR, exist_ok=True)
    
    file_extension = os.path.splitext(file.filename)[1]
    saved_filename = f"{uuid.uuid4()}{file_extension}"
    file_path = os.path.join(settings.UPLOAD_DIR, saved_filename)
    
    with open(file_path, "wb") as buffer:
        content = await file.read()
        buffer.write(content)
    
    try:
        video_info = video_processor.get_video_info(file_path)
        
        video = Video(
            filename=saved_filename,
            original_filename=file.filename,
            file_path=file_path,
            file_size=video_info["file_size"],
            duration=video_info["duration"],
            width=video_info["width"],
            height=video_info["height"],
            fps=video_info["fps"],
            status="pending",
        )
        db.add(video)
        db.commit()
        db.refresh(video)
        
        background_tasks.add_task(process_video_background, video.id, db)
        
        return {
            "success": True,
            "video_id": video.id,
            "status": video.status,
            "message": "视频上传成功，正在处理中...",
            "video_info": {
                "filename": file.filename,
                "duration": format_duration(video_info["duration"]),
                "size": f"{video_info['file_size'] / 1024 / 1024:.2f} MB",
                "resolution": f"{video_info['width']}x{video_info['height']}",
                "fps": video_info["fps"],
            }
        }
        
    except Exception as e:
        if os.path.exists(file_path):
            os.remove(file_path)
        raise HTTPException(status_code=500, detail=f"视频处理失败: {str(e)}")


@router.get("/{video_id}")
async def get_video(video_id: int, db: Session = Depends(get_db)):
    video = db.query(Video).filter(Video.id == video_id).first()
    if not video:
        raise HTTPException(status_code=404, detail="视频不存在")
    
    transcript = db.query(Transcript).filter(Transcript.video_id == video_id).first()
    keyframes = db.query(Keyframe).filter(Keyframe.video_id == video_id).order_by(Keyframe.timestamp).all()
    summary = db.query(Summary).filter(Summary.video_id == video_id).first()
    
    transcript_segments = []
    if transcript:
        segments = db.query(TranscriptSegment).filter(
            TranscriptSegment.transcript_id == transcript.id
        ).order_by(TranscriptSegment.start_time).all()
        transcript_segments = [
            {
                "start_time": s.start_time,
                "end_time": s.end_time,
                "text": s.text,
                "formatted_time": format_duration(s.start_time),
            }
            for s in segments
        ]
    
    return {
        "video": {
            "id": video.id,
            "original_filename": video.original_filename,
            "duration": format_duration(video.duration),
            "status": video.status,
            "created_at": video.created_at.isoformat() if video.created_at else None,
        },
        "transcript": {
            "full_text": transcript.full_text if transcript else None,
            "language": transcript.language if transcript else None,
            "segments": transcript_segments,
        } if transcript else None,
        "keyframes": [
            {
                "id": kf.id,
                "timestamp": kf.timestamp,
                "formatted_time": format_duration(kf.timestamp),
                "frame_path": f"/api/videos/{video_id}/keyframes/{kf.id}",
                "description": kf.description,
            }
            for kf in keyframes
        ],
        "summary": {
            "text": summary.summary_text if summary else None,
            "key_points": eval(summary.key_points) if summary and summary.key_points else None,
        } if summary else None,
    }


@router.get("/{video_id}/keyframes/{keyframe_id}")
async def get_keyframe(video_id: int, keyframe_id: int, db: Session = Depends(get_db)):
    keyframe = db.query(Keyframe).filter(
        Keyframe.id == keyframe_id,
        Keyframe.video_id == video_id
    ).first()
    
    if not keyframe:
        raise HTTPException(status_code=404, detail="关键帧不存在")
    
    if not os.path.exists(keyframe.frame_path):
        raise HTTPException(status_code=404, detail="关键帧文件已丢失")
    
    return FileResponse(
        keyframe.frame_path,
        media_type="image/jpeg"
    )


@router.get("/{video_id}/status")
async def get_video_status(video_id: int, db: Session = Depends(get_db)):
    video = db.query(Video).filter(Video.id == video_id).first()
    if not video:
        raise HTTPException(status_code=404, detail="视频不存在")
    
    return {
        "video_id": video.id,
        "status": video.status,
        "error_message": video.error_message,
    }


@router.get("/")
async def list_videos(
    skip: int = 0, 
    limit: int = 20, 
    db: Session = Depends(get_db)
):
    videos = db.query(Video).order_by(Video.created_at.desc()).offset(skip).limit(limit).all()
    
    return {
        "total": db.query(Video).count(),
        "videos": [
            {
                "id": v.id,
                "original_filename": v.original_filename,
                "duration": format_duration(v.duration),
                "status": v.status,
                "created_at": v.created_at.isoformat() if v.created_at else None,
            }
            for v in videos
        ]
    }
