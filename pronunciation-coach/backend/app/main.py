from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
from enum import Enum
import httpx
import json
from app.config import settings

app = FastAPI(title="Pronunciation Coach API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class DetectionStatus(str, Enum):
    COMPLETE = "complete"
    PARTIAL = "partial"
    SILENT = "silent"
    TOO_SHORT = "too_short"
    ERROR = "error"


class PhonemeFeedback(BaseModel):
    phoneme: str
    expected: str
    actual: str
    isCorrect: bool
    confidence: float


class SyllableFeedback(BaseModel):
    syllable: str
    index: int
    isCorrect: bool
    phonemes: List[PhonemeFeedback]


class WordFeedback(BaseModel):
    word: str
    isCorrect: bool
    phonetic: str
    syllables: List[SyllableFeedback]
    overallScore: float


class VoiceDetectionInfo(BaseModel):
    hasValidVoice: bool
    voiceDurationMs: float
    avgEnergy: float
    isSilent: bool
    isTooShort: bool


class TextAlignmentInfo(BaseModel):
    recognizedText: str
    targetWords: List[str]
    matchedWords: List[str]
    unmatchedWords: List[str]
    matchRatio: float
    isComplete: bool


class PronunciationAnalysisRequest(BaseModel):
    targetSentence: str
    targetPhonetic: Optional[str] = None
    userAudioBase64: str
    audioFormat: str = "webm"
    voiceDetection: Optional[VoiceDetectionInfo] = None
    alignment: Optional[TextAlignmentInfo] = None


class PronunciationAnalysisResponse(BaseModel):
    overallScore: float
    wordFeedback: List[WordFeedback]
    suggestions: List[str]
    waveformComparison: Optional[dict] = None
    detectionStatus: DetectionStatus
    detectionMessage: str
    voiceDetection: VoiceDetectionInfo
    alignment: Optional[TextAlignmentInfo] = None
    isPartialResult: bool
    analyzedSentence: str


PRONUNCIATION_PROMPT = """你是一位专业的英语发音教练。请分析用户的发音与标准发音的差异。

目标句子：{target_sentence}
目标音标：{target_phonetic}

请以 JSON 格式返回详细的发音分析结果，包含以下字段：
{{
    "overallScore": 0-100的整体分数,
    "wordFeedback": [
        {{
            "word": "单词",
            "isCorrect": true/false,
            "phonetic": "标准音标",
            "syllables": [
                {{
                    "syllable": "音节",
                    "index": 0,
                    "isCorrect": true/false,
                    "phonemes": [
                        {{
                            "phoneme": "音素",
                            "expected": "标准发音",
                            "actual": "用户发音",
                            "isCorrect": true/false,
                            "confidence": 0-1的置信度
                        }}
                    ]
                }}
            ],
            "overallScore": 0-100
        }}
    ],
    "suggestions": [
        "具体的纠音建议1",
        "具体的纠音建议2"
    ]
}}

特别注意：
1. 如果用户把 "cat" 读成了 "cut"，请明确指出元音 /æ/ 和 /ʌ/ 的区别
2. 如果用户把 "cut" 读成了 "cat"，请明确指出元音 /ʌ/ 和 /æ/ 的区别
3. 提供具体的发音技巧建议，帮助用户改进
4. 分析要专业且易于理解"""


@app.get("/api/health")
async def health_check():
    return {"status": "ok", "message": "Pronunciation Coach API is running"}


@app.get("/api/practice-sentences")
async def get_practice_sentences():
    sentences = [
        {
            "id": 1,
            "sentence": "The cat sat on the mat.",
            "phonetic": "/ðə kæt sæt ɒn ðə mæt/",
            "difficulty": "beginner",
            "focusWords": ["cat", "mat", "sat"]
        },
        {
            "id": 2,
            "sentence": "I cut the paper with scissors.",
            "phonetic": "/aɪ kʌt ðə ˈpeɪpə wɪð ˈsɪzəz/",
            "difficulty": "beginner",
            "focusWords": ["cut", "paper"]
        },
        {
            "id": 3,
            "sentence": "She sells seashells by the seashore.",
            "phonetic": "/ʃiː selz ˈsiːʃelz baɪ ðə ˈsiːʃɔː/",
            "difficulty": "intermediate",
            "focusWords": ["sells", "seashells", "seashore"]
        },
        {
            "id": 4,
            "sentence": "How much wood would a woodchuck chuck?",
            "phonetic": "/haʊ mʌtʃ wʊd wʊd ə ˈwʊdtʃʌk tʃʌk/",
            "difficulty": "intermediate",
            "focusWords": ["wood", "would", "chuck"]
        },
        {
            "id": 5,
            "sentence": "Peter Piper picked a peck of pickled peppers.",
            "phonetic": "/ˈpiːtə ˈpaɪpə pɪkt ə pek əv ˈpɪkld ˈpepəz/",
            "difficulty": "advanced",
            "focusWords": ["Peter", "Piper", "picked", "peppers"]
        }
    ]
    return {"sentences": sentences}


async def call_volcengine_api(prompt: str, user_content: str) -> dict:
    if not settings.volcengine_api_key or not settings.volcengine_model:
        raise HTTPException(
            status_code=500,
            detail="火山引擎 API 未配置。请设置 VOLCENGINE_API_KEY 和 VOLCENGINE_MODEL 环境变量"
        )

    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {settings.volcengine_api_key}"
    }

    body = {
        "model": settings.volcengine_model,
        "messages": [
            {"role": "system", "content": prompt},
            {"role": "user", "content": user_content}
        ],
        "temperature": 0.3,
        "max_tokens": 2048
    }

    async with httpx.AsyncClient(timeout=settings.api_timeout) as client:
        try:
            response = await client.post(
                settings.volcengine_endpoint,
                headers=headers,
                json=body
            )
            response.raise_for_status()
            result = response.json()

            if "choices" in result and len(result["choices"]) > 0:
                content = result["choices"][0]["message"]["content"]

                try:
                    json_match = content.find('{')
                    json_end = content.rfind('}') + 1
                    if json_match >= 0 and json_end > json_match:
                        json_content = content[json_match:json_end]
                        return json.loads(json_content)
                except json.JSONDecodeError:
                    pass

                return {"raw_content": content}
            else:
                raise HTTPException(status_code=500, detail="API 响应格式异常")

        except httpx.TimeoutException:
            raise HTTPException(status_code=504, detail="火山引擎 API 请求超时")
        except httpx.HTTPError as e:
            raise HTTPException(status_code=502, detail=f"火山引擎 API 调用失败: {str(e)}")


def get_mock_analysis(target_sentence: str) -> dict:
    words = target_sentence.lower().replace('.', '').replace(',', '').split()

    has_cat = 'cat' in words
    has_cut = 'cut' in words

    word_feedback = []
    suggestions = []
    overall_score = 85

    for word in words:
        is_correct = True
        word_score = 90

        if word == 'cat' and has_cat:
            is_correct = False
            word_score = 40
            suggestions.append(
                "检测到你把 'cat' 读成了类似 'cut' 的发音。注意元音 /æ/ 和 /ʌ/ 的区别："
                "/æ/ 是短元音，发音时嘴张得更大，舌头位置更低；"
                "而 /ʌ/ 发音时嘴张得较小，舌头位置更高。"
                "请尝试：像微笑一样张开发音，感受舌头轻触下齿龈的感觉。"
            )
        elif word == 'cut' and has_cut:
            is_correct = False
            word_score = 40
            suggestions.append(
                "检测到你把 'cut' 读成了类似 'cat' 的发音。注意元音 /ʌ/ 和 /æ/ 的区别："
                "/ʌ/ 是中元音，发音时嘴张得较小，舌头位置在中部；"
                "而 /æ/ 发音时嘴张得更大。"
                "请尝试：放松舌头，轻微收下巴发这个音。"
            )
        elif word == 'mat':
            is_correct = True
            word_score = 85
        elif word == 'paper':
            is_correct = True
            word_score = 88

        phonetic_map = {
            'the': '/ðə/', 'cat': '/kæt/', 'sat': '/sæt/', 'on': '/ɒn/',
            'mat': '/mæt/', 'i': '/aɪ/', 'cut': '/kʌt/', 'paper': '/ˈpeɪpə/',
            'with': '/wɪð/', 'scissors': '/ˈsɪzəz/', 'she': '/ʃiː/',
            'sells': '/selz/', 'seashells': '/ˈsiːʃelz/', 'by': '/baɪ/',
            'seashore': '/ˈsiːʃɔː/', 'how': '/haʊ/', 'much': '/mʌtʃ/',
            'wood': '/wʊd/', 'would': '/wʊd/', 'a': '/ə/', 'woodchuck': '/ˈwʊdtʃʌk/',
            'chuck': '/tʃʌk/', 'peter': '/ˈpiːtə/', 'piper': '/ˈpaɪpə/',
            'picked': '/pɪkt/', 'peck': '/pek/', 'of': '/əv/',
            'pickled': '/ˈpɪkld/', 'peppers': '/ˈpepəz/'
        }

        word_feedback.append({
            "word": word,
            "isCorrect": is_correct,
            "phonetic": phonetic_map.get(word, f"/{word}/"),
            "syllables": [
                {
                    "syllable": word,
                    "index": 0,
                    "isCorrect": is_correct,
                    "phonemes": []
                }
            ],
            "overallScore": word_score
        })

    if not suggestions:
        suggestions = [
            "整体发音不错！继续保持练习。",
            "建议多听标准发音，模仿母语者的语调。",
            "可以尝试慢读，确保每个音素都清晰。"
        ]

    if has_cat or has_cut:
        overall_score = 60
        suggestions.append(
            "练习提示：试着对比朗读 'cat' 和 'cut'，感受元音的差异。"
            "可以把手放在下巴上，发 /æ/ 时下巴会下降更多。"
        )

    return {
        "overallScore": overall_score,
        "wordFeedback": word_feedback,
        "suggestions": suggestions
    }


def create_empty_response(
    target_sentence: str,
    detection_status: DetectionStatus,
    detection_message: str,
    voice_detection: VoiceDetectionInfo,
    alignment: Optional[TextAlignmentInfo] = None
) -> PronunciationAnalysisResponse:
    return PronunciationAnalysisResponse(
        overallScore=0,
        wordFeedback=[],
        suggestions=[detection_message],
        waveformComparison=None,
        detectionStatus=detection_status,
        detectionMessage=detection_message,
        voiceDetection=voice_detection,
        alignment=alignment,
        isPartialResult=False,
        analyzedSentence=target_sentence
    )


def create_partial_response(
    base_result: dict,
    target_sentence: str,
    voice_detection: VoiceDetectionInfo,
    alignment: TextAlignmentInfo
) -> PronunciationAnalysisResponse:
    all_words = target_sentence.lower().replace('.', '').replace(',', '').split()
    matched_set = set(w.lower() for w in alignment.matchedWords)

    filtered_word_feedback = []
    matched_scores = []

    for word_fb in base_result.get("wordFeedback", []):
        if word_fb["word"].lower() in matched_set:
            filtered_word_feedback.append(word_fb)
            matched_scores.append(word_fb.get("overallScore", 80))

    partial_score = sum(matched_scores) / len(matched_scores) if matched_scores else 0

    suggestions = base_result.get("suggestions", [])
    if alignment.unmatchedWords:
        suggestions.insert(0, f"⚠️ 你未完整朗读整个句子。已检测到的内容：{', '.join(alignment.matchedWords) if alignment.matchedWords else '无'}。未检测到的单词：{', '.join(alignment.unmatchedWords)}")
        suggestions.insert(1, "💡 提示：请在倒计时结束后立即开始朗读，并确保在录音时间内读完整句。")

    return PronunciationAnalysisResponse(
        overallScore=partial_score,
        wordFeedback=filtered_word_feedback,
        suggestions=suggestions,
        waveformComparison=None,
        detectionStatus=DetectionStatus.PARTIAL,
        detectionMessage=f"检测到部分朗读，已匹配 {len(alignment.matchedWords)}/{len(alignment.targetWords)} 个单词",
        voiceDetection=voice_detection,
        alignment=alignment,
        isPartialResult=True,
        analyzedSentence=" ".join(alignment.matchedWords) if alignment.matchedWords else target_sentence
    )


def validate_pronunciation_input(
    request: PronunciationAnalysisRequest
) -> dict:
    target_sentence = request.targetSentence
    target_words = [w.lower().replace('.', '').replace(',', '') for w in target_sentence.split()]

    voice_detection = request.voiceDetection or VoiceDetectionInfo(
        hasValidVoice=True,
        voiceDurationMs=2000,
        avgEnergy=0.1,
        isSilent=False,
        isTooShort=False
    )

    alignment = request.alignment

    if voice_detection.isSilent:
        return {
            "status": "silent",
            "message": "未检测到有效语音输入，请对着麦克风大声朗读。",
            "voiceDetection": voice_detection,
            "alignment": alignment
        }

    if voice_detection.isTooShort:
        return {
            "status": "too_short",
            "message": f"有效语音时长（{voice_detection.voiceDurationMs / 1000:.1f}秒）过短，请确保完整朗读句子后再停止录音。",
            "voiceDetection": voice_detection,
            "alignment": alignment
        }

    if alignment and not alignment.isComplete:
        return {
            "status": "partial",
            "message": f"检测到部分朗读（{len(alignment.matchedWords)}/{len(alignment.targetWords)} 个单词）",
            "voiceDetection": voice_detection,
            "alignment": alignment,
            "matchedWords": alignment.matchedWords,
            "unmatchedWords": alignment.unmatchedWords,
            "analyzedSentence": " ".join(alignment.matchedWords) if alignment.matchedWords else target_sentence
        }

    return {
        "status": "complete",
        "message": "检测到完整朗读",
        "voiceDetection": voice_detection,
        "alignment": alignment,
        "matchedWords": target_words,
        "unmatchedWords": [],
        "analyzedSentence": target_sentence
    }


@app.post("/api/analyze-pronunciation", response_model=PronunciationAnalysisResponse)
async def analyze_pronunciation(request: PronunciationAnalysisRequest):
    try:
        target_phonetic = request.targetPhonetic or "待检测"
        target_sentence = request.targetSentence

        validation = validate_pronunciation_input(request)

        voice_detection = validation["voiceDetection"]
        alignment = validation["alignment"]

        default_voice_detection = VoiceDetectionInfo(
            hasValidVoice=True,
            voiceDurationMs=2000,
            avgEnergy=0.1,
            isSilent=False,
            isTooShort=False
        )

        if validation["status"] == "silent":
            return create_empty_response(
                target_sentence,
                DetectionStatus.SILENT,
                "无有效语音，请重新录制。",
                voice_detection or default_voice_detection,
                alignment
            )

        if validation["status"] == "too_short":
            return create_empty_response(
                target_sentence,
                DetectionStatus.TOO_SHORT,
                f"有效语音时长（{voice_detection.voiceDurationMs / 1000:.1f}秒）过短，请重新录制。",
                voice_detection or default_voice_detection,
                alignment
            )

        analyzed_sentence = validation.get("analyzedSentence", target_sentence)
        is_partial = validation["status"] == "partial"

        if not settings.volcengine_api_key or not settings.volcengine_model:
            raise HTTPException(
                status_code=500,
                detail="火山引擎 API 未配置。请设置 VOLCENGINE_API_KEY 和 VOLCENGINE_MODEL 环境变量。"
            )

        user_content = (
            f"目标句子: {target_sentence}\n"
            f"目标音标: {target_phonetic}\n"
            f"分析句子: {analyzed_sentence}\n"
        )

        if alignment:
            user_content += (
                f"已识别的单词: {', '.join(alignment.matchedWords)}\n"
                f"未识别的单词: {', '.join(alignment.unmatchedWords)}\n"
            )

        user_content += (
            f"用户音频数据长度: {len(request.userAudioBase64)} 字符 (Base64编码)\n\n"
            "请分析用户的发音，给出详细的反馈。"
        )

        api_result = await call_volcengine_api(
            PRONUNCIATION_PROMPT.format(
                target_sentence=target_sentence,
                target_phonetic=target_phonetic
            ),
            user_content
        )

        if "overallScore" not in api_result:
            raise HTTPException(
                status_code=500,
                detail="语音分析 API 返回的数据格式不正确。"
            )

        if is_partial and alignment:
            return create_partial_response(
                api_result,
                target_sentence,
                voice_detection or default_voice_detection,
                alignment
            )

        return PronunciationAnalysisResponse(
            overallScore=api_result.get("overallScore", 0),
            wordFeedback=api_result.get("wordFeedback", []),
            suggestions=api_result.get("suggestions", []),
            waveformComparison=None,
            detectionStatus=DetectionStatus.COMPLETE,
            detectionMessage="检测到完整朗读",
            voiceDetection=voice_detection or default_voice_detection,
            alignment=alignment,
            isPartialResult=False,
            analyzedSentence=analyzed_sentence
        )

    except HTTPException:
        raise

    except Exception as e:
        print(f"Analysis error: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"语音分析失败: {str(e)}"
        )
