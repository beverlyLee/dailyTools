import os
import re
import json
import logging
import jieba
from typing import List, Dict, Any, Optional

logger = logging.getLogger(__name__)

FILLER_WORDS = [
    '嗯', '啊', '哦', '呃', '那个', '这个', '就是', '其实', '然后',
    '对吧', '你知道', '怎么说呢', '说实话', '基本上', 'sort of',
    'you know', 'like', 'um', 'uh', 'er', 'ah', 'well', 'so',
    'actually', 'basically', 'i mean'
]

PUNCTUATION = ['。', '！', '？', '.', '!', '?', '，', ',', '；', ';', '：', ':']

try:
    import whisper
    WHISPER_AVAILABLE = True
    logger.info("Whisper 模块已加载")
except ImportError:
    WHISPER_AVAILABLE = False
    logger.warning("Whisper 未安装，将使用模拟模式")

class AudioTranscriber:
    def __init__(self, model_size: str = "base"):
        self.model = None
        self.model_size = model_size
        self.model_loaded = False
        
    def load_model(self):
        if not WHISPER_AVAILABLE:
            logger.warning("Whisper 不可用，使用模拟转写")
            return False
            
        if self.model_loaded:
            return True
            
        try:
            logger.info(f"正在加载 Whisper 模型: {self.model_size}")
            self.model = whisper.load_model(self.model_size)
            self.model_loaded = True
            logger.info("Whisper 模型加载成功")
            return True
        except Exception as e:
            logger.error(f"加载 Whisper 模型失败: {e}")
            return False
    
    def transcribe(self, audio_path: str, language: str = "zh") -> Dict[str, Any]:
        if not os.path.exists(audio_path):
            raise FileNotFoundError(f"音频文件不存在: {audio_path}")
            
        if self.load_model():
            return self._real_transcribe(audio_path, language)
        else:
            return self._mock_transcribe(audio_path, language)
    
    def _real_transcribe(self, audio_path: str, language: str) -> Dict[str, Any]:
        try:
            logger.info(f"开始转写音频: {audio_path}")
            result = self.model.transcribe(
                audio_path,
                language=language,
                word_timestamps=True,
                verbose=False
            )
            
            full_text = result["text"].strip()
            segments = result["segments"]
            
            words = []
            for seg in segments:
                if "words" in seg:
                    for word_info in seg["words"]:
                        words.append({
                            "word": word_info["word"].strip(),
                            "start": float(word_info["start"]),
                            "end": float(word_info["end"]),
                            "confidence": float(word_info.get("probability", 0.9))
                        })
            
            filler_words = self._detect_fillers(words)
            
            logger.info(f"转写完成，文本长度: {len(full_text)} 字符")
            
            return {
                "text": full_text,
                "words": words,
                "segments": [{
                    "start": s["start"],
                    "end": s["end"],
                    "text": s["text"].strip()
                } for s in segments],
                "language": language,
                "filler_count": len(filler_words),
                "filler_words": filler_words
            }
        except Exception as e:
            logger.error(f"转写失败: {e}", exc_info=True)
            return self._mock_transcribe(audio_path, language)
    
    def _mock_transcribe(self, audio_path: str, language: str) -> Dict[str, Any]:
        import ffmpeg
        probe = ffmpeg.probe(audio_path)
        duration = float(probe['format']['duration'])
        
        mock_texts = {
            "zh": "嗯那个今天啊我们想聊一下关于人工智能的话题对吧其实这个技术呢发展得非常快哦你知道吗然后呢我觉得怎么说呢基本上可以改变很多行业说实话",
            "en": "Um, so today we want to talk about AI, right? Actually, you know, this technology is developing really fast, uh, and I think it can basically change many industries, well."
        }
        
        text = mock_texts.get(language, mock_texts["zh"])
        
        words = []
        current_time = 0.0
        word_list = list(jieba.cut(text))
        
        for word in word_list:
            word_duration = max(0.1, len(word) * 0.15)
            if current_time + word_duration > duration:
                break
            words.append({
                "word": word,
                "start": current_time,
                "end": current_time + word_duration,
                "confidence": 0.9
            })
            current_time += word_duration + 0.05
        
        filler_words = self._detect_fillers(words)
        
        return {
            "text": text,
            "words": words,
            "segments": [{"start": 0, "end": duration, "text": text}],
            "language": language,
            "filler_count": len(filler_words),
            "filler_words": filler_words,
            "is_mock": True
        }
    
    def _detect_fillers(self, words: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        fillers = []
        for word_info in words:
            word = word_info["word"].lower().strip()
            if any(filler in word for filler in FILLER_WORDS):
                fillers.append(word_info)
        return fillers


class TextPolisher:
    def __init__(self):
        self.fillers_pattern = self._build_filler_pattern()
        jieba.initialize()
    
    def _build_filler_pattern(self) -> re.Pattern:
        escaped = [re.escape(f) for f in FILLER_WORDS]
        pattern = '|'.join(escaped)
        return re.compile(rf'\b({pattern})\b', re.IGNORECASE)
    
    def polish(self, text: str, language: str = "zh", preserve_meaning: bool = True) -> Dict[str, Any]:
        original_text = text
        changes = []
        
        cleaned_text = text
        
        if preserve_meaning:
            cleaned_text = self._smart_remove_fillers(cleaned_text)
        else:
            cleaned_text = self.fillers_pattern.sub('', cleaned_text)
        
        cleaned_text = re.sub(r'\s+', ' ', cleaned_text).strip()
        
        cleaned_text = self._smart_punctuation(cleaned_text, language)
        
        cleaned_text = self._add_breath_marks(cleaned_text, language)
        
        cleaned_text = re.sub(r'\s+', ' ', cleaned_text).strip()
        
        original_words = list(jieba.cut(original_text))
        polished_words = list(jieba.cut(cleaned_text))
        
        changes.append({
            "type": "filler_removal",
            "count": max(0, len(original_words) - len(polished_words)),
            "removed_fillers": self._find_removed_fillers(original_text, cleaned_text)
        })
        
        return {
            "original_text": original_text,
            "polished_text": cleaned_text,
            "changes": changes,
            "word_count_original": len(original_words),
            "word_count_polished": len(polished_words),
            "reduction_ratio": 1 - len(polished_words) / max(1, len(original_words))
        }
    
    def _smart_remove_fillers(self, text: str) -> str:
        result = text
        
        filler_patterns = [
            r'^嗯[，。！？、\s]',
            r'^啊[，。！？、\s]',
            r'^哦[，。！？、\s]',
            r'^那个[，。！？、\s]?',
            r'^这个[，。！？、\s]?',
            r'^就是[，。！？、\s]?',
            r'^其实[，。！？、\s]?',
            r'^然后[，。！？、\s]?',
            r'对吧[，。！？、\s]?$',
            r'你知道[，。！？、\s]?',
            r'怎么说呢[，。！？、\s]?',
            r'说实话[，。！？、\s]?',
            r'基本上[，。！？、\s]?',
            r'嗯',
            r'啊',
            r'哦',
            r'呃',
            r'呢',
        ]
        
        for pattern in filler_patterns:
            result = re.sub(pattern, '', result)
        
        for filler in sorted(FILLER_WORDS, key=len, reverse=True):
            if len(filler) >= 2:
                result = result.replace(filler, '')
        
        result = re.sub(r'\s+', ' ', result).strip()
        result = re.sub(r'([，。！？、])\1+', r'\1', result)
        
        return result
    
    def _smart_punctuation(self, text: str, language: str) -> str:
        if language == "zh":
            result = text
            result = re.sub(r'([。！？])\1+', r'\1', result)
            result = re.sub(r'([，。！？])\s*', r'\1', result)
            return result
        else:
            sentences = re.split(r'(?<=[.!?])\s+', text)
            sentences = [s.capitalize() for s in sentences if s.strip()]
            return ' '.join(sentences)
    
    def _add_breath_marks(self, text: str, language: str) -> str:
        if language == "zh":
            sentences = re.split(r'([。！？])', text)
            result = []
            
            for i in range(0, len(sentences) - 1, 2):
                sentence = sentences[i].strip()
                punc = sentences[i + 1]
                
                if len(sentence) > 20:
                    words = list(jieba.cut(sentence))
                    processed = []
                    current_length = 0
                    
                    for word in words:
                        processed.append(word)
                        current_length += len(word)
                        
                        if current_length > 15 and word not in PUNCTUATION:
                            processed.append('，')
                            current_length = 0
                    
                    processed_sentence = ''.join(processed)
                    processed_sentence = re.sub(r'，，+', '，', processed_sentence)
                    processed_sentence = re.sub(r'，([。！？])', r'\1', processed_sentence)
                    result.append(processed_sentence + punc)
                else:
                    result.append(sentence + punc)
            
            if len(sentences) % 2 == 1 and sentences[-1].strip():
                result.append(sentences[-1].strip())
            
            return ''.join(result)
        else:
            return text
    
    def _find_removed_fillers(self, original: str, polished: str) -> List[str]:
        original_words = set(jieba.cut(original))
        polished_words = set(jieba.cut(polished))
        removed = original_words - polished_words
        return [w for w in removed if any(f in w for f in FILLER_WORDS)]


_global_transcriber = None
_global_polisher = None

def get_transcriber() -> AudioTranscriber:
    global _global_transcriber
    if _global_transcriber is None:
        _global_transcriber = AudioTranscriber(model_size="base")
    return _global_transcriber

def get_polisher() -> TextPolisher:
    global _global_polisher
    if _global_polisher is None:
        _global_polisher = TextPolisher()
    return _global_polisher
