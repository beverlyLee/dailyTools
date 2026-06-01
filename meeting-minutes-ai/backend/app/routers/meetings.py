import logging
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from typing import List
from .. import crud, models, schemas
from ..database import get_db
from ..services.audio_service import AudioService
from ..services.ai_service import AIService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/meetings", tags=["meetings"])
audio_service = AudioService()
ai_service = AIService()


@router.post("", response_model=schemas.MeetingResponse)
def create_meeting(
    meeting: schemas.MeetingCreate,
    db: Session = Depends(get_db),
):
    logger.info(f"Creating meeting: title={meeting.title}")
    result = crud.create_meeting(db, meeting)
    logger.info(f"Meeting created: id={result.id}")
    return result


@router.get("", response_model=List[schemas.MeetingResponse])
def list_meetings(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
):
    logger.info(f"Listing meetings: skip={skip}, limit={limit}")
    meetings = crud.get_meetings(db, skip=skip, limit=limit)
    logger.info(f"Found {len(meetings)} meetings")
    return meetings


@router.get("/{meeting_id}", response_model=schemas.MeetingResponse)
def get_meeting(
    meeting_id: int,
    db: Session = Depends(get_db),
):
    logger.info(f"Getting meeting: id={meeting_id}")
    meeting = crud.get_meeting(db, meeting_id)
    if not meeting:
        logger.warning(f"Meeting not found: id={meeting_id}")
        raise HTTPException(status_code=404, detail="会议不存在")
    logger.info(f"Meeting found: id={meeting.id}, title={meeting.title}")
    return meeting


@router.put("/{meeting_id}", response_model=schemas.MeetingResponse)
def update_meeting(
    meeting_id: int,
    meeting: schemas.MeetingUpdate,
    db: Session = Depends(get_db),
):
    logger.info(f"Updating meeting: id={meeting_id}")
    updated = crud.update_meeting(db, meeting_id, meeting)
    if not updated:
        logger.warning(f"Meeting not found for update: id={meeting_id}")
        raise HTTPException(status_code=404, detail="会议不存在")
    logger.info(f"Meeting updated: id={meeting_id}")
    return updated


@router.delete("/{meeting_id}")
def delete_meeting(
    meeting_id: int,
    db: Session = Depends(get_db),
):
    logger.info(f"Deleting meeting: id={meeting_id}")
    success = crud.delete_meeting(db, meeting_id)
    if not success:
        logger.warning(f"Meeting not found for delete: id={meeting_id}")
        raise HTTPException(status_code=404, detail="会议不存在")
    logger.info(f"Meeting deleted: id={meeting_id}")
    return {"success": True}


@router.post("/{meeting_id}/upload")
async def upload_audio(
    meeting_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    logger.info(f"Uploading audio: meeting_id={meeting_id}, filename={file.filename}, size={file.size or 'unknown'}")

    meeting = crud.get_meeting(db, meeting_id)
    if not meeting:
        logger.warning(f"Meeting not found: id={meeting_id}")
        raise HTTPException(status_code=404, detail="会议不存在")

    content = await file.read()
    logger.info(f"Audio content read: {len(content)} bytes")

    filename, file_path = await audio_service.save_audio(content, file.filename or "audio.webm")
    logger.info(f"Audio saved: filename={filename}, path={file_path}")

    crud.create_audio_file(db, meeting_id, filename, file_path)
    logger.info(f"Audio record created in database")

    return {
        "filename": filename,
        "meeting_id": meeting_id,
        "message": "音频已保存。请输入会议内容文本以生成摘要。",
        "next_step": "请调用 /api/meetings/transcribe-text 或 /api/meetings/process 端点输入会议内容文本"
    }


@router.post("/transcribe-text")
async def transcribe_with_text(
    request: schemas.TextTranscribeRequest,
    db: Session = Depends(get_db),
):
    logger.info(f"Transcribing with text: meeting_id={request.meeting_id}, text_length={len(request.transcription_text)}")

    meeting = crud.get_meeting(db, request.meeting_id)
    if not meeting:
        logger.warning(f"Meeting not found: id={request.meeting_id}")
        raise HTTPException(status_code=404, detail="会议不存在")

    crud.update_meeting(
        db,
        meeting.id,
        schemas.MeetingUpdate(transcription=request.transcription_text),
    )
    logger.info(f"Transcription saved to meeting: id={request.meeting_id}")

    return {
        "transcription": request.transcription_text,
        "meeting_id": meeting.id,
        "next_step": "调用 /api/meetings/summary 或 /api/meetings/process 生成 AI 摘要"
    }


@router.post("/transcribe")
async def transcribe_audio(
    request: schemas.TranscribeRequest,
    db: Session = Depends(get_db),
):
    logger.info(f"Transcribing audio (LLM cleanup): meeting_id={request.meeting_id}")

    meeting = crud.get_meeting(db, request.meeting_id)
    if not meeting:
        logger.warning(f"Meeting not found: id={request.meeting_id}")
        raise HTTPException(status_code=404, detail="会议不存在")

    if not meeting.transcription:
        logger.warning(f"No transcription found for meeting: id={request.meeting_id}")
        raise HTTPException(status_code=400, detail="会议还没有转录内容。请先调用 /api/meetings/transcribe-text 输入会议文本内容。")

    try:
        logger.info(f"Calling LLM to clean up transcription")
        cleaned_transcription = await ai_service.transcribe_with_llm(meeting.transcription)
        crud.update_meeting(
            db,
            meeting.id,
            schemas.MeetingUpdate(transcription=cleaned_transcription),
        )
        logger.info(f"Transcription cleaned and saved")
        return {
            "transcription": cleaned_transcription,
            "next_step": "调用 /api/meetings/summary 生成 AI 摘要"
        }
    except ValueError as e:
        logger.error(f"Configuration error: {e}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Transcription failed: {e}")
        raise HTTPException(status_code=500, detail=f"转录失败: {str(e)}")


@router.post("/summary")
async def generate_summary(
    request: schemas.SummaryRequest,
    db: Session = Depends(get_db),
):
    logger.info(f"Generating summary: meeting_id={request.meeting_id}")

    meeting = crud.get_meeting(db, request.meeting_id)
    if not meeting:
        logger.warning(f"Meeting not found: id={request.meeting_id}")
        raise HTTPException(status_code=404, detail="会议不存在")

    if not meeting.transcription:
        logger.warning(f"No transcription found for summary: id={request.meeting_id}")
        raise HTTPException(status_code=400, detail="会议还没有转录内容。请先调用 /api/meetings/transcribe-text 输入会议文本内容。")

    try:
        logger.info(f"Calling AI to generate summary")
        result = await ai_service.generate_summary(meeting.transcription)

        crud.update_meeting(
            db,
            meeting.id,
            schemas.MeetingUpdate(
                topic=result["topic"],
                summary=result["summary"],
                decisions=result["decisions"],
                action_items=result["action_items"],
            ),
        )
        logger.info(f"Summary saved: topic={result['topic']}, decisions={len(result['decisions'])}, action_items={len(result['action_items'])}")

        return result
    except ValueError as e:
        logger.error(f"Configuration error: {e}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Summary generation failed: {e}")
        raise HTTPException(status_code=500, detail=f"摘要生成失败: {str(e)}")


@router.post("/process")
async def process_meeting(
    request: schemas.ProcessMeetingRequest,
    db: Session = Depends(get_db),
):
    logger.info(f"Processing meeting (full workflow): meeting_id={request.meeting_id}")

    meeting = crud.get_meeting(db, request.meeting_id)
    if not meeting:
        logger.warning(f"Meeting not found: id={request.meeting_id}")
        raise HTTPException(status_code=404, detail="会议不存在")

    current_transcription = meeting.transcription or request.transcription_text

    if not current_transcription:
        logger.warning(f"No transcription text provided: id={request.meeting_id}")
        raise HTTPException(
            status_code=400,
            detail="请提供会议内容文本。可以通过 transcription_text 参数传入，或者先调用 /api/meetings/transcribe-text 保存文本。"
        )

    if request.transcription_text and not meeting.transcription:
        logger.info(f"Saving transcription text")
        crud.update_meeting(
            db,
            meeting.id,
            schemas.MeetingUpdate(transcription=request.transcription_text),
        )
        current_transcription = request.transcription_text

    logger.info(f"Generating summary with text length: {len(current_transcription)}")

    try:
        result = await ai_service.generate_summary(current_transcription)

        crud.update_meeting(
            db,
            meeting.id,
            schemas.MeetingUpdate(
                transcription=current_transcription,
                topic=result["topic"],
                summary=result["summary"],
                decisions=result["decisions"],
                action_items=result["action_items"],
            ),
        )

        logger.info(f"Meeting processed successfully: topic={result['topic']}")
        return {
            **result,
            "meeting_id": meeting.id,
            "status": "success",
        }
    except ValueError as e:
        logger.error(f"Configuration error: {e}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Processing failed: {e}")
        raise HTTPException(status_code=500, detail=f"处理失败: {str(e)}")
