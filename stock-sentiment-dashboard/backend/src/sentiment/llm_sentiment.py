from typing import List, Dict
import os
from dotenv import load_dotenv

load_dotenv()


class VolcengineSentiment:
    """
    新闻情绪分析器
    优先使用本地关键词规则进行高效分析
    可选配置火山引擎 API 进行 LLM 深度分析
    """
    
    def __init__(self):
        self.api_key = os.getenv('ARK_API_KEY')
        # 只有真实有效的 API Key 才启用 LLM 模式
        self.use_llm = bool(self.api_key) and self.api_key not in [
            'your_ark_api_key_here',
            '',
            ' ',
            None
        ]
        self.endpoint = "https://ark.cn-beijing.volces.com/api/v3/chat/completions"
        self.model = "ep-20240101000000-xxxxx"
        
        # 情绪关键词词典
        self.positive_keywords = [
            '增长', '上涨', '新高', '利好', '盈利', '突破', '战略合作', '升级',
            '增长', '超预期', '增持', '看好', '稳健', '亮眼', '亮眼',
            '增长', '突破', '创新高', '创历史'
        ]
        
        self.negative_keywords = [
            '下跌', '亏损', '利空', '下滑', '风险', '警告', '处罚', '调查',
            '下跌', '暴跌', '亏损', '违约', '退市', '风险', '预警'
        ]
        
        if self.use_llm:
            print(f"🤖 情绪分析模式: 火山引擎 LLM")
        else:
            print(f"📝 情绪分析模式: 本地关键词规则（可配置 ARK_API_KEY 启用 LLM）")
    
    def analyze_sentiment(self, title: str, summary: str = "") -> Dict:
        """分析新闻情绪"""
        if self.use_llm:
            return self._llm_analysis(title, summary)
        return self._rule_analysis(title, summary)
    
    def _rule_analysis(self, title: str, summary: str) -> Dict:
        """基于关键词规则的情绪分析"""
        full_text = title + summary
        
        positive_count = sum(1 for kw in self.positive_keywords if kw in full_text)
        negative_count = sum(1 for kw in self.negative_keywords if kw in full_text)
        
        # 结合新闻标签进行判断
        if '利好' in title or '利好' in summary:
            positive_count += 3
        if '利空' in title or '利空' in summary:
            negative_count += 3
        
        if positive_count > negative_count:
            sentiment = "利好"
            score = 0.6 + min(positive_count * 0.1, 0.4)
        elif negative_count > positive_count:
            sentiment = "利空"
            score = -0.6 - min(negative_count * 0.1, 0.4)
        else:
            sentiment = "中性"
            score = 0.0
        
        return {
            "title": title,
            "sentiment": sentiment,
            "score": round(score, 2)
        }
    
    def _llm_analysis(self, title: str, summary: str = "") -> Dict:
        """基于 LLM 的情绪分析"""
        try:
            import requests
            
            prompt = f"""
            请分析以下股票新闻的情绪倾向，只回答"利好"、"利空"或"中性"。
            
            新闻标题：{title}
            新闻摘要：{summary}
            
            请直接给出判断结果，不要解释。
            """
            
            headers = {
                "Content-Type": "application/json",
                "Authorization": f"Bearer {self.api_key}"
            }
            
            data = {
                "model": "doubao-pro-32k",
                "messages": [
                    {"role": "user", "content": prompt}
                ],
                "temperature": 0.1,
                "max_tokens": 10
            }
            
            response = requests.post(self.endpoint, headers=headers, json=data, timeout=10)
            response.raise_for_status()
            
            result = response.json()
            sentiment = result['choices'][0]['message']['content'].strip()
            
            if "利好" in sentiment:
                sentiment_label = "利好"
                score = 0.8
            elif "利空" in sentiment:
                sentiment_label = "利空"
                score = -0.8
            else:
                sentiment_label = "中性"
                score = 0.0
            
            return {
                "title": title,
                "sentiment": sentiment_label,
                "score": score
            }
            
        except Exception:
            # LLM 调用失败时降级到规则分析
            return self._rule_analysis(title, summary)
    
    def batch_analyze(self, news_list: List[Dict]) -> List[Dict]:
        """批量分析新闻情绪"""
        results = []
        for news in news_list:
            sentiment_result = self.analyze_sentiment(
                news.get('title', ''),
                news.get('summary', '')
            )
            news_with_sentiment = {**news, **sentiment_result}
            results.append(news_with_sentiment)
        
        return results
    
    def get_sentiment_stats(self, news_with_sentiment: List[Dict]) -> Dict:
        """获取情绪统计数据"""
        total = len(news_with_sentiment)
        positive = sum(1 for n in news_with_sentiment if n.get('sentiment') == '利好')
        negative = sum(1 for n in news_with_sentiment if n.get('sentiment') == '利空')
        neutral = sum(1 for n in news_with_sentiment if n.get('sentiment') == '中性')
        
        avg_score = 0
        if total > 0:
            scores = [n.get('score', 0) for n in news_with_sentiment]
            avg_score = sum(scores) / total
        
        return {
            'total': total,
            'positive': positive,
            'negative': negative,
            'neutral': neutral,
            'positive_ratio': round(positive / total if total > 0 else 0, 2),
            'negative_ratio': round(negative / total if total > 0 else 0, 2),
            'avg_score': round(avg_score, 2)
        }


if __name__ == '__main__':
    analyzer = VolcengineSentiment()
    test_news = [
        {'title': '茅台集团业绩大增', 'summary': '营收创历史新高'},
        {'title': '白酒板块集体下跌', 'summary': '多家机构下调评级'},
        {'title': '茅台召开股东大会', 'summary': '审议多项议案'}
    ]
    results = analyzer.batch_analyze(test_news)
    for r in results:
        print(f"{r['title']} - {r['sentiment']} (score: {r['score']})")
