from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from typing import Optional
import uuid
from datetime import datetime

from app.schemas import (
    AlertRequest, 
    AlertResponse, 
    SettingsUpdate, 
    AlertHistory,
    AlertLevel,
    SoundType
)
from app.services.alert_dispatcher import alert_dispatcher
from app.services.sound_detector import sound_detector
from app.config import settings


app = FastAPI(
    title="老人居家安全声音监护系统",
    description="独居老人突发意外求助系统 - API 服务",
    version="1.0.0"
)


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
async def health_check():
    return {
        "status": "ok",
        "timestamp": datetime.now().isoformat(),
        "version": "1.0.0"
    }


@app.post("/api/detect-alert")
async def detect_alert(request: AlertRequest):
    try:
        detection_result = await sound_detector.detect(
            audio_transcript=request.audio_data,
            detected_sound=request.detected_sound,
            confidence=request.confidence
        )
        
        sound_type = detection_result.get('sound_type', 'unknown')
        
        if sound_type == 'unknown':
            return JSONResponse(
                status_code=200,
                content={
                    "status": "normal",
                    "message": "未检测到异常声音",
                    "sound_type": "unknown",
                    "confidence": detection_result.get('confidence', 0.0)
                }
            )
        
        alert_result = await alert_dispatcher.dispatch(
            sound_type=sound_type,
            confidence=detection_result.get('confidence', 0.8),
            location=request.location,
            audio_url=request.audio_url
        )
        
        return alert_result
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/test-alert")
async def test_alert():
    try:
        result = alert_dispatcher.trigger_test_alert()
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/alerts")
async def get_alerts():
    return {"alerts": alert_dispatcher.get_alert_history()}


@app.post("/api/alerts/{alert_id}/resolve")
async def resolve_alert(alert_id: str):
    success = alert_dispatcher.resolve_alert(alert_id)
    if not success:
        raise HTTPException(status_code=404, detail="Alert not found")
    return {"status": "resolved", "alert_id": alert_id}


@app.get("/api/settings/contacts")
async def get_contacts():
    return {"contacts": alert_dispatcher.get_contacts()}


@app.put("/api/settings/contacts")
async def update_contacts(settings_update: SettingsUpdate):
    contacts_dicts = [c.model_dump() for c in settings_update.contacts]
    alert_dispatcher.update_contacts(contacts_dicts)
    return {
        "status": "updated",
        "contacts": alert_dispatcher.get_contacts()
    }


@app.post("/api/settings/test-connection")
async def test_connection():
    return {
        "status": "ok",
        "message": "后端连接正常",
        "api_configured": bool(settings.ARK_API_KEY)
    }


@app.post("/api/upload-audio")
async def upload_audio(
    file: UploadFile = File(...),
    location: Optional[str] = Form(None)
):
    try:
        audio_id = str(uuid.uuid4())
        return {
            "status": "uploaded",
            "audio_id": audio_id,
            "filename": file.filename,
            "location": location
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
