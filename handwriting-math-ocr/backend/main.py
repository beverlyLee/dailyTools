from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import requests
import os
import hmac
import hashlib
import time
import json
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="手写数学公式识别API", description="基于 MyScript API 的手写数学公式识别服务")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

MYSCRIPT_APPLICATION_KEY = os.getenv("MYSCRIPT_APPLICATION_KEY", "")
MYSCRIPT_HMAC_KEY = os.getenv("MYSCRIPT_HMAC_KEY", "")
MYSCRIPT_API_URL = "https://cloud.myscript.com/api/v4.0/iink/batch"


class Point(BaseModel):
    x: float
    y: float
    t: Optional[int] = None
    p: Optional[float] = None


class Stroke(BaseModel):
    x: List[float]
    y: List[float]
    t: Optional[List[int]] = None
    p: Optional[List[float]] = None


class RecognitionRequest(BaseModel):
    strokes: List[Stroke]
    mime_types: List[str] = ["application/x-latex", "application/mathml+xml"]


def generate_hmac(data: str, timestamp: str, nonce: str) -> str:
    if not MYSCRIPT_HMAC_KEY:
        return ""
    
    message = f"POST\n/myscript.com/api/v4.0/iink/batch\n{timestamp}\n{nonce}\napplication/json\n{data}"
    hmac_obj = hmac.new(
        MYSCRIPT_HMAC_KEY.encode('utf-8'),
        message.encode('utf-8'),
        hashlib.sha512
    )
    return hmac_obj.hexdigest()


def convert_strokes_to_myscript_format(strokes: List[Stroke]) -> dict:
    myscript_strokes = []
    for stroke in strokes:
        stroke_data = {"x": stroke.x, "y": stroke.y}
        if stroke.t:
            stroke_data["t"] = stroke.t
        if stroke.p:
            stroke_data["p"] = stroke.p
        myscript_strokes.append(stroke_data)
    return myscript_strokes


def build_myscript_request(strokes: List[Stroke], mime_types: List[str]) -> dict:
    return {
        "configuration": {
            "lang": "en_US",
            "mimeTypes": mime_types,
            "math": {
                "mimeTypes": mime_types,
                "solver": {
                    "enable": False
                }
            }
        },
        "strokeGroups": [
            {
                "strokes": convert_strokes_to_myscript_format(strokes)
            }
        ]
    }


@app.post("/api/recognize")
async def recognize_math(request: RecognitionRequest):
    if not MYSCRIPT_APPLICATION_KEY or not MYSCRIPT_HMAC_KEY:
        raise HTTPException(
            status_code=500,
            detail="MyScript API 密钥未配置，请在 .env 文件中设置 MYSCRIPT_APPLICATION_KEY 和 MYSCRIPT_HMAC_KEY"
        )
    
    if not request.strokes:
        raise HTTPException(status_code=400, detail="没有提供手写轨迹数据")
    
    try:
        request_data = build_myscript_request(request.strokes, request.mime_types)
        json_data = json.dumps(request_data)
        
        timestamp = str(int(time.time()))
        nonce = "".join([str(int(time.time() * 1000)) for _ in range(5)])
        
        hmac_hash = generate_hmac(json_data, timestamp, nonce)
        
        headers = {
            "Content-Type": "application/json",
            "applicationKey": MYSCRIPT_APPLICATION_KEY,
            "hmac": hmac_hash,
            "timestamp": timestamp,
            "nonce": nonce
        }
        
        response = requests.post(
            MYSCRIPT_API_URL,
            data=json_data,
            headers=headers,
            timeout=30
        )
        
        if response.status_code != 200:
            raise HTTPException(
                status_code=response.status_code,
                detail=f"MyScript API 错误: {response.text}"
            )
        
        result = response.json()
        
        latex_output = ""
        mathml_output = ""
        
        if "result" in result:
            results = result["result"]
            for mime_type in request.mime_types:
                if mime_type in results:
                    if mime_type == "application/x-latex":
                        latex_output = results[mime_type]
                    elif mime_type == "application/mathml+xml":
                        mathml_output = results[mime_type]
        
        return {
            "success": True,
            "latex": latex_output,
            "mathml": mathml_output,
            "raw_response": result
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"识别过程中发生错误: {str(e)}"
        )


@app.get("/api/health")
async def health_check():
    return {
        "status": "healthy",
        "myscript_configured": bool(MYSCRIPT_APPLICATION_KEY and MYSCRIPT_HMAC_KEY)
    }


@app.get("/")
async def root():
    return {
        "message": "手写数学公式识别API",
        "endpoints": {
            "识别": "POST /api/recognize",
            "健康检查": "GET /api/health"
        },
        "docs": {
            "Swagger UI": "/docs",
            "ReDoc": "/redoc"
        }
    }
