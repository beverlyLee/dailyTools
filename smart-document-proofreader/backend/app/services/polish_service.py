import re
from typing import List, Dict, Any
from dataclasses import dataclass

@dataclass
class PolishSuggestion:
    original_text: str
    suggested_text: str
    category: str
    explanation: str
    start_position: int = -1
    end_position: int = -1

class PolishService:
    def __init__(self):
        self.colloquial_to_formal = {
            "搞": "开展",
            "搞定": "完成",
            "搞不定": "无法完成",
            "搞起来": "开展起来",
            "搞活动": "开展活动",
            "搞工作": "开展工作",
            "搞建设": "开展建设",
            "搞改革": "推进改革",
            "搞创新": "开展创新",
            
            "弄": "办理",
            "弄好": "办理好",
            "弄完": "完成",
            "弄清楚": "核实清楚",
            "弄明白": "核实明白",
            
            "做": "开展",
            "做事": "开展工作",
            "做事情": "开展工作",
            "做计划": "制定计划",
            "做方案": "制定方案",
            "做准备": "做好准备",
            "做总结": "总结",
            
            "干": "开展",
            "干工作": "开展工作",
            "干事情": "开展工作",
            "干事业": "干事创业",
            
            "拿": "领取",
            "拿到": "领取到",
            "拿过来": "移交",
            
            "给": "拨付",
            "给了": "已拨付",
            "给出去": "拨付",
            
            "要": "申请",
            "要到": "申请到",
            "要过来": "协调",
            
            "说": "说明",
            "说了": "已说明",
            "说清楚": "说明清楚",
            
            "看": "查阅",
            "看了": "已查阅",
            "看看": "查阅",
            
            "想": "研究",
            "想想": "研究",
            "想办法": "研究解决办法",
            
            "找": "协调",
            "找人": "协调相关人员",
            "找一下": "协调",
            
            "差不多": "基本",
            "差不多了": "基本完成",
            
            "大概": "约",
            "大概是": "约为",
            
            "可能": "拟",
            "可能会": "拟",
            
            "打算": "计划",
            "打算做": "计划开展",
            
            "准备": "拟",
            "准备做": "拟开展",
            
            "马上": "立即",
            "马上做": "立即开展",
            
            "赶紧": "抓紧",
            "赶紧做": "抓紧开展",
            
            "快点": "加快",
            "快点做": "加快推进",
            
            "慢慢来": "稳步推进",
            "慢慢做": "稳步推进",
            
            "挺好的": "良好",
            "很好": "良好",
            "非常好": "优异",
            
            "挺不错的": "良好",
            "不错": "良好",
            
            "挺难的": "难度较大",
            "很难": "难度较大",
            
            "挺容易的": "较为容易",
            "很容易": "较为容易",
            
            "好多": "较多",
            "很多": "较多",
            
            "好多人": "较多人员",
            "很多人": "较多人员",
            
            "有点": "略有",
            "有点问题": "略有问题",
            
            "有些": "部分",
            "有些问题": "部分问题",
            
            "几个": "若干",
            "几个问题": "若干问题",
            
            "一些": "部分",
            "一些问题": "部分问题",
        }
        
        self.formal_phrases = {
            "为了": "为进一步",
            "为了加强": "为进一步加强",
            "为了推进": "为进一步推进",
            "为了落实": "为进一步落实",
            
            "根据": "根据《",
            "根据规定": "根据相关规定",
            "根据文件": "根据相关文件",
            
            "按照": "按照《",
            "按照规定": "按照相关规定",
            "按照文件": "按照相关文件",
            
            "关于": "关于进一步",
            "关于加强": "关于进一步加强",
            "关于推进": "关于进一步推进",
            
            "由于": "鉴于",
            "由于工作需要": "鉴于工作需要",
            
            "因此": "据此",
            "因此决定": "据此决定",
            
            "所以": "据此",
            "所以决定": "据此决定",
            
            "但是": "但",
            "但是由于": "但鉴于",
            
            "而且": "且",
            "而且还": "且",
            
            "或者": "或",
            "或者是": "或为",
            
            "并且": "且",
            "并且还": "且",
            
            "如果": "如",
            "如果是": "如为",
            
            "因为": "鉴于",
            "因为工作需要": "鉴于工作需要",
        }

    def check_colloquial_expressions(self, text: str) -> List[PolishSuggestion]:
        suggestions = []
        
        for colloquial, formal in self.colloquial_to_formal.items():
            pattern = r"\b" + re.escape(colloquial) + r"\b"
            matches = list(re.finditer(pattern, text))
            for match in matches:
                suggestions.append(PolishSuggestion(
                    original_text=match.group(),
                    suggested_text=formal,
                    category="口语化表达",
                    explanation=f"建议将口语化表达 '{colloquial}' 修改为公文用语 '{formal}'",
                    start_position=match.start(),
                    end_position=match.end()
                ))
        
        return suggestions

    def check_formal_phrases(self, text: str) -> List[PolishSuggestion]:
        suggestions = []
        
        for informal, formal in self.formal_phrases.items():
            pattern = r"\b" + re.escape(informal) + r"\b"
            matches = list(re.finditer(pattern, text))
            for match in matches:
                suggestions.append(PolishSuggestion(
                    original_text=match.group(),
                    suggested_text=formal,
                    category="表述优化",
                    explanation=f"建议将表述 '{informal}' 优化为更规范的公文用语 '{formal}'",
                    start_position=match.start(),
                    end_position=match.end()
                ))
        
        return suggestions

    def check_sentence_structure(self, text: str) -> List[PolishSuggestion]:
        suggestions = []
        
        patterns = [
            {
                "pattern": r"我(们)?觉得",
                "suggestion": "经研究认为",
                "explanation": "公文应使用客观表述，避免主观感受"
            },
            {
                "pattern": r"我(们)?认为",
                "suggestion": "经研究认为",
                "explanation": "公文应使用客观表述，避免主观感受"
            },
            {
                "pattern": r"我(们)?希望",
                "suggestion": "望",
                "explanation": "公文应使用规范表述"
            },
            {
                "pattern": r"我(们)?想",
                "suggestion": "拟",
                "explanation": "公文应使用规范表述"
            },
            {
                "pattern": r"请大家",
                "suggestion": "请各单位",
                "explanation": "公文应使用正式称谓"
            },
            {
                "pattern": r"同志们",
                "suggestion": "各单位、各部门",
                "explanation": "公文应使用正式称谓"
            },
            {
                "pattern": r"大家好",
                "suggestion": "",
                "explanation": "公文不需要问候语"
            },
            {
                "pattern": r"谢谢",
                "suggestion": "",
                "explanation": "公文不需要感谢语"
            },
        ]
        
        for p in patterns:
            matches = list(re.finditer(p["pattern"], text))
            for match in matches:
                suggestions.append(PolishSuggestion(
                    original_text=match.group(),
                    suggested_text=p["suggestion"],
                    category="句式优化",
                    explanation=p["explanation"],
                    start_position=match.start(),
                    end_position=match.end()
                ))
        
        return suggestions

    def polish_all(self, text: str) -> List[PolishSuggestion]:
        suggestions = []
        suggestions.extend(self.check_colloquial_expressions(text))
        suggestions.extend(self.check_formal_phrases(text))
        suggestions.extend(self.check_sentence_structure(text))
        return suggestions

    def to_dict_list(self, suggestions: List[PolishSuggestion]) -> List[Dict[str, Any]]:
        return [
            {
                "original_text": s.original_text,
                "suggested_text": s.suggested_text,
                "category": s.category,
                "explanation": s.explanation,
                "start_position": s.start_position,
                "end_position": s.end_position
            }
            for s in suggestions
        ]
