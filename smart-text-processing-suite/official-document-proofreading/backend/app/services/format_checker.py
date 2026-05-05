import re
from typing import List, Dict, Any, Optional
from dataclasses import dataclass
from abc import ABC, abstractmethod


@dataclass
class FormatIssue:
    issue_id: str
    issue_type: str
    issue_level: str
    description: str
    suggestion: Optional[str]
    line_number: Optional[int]
    position_reference: Optional[str]


class BaseFormatRule(ABC):
    
    def __init__(self, rule_id: str, rule_name: str, issue_level: str = "warning"):
        self.rule_id = rule_id
        self.rule_name = rule_name
        self.issue_level = issue_level
    
    @abstractmethod
    def check(self, text: str, lines: List[str]) -> List[FormatIssue]:
        pass


class TitleLevelRule(BaseFormatRule):
    
    def __init__(self):
        super().__init__("TITLE_001", "标题层级检查", "warning")
        self.level_patterns = {
            1: re.compile(r'^[一二三四五六七八九十]+、'),
            2: re.compile(r'^[（(][一二三四五六七八九十]+[)）]'),
            3: re.compile(r'^[123456789]+\.'),
            4: re.compile(r'^[（(][123456789]+[)）]'),
        }
    
    def check(self, text: str, lines: List[str]) -> List[FormatIssue]:
        issues = []
        seen_levels: Dict[int, int] = {}
        
        for line_num, line in enumerate(lines, 1):
            stripped_line = line.strip()
            if not stripped_line:
                continue
            
            current_level = None
            level_text = None
            
            for level in sorted(self.level_patterns.keys()):
                match = self.level_patterns[level].match(stripped_line)
                if match:
                    current_level = level
                    level_text = match.group()
                    break
            
            if current_level is None:
                continue
            
            seen_levels[current_level] = seen_levels.get(current_level, 0) + 1
            
            if current_level > 1:
                prev_level = current_level - 1
                if prev_level not in seen_levels:
                    issues.append(FormatIssue(
                        issue_id=self.rule_id,
                        issue_type="标题层级错误",
                        issue_level="warning",
                        description=f"标题「{stripped_line[:30]}...」跳过了层级 {prev_level}",
                        suggestion="请检查标题层级是否完整，是否缺少上级标题",
                        line_number=line_num,
                        position_reference=stripped_line[:20]
                    ))
            
            if current_level == 1:
                if not stripped_line.endswith(('。', '：', '）', ')')) and len(stripped_line) < 30:
                    issues.append(FormatIssue(
                        issue_id="TITLE_002",
                        issue_type="标题格式",
                        issue_level="info",
                        description=f"一级标题「{stripped_line[:20]}...」建议检查标点使用",
                        suggestion="一级标题通常以顿号「、」结尾，或根据规范使用其他标点",
                        line_number=line_num,
                        position_reference=stripped_line[:20]
                    ))
        
        return issues


class DocumentNumberRule(BaseFormatRule):
    
    def __init__(self):
        super().__init__("DOC_NUM_001", "发文字号格式检查", "warning")
        self.valid_pattern = re.compile(
            r'^([\u4e00-\u9fa5]+〔[〔（(]?)(\d{4})[）〕)〕〕([\u4e00-\u9fa5]*号?)\d+号?$'
        )
    
    def check(self, text: str, lines: List[str]) -> List[FormatIssue]:
        issues = []
        
        for line_num, line in enumerate(lines, 1):
            stripped_line = line.strip()
            if not stripped_line:
                continue
            
            if "号" in stripped_line and re.search(r'〔|（|\(', stripped_line):
                is_valid = False
                
                if re.search(r'〔\d{4}〕', stripped_line):
                    is_valid = True
                elif re.search(r'[（(]\d{4}[)）]', stripped_line):
                    issues.append(FormatIssue(
                        issue_id="DOC_NUM_002",
                        issue_type="发文字号括号",
                        issue_level="minor",
                        description=f"发文字号「{stripped_line}」使用了圆括号",
                        suggestion="发文字号应使用六角括号「〔〕」，例如：XX〔2024〕1号",
                        line_number=line_num,
                        position_reference=stripped_line
                    ))
                
                if not re.search(r'\d{4}', stripped_line):
                    issues.append(FormatIssue(
                        issue_id="DOC_NUM_003",
                        issue_type="发文字号年份",
                        issue_level="warning",
                        description=f"发文字号「{stripped_line}」未包含完整年份",
                        suggestion="发文字号应包含完整四位年份，例如：XX〔2024〕1号",
                        line_number=line_num,
                        position_reference=stripped_line
                    ))
                
                if not re.search(r'\d+号', stripped_line) and "号" not in stripped_line[-2:]:
                    issues.append(FormatIssue(
                        issue_id="DOC_NUM_004",
                        issue_type="发文字号序号",
                        issue_level="warning",
                        description=f"发文字号「{stripped_line}」未包含序号",
                        suggestion="发文字号应包含序号，例如：XX〔2024〕1号",
                        line_number=line_num,
                        position_reference=stripped_line
                    ))
                
                if re.search(r'第\d+号', stripped_line):
                    issues.append(FormatIssue(
                        issue_id="DOC_NUM_005",
                        issue_type="发文字号虚字",
                        issue_level="minor",
                        description=f"发文字号「{stripped_line}」使用了虚字「第」",
                        suggestion="发文字号序号前不使用虚字「第」，例如：XX〔2024〕1号而非XX〔2024〕第1号",
                        line_number=line_num,
                        position_reference=stripped_line
                    ))
        
        return issues


class RedHeadFormatRule(BaseFormatRule):
    
    def __init__(self):
        super().__init__("RED_HEAD_001", "红头文件格式检查", "warning")
    
    def check(self, text: str, lines: List[str]) -> List[FormatIssue]:
        issues = []
        
        red_head_keywords = ['人民政府', '委员会', '办公厅', '办公室', '局', '部', '委']
        found_red_head = False
        
        for line_num, line in enumerate(lines[:10], 1):
            stripped_line = line.strip()
            if not stripped_line:
                continue
            
            for keyword in red_head_keywords:
                if keyword in stripped_line and len(stripped_line) < 50:
                    found_red_head = True
                    
                    if not stripped_line.endswith('文件'):
                        issues.append(FormatIssue(
                            issue_id="RED_HEAD_002",
                            issue_type="红头文件标题",
                            issue_level="info",
                            description=f"红头文件标题「{stripped_line}」建议检查格式",
                            suggestion="红头文件标题通常格式为：「XX人民政府文件」",
                            line_number=line_num,
                            position_reference=stripped_line
                        ))
                    
                    center_indicators = ['　', '  ', '\t']
                    is_centered = any(indicator in line for indicator in center_indicators)
                    if not is_centered and line_num <= 3:
                        issues.append(FormatIssue(
                            issue_id="RED_HEAD_003",
                            issue_type="红头文件居中",
                            issue_level="minor",
                            description=f"红头文件标题「{stripped_line}」建议居中对齐",
                            suggestion="红头文件标题应居中排布",
                            line_number=line_num,
                            position_reference=stripped_line
                        ))
                    
                    break
            
            if found_red_head:
                break
        
        if found_red_head:
            for line_num, line in enumerate(lines[1:15], 2):
                stripped_line = line.strip()
                if not stripped_line:
                    continue
                
                if re.search(r'〔.*〕', stripped_line) or re.search(r'[（(].*[)）]', stripped_line):
                    if re.search(r'〔.*〕|（.*）|\(.*\)', stripped_line) and "号" in stripped_line:
                        pass
                    
                    if not re.search(r'〔\d{4}〕|（\d{4}）|\(\d{4}\)', stripped_line):
                        pass
                
                if "关于" in stripped_line and "的" in stripped_line:
                    if not stripped_line.endswith(('通知', '决定', '意见', '规定', '办法', '批复', '函')):
                        issues.append(FormatIssue(
                            issue_id="RED_HEAD_004",
                            issue_type="公文标题格式",
                            issue_level="info",
                            description=f"公文标题「{stripped_line[:30]}...」建议检查文种",
                            suggestion="公文标题通常格式为：「关于XX的通知/决定/意见」",
                            line_number=line_num,
                            position_reference=stripped_line[:30]
                        ))
                    
                    if "关于" in stripped_line and stripped_line.count("的") > 1:
                        issues.append(FormatIssue(
                            issue_id="RED_HEAD_005",
                            issue_type="公文标题结构",
                            issue_level="info",
                            description=f"公文标题「{stripped_line[:30]}...」可能存在结构问题",
                            suggestion="公文标题结构应为：发文机关+关于+事由+的+文种",
                            line_number=line_num,
                            position_reference=stripped_line[:30]
                        ))
        
        return issues


class PunctuationFormatRule(BaseFormatRule):
    
    def __init__(self):
        super().__init__("PUNC_001", "标点符号格式检查", "minor")
        self.full_width_punct = ['，', '。', '；', '：', '？', '！', '、']
        self.half_width_punct = [',', '.', ';', ':', '?', '!']
    
    def check(self, text: str, lines: List[str]) -> List[FormatIssue]:
        issues = []
        
        half_to_full = {
            ',': '，',
            '.': '。',
            ';': '；',
            ':': '：',
            '?': '？',
            '!': '！',
            '(': '（',
            ')': '）',
            '[': '【',
            ']': '】'
        }
        
        for line_num, line in enumerate(lines, 1):
            for i, char in enumerate(line):
                if char in half_to_full and i > 0:
                    prev_char = line[i-1]
                    if '\u4e00' <= prev_char <= '\u9fff':
                        issues.append(FormatIssue(
                            issue_id="PUNC_002",
                            issue_type="标点符号全角",
                            issue_level="minor",
                            description=f"在中文字符后使用了半角标点「{char}」",
                            suggestion=f"建议使用全角标点「{half_to_full[char]}」",
                            line_number=line_num,
                            position_reference=f"...{line[max(0,i-5):i+5]}..."
                        ))
        
        for line_num, line in enumerate(lines, 1):
            matches = re.findall(r'([，。；：？！、])\1+', line)
            if matches:
                for match in matches:
                    issues.append(FormatIssue(
                        issue_id="PUNC_003",
                        issue_type="标点符号重复",
                        issue_level="warning",
                        description=f"发现重复的标点符号「{match}」",
                        suggestion="标点符号不应重复使用",
                        line_number=line_num,
                        position_reference=line[:50]
                    ))
        
        return issues


class ParagraphRule(BaseFormatRule):
    
    def __init__(self):
        super().__init__("PARA_001", "段落格式检查", "info")
    
    def check(self, text: str, lines: List[str]) -> List[FormatIssue]:
        issues = []
        
        for line_num, line in enumerate(lines, 1):
            if not line.strip():
                continue
            
            if line.startswith('　　') or line.startswith('  '):
                pass
            elif '\u4e00' <= line[0] <= '\u9fff' and line_num > 1:
                issues.append(FormatIssue(
                    issue_id="PARA_002",
                    issue_type="段落首行缩进",
                    issue_level="info",
                    description=f"第 {line_num} 行段落建议首行缩进",
                    suggestion="中文公文段落通常首行缩进2字符",
                    line_number=line_num,
                    position_reference=line[:30]
                ))
        
        long_line_count = 0
        for line_num, line in enumerate(lines, 1):
            if len(line.strip()) > 80:
                long_line_count += 1
                if long_line_count > 3:
                    issues.append(FormatIssue(
                        issue_id="PARA_003",
                        issue_type="行长度检查",
                        issue_level="info",
                        description=f"存在较长的行（第 {line_num} 行超过80字符）",
                        suggestion="建议适当分段以提高可读性",
                        line_number=line_num,
                        position_reference=line[:50]
                    ))
                    break
        
        return issues


class FormatCheckerService:
    
    def __init__(self):
        self.rules: List[BaseFormatRule] = [
            TitleLevelRule(),
            DocumentNumberRule(),
            RedHeadFormatRule(),
            PunctuationFormatRule(),
            ParagraphRule(),
        ]
    
    def check_all(self, text: str) -> Dict[str, Any]:
        lines = text.split('\n')
        
        all_issues: List[FormatIssue] = []
        
        for rule in self.rules:
            try:
                issues = rule.check(text, lines)
                all_issues.extend(issues)
            except Exception as e:
                print(f"格式检查规则执行错误 {rule.rule_name}: {e}")
        
        issues_by_severity = {
            "major": [],
            "warning": [],
            "minor": [],
            "info": []
        }
        
        for issue in all_issues:
            if issue.issue_level in issues_by_severity:
                issues_by_severity[issue.issue_level].append(issue)
        
        return {
            "total_issues": len(all_issues),
            "issues_by_severity": {
                level: [format_issue_to_dict(issue) for issue in issues]
                for level, issues in issues_by_severity.items()
            },
            "summary": self._generate_summary(all_issues)
        }
    
    def check_format_type(self, text: str, format_type: str) -> Dict[str, Any]:
        lines = text.split('\n')
        issues = []
        
        rule_map = {
            "title": TitleLevelRule(),
            "document_number": DocumentNumberRule(),
            "red_head": RedHeadFormatRule(),
            "punctuation": PunctuationFormatRule(),
            "paragraph": ParagraphRule(),
        }
        
        if format_type in rule_map:
            rule = rule_map[format_type]
            try:
                issues = rule.check(text, lines)
            except Exception as e:
                print(f"格式检查规则执行错误 {rule.rule_name}: {e}")
        
        return {
            "format_type": format_type,
            "issues": [format_issue_to_dict(issue) for issue in issues]
        }
    
    def _generate_summary(self, issues: List[FormatIssue]) -> str:
        if not issues:
            return "文档格式检查通过，未发现明显问题。"
        
        major_count = sum(1 for i in issues if i.issue_level == "major")
        warning_count = sum(1 for i in issues if i.issue_level == "warning")
        minor_count = sum(1 for i in issues if i.issue_level == "minor")
        info_count = sum(1 for i in issues if i.issue_level == "info")
        
        parts = []
        if major_count > 0:
            parts.append(f"严重问题 {major_count} 个")
        if warning_count > 0:
            parts.append(f"警告 {warning_count} 个")
        if minor_count > 0:
            parts.append(f"次要问题 {minor_count} 个")
        if info_count > 0:
            parts.append(f"建议 {info_count} 个")
        
        if parts:
            return f"格式检查完成，共发现：{'、'.join(parts)}。"
        
        return "格式检查完成。"


def format_issue_to_dict(issue: FormatIssue) -> Dict[str, Any]:
    return {
        "issue_id": issue.issue_id,
        "issue_type": issue.issue_type,
        "issue_level": issue.issue_level,
        "description": issue.description,
        "suggestion": issue.suggestion,
        "line_number": issue.line_number,
        "position_reference": issue.position_reference
    }


def get_format_checker() -> FormatCheckerService:
    return FormatCheckerService()
