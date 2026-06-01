from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from typing import Dict, List, Optional
import random
import os
import io

app = FastAPI(title="Mood Music Player API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class EmotionRequest(BaseModel):
    emotion: str
    confidence: float
    source: str

class PlaylistResponse(BaseModel):
    playlist_id: str
    playlist_name: str
    description: str
    icon: str
    color_theme: Dict[str, str]
    tracks: List[Dict[str, str]]
    matched_emotion: str

os.makedirs("static/audio", exist_ok=True)
app.mount("/static", StaticFiles(directory="static"), name="static")

PLAYLISTS = {
    "healing": {
        "id": "healing",
        "name": "治愈系音乐",
        "description": "温柔舒缓的旋律，抚慰受伤的心灵",
        "icon": "💚",
        "color_theme": {
            "primary": "#4ade80",
            "secondary": "#22d3ee",
            "background": "#0f172a",
            "accent": "#818cf8",
            "type": "cool"
        },
        "tracks": [
            {"title": "宁静森林", "artist": "Nature Sounds", "duration": "3:24"},
            {"title": "雨后彩虹", "artist": "Peaceful Mind", "duration": "4:12"},
            {"title": "星空漫步", "artist": "Dreamy Nights", "duration": "3:45"}
        ]
    },
    "happy": {
        "id": "happy",
        "name": "欢快流行乐",
        "description": "充满活力的节奏，让心情更灿烂",
        "icon": "☀️",
        "color_theme": {
            "primary": "#fbbf24",
            "secondary": "#f59e0b",
            "background": "#fffbeb",
            "accent": "#ef4444",
            "type": "warm"
        },
        "tracks": [
            {"title": "阳光早晨", "artist": "Happy Vibes", "duration": "3:15"},
            {"title": "快乐节拍", "artist": "Pop Stars", "duration": "2:58"},
            {"title": "夏日派对", "artist": "Beach Boys", "duration": "3:42"}
        ]
    },
    "energetic": {
        "id": "energetic",
        "name": "激情摇滚",
        "description": "释放压力，燃烧激情",
        "icon": "🔥",
        "color_theme": {
            "primary": "#ef4444",
            "secondary": "#dc2626",
            "background": "#1f2937",
            "accent": "#f97316",
            "type": "warm"
        },
        "tracks": [
            {"title": "燃烧激情", "artist": "Rock Legends", "duration": "4:02"},
            {"title": "狂野之心", "artist": "Energy Band", "duration": "3:28"},
            {"title": "力量觉醒", "artist": "Metal Masters", "duration": "3:55"}
        ]
    },
    "calm": {
        "id": "calm",
        "name": "平静冥想",
        "description": "让心灵回归宁静",
        "icon": "🌊",
        "color_theme": {
            "primary": "#06b6d4",
            "secondary": "#0891b2",
            "background": "#f0f9ff",
            "accent": "#0ea5e9",
            "type": "cool"
        },
        "tracks": [
            {"title": "海洋深处", "artist": "Ocean Sounds", "duration": "4:30"},
            {"title": "禅意冥想", "artist": "Zen Masters", "duration": "5:15"},
            {"title": "深呼吸", "artist": "Peaceful Soul", "duration": "3:48"}
        ]
    },
    "romantic": {
        "id": "romantic",
        "name": "浪漫爵士",
        "description": "优雅的爵士旋律，营造浪漫氛围",
        "icon": "🌹",
        "color_theme": {
            "primary": "#ec4899",
            "secondary": "#db2777",
            "background": "#fdf2f8",
            "accent": "#f472b6",
            "type": "warm"
        },
        "tracks": [
            {"title": "午夜爵士", "artist": "Jazz Club", "duration": "4:18"},
            {"title": "浪漫之夜", "artist": "Smooth Jazz", "duration": "3:55"},
            {"title": "红酒时光", "artist": "Cafe Jazz", "duration": "4:02"}
        ]
    },
    "electronic": {
        "id": "electronic",
        "name": "动感电子",
        "description": "充满未来感的电子节拍",
        "icon": "🎧",
        "color_theme": {
            "primary": "#8b5cf6",
            "secondary": "#7c3aed",
            "background": "#1e1b4b",
            "accent": "#a78bfa",
            "type": "cool"
        },
        "tracks": [
            {"title": "未来都市", "artist": "EDM Masters", "duration": "3:42"},
            {"title": "霓虹之夜", "artist": "Synth Wave", "duration": "4:08"},
            {"title": "数字梦境", "artist": "Cyber Punk", "duration": "3:55"}
        ]
    }
}

EMOTION_MAPPING = {
    "sad": {"playlist": "healing", "min_confidence": 0.3},
    "grief": {"playlist": "healing", "min_confidence": 0.3},
    "depressed": {"playlist": "healing", "min_confidence": 0.3},
    "melancholy": {"playlist": "healing", "min_confidence": 0.3},
    "happy": {"playlist": "happy", "min_confidence": 0.4},
    "joy": {"playlist": "happy", "min_confidence": 0.4},
    "excited": {"playlist": "happy", "min_confidence": 0.4},
    "angry": {"playlist": "energetic", "min_confidence": 0.4},
    "frustrated": {"playlist": "energetic", "min_confidence": 0.4},
    "annoyed": {"playlist": "energetic", "min_confidence": 0.4},
    "neutral": {"playlist": "calm", "min_confidence": 0.3},
    "calm": {"playlist": "calm", "min_confidence": 0.3},
    "peaceful": {"playlist": "calm", "min_confidence": 0.3},
    "surprised": {"playlist": "electronic", "min_confidence": 0.4},
    "shocked": {"playlist": "electronic", "min_confidence": 0.4},
    "fearful": {"playlist": "calm", "min_confidence": 0.3},
    "scared": {"playlist": "calm", "min_confidence": 0.3},
    "disgusted": {"playlist": "romantic", "min_confidence": 0.3},
    "love": {"playlist": "romantic", "min_confidence": 0.4},
    "romantic": {"playlist": "romantic", "min_confidence": 0.4}
}

def analyze_audio_features_simple(audio_data: bytes) -> Dict[str, float]:
    try:
        data_length = len(audio_data)
        
        intensity = min(1.0, data_length / 100000)
        variance = 0.3 + (hash(audio_data[:100]) % 100) / 200
        zero_crossing_rate = 0.2 + (hash(audio_data[-100:]) % 100) / 200
        
        print(f"🔊 音频分析: 长度={data_length}字节, 强度={intensity:.3f}, 波动={variance:.3f}")
        
        return {
            "energy": intensity,
            "variance": variance,
            "zero_crossing_rate": zero_crossing_rate,
            "tempo": 60 + intensity * 120
        }
    except Exception as e:
        print(f"⚠️ 音频分析失败: {e}")
        return {"energy": 0.5, "variance": 0.5, "zero_crossing_rate": 0.5, "tempo": 120}

def infer_emotion_from_features(features: Dict[str, float]) -> tuple:
    energy = features["energy"]
    variance = features["variance"]
    zcr = features["zero_crossing_rate"]
    
    if energy < 0.25 and variance < 0.3:
        return "sad", 0.75 + (0.3 - energy) * 0.4
    
    if energy > 0.6 and variance > 0.5:
        return "happy", 0.65 + energy * 0.35
    
    if energy > 0.7 and (variance > 0.6 or zcr > 0.5):
        return "angry", 0.55 + energy * 0.3
    
    if energy < 0.35 and variance < 0.25:
        return "calm", 0.6 + (1 - energy) * 0.3
    
    if variance > 0.7 and energy > 0.5:
        return "surprised", 0.55 + variance * 0.3
    
    if energy > 0.3 and energy < 0.5 and zcr > 0.4:
        return "fearful", 0.5 + zcr * 0.3
    
    return "neutral", 0.5

def get_best_playlist(emotion: str, confidence: float, source: str) -> dict:
    emotion_lower = emotion.lower()
    
    print(f"🎯 获取歌单: 情绪={emotion_lower}, 置信度={confidence:.3f}, 来源={source}")
    
    mapping = EMOTION_MAPPING.get(emotion_lower)
    if mapping and confidence >= mapping["min_confidence"]:
        playlist_id = mapping["playlist"]
        print(f"✅ 精确匹配到歌单: {PLAYLISTS[playlist_id]['name']}")
        return PLAYLISTS[playlist_id]
    
    for emo_key, mapping in EMOTION_MAPPING.items():
        if emo_key in emotion_lower and confidence >= mapping["min_confidence"]:
            playlist_id = mapping["playlist"]
            print(f"✅ 模糊匹配到歌单: {PLAYLISTS[playlist_id]['name']}")
            return PLAYLISTS[playlist_id]
    
    print(f"ℹ️ 使用默认歌单: 平静冥想")
    return PLAYLISTS["calm"]

@app.get("/")
async def root():
    return {"message": "Mood Music Player API", "version": "1.0.0", "docs": "/docs"}

@app.post("/api/match-playlist", response_model=PlaylistResponse)
async def match_playlist(request: EmotionRequest):
    try:
        print(f"📨 收到歌单匹配请求: emotion={request.emotion}, confidence={request.confidence}, source={request.source}")
        playlist = get_best_playlist(request.emotion, request.confidence, request.source)
        response = {
            "playlist_id": playlist["id"],
            "playlist_name": playlist["name"],
            "description": playlist["description"],
            "icon": playlist["icon"],
            "color_theme": playlist["color_theme"],
            "tracks": playlist["tracks"],
            "matched_emotion": request.emotion
        }
        print(f"✅ 返回歌单: {response['playlist_name']}, 主题类型: {response['color_theme']['type']}")
        return response
    except Exception as e:
        print(f"❌ 处理歌单请求出错: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/analyze-audio")
async def analyze_audio(file: UploadFile = File(...)):
    try:
        print(f"🔊 收到音频文件: {file.filename}, 大小: {file.size} bytes")
        
        contents = await file.read()
        print(f"📦 音频数据长度: {len(contents)} bytes")
        
        features = analyze_audio_features_simple(contents)
        emotion, confidence = infer_emotion_from_features(features)
        
        print(f"✅ 音频分析完成: 情绪={emotion}, 置信度={confidence:.3f}")
        
        return {
            "emotion": emotion,
            "confidence": confidence,
            "features": features
        }
    except Exception as e:
        print(f"❌ 音频分析出错: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/playlists")
async def get_all_playlists():
    return list(PLAYLISTS.values())

@app.get("/api/emotion-mapping")
async def get_emotion_mapping():
    return {
        emotion: {
            "playlist": mapping["playlist"],
            "playlist_name": PLAYLISTS[mapping["playlist"]]["name"]
        }
        for emotion, mapping in EMOTION_MAPPING.items()
    }

@app.get("/api/health")
async def health_check():
    return {"status": "healthy", "message": "情绪音乐播放器API运行正常"}

if __name__ == "__main__":
    import uvicorn
    print("🚀 启动情绪音乐播放器后端服务...")
    print(f"📡 API地址: http://localhost:8000")
    print(f"📚 API文档: http://localhost:8000/docs")
    uvicorn.run(app, host="0.0.0.0", port=8000, log_level="info")
