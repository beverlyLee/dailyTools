import os
import uuid
from fastapi import APIRouter, UploadFile, File, BackgroundTasks, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from ..database import get_db
from ..models import AudioBook, AudioChunk, AudiobookNote, ChapterNote, KeyPoint, MindMap
from ..services.audio_processor import audio_processor
from ..services.note_generator import note_generator

router = APIRouter(prefix="/api/audiobooks", tags=["audiobooks"])

def format_duration(seconds: float) -> str:
    minutes = int(seconds // 60)
    secs = int(seconds % 60)
    return f"{minutes:02d}:{secs:02d}"

async def process_audio_background(audiobook_id: int, db: Session):
    try:
        audiobook = db.query(AudioBook).filter(AudioBook.id == audiobook_id).first()
        if not audiobook:
            return
        
        audiobook.status = "processing"
        db.commit()
        
        file_path = audiobook.file_path
        
        chunks = audio_processor.split_by_silence(file_path, audiobook_id)
        
        all_transcripts = []
        for chunk_data in chunks:
            chunk = AudioChunk(
                audiobook_id=audiobook_id,
                chunk_index=chunk_data["index"],
                start_time=chunk_data["start_time"],
                end_time=chunk_data["end_time"],
                file_path=chunk_data["file_path"]
            )
            db.add(chunk)
            db.flush()
            
            transcript = audio_processor.transcribe_chunk(chunk_data["file_path"])
            chunk.transcript = transcript
            all_transcripts.append(transcript)
        
        db.commit()
        
        full_transcript = "\n".join(all_transcripts)
        
        notes_data = note_generator.generate_notes(full_transcript)
        
        audiobook_note = AudiobookNote(
            audiobook_id=audiobook_id,
            topic=notes_data["topic"],
            summary=notes_data["summary"]
        )
        db.add(audiobook_note)
        db.flush()
        
        for idx, chapter in enumerate(notes_data.get("chapters", [])):
            chapter_note = ChapterNote(
                note_id=audiobook_note.id,
                title=chapter["title"],
                timestamp=chapter["timestamp"],
                content=chapter["content"],
                order_index=idx
            )
            db.add(chapter_note)
        
        for idx, kp in enumerate(notes_data.get("key_points", [])):
            key_point = KeyPoint(
                note_id=audiobook_note.id,
                content=kp["content"],
                timestamp=kp["timestamp"],
                order_index=idx
            )
            db.add(key_point)
        
        mind_map_data = note_generator.generate_mind_map(notes_data)
        mind_map = MindMap(
            note_id=audiobook_note.id,
            nodes_data=str(mind_map_data["nodes"]),
            edges_data=str(mind_map_data["edges"])
        )
        db.add(mind_map)
        
        audiobook.status = "completed"
        db.commit()
        
    except Exception as e:
        audiobook = db.query(AudioBook).filter(AudioBook.id == audiobook_id).first()
        if audiobook:
            audiobook.status = "failed"
            audiobook.error_message = str(e)
            db.commit()
        print(f"Processing Error: {e}")

@router.post("/upload")
async def upload_audiobook(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    if not file.filename or not file.filename.lower().endswith(('.mp3', '.wav')):
        raise HTTPException(status_code=400, detail="只支持 MP3 和 WAV 格式")
    
    from ..config import settings
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    
    file_extension = os.path.splitext(file.filename)[1]
    saved_filename = f"{uuid.uuid4()}{file_extension}"
    file_path = os.path.join(settings.UPLOAD_DIR, saved_filename)
    
    with open(file_path, "wb") as buffer:
        content = await file.read()
        file_size = len(content)
        buffer.write(content)
    
    try:
        duration = audio_processor.get_audio_duration(file_path)
        
        audiobook = AudioBook(
            filename=saved_filename,
            original_filename=file.filename,
            file_path=file_path,
            file_size=file_size / (1024 * 1024),
            duration=duration,
            status="pending"
        )
        db.add(audiobook)
        db.commit()
        db.refresh(audiobook)
        
        background_tasks.add_task(process_audio_background, audiobook.id, db)
        
        return {
            "success": True,
            "audiobook_id": audiobook.id,
            "status": audiobook.status,
            "message": "音频上传成功，正在处理中...",
            "audio_info": {
                "filename": file.filename,
                "duration": format_duration(duration),
                "size": f"{file_size / (1024 * 1024):.2f} MB"
            }
        }
        
    except Exception as e:
        if os.path.exists(file_path):
            os.remove(file_path)
        raise HTTPException(status_code=500, detail=f"音频处理失败: {str(e)}")

@router.get("/{audiobook_id}")
async def get_audiobook(audiobook_id: int, db: Session = Depends(get_db)):
    audiobook = db.query(AudioBook).filter(AudioBook.id == audiobook_id).first()
    if not audiobook:
        raise HTTPException(status_code=404, detail="音频不存在")
    
    note = db.query(AudiobookNote).filter(AudiobookNote.audiobook_id == audiobook_id).first()
    
    chapters = []
    key_points = []
    mind_map = None
    
    if note:
        chapters = db.query(ChapterNote).filter(
            ChapterNote.note_id == note.id
        ).order_by(ChapterNote.order_index).all()
        
        key_points = db.query(KeyPoint).filter(
            KeyPoint.note_id == note.id
        ).order_by(KeyPoint.order_index).all()
        
        mind_map_entry = db.query(MindMap).filter(MindMap.note_id == note.id).first()
        if mind_map_entry:
            try:
                import ast
                mind_map = {
                    "nodes": ast.literal_eval(mind_map_entry.nodes_data),
                    "edges": ast.literal_eval(mind_map_entry.edges_data)
                }
            except:
                mind_map = {"nodes": [], "edges": []}
    
    return {
        "audiobook": {
            "id": audiobook.id,
            "original_filename": audiobook.original_filename,
            "duration": format_duration(audiobook.duration),
            "status": audiobook.status,
            "created_at": audiobook.created_at.isoformat() if audiobook.created_at else None,
        },
        "notes": {
            "topic": note.topic if note else None,
            "summary": note.summary if note else None,
            "chapters": [
                {
                    "id": c.id,
                    "title": c.title,
                    "timestamp": c.timestamp,
                    "formatted_time": format_duration(c.timestamp),
                    "content": c.content
                }
                for c in chapters
            ],
            "key_points": [
                {
                    "id": kp.id,
                    "content": kp.content,
                    "timestamp": kp.timestamp,
                    "formatted_time": format_duration(kp.timestamp)
                }
                for kp in key_points
            ],
            "mind_map": mind_map
        } if note else None
    }

@router.get("/{audiobook_id}/status")
async def get_audiobook_status(audiobook_id: int, db: Session = Depends(get_db)):
    audiobook = db.query(AudioBook).filter(AudioBook.id == audiobook_id).first()
    if not audiobook:
        raise HTTPException(status_code=404, detail="音频不存在")
    
    return {
        "audiobook_id": audiobook.id,
        "status": audiobook.status,
        "error_message": audiobook.error_message,
    }

@router.get("/")
async def list_audiobooks(
    skip: int = 0,
    limit: int = 20,
    db: Session = Depends(get_db)
):
    audiobooks = db.query(AudioBook).order_by(AudioBook.created_at.desc()).offset(skip).limit(limit).all()
    
    return {
        "total": db.query(AudioBook).count(),
        "audiobooks": [
            {
                "id": ab.id,
                "original_filename": ab.original_filename,
                "duration": format_duration(ab.duration),
                "status": ab.status,
                "created_at": ab.created_at.isoformat() if ab.created_at else None,
            }
            for ab in audiobooks
        ]
    }
