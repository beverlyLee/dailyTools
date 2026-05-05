import jieba
import re
from typing import List, Dict, Any, Optional, Tuple
from abc import ABC, abstractmethod


class BaseNLPService(ABC):
    
    @abstractmethod
    def segment(self, text: str) -> List[str]:
        pass
    
    @abstractmethod
    def pos_tag(self, text: str) -> List[Tuple[str, str]]:
        pass
    
    @abstractmethod
    def dependency_parse(self, text: str) -> List[Dict[str, Any]]:
        pass
    
    @abstractmethod
    def sentence_split(self, text: str) -> List[str]:
        pass


class JiebaNLPService(BaseNLPService):
    
    def __init__(self):
        jieba.initialize()
    
    def segment(self, text: str) -> List[str]:
        return list(jieba.cut(text))
    
    def pos_tag(self, text: str) -> List[Tuple[str, str]]:
        return list(jieba.posseg.cut(text))
    
    def dependency_parse(self, text: str) -> List[Dict[str, Any]]:
        words = self.segment(text)
        pos_tags = self.pos_tag(text)
        
        results = []
        for i, (word, pos) in enumerate(pos_tags):
            results.append({
                "word": word,
                "pos": pos,
                "dep": "ROOT" if i == 0 else "DEP",
                "head": words[0] if i > 0 else word,
                "head_idx": 0 if i > 0 else i,
                "idx": i,
                "explanation": self._pos_explanation(pos)
            })
        return results
    
    def sentence_split(self, text: str) -> List[str]:
        sentences = re.split(r'([。！？.!?])', text)
        result = []
        for i in range(0, len(sentences) - 1, 2):
            if sentences[i]:
                result.append(sentences[i] + sentences[i + 1])
        if len(sentences) % 2 == 1 and sentences[-1]:
            result.append(sentences[-1])
        return result
    
    def _pos_explanation(self, pos: str) -> str:
        pos_map = {
            'n': '名词',
            'v': '动词',
            'a': '形容词',
            'ad': '副词',
            'p': '介词',
            'c': '连词',
            'u': '助词',
            'r': '代词',
            'm': '数词',
            'q': '量词',
            'd': '副词',
            'f': '方位词',
            't': '时间词',
            's': '处所词',
            'nr': '人名',
            'ns': '地名',
            'nt': '机构名',
            'nw': '作品名',
            'nz': '其他专名',
            'vd': '副动词',
            'vn': '名动词',
            'an': '名形词',
            'ag': '形容词性语素',
            'vg': '动词性语素',
            'ng': '名词性语素',
            'x': '非语素字',
            'w': '标点符号',
        }
        return pos_map.get(pos, f'未知词性({pos})')


class LtpNLPService(BaseNLPService):
    
    def __init__(self, model_path: Optional[str] = None):
        self.model_path = model_path
        self._ltp = None
        self._initialized = False
    
    def _initialize(self):
        if self._initialized:
            return
        try:
            from ltp import LTP
            if self.model_path:
                self._ltp = LTP(self.model_path)
            else:
                self._ltp = LTP()
            self._initialized = True
        except ImportError:
            raise ImportError("LTP 库未安装，请安装: pip install ltp")
        except Exception as e:
            print(f"LTP 初始化失败，将使用 jieba 作为备选: {e}")
            self._fallback = JiebaNLPService()
            self._initialized = True
    
    def segment(self, text: str) -> List[str]:
        self._initialize()
        if hasattr(self, '_fallback'):
            return self._fallback.segment(text)
        
        try:
            words, _ = self._ltp.pipeline([text], tasks=["cws"])
            return words[0] if words else []
        except Exception:
            return list(jieba.cut(text))
    
    def pos_tag(self, text: str) -> List[Tuple[str, str]]:
        self._initialize()
        if hasattr(self, '_fallback'):
            return self._fallback.pos_tag(text)
        
        try:
            words, hidden = self._ltp.pipeline([text], tasks=["cws"])
            pos_tags = self._ltp.pipeline(hidden, tasks=["pos"])
            if words and pos_tags:
                return list(zip(words[0], pos_tags[0]))
            return []
        except Exception:
            return list(jieba.posseg.cut(text))
    
    def dependency_parse(self, text: str) -> List[Dict[str, Any]]:
        self._initialize()
        if hasattr(self, '_fallback'):
            return self._fallback.dependency_parse(text)
        
        try:
            words, hidden = self._ltp.pipeline([text], tasks=["cws"])
            pos_tags = self._ltp.pipeline(hidden, tasks=["pos"])
            deps = self._ltp.pipeline(hidden, tasks=["dep"])
            
            results = []
            if words and pos_tags and deps:
                for i, (word, pos, dep) in enumerate(zip(words[0], pos_tags[0], deps[0])):
                    head_idx = dep[0] - 1 if dep[0] > 0 else i
                    head_word = words[0][head_idx] if head_idx < len(words[0]) else word
                    
                    results.append({
                        "word": word,
                        "pos": pos,
                        "dep": dep[1],
                        "head": head_word,
                        "head_idx": head_idx,
                        "idx": i,
                        "explanation": self._dep_explanation(dep[1])
                    })
            return results
        except Exception as e:
            print(f"依存句法分析失败: {e}")
            return []
    
    def sentence_split(self, text: str) -> List[str]:
        self._initialize()
        if hasattr(self, '_fallback'):
            return self._fallback.sentence_split(text)
        
        try:
            sents = self._ltp.sent_split([text])
            return sents
        except Exception:
            sentences = re.split(r'([。！？.!?])', text)
            result = []
            for i in range(0, len(sentences) - 1, 2):
                if sentences[i]:
                    result.append(sentences[i] + sentences[i + 1])
            if len(sentences) % 2 == 1 and sentences[-1]:
                result.append(sentences[-1])
            return result
    
    def _dep_explanation(self, dep: str) -> str:
        dep_map = {
            'SBV': '主谓关系',
            'VOB': '动宾关系',
            'IOB': '间宾关系',
            'FOB': '前置宾语',
            'DBL': '兼语',
            'ATT': '定中关系',
            'ADV': '状中结构',
            'CMP': '动补结构',
            'COO': '并列关系',
            'POB': '介宾关系',
            'LAD': '左附加关系',
            'RAD': '右附加关系',
            'IS': '独立结构',
            'HED': '核心关系',
            'WP': '标点',
            'ROOT': '根节点',
        }
        return dep_map.get(dep, f'未知依存关系({dep})')


class NLPServiceFactory:
    
    _instance: Optional[BaseNLPService] = None
    
    @classmethod
    def get_service(cls, engine: str = 'jieba', model_path: Optional[str] = None) -> BaseNLPService:
        if cls._instance is not None:
            return cls._instance
        
        if engine == 'ltp':
            try:
                cls._instance = LtpNLPService(model_path)
                return cls._instance
            except Exception as e:
                print(f"LTP 初始化失败，使用 jieba 作为备选: {e}")
        
        cls._instance = JiebaNLPService()
        return cls._instance
    
    @classmethod
    def reset(cls):
        cls._instance = None


def get_nlp_service(engine: str = 'jieba', model_path: Optional[str] = None) -> BaseNLPService:
    return NLPServiceFactory.get_service(engine, model_path)
