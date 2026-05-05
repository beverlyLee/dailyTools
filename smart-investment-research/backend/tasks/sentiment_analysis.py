from celery_app import celery
import jieba
import re
from datetime import datetime
from config import config

try:
    from snownlp import SnowNLP
    HAS_SNOWNLP = True
except ImportError:
    HAS_SNOWNLP = False

positive_words = {
    '利好', '上涨', '增长', '盈利', '利好消息', '超预期', '创新高',
    '突破', '强劲', '优秀', '出色', '亮眼', '超预期', '业绩大增',
    '营收增长', '净利润增长', '市场份额提升', '政策支持', '资金流入',
    '主力加仓', '涨停', '大涨', '飙升', '暴涨', '看好', '推荐',
    '买入', '增持', '长期持有', '价值投资', '低估', '安全边际'
}

negative_words = {
    '利空', '下跌', '亏损', '不及预期', '创新低', '暴跌', '大跌',
    '疲软', '下滑', '恶化', '危机', '风险', '警示', '警告',
    '业绩下滑', '营收下降', '净利润亏损', '政策收紧', '资金流出',
    '主力减仓', '跌停', '大跌', '暴跌', '看空', '卖出', '减持',
    '清仓', '高估', '泡沫', '风险警示', '退市风险', '财务造假'
}

negation_words = {'不', '没', '无', '未', '非', '否', '别', '莫', '休'}

degree_words = {
    '非常': 1.5, '极其': 2.0, '特别': 1.5, '相当': 1.2,
    '很': 1.3, '太': 1.5, '最': 2.0, '更': 1.3, '较': 0.8,
    '略': 0.6, '稍微': 0.5, '有点': 0.5
}

@celery.task(bind=True, name='tasks.sentiment_analysis.analyze_sentiment_task')
def analyze_sentiment_task(self, text):
    """
    情感分析Celery任务
    """
    return analyze_sentiment(text)

def analyze_sentiment(text):
    """
    分析文本情感
    """
    if not text or not text.strip():
        return {
            'sentiment': 'neutral',
            'score': 0.5,
            'confidence': 0.0,
            'keywords': []
        }
    
    if HAS_SNOWNLP:
        try:
            s = SnowNLP(text)
            snownlp_score = s.sentiments
        except:
            snownlp_score = 0.5
    else:
        snownlp_score = 0.5
    
    rule_score, keywords = rule_based_analysis(text)
    
    final_score = (snownlp_score * 0.4 + rule_score * 0.6)
    
    if final_score > config.SENTIMENT_THRESHOLD['positive']:
        sentiment = 'positive'
    elif final_score < config.SENTIMENT_THRESHOLD['negative']:
        sentiment = 'negative'
    else:
        sentiment = 'neutral'
    
    confidence = calculate_confidence(text, final_score, keywords)
    
    return {
        'sentiment': sentiment,
        'score': round(final_score, 4),
        'confidence': round(confidence, 4),
        'keywords': keywords,
        'analysis_time': datetime.now().isoformat()
    }

def rule_based_analysis(text):
    """
    基于规则的情感分析
    """
    words = jieba.lcut(text)
    
    positive_count = 0
    negative_count = 0
    found_keywords = []
    
    i = 0
    while i < len(words):
        word = words[i]
        
        if word in negation_words and i + 1 < len(words):
            next_word = words[i + 1]
            if next_word in positive_words:
                negative_count += 1
                found_keywords.append(f'非{next_word}')
                i += 2
                continue
            elif next_word in negative_words:
                positive_count += 1
                found_keywords.append(f'非{next_word}')
                i += 2
                continue
        
        degree = 1.0
        if word in degree_words and i + 1 < len(words):
            degree = degree_words[word]
            next_word = words[i + 1]
            if next_word in positive_words:
                positive_count += degree
                found_keywords.append(next_word)
                i += 2
                continue
            elif next_word in negative_words:
                negative_count += degree
                found_keywords.append(next_word)
                i += 2
                continue
        
        if word in positive_words:
            positive_count += 1
            found_keywords.append(word)
        elif word in negative_words:
            negative_count += 1
            found_keywords.append(word)
        
        i += 1
    
    for word_phrase in find_word_phrases(text):
        if word_phrase in positive_words and word_phrase not in found_keywords:
            positive_count += 1.5
            found_keywords.append(word_phrase)
        elif word_phrase in negative_words and word_phrase not in found_keywords:
            negative_count += 1.5
            found_keywords.append(word_phrase)
    
    total = positive_count + negative_count
    if total == 0:
        score = 0.5
    else:
        score = positive_count / total
    
    found_keywords = list(set(found_keywords))
    
    return score, found_keywords

def find_word_phrases(text):
    """
    查找文本中的词组
    """
    phrases = []
    
    for word in positive_words.union(negative_words):
        if len(word) >= 2 and word in text:
            phrases.append(word)
    
    return phrases

def calculate_confidence(text, score, keywords):
    """
    计算情感分析置信度
    """
    if not keywords:
        return 0.3
    
    text_length = len(text)
    
    keyword_factor = min(len(keywords) * 0.1, 0.5)
    
    length_factor = min(text_length / 100, 0.3)
    
    sentiment_strength = abs(score - 0.5) * 2
    
    confidence = keyword_factor + length_factor + sentiment_strength * 0.2
    confidence = min(confidence, 1.0)
    
    return confidence

@celery.task(bind=True, name='tasks.sentiment_analysis.batch_analyze')
def batch_analyze(self, texts):
    """
    批量情感分析
    """
    results = []
    for text in texts:
        result = analyze_sentiment(text)
        results.append({
            'text': text,
            **result
        })
    
    return results

@celery.task(bind=True, name='tasks.sentiment_analysis.calculate_hot_topics')
def calculate_hot_topics(self, news_items, top_n=10):
    """
    计算热门话题
    """
    from collections import Counter
    
    all_keywords = []
    sentiment_by_topic = {}
    
    for news in news_items:
        keywords = news.get('keywords', [])
        sentiment = news.get('sentiment', 'neutral')
        score = news.get('score', 0.5)
        
        for keyword in keywords:
            all_keywords.append(keyword)
            
            if keyword not in sentiment_by_topic:
                sentiment_by_topic[keyword] = {
                    'positive': 0,
                    'negative': 0,
                    'neutral': 0,
                    'total_score': 0,
                    'count': 0
                }
            
            sentiment_by_topic[keyword][sentiment] += 1
            sentiment_by_topic[keyword]['total_score'] += score
            sentiment_by_topic[keyword]['count'] += 1
    
    keyword_counter = Counter(all_keywords)
    top_keywords = keyword_counter.most_common(top_n)
    
    hot_topics = []
    for keyword, mentions in top_keywords:
        topic_data = sentiment_by_topic.get(keyword, {})
        count = topic_data.get('count', 1)
        avg_score = topic_data.get('total_score', 0) / count if count > 0 else 0.5
        
        if avg_score > config.SENTIMENT_THRESHOLD['positive']:
            overall_sentiment = 'positive'
        elif avg_score < config.SENTIMENT_THRESHOLD['negative']:
            overall_sentiment = 'negative'
        else:
            overall_sentiment = 'neutral'
        
        heat = min(mentions * 5 + avg_score * 50, 100)
        
        hot_topics.append({
            'topic': keyword,
            'mentions': mentions,
            'sentiment': overall_sentiment,
            'avg_score': round(avg_score, 4),
            'heat': round(heat, 1),
            'breakdown': {
                'positive': topic_data.get('positive', 0),
                'negative': topic_data.get('negative', 0),
                'neutral': topic_data.get('neutral', 0)
            }
        })
    
    return hot_topics
