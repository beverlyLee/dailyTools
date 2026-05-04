import re
import jieba
from typing import List, Dict, Any
from dataclasses import dataclass

@dataclass
class CorrectionItem:
    original_text: str
    suggested_text: str
    correction_type: str
    category: str
    explanation: str
    start_position: int = -1
    end_position: int = -1

class ProofreaderService:
    def __init__(self):
        self.political_terms = {
            "中国共产党": "正确",
            "中共中央": "正确",
            "国务院": "正确",
            "全国人民代表大会": "正确",
            "全国人大": "正确",
            "政协": "正确",
            "中国人民政治协商会议": "正确",
            "中央军委": "正确",
            "中央军事委员会": "正确",
            "总书记": "正确",
            "国家主席": "正确",
            "总理": "正确",
            "委员长": "正确",
            "政协主席": "正确",
        }
        
        self.incorrect_political_terms = {
            "党国": "中国共产党",
            "党政府": "党和政府",
            "共党": "中国共产党",
            "中共和政府": "中共中央和国务院",
        }
        
        self.fixed_collocations = {
            "贯彻落实": True,
            "传达学习": True,
            "研究部署": True,
            "总结表彰": True,
            "动员部署": True,
            "督促检查": True,
            "监督管理": True,
            "统筹协调": True,
            "协调配合": True,
            "齐抓共管": True,
            "各司其职": True,
            "各负其责": True,
            "真抓实干": True,
            "务求实效": True,
            "开拓创新": True,
            "锐意进取": True,
        }
        
        self.incorrect_collocations = {
            "贯彻执行": "贯彻落实",
            "研究安排": "研究部署",
            "总结表扬": "总结表彰",
            "动员安排": "动员部署",
            "督促检查": "督促检查",
            "监督管理": "监督管理",
            "统筹协调": "统筹协调",
            "协调配合": "协调配合",
            "齐抓共管": "齐抓共管",
            "各司其职": "各司其职",
            "各负其责": "各负其责",
            "真抓实干": "真抓实干",
            "务求实效": "务求实效",
            "开拓创新": "开拓创新",
            "锐意进取": "锐意进取",
        }
        
        self.punctuation_rules = [
            {
                "pattern": r"([，。；：！？])\1+",
                "explanation": "标点符号重复使用",
                "correction": lambda m: m.group(1)
            },
            {
                "pattern": r"([，。；：！？])\s+",
                "explanation": "标点符号后不应有空格",
                "correction": lambda m: m.group(1)
            },
            {
                "pattern": r"\s+([，。；：！？])",
                "explanation": "标点符号前不应有空格",
                "correction": lambda m: m.group(1)
            },
            {
                "pattern": r"([（【])",
                "explanation": "左括号应使用全角",
                "correction": lambda m: "（" if m.group(1) == "(" else "【"
            },
            {
                "pattern": r"([）】])",
                "explanation": "右括号应使用全角",
                "correction": lambda m: "）" if m.group(1) == ")" else "】"
            },
        ]

    def check_political_terms(self, text: str) -> List[CorrectionItem]:
        corrections = []
        for incorrect, correct in self.incorrect_political_terms.items():
            matches = list(re.finditer(incorrect, text))
            for match in matches:
                corrections.append(CorrectionItem(
                    original_text=match.group(),
                    suggested_text=correct,
                    correction_type="政治术语",
                    category="术语使用不当",
                    explanation=f"政治术语使用不当，建议使用 '{correct}' 替代 '{match.group()}'",
                    start_position=match.start(),
                    end_position=match.end()
                ))
        return corrections

    def check_fixed_collocations(self, text: str) -> List[CorrectionItem]:
        corrections = []
        words = list(jieba.cut(text))
        for i in range(len(words) - 1):
            word_pair = words[i] + words[i + 1]
            if word_pair in self.incorrect_collocations:
                correct = self.incorrect_collocations[word_pair]
                start_idx = text.find(word_pair)
                if start_idx != -1:
                    corrections.append(CorrectionItem(
                        original_text=word_pair,
                        suggested_text=correct,
                        correction_type="固定搭配",
                        category="搭配错误",
                        explanation=f"固定搭配使用不当，建议使用 '{correct}' 替代 '{word_pair}'",
                        start_position=start_idx,
                        end_position=start_idx + len(word_pair)
                    ))
        return corrections

    def check_punctuation(self, text: str) -> List[CorrectionItem]:
        corrections = []
        for rule in self.punctuation_rules:
            matches = list(re.finditer(rule["pattern"], text))
            for match in matches:
                corrected = rule["correction"](match)
                corrections.append(CorrectionItem(
                    original_text=match.group(),
                    suggested_text=corrected,
                    correction_type="标点符号",
                    category="标点误用",
                    explanation=rule["explanation"],
                    start_position=match.start(),
                    end_position=match.end()
                ))
        return corrections

    def check_all(self, text: str) -> List[CorrectionItem]:
        corrections = []
        corrections.extend(self.check_political_terms(text))
        corrections.extend(self.check_fixed_collocations(text))
        corrections.extend(self.check_punctuation(text))
        return corrections

    def to_dict_list(self, corrections: List[CorrectionItem]) -> List[Dict[str, Any]]:
        return [
            {
                "original_text": c.original_text,
                "suggested_text": c.suggested_text,
                "correction_type": c.correction_type,
                "category": c.category,
                "explanation": c.explanation,
                "start_position": c.start_position,
                "end_position": c.end_position
            }
            for c in corrections
        ]
