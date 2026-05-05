import re
from typing import List, Dict, Any, Tuple, Optional, Callable
from dataclasses import dataclass
from abc import ABC, abstractmethod


@dataclass
class RuleMatch:
    rule_id: str
    rule_name: str
    category: str
    original_text: str
    suggested_text: Optional[str]
    position_start: int
    position_end: int
    explanation: str
    severity: str = "minor"
    confidence: int = 80


class BaseRule(ABC):
    
    def __init__(self, rule_id: str, rule_name: str, category: str, severity: str = "minor"):
        self.rule_id = rule_id
        self.rule_name = rule_name
        self.category = category
        self.severity = severity
    
    @abstractmethod
    def match(self, text: str) -> List[RuleMatch]:
        pass


class RegexRule(BaseRule):
    
    def __init__(
        self, 
        rule_id: str, 
        rule_name: str, 
        category: str,
        pattern: str,
        replacement: Optional[str] = None,
        explanation: str = "",
        severity: str = "minor",
        confidence: int = 80,
        flags: int = 0
    ):
        super().__init__(rule_id, rule_name, category, severity)
        self.pattern = re.compile(pattern, flags)
        self.replacement = replacement
        self.explanation = explanation
        self.confidence = confidence
    
    def match(self, text: str) -> List[RuleMatch]:
        matches = []
        
        for match in self.pattern.finditer(text):
            original = match.group()
            position_start = match.start()
            position_end = match.end()
            
            suggested = None
            if self.replacement:
                if callable(self.replacement):
                    suggested = self.replacement(match)
                else:
                    suggested = self.pattern.sub(self.replacement, original)
            
            matches.append(RuleMatch(
                rule_id=self.rule_id,
                rule_name=self.rule_name,
                category=self.category,
                original_text=original,
                suggested_text=suggested,
                position_start=position_start,
                position_end=position_end,
                explanation=self.explanation,
                severity=self.severity,
                confidence=self.confidence
            ))
        
        return matches


class ContextRule(BaseRule):
    
    def __init__(
        self,
        rule_id: str,
        rule_name: str,
        category: str,
        check_function: Callable[[str, int, int], Tuple[bool, str, Optional[str]]],
        trigger_pattern: str,
        explanation: str = "",
        severity: str = "minor",
        confidence: int = 70
    ):
        super().__init__(rule_id, rule_name, category, severity)
        self.check_function = check_function
        self.trigger_pattern = re.compile(trigger_pattern)
        self.explanation = explanation
        self.confidence = confidence
    
    def match(self, text: str) -> List[RuleMatch]:
        matches = []
        
        for match in self.trigger_pattern.finditer(text):
            is_issue, explanation, suggested = self.check_function(
                text, match.start(), match.end()
            )
            
            if is_issue:
                matches.append(RuleMatch(
                    rule_id=self.rule_id,
                    rule_name=self.rule_name,
                    category=self.category,
                    original_text=match.group(),
                    suggested_text=suggested,
                    position_start=match.start(),
                    position_end=match.end(),
                    explanation=explanation or self.explanation,
                    severity=self.severity,
                    confidence=self.confidence
                ))
        
        return matches


class RuleEngine:
    
    def __init__(self):
        self.rules: List[BaseRule] = []
        self._load_default_rules()
    
    def add_rule(self, rule: BaseRule):
        self.rules.append(rule)
    
    def add_rules(self, rules: List[BaseRule]):
        self.rules.extend(rules)
    
    def run_all(self, text: str) -> List[RuleMatch]:
        all_matches = []
        seen_positions = set()
        
        for rule in self.rules:
            try:
                matches = rule.match(text)
                for match in matches:
                    pos_key = (match.position_start, match.position_end, match.rule_id)
                    if pos_key not in seen_positions:
                        seen_positions.add(pos_key)
                        all_matches.append(match)
            except Exception as e:
                print(f"规则执行错误 {rule.rule_id}: {e}")
        
        all_matches.sort(key=lambda m: m.position_start)
        
        return all_matches
    
    def run_by_category(self, text: str, category: str) -> List[RuleMatch]:
        matches = self.run_all(text)
        return [m for m in matches if m.category == category]
    
    def _load_default_rules(self):
        
        self.add_rules([
            RegexRule(
                rule_id="POL_001",
                rule_name="习近平总书记称谓",
                category="政治术语",
                pattern=r"习(近平)?(总)?书记",
                replacement="习近平总书记",
                explanation="在正式公文中，应使用完整规范的称谓「习近平总书记」",
                severity="major",
                confidence=95
            ),
            RegexRule(
                rule_id="POL_002",
                rule_name="党中央规范称谓",
                category="政治术语",
                pattern=r"党中央",
                explanation="在正式公文中，应使用「中共中央」或「党中央」（根据上下文）",
                severity="minor",
                confidence=70
            ),
            RegexRule(
                rule_id="POL_003",
                rule_name="国务院规范称谓",
                category="政治术语",
                pattern=r"中央(人民)?政府",
                replacement="国务院",
                explanation="在正式公文中，中央人民政府应简称为「国务院」",
                severity="major",
                confidence=90
            ),
            RegexRule(
                rule_id="POL_004",
                rule_name="两个维护",
                category="政治术语",
                pattern=r"两个维护",
                explanation="「两个维护」的完整表述是：坚决维护习近平总书记党中央的核心、全党的核心地位，坚决维护党中央权威和集中统一领导",
                severity="minor",
                confidence=85
            ),
            RegexRule(
                rule_id="POL_005",
                rule_name="四个意识",
                category="政治术语",
                pattern=r"四个意识",
                explanation="「四个意识」是指：政治意识、大局意识、核心意识、看齐意识",
                severity="minor",
                confidence=85
            ),
            RegexRule(
                rule_id="POL_006",
                rule_name="四个自信",
                category="政治术语",
                pattern=r"四个自信",
                explanation="「四个自信」是指：道路自信、理论自信、制度自信、文化自信",
                severity="minor",
                confidence=85
            ),
        ])
        
        self.add_rules([
            RegexRule(
                rule_id="COL_001",
                rule_name="提高水平",
                category="固定搭配",
                pattern=r"提升(政治|业务|工作)?水平",
                replacement="提高水平",
                explanation="公文常用搭配：「提高水平」而非「提升水平」",
                severity="minor",
                confidence=85
            ),
            RegexRule(
                rule_id="COL_002",
                rule_name="加强建设",
                category="固定搭配",
                pattern=r"增强(党的|组织|队伍)?建设",
                replacement="加强建设",
                explanation="公文常用搭配：「加强建设」而非「增强建设」",
                severity="minor",
                confidence=85
            ),
            RegexRule(
                rule_id="COL_003",
                rule_name="增强意识",
                category="固定搭配",
                pattern=r"提高(政治|责任|风险)?意识",
                replacement="增强意识",
                explanation="公文常用搭配：「增强意识」而非「提高意识」",
                severity="minor",
                confidence=85
            ),
            RegexRule(
                rule_id="COL_004",
                rule_name="提高认识",
                category="固定搭配",
                pattern=r"增强(思想|认识)?",
                explanation="公文常用搭配：「提高认识」、「统一思想」",
                severity="minor",
                confidence=70
            ),
            RegexRule(
                rule_id="COL_005",
                rule_name="完善制度",
                category="固定搭配",
                pattern=r"健全(各项|相关)?制度",
                replacement="完善制度",
                explanation="公文常用搭配：「完善制度」、「健全机制」",
                severity="minor",
                confidence=80
            ),
            RegexRule(
                rule_id="COL_006",
                rule_name="开展活动",
                category="固定搭配",
                pattern=r"进行(各项|相关)?活动",
                replacement="开展活动",
                explanation="公文常用搭配：「开展活动」而非「进行活动」",
                severity="minor",
                confidence=85
            ),
        ])
        
        self.add_rules([
            RegexRule(
                rule_id="PUN_001",
                rule_name="中文顿号",
                category="标点符号",
                pattern=r"([\u4e00-\u9fa5]{2,}),",
                replacement=lambda m: m.group(1) + "、",
                explanation="中文并列词之间应使用顿号「、」而非逗号「,」",
                severity="minor",
                confidence=90
            ),
            RegexRule(
                rule_id="PUN_002",
                rule_name="中文句号",
                category="标点符号",
                pattern=r"([。！？])\1+",
                replacement=lambda m: m.group(1),
                explanation="标点符号不应重复使用",
                severity="minor",
                confidence=95
            ),
            RegexRule(
                rule_id="PUN_003",
                rule_name="中文引号",
                category="标点符号",
                pattern=r'"([^"]*)"',
                replacement=lambda m: f"「{m.group(1)}」",
                explanation="正式公文建议使用中文引号「「」」而非英文引号「\"\"」",
                severity="minor",
                confidence=80
            ),
            RegexRule(
                rule_id="PUN_004",
                rule_name="书名号使用",
                category="标点符号",
                pattern=r"《([^》]{1,5})》",
                explanation="书名号内文字过短，可能存在误用。书名号用于书名、篇名、报刊名等",
                severity="minor",
                confidence=60
            ),
            RegexRule(
                rule_id="PUN_005",
                rule_name="中文括号",
                category="标点符号",
                pattern=r"\(([^)]*)\)",
                explanation="正式公文建议使用中文括号「（）」而非英文括号「()」",
                severity="minor",
                confidence=75
            ),
            RegexRule(
                rule_id="PUN_006",
                rule_name="数字间标点",
                category="标点符号",
                pattern=r"(\d{4})年(\d{1,2})月(\d{1,2})日",
                explanation="日期格式正确",
                severity="info",
                confidence=100
            ),
        ])
        
        self.add_rules([
            RegexRule(
                rule_id="COL_010",
                rule_name="很多",
                category="口语化",
                pattern=r"很多",
                replacement="诸多",
                explanation="正式公文建议使用「诸多」、「众多」等书面语表达",
                severity="minor",
                confidence=70
            ),
            RegexRule(
                rule_id="COL_011",
                rule_name="很好",
                category="口语化",
                pattern=r"很好",
                replacement="良好",
                explanation="正式公文建议使用「良好」、「优异」等书面语表达",
                severity="minor",
                confidence=70
            ),
            RegexRule(
                rule_id="COL_012",
                rule_name="非常",
                category="口语化",
                pattern=r"非常(重要|关键|必要)",
                replacement=lambda m: "极其" + m.group(1),
                explanation="正式公文建议使用「极其」、「尤为」等书面语表达",
                severity="minor",
                confidence=65
            ),
            RegexRule(
                rule_id="COL_013",
                rule_name="搞",
                category="口语化",
                pattern=r"搞(好|定|成|清楚|明白)",
                replacement=lambda m: "做" + m.group(1),
                explanation="正式公文避免使用口语化的「搞」，建议使用「做」、「开展」等",
                severity="minor",
                confidence=80
            ),
            RegexRule(
                rule_id="COL_014",
                rule_name="拿",
                category="口语化",
                pattern=r"拿(来|去|出|过)",
                explanation="正式公文避免使用口语化的「拿」",
                severity="minor",
                confidence=70
            ),
            RegexRule(
                rule_id="COL_015",
                rule_name="大概",
                category="口语化",
                pattern=r"大概",
                replacement="约",
                explanation="正式公文建议使用「约」、「大致」等书面语表达",
                severity="minor",
                confidence=70
            ),
            RegexRule(
                rule_id="COL_016",
                rule_name="差不多",
                category="口语化",
                pattern=r"差不多",
                replacement="基本",
                explanation="正式公文建议使用「基本」、「大致」等书面语表达",
                severity="minor",
                confidence=75
            ),
            RegexRule(
                rule_id="COL_017",
                rule_name="赶紧",
                category="口语化",
                pattern=r"赶紧",
                replacement="抓紧",
                explanation="正式公文建议使用「抓紧」、「尽快」等书面语表达",
                severity="minor",
                confidence=80
            ),
            RegexRule(
                rule_id="COL_018",
                rule_name="马上",
                category="口语化",
                pattern=r"马上",
                replacement="立即",
                explanation="正式公文建议使用「立即」、「即刻」等书面语表达",
                severity="minor",
                confidence=80
            ),
            RegexRule(
                rule_id="COL_019",
                rule_name="有点",
                category="口语化",
                pattern=r"有点",
                replacement="较为",
                explanation="正式公文建议使用「较为」、「略」等书面语表达",
                severity="minor",
                confidence=70
            ),
            RegexRule(
                rule_id="COL_020",
                rule_name="比较",
                category="口语化",
                pattern=r"比较(好|大|小|多|少)",
                replacement=lambda m: "较为" + m.group(1),
                explanation="正式公文建议使用「较为」等书面语表达",
                severity="minor",
                confidence=65
            ),
        ])


def rule_match_to_dict(match: RuleMatch) -> Dict[str, Any]:
    return {
        "rule_id": match.rule_id,
        "rule_name": match.rule_name,
        "category": match.category,
        "original_text": match.original_text,
        "suggested_text": match.suggested_text,
        "position_start": match.position_start,
        "position_end": match.position_end,
        "explanation": match.explanation,
        "severity": match.severity,
        "confidence": match.confidence
    }


def get_rule_engine() -> RuleEngine:
    return RuleEngine()
