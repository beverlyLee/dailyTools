import re
from typing import List, Dict, Any
from dataclasses import dataclass

@dataclass
class FormatIssue:
    issue_type: str
    category: str
    description: str
    suggestion: str
    start_position: int = -1
    end_position: int = -1

class FormatCheckerService:
    def __init__(self):
        self.title_level_rules = {
            "一级标题": {
                "pattern": r"^[一二三四五六七八九十]+[、\.．]",
                "example": "一、",
                "description": "一级标题应使用中文数字加顿号"
            },
            "二级标题": {
                "pattern": r"^（[一二三四五六七八九十]+）",
                "example": "（一）",
                "description": "二级标题应使用带括号的中文数字"
            },
            "三级标题": {
                "pattern": r"^[123456789]+\.",
                "example": "1.",
                "description": "三级标题应使用阿拉伯数字加点"
            },
            "四级标题": {
                "pattern": r"^（[123456789]+）",
                "example": "（1）",
                "description": "四级标题应使用带括号的阿拉伯数字"
            },
        }
        
        self.document_number_pattern = r"^[\u4e00-\u9fa5]+〔\d{4}〕\d+号$"
        self.incorrect_bracket_patterns = [
            (r"\(", "〔"),
            (r"\)", "〕"),
            (r"【", "〔"),
            (r"】", "〕"),
            (r"\[", "〔"),
            (r"\]", "〕"),
        ]

    def check_title_hierarchy(self, text: str) -> List[FormatIssue]:
        issues = []
        lines = text.split('\n')
        position = 0
        
        for line in lines:
            line_stripped = line.strip()
            if not line_stripped:
                position += len(line) + 1
                continue
            
            found_issue = False
            for level_name, rule in self.title_level_rules.items():
                match = re.match(rule["pattern"], line_stripped)
                if match:
                    found_issue = True
                    break
            
            if not found_issue and line_stripped:
                if re.match(r"^[\u4e00-\u9fa5]{1,5}[：:]", line_stripped):
                    issues.append(FormatIssue(
                        issue_type="标题格式",
                        category="标题层级",
                        description=f"可能的标题使用了冒号结尾：'{line_stripped[:20]}...'",
                        suggestion="建议检查标题格式，一级标题应使用'一、'格式，二级标题应使用'（一）'格式",
                        start_position=position,
                        end_position=position + len(line)
                    ))
            
            position += len(line) + 1
        
        return issues

    def check_document_number(self, text: str) -> List[FormatIssue]:
        issues = []
        
        document_number_patterns = [
            r"[\u4e00-\u9fa5]+〔\d{4}〕\d+号",
            r"[\u4e00-\u9fa5]+[（(【\[]\d{4}[）)】\]]\d+号",
        ]
        
        for pattern in document_number_patterns:
            matches = list(re.finditer(pattern, text))
            for match in matches:
                doc_num = match.group()
                if not re.match(self.document_number_pattern, doc_num):
                    suggestion = "发文字号应使用六角括号，格式为：机关代字〔年份〕序号号"
                    for wrong, correct in self.incorrect_bracket_patterns:
                        if re.search(wrong, doc_num):
                            corrected = re.sub(wrong, correct, doc_num)
                            for wrong2, correct2 in self.incorrect_bracket_patterns:
                                corrected = re.sub(wrong2, correct2, corrected)
                            suggestion = f"发文字号应使用六角括号，建议修改为：{corrected}"
                            break
                    
                    issues.append(FormatIssue(
                        issue_type="发文字号",
                        category="格式规范",
                        description=f"发文字号格式不规范：{doc_num}",
                        suggestion=suggestion,
                        start_position=match.start(),
                        end_position=match.end()
                    ))
        
        return issues

    def check_red_head_format(self, text: str) -> List[FormatIssue]:
        issues = []
        lines = text.split('\n')
        
        if len(lines) < 3:
            return issues
        
        first_line = lines[0].strip()
        
        if re.match(r"^中共中央|^国务院|^中央军委|^全国人大|^政协|^[\u4e00-\u9fa5]+人民政府|^[\u4e00-\u9fa5]+委员会", first_line):
            if len(first_line) < 20 and not re.search(r"文件$", first_line):
                if len(lines) > 1:
                    second_line = lines[1].strip()
                    if not re.search(r"文件$", second_line):
                        issues.append(FormatIssue(
                            issue_type="红头文件",
                            category="格式规范",
                            description="红头文件格式可能不规范，未找到'文件'字样",
                            suggestion="红头文件格式通常为：机关名称 + 文件（多行排列）",
                            start_position=0,
                            end_position=len(first_line)
                        ))
        
        return issues

    def check_all(self, text: str) -> List[FormatIssue]:
        issues = []
        issues.extend(self.check_title_hierarchy(text))
        issues.extend(self.check_document_number(text))
        issues.extend(self.check_red_head_format(text))
        return issues

    def to_dict_list(self, issues: List[FormatIssue]) -> List[Dict[str, Any]]:
        return [
            {
                "issue_type": i.issue_type,
                "category": i.category,
                "description": i.description,
                "suggestion": i.suggestion,
                "start_position": i.start_position,
                "end_position": i.end_position
            }
            for i in issues
        ]
