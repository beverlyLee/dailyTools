import os
import re
import jieba
from typing import List, Tuple, Optional, Dict, Any
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.naive_bayes import MultinomialNB
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import LabelEncoder
import joblib
from pathlib import Path
import numpy as np

from ..config import settings


class TextPreprocessor:
    STOP_WORDS = {
        '的', '了', '是', '在', '有', '和', '就', '不', '人', '都',
        '一', '一个', '上', '也', '很', '到', '说', '要', '去', '你',
        '会', '着', '没有', '看', '好', '自己', '这', '那', '他', '她',
        '它', '们', '这个', '那个', '什么', '怎么', '为什么', '哪', '谁',
        '交易', '支付', '收款', '付款', '转账', '提现', '充值', '消费',
        '收入', '支出', '金额', '元', '角', '分', '号', '店', '市', '省',
        '备注', '说明', '交易号', '订单号', '商户', '商家', '对方', '账号',
        '方式', '状态', '时间', '日期', '当前', '来自',
    }

    @classmethod
    def preprocess(cls, text: str) -> str:
        if not text:
            return ""
        
        text = str(text).lower()
        
        text = re.sub(r'[a-zA-Z0-9]{8,}', ' ', text)
        text = re.sub(r'https?://\S+|www\.\S+', ' ', text)
        text = re.sub(r'\d+', ' ', text)
        text = re.sub(r'[^\u4e00-\u9fff\s]', ' ', text)
        
        words = jieba.lcut(text)
        words = [w for w in words if w.strip() and w not in cls.STOP_WORDS]
        
        return ' '.join(words)


class CategoryClassifier:
    CATEGORIES = [
        '餐饮', '购物', '交通', '娱乐', 
        '居住', '医疗', '教育', '其他'
    ]

    TRAINING_DATA: List[Tuple[str, str]] = [
        ('餐饮美食', '餐饮'),
        ('餐厅', '餐饮'),
        ('外卖', '餐饮'),
        ('美团外卖', '餐饮'),
        ('饿了么', '餐饮'),
        ('肯德基', '餐饮'),
        ('麦当劳', '餐饮'),
        ('星巴克咖啡', '餐饮'),
        ('奶茶店', '餐饮'),
        ('咖啡店', '餐饮'),
        ('便利店', '餐饮'),
        ('超市', '购物'),
        ('商场', '购物'),
        ('淘宝购物', '购物'),
        ('天猫商城', '购物'),
        ('京东', '购物'),
        ('拼多多', '购物'),
        ('网购', '购物'),
        ('服饰', '购物'),
        ('化妆品', '购物'),
        ('滴滴出行', '交通'),
        ('滴滴打车', '交通'),
        ('出租车', '交通'),
        ('地铁', '交通'),
        ('公交', '交通'),
        ('共享单车', '交通'),
        ('火车', '交通'),
        ('机票', '交通'),
        ('加油', '交通'),
        ('停车', '交通'),
        ('电影', '娱乐'),
        ('游戏充值', '娱乐'),
        ('KTV', '娱乐'),
        ('酒吧', '娱乐'),
        ('旅游', '娱乐'),
        ('酒店', '娱乐'),
        ('住宿', '娱乐'),
        ('房租', '居住'),
        ('水电费', '居住'),
        ('燃气费', '居住'),
        ('物业费', '居住'),
        ('医院', '医疗'),
        ('药店', '医疗'),
        ('药品', '医疗'),
        ('体检', '医疗'),
        ('教育培训', '教育'),
        ('课程', '教育'),
        ('图书', '教育'),
        ('书店', '教育'),
        ('微信转账', '其他'),
        ('支付宝转账', '其他'),
        ('红包', '其他'),
    ]

    def __init__(self, model_path: Optional[str] = None):
        self.model_path = model_path or Path(settings.MODEL_PATH)
        self.pipeline: Optional[Pipeline] = None
        self.label_encoder: Optional[LabelEncoder] = None
        self._is_trained = False

    def _build_pipeline(self) -> Pipeline:
        return Pipeline([
            ('tfidf', TfidfVectorizer(
                max_features=5000,
                ngram_range=(1, 2),
                min_df=1,
                max_df=0.9,
                sublinear_tf=True,
            )),
            ('classifier', MultinomialNB(alpha=0.1)),
        ])

    def train(self, training_data: Optional[List[Tuple[str, str]]] = None) -> 'CategoryClassifier':
        data = training_data or self.TRAINING_DATA
        
        texts = [TextPreprocessor.preprocess(text) for text, _ in data]
        labels = [label for _, label in data]
        
        self.label_encoder = LabelEncoder()
        encoded_labels = self.label_encoder.fit_transform(labels)
        
        self.pipeline = self._build_pipeline()
        self.pipeline.fit(texts, encoded_labels)
        
        self._is_trained = True
        return self

    def classify(self, text: str) -> Tuple[str, float]:
        if not self._is_trained or self.pipeline is None:
            self.train()
        
        processed_text = TextPreprocessor.preprocess(text)
        
        if not processed_text.strip():
            return ('其他', 0.5)
        
        prediction = self.pipeline.predict([processed_text])
        probabilities = self.pipeline.predict_proba([processed_text])
        
        category_idx = int(prediction[0])
        confidence = float(probabilities[0][category_idx])
        
        category = self.label_encoder.inverse_transform([category_idx])[0]
        
        if confidence < 0.3:
            category = self._rule_based_classify(text)
        
        return (category, confidence)

    def _rule_based_classify(self, text: str) -> str:
        text_lower = text.lower()
        
        rules = {
            '餐饮': ['餐厅', '饭店', '外卖', '美团', '饿了么', '肯德基', '麦当劳', 
                    '星巴克', '咖啡', '奶茶', '便利店', '超市', '餐饮', '美食'],
            '购物': ['购物', '商城', '淘宝', '天猫', '京东', '拼多多', '网购', 
                    '电商', '服饰', '化妆品'],
            '交通': ['交通', '出行', '滴滴', '打车', '出租车', '地铁', '公交', 
                    '共享单车', '火车', '机票', '加油', '停车', '高铁'],
            '娱乐': ['娱乐', '游戏', '电影', '演出', '旅游', '酒店', '住宿', 
                    'KTV', '酒吧'],
            '居住': ['居住', '房租', '水电', '燃气', '物业费', '家居', '装修'],
            '医疗': ['医疗', '医院', '药店', '药品', '体检', '挂号'],
            '教育': ['教育', '培训', '课程', '图书', '书店', '学费'],
        }
        
        for category, keywords in rules.items():
            for keyword in keywords:
                if keyword in text_lower:
                    return category
        
        return '其他'

    def classify_batch(self, texts: List[str]) -> List[Tuple[str, float]]:
        return [self.classify(text) for text in texts]

    def save(self, path: Optional[str] = None) -> None:
        save_path = Path(path or self.model_path)
        save_path.mkdir(parents=True, exist_ok=True)
        
        if self.pipeline and self.label_encoder:
            joblib.dump(self.pipeline, save_path / 'classifier_pipeline.pkl')
            joblib.dump(self.label_encoder, save_path / 'label_encoder.pkl')

    def load(self, path: Optional[str] = None) -> bool:
        load_path = Path(path or self.model_path)
        
        pipeline_path = load_path / 'classifier_pipeline.pkl'
        encoder_path = load_path / 'label_encoder.pkl'
        
        if pipeline_path.exists() and encoder_path.exists():
            self.pipeline = joblib.load(pipeline_path)
            self.label_encoder = joblib.load(encoder_path)
            self._is_trained = True
            return True
        
        return False


classifier_instance: Optional[CategoryClassifier] = None


def get_classifier() -> CategoryClassifier:
    global classifier_instance
    
    if classifier_instance is None:
        classifier_instance = CategoryClassifier()
        if not classifier_instance.load():
            classifier_instance.train()
    
    return classifier_instance


def classify_text(text: str) -> Tuple[str, float]:
    classifier = get_classifier()
    return classifier.classify(text)


def classify_texts(texts: List[str]) -> List[Tuple[str, float]]:
    classifier = get_classifier()
    return classifier.classify_batch(texts)
