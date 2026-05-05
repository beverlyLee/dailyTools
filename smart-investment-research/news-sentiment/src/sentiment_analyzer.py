import jieba
import re
from datetime import datetime
from .config import config
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

try:
    from snownlp import SnowNLP
    HAS_SNOWNLP = True
    logger.info("SnowNLP loaded successfully")
except ImportError:
    HAS_SNOWNLP = False
    logger.warning("SnowNLP not installed, will use rule-based analysis only")

positive_words = {
    '利好', '上涨', '增长', '盈利', '利好消息', '超预期', '创新高',
    '突破', '强劲', '优秀', '出色', '亮眼', '业绩大增',
    '营收增长', '净利润增长', '市场份额提升', '政策支持', '资金流入',
    '主力加仓', '涨停', '大涨', '飙升', '暴涨', '看好', '推荐',
    '买入', '增持', '长期持有', '价值投资', '低估', '安全边际',
    '高增长', '高景气', '景气度', '复苏', '回暖', '反弹', '反转',
    '牛市', '行情', '机会', '潜力', '优质', '龙头', '领先',
    '优势', '核心竞争力', '护城河', '成长性', '确定性', '稳定性'
}

negative_words = {
    '利空', '下跌', '亏损', '不及预期', '创新低', '暴跌', '大跌',
    '疲软', '下滑', '恶化', '危机', '风险', '警示', '警告',
    '业绩下滑', '营收下降', '净利润亏损', '政策收紧', '资金流出',
    '主力减仓', '跌停', '看空', '卖出', '减持',
    '清仓', '高估', '泡沫', '风险警示', '退市风险', '财务造假',
    '违规', '处罚', '调查', '诉讼', '违约', '债务', '现金流紧张',
    '毛利率下降', '净利率下降', 'ROE下降', '市场份额下降',
    '竞争加剧', '价格战', '需求疲软', '产能过剩', '库存高企',
    '熊市', '调整', '下跌通道', '承压', '压力', '挑战', '困难',
    '不确定性', '黑天鹅', '灰犀牛', '系统性风险', '流动性风险'
}

negation_words = {'不', '没', '无', '未', '非', '否', '别', '莫', '休', '并非'}

degree_words = {
    '非常': 1.5, '极其': 2.0, '特别': 1.5, '相当': 1.2,
    '很': 1.3, '太': 1.5, '最': 2.0, '更': 1.3, '较': 0.8,
    '略': 0.6, '稍微': 0.5, '有点': 0.5, '比较': 1.0,
    '大幅': 1.8, '明显': 1.3, '显著': 1.5, '剧烈': 2.0,
    '轻微': 0.6, '小幅': 0.7, '适度': 0.9
}

stock_keywords = {
    'A股', 'B股', 'H股', '港股', '美股', '大盘', '小盘',
    '创业板', '科创板', '主板', '中小板', '新三板',
    '上证指数', '深证成指', '创业板指', '沪深300', '上证50',
    '个股', '板块', '概念股', '题材股', '蓝筹股', '白马股',
    '龙头股', '妖股', '次新股', '解禁股', '限售股'
}

class SentimentAnalyzer:
    def __init__(self):
        self.config = config.SENTIMENT_CONFIG
        self._init_jieba()
    
    def _init_jieba(self):
        """
        初始化jieba分词，添加自定义词典
        """
        for word in positive_words:
            jieba.add_word(word)
        for word in negative_words:
            jieba.add_word(word)
        for word in stock_keywords:
            jieba.add_word(word)
        
        logger.info("Jieba initialized with custom financial vocabulary")
    
    def analyze(self, text):
        """
        分析文本情感
        """
        if not text or not text.strip():
            return {
                'sentiment': 'neutral',
                'score': 0.5,
                'confidence': 0.0,
                'keywords': [],
                'analysis_time': datetime.now().isoformat()
            }
        
        scores = []
        
        if self.config.get('use_snownlp', True) and HAS_SNOWNLP:
            snownlp_score = self._analyze_with_snownlp(text)
            scores.append(('snownlp', snownlp_score, 0.4))
        
        if self.config.get('use_rule_based', True):
            rule_score, keywords = self._analyze_with_rules(text)
            scores.append(('rule', rule_score, 0.6))
        
        final_score = self._weighted_average(scores)
        
        sentiment = self._classify_sentiment(final_score)
        
        confidence = self._calculate_confidence(text, final_score, keywords)
        
        return {
            'sentiment': sentiment,
            'score': round(final_score, 4),
            'confidence': round(confidence, 4),
            'keywords': keywords,
            'analysis_time': datetime.now().isoformat()
        }
    
    def _analyze_with_snownlp(self, text):
        """
        使用SnowNLP进行情感分析
        """
        try:
            s = SnowNLP(text)
            return s.sentiments
        except Exception as e:
            logger.error(f"SnowNLP analysis error: {str(e)}")
            return 0.5
    
    def _analyze_with_rules(self, text):
        """
        基于规则的情感分析
        """
        words = jieba.lcut(text)
        
        positive_count = 0.0
        negative_count = 0.0
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
        
        for word_phrase in self._find_word_phrases(text):
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
    
    def _find_word_phrases(self, text):
        """
        查找文本中的词组
        """
        phrases = []
        
        for word in positive_words.union(negative_words):
            if len(word) >= 2 and word in text:
                phrases.append(word)
        
        return phrases
    
    def _weighted_average(self, scores):
        """
        计算加权平均
        """
        if not scores:
            return 0.5
        
        total_weight = sum(weight for _, _, weight in scores)
        if total_weight == 0:
            return 0.5
        
        weighted_sum = sum(score * weight for _, score, weight in scores)
        return weighted_sum / total_weight
    
    def _classify_sentiment(self, score):
        """
        根据分数分类情感
        """
        positive_threshold = self.config.get('positive_threshold', 0.6)
        negative_threshold = self.config.get('negative_threshold', 0.4)
        
        if score > positive_threshold:
            return 'positive'
        elif score < negative_threshold:
            return 'negative'
        else:
            return 'neutral'
    
    def _calculate_confidence(self, text, score, keywords):
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
    
    def batch_analyze(self, texts):
        """
        批量情感分析
        """
        results = []
        for text in texts:
            result = self.analyze(text)
            results.append({
                'text': text,
                **result
            })
        
        return results
    
    def extract_stock_keywords(self, text):
        """
        提取文本中的股票相关关键词
        """
        found_keywords = []
        
        for keyword in stock_keywords:
            if keyword in text:
                found_keywords.append(keyword)
        
        stock_code_pattern = r'\b[036]\d{5}\b'
        stock_codes = re.findall(stock_code_pattern, text)
        found_keywords.extend(stock_codes)
        
        return list(set(found_keywords))

analyzer = SentimentAnalyzer()
