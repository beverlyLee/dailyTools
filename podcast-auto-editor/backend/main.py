from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
import ffmpeg
import os
import re
import logging
from typing import List, Dict, Any
import uuid
from pydantic import BaseModel

from audio_processor import get_transcriber, get_polisher, FILLER_WORDS

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Podcast Auto Editor API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "uploads")
OUTPUT_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "output")
os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs(OUTPUT_DIR, exist_ok=True)

MAX_FILE_SIZE = 100 * 1024 * 1024
ALLOWED_EXTENSIONS = {'.wav', '.mp3', '.m4a', '.ogg', '.flac', '.aac'}

class TextPolishRequest(BaseModel):
    text: str
    language: str = "zh"
    preserve_meaning: bool = True

class RenderRequest(BaseModel):
    audio_file: str
    segments: List[Dict[str, Any]]

def detect_silence_fast(audio_path: str, silence_thresh: int = -40, min_silence_len: int = 500) -> List[Dict[str, float]]:
    try:
        probe = ffmpeg.probe(audio_path)
        duration = float(probe['format']['duration'])
        
        logger.info(f"开始静音检测，音频时长: {duration:.2f}秒")
        
        try:
            output = (
                ffmpeg
                .input(audio_path)
                .filter('silencedetect', n=f"{silence_thresh}dB", d=min_silence_len / 1000)
                .output('-', format='null')
                .run(capture_stdout=True, capture_stderr=True)
            )
            
            stderr = output[1].decode('utf-8', errors='ignore')
            
            silence_segments = []
            silence_start_pattern = re.compile(r'silence_start: (\d+\.?\d*)')
            silence_end_pattern = re.compile(r'silence_end: (\d+\.?\d*)')
            silence_duration_pattern = re.compile(r'silence_duration: (\d+\.?\d*)')
            
            starts = [float(match) for match in silence_start_pattern.findall(stderr)]
            ends = [float(match) for match in silence_end_pattern.findall(stderr)]
            durations = [float(match) for match in silence_duration_pattern.findall(stderr)]
            
            min_duration_sec = min_silence_len / 1000
            for i in range(min(len(starts), len(ends), len(durations))):
                if durations[i] >= min_duration_sec:
                    silence_segments.append({
                        'start': starts[i],
                        'end': ends[i],
                        'duration': durations[i]
                    })
            
            logger.info(f"检测到 {len(silence_segments)} 个静音片段")
            return silence_segments
            
        except ffmpeg.Error as e:
            logger.warning(f"silencedetect 滤镜失败，跳过静音检测: {e}")
            return []
            
    except Exception as e:
        logger.error(f"静音检测出错: {e}")
        return []

@app.post("/api/analyze-audio")
async def analyze_audio(file: UploadFile = File(...)):
    logger.info(f"收到音频分析请求: {file.filename}")
    
    try:
        file_ext = os.path.splitext(file.filename)[1].lower()
        if file_ext not in ALLOWED_EXTENSIONS:
            raise HTTPException(
                status_code=400,
                detail=f"不支持的文件格式。支持的格式: {', '.join(ALLOWED_EXTENSIONS)}"
            )
        
        file_id = str(uuid.uuid4())
        audio_path = os.path.join(UPLOAD_DIR, f"{file_id}{file_ext}")
        
        content = await file.read()
        if len(content) == 0:
            raise HTTPException(status_code=400, detail="上传的文件为空")
        if len(content) > MAX_FILE_SIZE:
            raise HTTPException(
                status_code=400, 
                detail=f"文件过大，最大支持 {MAX_FILE_SIZE//1024//1024}MB"
            )
        
        with open(audio_path, 'wb') as f:
            f.write(content)
        
        logger.info(f"文件保存成功: {audio_path}")
        
        try:
            probe = ffmpeg.probe(audio_path)
            duration = float(probe['format']['duration'])
            logger.info(f"音频时长: {duration:.2f}秒")
        except ffmpeg.Error as e:
            os.remove(audio_path)
            raise HTTPException(status_code=400, detail="无法解析音频文件，请检查文件格式")
        
        silence_segments = detect_silence_fast(audio_path)
        
        logger.info("开始音频转写...")
        transcriber = get_transcriber()
        transcribe_result = transcriber.transcribe(audio_path, language="zh")
        
        transcript = transcribe_result["words"]
        full_text = transcribe_result["text"]
        
        logger.info(f"转写完成，文本长度: {len(full_text)} 字符")
        logger.info(f"检测到 {transcribe_result['filler_count']} 个口癖词")
        
        filler_markers = []
        for word_info in transcribe_result.get("filler_words", []):
            filler_markers.append({
                "type": "filler",
                "start": word_info["start"],
                "end": word_info["end"],
                "text": word_info["word"]
            })
        
        markers = []
        for sil in silence_segments:
            markers.append({
                "type": "silence",
                "start": sil["start"],
                "end": sil["end"],
                "duration": sil["duration"]
            })
        
        markers.extend(filler_markers)
        markers.sort(key=lambda x: x["start"])
        
        estimated_duration = duration
        for m in markers:
            if m["type"] == "silence" and m.get("duration", 0) > 1.5:
                estimated_duration -= (m["duration"] - 0.5)
            elif m["type"] == "filler":
                estimated_duration -= (m["end"] - m["start"])
        
        estimated_duration = max(estimated_duration, duration * 0.3)
        
        return {
            "success": True,
            "file_id": file_id,
            "file_name": file.filename,
            "audio_path": audio_path,
            "duration": duration,
            "estimated_duration": estimated_duration,
            "markers": markers,
            "transcript": transcript,
            "full_text": full_text,
            "silence_count": len(silence_segments),
            "filler_count": len(filler_markers),
            "is_mock": transcribe_result.get("is_mock", False)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"音频分析出错: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"分析失败: {str(e)}")

@app.post("/api/polish-text")
async def polish_text(request: TextPolishRequest):
    logger.info(f"收到文本润色请求，文本长度: {len(request.text)}")
    
    try:
        polisher = get_polisher()
        result = polisher.polish(
            request.text, 
            language=request.language,
            preserve_meaning=request.preserve_meaning
        )
        
        logger.info(f"文本润色完成，移除 {result['changes'][0]['count']} 个词")
        logger.info(f"精简率: {result['reduction_ratio']:.1%}")
        
        return {
            "success": True,
            **result
        }
        
    except Exception as e:
        logger.error(f"文本润色出错: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"润色失败: {str(e)}")

@app.post("/api/render-audio")
async def render_audio(request: RenderRequest):
    logger.info(f"收到音频导出请求: {request.audio_file}")
    
    try:
        audio_path = request.audio_file
        if not os.path.exists(audio_path):
            audio_filename = os.path.basename(audio_path)
            audio_path = os.path.join(UPLOAD_DIR, audio_filename)
        
        if not os.path.exists(audio_path):
            raise HTTPException(status_code=404, detail="音频文件未找到")
        
        output_id = str(uuid.uuid4())
        output_path = os.path.join(OUTPUT_DIR, f"edited_{output_id}.mp3")
        
        segments = sorted(request.segments, key=lambda x: x["start"])
        logger.info(f"处理 {len(segments)} 个音频片段")
        
        if not segments:
            probe = ffmpeg.probe(audio_path)
            duration = float(probe["format"]["duration"])
            segments = [{"start": 0, "end": duration, "keep": True}]
        
        keep_segments = []
        for seg in segments:
            if seg.get("keep", True):
                keep_segments.append(seg)
        
        if not keep_segments:
            probe = ffmpeg.probe(audio_path)
            duration = float(probe["format"]["duration"])
            keep_segments = [{"start": 0, "end": duration, "keep": True}]
        
        inputs = []
        for i, seg in enumerate(keep_segments):
            duration = seg["end"] - seg["start"]
            if duration <= 0:
                continue
                
            try:
                seg_input = ffmpeg.input(audio_path, ss=seg["start"], t=duration)
                inputs.append(seg_input)
            except Exception as e:
                logger.warning(f"片段 {i} 处理失败: {e}")
                continue
        
        if not inputs:
            raise HTTPException(status_code=400, detail="没有有效的音频片段需要处理")
        
        logger.info(f"开始导出，共 {len(inputs)} 个片段")
        
        if len(inputs) == 1:
            (
                ffmpeg
                .output(inputs[0], output_path, format="mp3", audio_bitrate="192k")
                .overwrite_output()
                .run(capture_stdout=True, capture_stderr=True)
            )
        else:
            joined = ffmpeg.concat(*inputs, v=0, a=1)
            (
                ffmpeg
                .output(joined, output_path, format="mp3", audio_bitrate="192k")
                .overwrite_output()
                .run(capture_stdout=True, capture_stderr=True)
            )
        
        probe = ffmpeg.probe(output_path)
        output_duration = float(probe["format"]["duration"])
        
        logger.info(f"导出成功，输出时长: {output_duration:.2f}秒")
        
        return {
            "success": True,
            "output_path": output_path,
            "output_filename": os.path.basename(output_path),
            "duration": output_duration
        }
        
    except ffmpeg.Error as e:
        logger.error(f"FFmpeg 错误: {e.stderr.decode('utf-8', errors='ignore')}")
        raise HTTPException(status_code=500, detail="音频处理失败，请检查 FFmpeg 安装")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"音频导出出错: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"导出失败: {str(e)}")

@app.get("/api/download/{filename}")
async def download_file(filename: str):
    try:
        file_path = os.path.join(OUTPUT_DIR, filename)
        if not os.path.exists(file_path):
            raise HTTPException(status_code=404, detail="文件未找到")
        
        return FileResponse(
            file_path,
            media_type="audio/mpeg",
            filename=filename
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"下载文件出错: {e}")
        raise HTTPException(status_code=500, detail="下载失败")

@app.get("/api/health")
async def health_check():
    from audio_processor import WHISPER_AVAILABLE
    return {
        "status": "healthy",
        "whisper_available": WHISPER_AVAILABLE,
        "filler_words_count": len(FILLER_WORDS)
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, log_level="info")
