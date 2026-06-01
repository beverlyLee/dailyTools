import os
from typing import Dict, List, Tuple
from snownlp import SnowNLP
import requests
import json
from dotenv import load_dotenv


load_dotenv()


class SentimentAnalyzer:
    def __init__(self):
        self.ark_api_key = os.getenv("ARK_API_KEY", "")
        self.api_url = "https://ark.cn-beijing.volces.com/api/v3/chat/completions"

    def analyze_snownlp(self, text: str) -> Dict:
        s = SnowNLP(text)
        sentiment_score = s.sentiments
        
        if sentiment_score >= 0.6:
            sentiment = "positive"
            sentiment_label = "积极"
        elif sentiment_score <= 0.4:
            sentiment = "negative"
            sentiment_label = "消极"
        else:
            sentiment = "neutral"
            sentiment_label = "中性"
        
        return {
            "score": sentiment_score,
            "sentiment": sentiment,
            "sentiment_label": sentiment_label,
            "keywords": s.keywords(5),
            "summary": s.summary(3)
        }

    def analyze_volcengine(self, text: str) -> Dict:
        if not self.ark_api_key:
            return {
                "error": "未配置 ARK_API_KEY",
                "emotions": {}
            }

        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {self.ark_api_key}"
        }

        prompt = f"""
        请分析以下评论的情感倾向，返回JSON格式，包含以下维度：
        - 总体情感: positive/negative/neutral (三选一)
        - 情感标签: 如"满意"、"愤怒"、"失望"、"惊喜"等
        - 各情绪维度得分(0-1): 喜悦、愤怒、悲伤、惊讶、恐惧、厌恶
        - 置信度: 0-1之间的数值
        
        评论文本: {text}
        
        返回格式示例:
        {{
            "overall_sentiment": "positive",
            "sentiment_label": "满意",
            "emotions": {{
                "joy": 0.85,
                "anger": 0.0,
                "sadness": 0.0,
                "surprise": 0.2,
                "fear": 0.0,
                "disgust": 0.0
            }},
            "confidence": 0.92
        }}
        """

        payload = {
            "model": "ep-20250516000000-xxxxx",
            "messages": [{"role": "user", "content": prompt}]
        }

        try:
            response = requests.post(
                self.api_url,
                headers=headers,
                json=payload,
                timeout=10
            )
            
            if response.status_code == 200:
                result = response.json()
                content = result["choices"][0]["message"]["content"]
                return json.loads(content)
            else:
                return {
                    "error": f"API 调用失败: {response.status_code}",
                    "emotions": {}
                }
        except Exception as e:
            return {
                "error": f"请求异常: {str(e)}",
                "emotions": {}
            }

    def analyze(self, text: str, use_volcengine: bool = False) -> Dict:
        snownlp_result = self.analyze_snownlp(text)
        
        result = {
            "text": text,
            "snownlp": snownlp_result
        }

        if use_volcengine:
            volc_result = self.analyze_volcengine(text)
            result["volcengine"] = volc_result
            
            if "error" not in volc_result:
                result["final_sentiment"] = volc_result.get("overall_sentiment", snownlp_result["sentiment"])
                result["final_label"] = volc_result.get("sentiment_label", snownlp_result["sentiment_label"])
            else:
                result["final_sentiment"] = snownlp_result["sentiment"]
                result["final_label"] = snownlp_result["sentiment_label"]
        else:
            result["final_sentiment"] = snownlp_result["sentiment"]
            result["final_label"] = snownlp_result["sentiment_label"]

        return result

    def batch_analyze(self, texts: List[str], use_volcengine: bool = False) -> List[Dict]:
        results = []
        for text in texts:
            results.append(self.analyze(text, use_volcengine))
        return results

    def get_sentiment_stats(self, results: List[Dict]) -> Dict:
        total = len(results)
        positive = sum(1 for r in results if r["final_sentiment"] == "positive")
        negative = sum(1 for r in results if r["final_sentiment"] == "negative")
        neutral = sum(1 for r in results if r["final_sentiment"] == "neutral")
        
        return {
            "total": total,
            "positive": positive,
            "negative": negative,
            "neutral": neutral,
            "positive_ratio": positive / total if total > 0 else 0,
            "negative_ratio": negative / total if total > 0 else 0,
            "neutral_ratio": neutral / total if total > 0 else 0
        }
