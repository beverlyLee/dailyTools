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
    '突破', '强劲', '优秀', '出色', '亮眼', '业绩大增',
    '营收增长', '净利润增长', '市场份额提升', '政策支持', '资金流入',
    '主力加仓', '涨停', '大涨', '飙升', '暴涨', '看好', '推荐',
    '买入', '增持', '长期持有', '价值投资', '低估', '安全边际'
}

negative_words = {
    '利空', '下跌', '亏损', '不及预期', '创新低', '暴跌', '大跌',
    '疲软', '下滑', '恶化', '危机', '风险', '警示', '警告',
    '业绩下滑', '营收下降', '净利润亏损', '政策收紧', '资金流出',
    '主力减仓', '跌停', '看空', '卖出', '减持',
    '清仓', '高估', '泡沫', '风险警示', '退市风险', '财务造假'
}

negation_words = {'不', '没', '无', '未', '非', '否', '别', '莫', '休'}

degree_words = {
    '非常': 1.5, '极其': 2.0, '特别': 1.5, '相当': 1.2,
    '很': 1.3, '太': 1.5, '最': 2.0, '更': 1.3, '较': 0.8,
    '略': 0.6, '稍微': 0.5, '有点': 0.5
}

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

def batch_analyze(texts):
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
