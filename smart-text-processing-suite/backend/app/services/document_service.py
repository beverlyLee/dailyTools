import re
from typing import Dict, List, Any


class DocumentService:
    def __init__(self):
        self.political_terms = self._load_political_terms()
        self.collocation_rules = self._load_collocation_rules()
        self.format_rules = self._load_format_rules()
        self.polish_dictionary = self._load_polish_dictionary()
        self.punctuation_rules = self._load_punctuation_rules()
        
    def _load_political_terms(self) -> List[Dict]:
        return [
            {
                "term": "习近平新时代中国特色社会主义思想",
                "common_mistakes": ["新时代中国特色社会主义思想", "习近平思想", "习总书记思想"],
                "category": "policy",
                "explanation": "规范表述为'习近平新时代中国特色社会主义思想'"
            },
            {
                "term": "中国共产党",
                "common_mistakes": ["共产党", "中共党"],
                "category": "organization",
                "explanation": "正式文件中应使用全称'中国共产党'或规范简称'中共'"
            },
            {
                "term": "全国人民代表大会",
                "common_mistakes": ["全国人大代表大会", "人代会"],
                "category": "organization",
                "explanation": "规范表述为'全国人民代表大会'，简称'全国人大'"
            },
            {
                "term": "国务院",
                "common_mistakes": ["中央政府", "国家政府"],
                "category": "organization",
                "explanation": "正式文件中应使用'国务院'指代中央人民政府"
            },
            {
                "term": "两个维护",
                "common_mistakes": ["二个维护", "2个维护"],
                "category": "policy",
                "explanation": "规范表述为'两个维护'，指坚决维护习近平总书记党中央的核心、全党的核心地位，坚决维护党中央权威和集中统一领导"
            },
            {
                "term": "四个意识",
                "common_mistakes": ["4个意识", "四种意识"],
                "category": "policy",
                "explanation": "规范表述为'四个意识'，指政治意识、大局意识、核心意识、看齐意识"
            },
            {
                "term": "四个自信",
                "common_mistakes": ["4个自信", "四种自信"],
                "category": "policy",
                "explanation": "规范表述为'四个自信'，指道路自信、理论自信、制度自信、文化自信"
            },
            {
                "term": "五位一体",
                "common_mistakes": ["5位一体", "5个一体"],
                "category": "policy",
                "explanation": "规范表述为'五位一体'总体布局"
            },
            {
                "term": "四个全面",
                "common_mistakes": ["4个全面", "四种全面"],
                "category": "policy",
                "explanation": "规范表述为'四个全面'战略布局"
            }
        ]
    
    def _load_collocation_rules(self) -> List[Dict]:
        return [
            {
                "pattern": r"加强\s*[领导|指导|管理|监督|检查|审查|考核|评估]",
                "suggestions": {
                    "加强领导": "加强党的领导",
                    "加强指导": "加强业务指导",
                    "加强管理": "加强精细化管理",
                    "加强监督": "加强全过程监督"
                },
                "explanation": "公文写作中，'加强'后面通常需要更具体的限定词"
            },
            {
                "pattern": r"提高\s*[水平|能力|质量|效率|标准|认识]",
                "suggestions": {
                    "提高水平": "提高工作水平",
                    "提高能力": "提高履职能力",
                    "提高质量": "提高服务质量",
                    "提高效率": "提高行政效率"
                },
                "explanation": "公文写作中，'提高'后面通常需要明确具体对象"
            },
            {
                "pattern": r"落实\s*[责任|措施|任务|要求|政策]",
                "suggestions": {
                    "落实责任": "落实主体责任",
                    "落实措施": "落实具体措施",
                    "落实任务": "落实工作任务"
                },
                "explanation": "公文写作中，'落实'后面通常需要更具体的表述"
            },
            {
                "pattern": r"制定\s*[方案|计划|规定|制度|办法|细则",
                "suggestions": {
                    "制定方案": "制定实施方案",
                    "制定计划": "制定工作计划",
                    "制定规定": "制定管理规定"
                },
                "explanation": "公文写作中，'制定'后面通常需要明确具体类型"
            }
        ]
    
    def _load_format_rules(self) -> List[Dict]:
        return [
            {
                "rule_name": "发文字号格式",
                "rule_type": "number",
                "pattern": r"[（(]\s*\d{4}\s*[）)]\s*\d+[号]",
                "correct_pattern": r"〔\d{4}〕\d+号",
                "description": "发文字号格式检查",
                "suggestion": "发文字号应使用六角括号'〔〕'，格式应为：机关代字〔年份〕序号号",
                "priority": 1
            },
            {
                "rule_name": "标题层级检查",
                "rule_type": "title",
                "pattern": r"^(一|二|三|四|五|六|七|八|九|十)[、]",
                "correct_pattern": r"^(一|二|三|四|五|六|七|八|九|十)、",
                "description": "一级标题应使用'一、二、三'格式",
                "suggestion": "一级标题：一、二、三...；二级标题：（一）（二）（三）...；三级标题：1.2.3...",
                "priority": 2
            },
            {
                "rule_name": "二级标题格式",
                "rule_type": "title",
                "pattern": r"^（\d+）",
                "correct_pattern": r"^（[一二三四五六七八九十]+）",
                "description": "二级标题应使用全角括号",
                "suggestion": "二级标题应使用全角括号'（一）'而非半角"(一)',
                "priority": 2
            },
            {
                "rule_name": "标点符号检查",
                "rule_type": "punctuation",
                "pattern": r"[，。！？、；：][，。！？、；：]",
                "correct_pattern": "",
                "description": "连续标点符号检查",
                "suggestion": "不应连续使用多个标点符号",
                "priority": 3
            }
        ]
    
    def _load_polish_dictionary(self) -> List[Dict]:
        return [
            {
                "colloquial": "好像",
                "formal": "拟",
                "category": "verb",
                "explanation": "公文写作中表示计划、打算做某事时用'拟'"
            },
            {
                "colloquial": "打算",
                "formal": "拟",
                "category": "verb",
                "explanation": "公文写作中表示计划、打算做某事时用'拟'"
            },
            {
                "colloquial": "准备",
                "formal": "拟",
                "category": "verb",
                "explanation": "公文写作中表示计划、打算做某事时用'拟'"
            },
            {
                "colloquial": "大概",
                "formal": "约",
                "category": "adverb",
                "explanation": "公文写作中表示约数时用'约'"
            },
            {
                "colloquial": "大约",
                "formal": "约",
                "category": "adverb",
                "explanation": "公文写作中表示约数时用'约'"
            },
            {
                "colloquial": "现在",
                "formal": "目前",
                "category": "adverb",
                "explanation": "公文写作中表示当前时间时用'目前'"
            },
            {
                "colloquial": "现在",
                "formal": "当前",
                "category": "adverb",
                "explanation": "公文写作中表示当前时间时用'当前'"
            },
            {
                "colloquial": "以后",
                "formal": "今后",
                "category": "adverb",
                "explanation": "公文写作中表示未来时间时用'今后'"
            },
            {
                "colloquial": "后来",
                "formal": "嗣后",
                "category": "adverb",
                "explanation": "公文写作中表示后续时间时用'嗣后'"
            },
            {
                "colloquial": "因为",
                "formal": "鉴于",
                "category": "conjunction",
                "explanation": "公文写作中表示原因时用'鉴于'"
            },
            {
                "colloquial": "因为",
                "formal": "由于",
                "category": "conjunction",
                "explanation": "公文写作中表示原因时用'由于'"
            },
            {
                "colloquial": "所以",
                "formal": "故此",
                "category": "conjunction",
                "explanation": "公文写作中表示结果时用'故此'"
            },
            {
                "colloquial": "所以",
                "formal": "因此",
                "category": "conjunction",
                "explanation": "公文写作中表示结果时用'因此'"
            },
            {
                "colloquial": "但是",
                "formal": "但",
                "category": "conjunction",
                "explanation": "公文写作中表示转折时用'但'"
            },
            {
                "colloquial": "但是",
                "formal": "然而",
                "category": "conjunction",
                "explanation": "公文写作中表示转折时用'然而'"
            },
            {
                "colloquial": "告诉",
                "formal": "告知",
                "category": "verb",
                "explanation": "公文写作中表示通知时用'告知'"
            },
            {
                "colloquial": "通知",
                "formal": "告知",
                "category": "verb",
                "explanation": "公文写作中表示通知时用'告知'"
            },
            {
                "colloquial": "收到",
                "formal": "收悉",
                "category": "verb",
                "explanation": "公文写作中表示收到并了解时用'收悉'"
            },
            {
                "colloquial": "知道",
                "formal": "知悉",
                "category": "verb",
                "explanation": "公文写作中表示了解时用'知悉'"
            },
            {
                "colloquial": "参加",
                "formal": "参与",
                "category": "verb",
                "explanation": "公文写作中表示参加时用'参与'"
            },
            {
                "colloquial": "参加",
                "formal": "出席",
                "category": "verb",
                "explanation": "公文写作中表示参加会议等正式活动时用'出席'"
            },
            {
                "colloquial": "帮助",
                "formal": "协助",
                "category": "verb",
                "explanation": "公文写作中表示帮助时用'协助'"
            },
            {
                "colloquial": "商量",
                "formal": "协商",
                "category": "verb",
                "explanation": "公文写作中表示商量时用'协商'"
            },
            {
                "colloquial": "商量",
                "formal": "会商",
                "category": "verb",
                "explanation": "公文写作中表示多方商量时用'会商'"
            },
            {
                "colloquial": "要求",
                "formal": "请",
                "category": "verb",
                "explanation": "公文写作中表示请求时用'请'"
            },
            {
                "colloquial": "希望",
                "formal": "望",
                "category": "verb",
                "explanation": "公文写作中表示希望时用'望'"
            },
            {
                "colloquial": "同意",
                "formal": "准予",
                "category": "verb",
                "explanation": "公文写作中表示同意时用'准予'"
            },
            {
                "colloquial": "同意",
                "formal": "同意",
                "category": "verb",
                "explanation": "公文写作中表示同意时可保留'同意'"
            },
            {
                "colloquial": "不同意",
                "formal": "不予同意",
                "category": "verb",
                "explanation": "公文写作中表示不同意时用'不予同意'"
            },
            {
                "colloquial": "批准",
                "formal": "准予",
                "category": "verb",
                "explanation": "公文写作中表示批准时用'准予'"
            },
            {
                "colloquial": "批准",
                "formal": "核准",
                "category": "verb",
                "explanation": "公文写作中表示审查批准时用'核准'"
            },
            {
                "colloquial": "向上级",
                "formal": "妥否",
                "category": "phrase",
                "explanation": "公文结尾表示询问时用'妥否'"
            },
            {
                "colloquial": "行不行",
                "formal": "妥否",
                "category": "phrase",
                "explanation": "公文结尾表示询问时用'妥否'"
            },
            {
                "colloquial": "请批示",
                "formal": "请批示",
                "category": "phrase",
                "explanation": "公文结尾请求指示时用'请批示'"
            },
            {
                "colloquial": "请批准",
                "formal": "请予批准",
                "category": "phrase",
                "explanation": "公文结尾请求批准时用'请予批准'"
            },
            {
                "colloquial": "特此通知",
                "formal": "特此通知",
                "category": "phrase",
                "explanation": "通知结尾用'特此通知'"
            },
            {
                "colloquial": "特此报告",
                "formal": "特此报告",
                "category": "phrase",
                "explanation": "报告结尾用'特此报告'"
            }
        ]
    
    def _load_punctuation_rules(self) -> List[Dict]:
        return [
            {
                "pattern": r"[，。！？、；：][，。！？、；：]",
                "type": "punctuation",
                "severity": "warning",
                "explanation": "连续使用多个标点符号不符合规范",
                "suggestion": "删除重复的标点符号"
            },
            {
                "pattern": r"[，。！？、；：]\s*[，。！？、；：]",
                "type": "punctuation",
                "severity": "warning",
                "explanation": "标点符号间不应有空格",
                "suggestion": "删除标点符号间的空格"
            },
            {
                "pattern": r"[a-zA-Z0-9][，。！？]",
                "type": "punctuation",
                "severity": "info",
                "explanation": "英文内容后应使用英文标点",
                "suggestion": "将中文标点改为英文标点"
            },
            {
                "pattern": r"[\u4e00-\u9fa5][,.!?]",
                "type": "punctuation",
                "severity": "warning",
                "explanation": "中文内容后应使用中文标点",
                "suggestion": "将英文标点改为中文标点"
            }
        ]
    
    async def check_document(
        self,
        content: str,
        doc_type: str = "notice",
        doc_number: str = "",
        check_level: str = "standard"
    ) -> Dict[str, Any]:
        issues = []
        format_issues = []
        polish_suggestions = []
        
        issues.extend(self._check_political_terms(content))
        issues.extend(self._check_collocations(content))
        issues.extend(self._check_punctuation(content))
        issues.extend(self._check_grammar(content))
        
        format_issues.extend(self._check_format(content, doc_number))
        format_issues.extend(self._check_title_structure(content))
        
        polish_suggestions.extend(self._check_polish(content))
        
        statistics = {
            "totalIssues": len(issues),
            "errorCount": len([i for i in issues if i["severity"] == "error"]),
            "warningCount": len([i for i in issues if i["severity"] == "warning"]),
            "infoCount": len([i for i in issues if i["severity"] == "info"]),
            "formatIssues": len(format_issues),
            "polishSuggestions": len(polish_suggestions),
            "wordCount": len(content.replace(" ", "").replace("\n", ""))
        }
        
        return {
            "issues": issues,
            "formatIssues": format_issues,
            "polishSuggestions": polish_suggestions,
            "statistics": statistics
        }
    
    def _check_political_terms(self, content: str) -> List[Dict]:
        issues = []
        lines = content.split("\n")
        
        for line_num, line in enumerate(lines, 1):
            for term_item in self.political_terms:
                for mistake in term_item["common_mistakes"]:
                    if mistake in line and mistake != term_item["term"]:
                        if term_item["term"] in line:
                            continue
                        
                        start_col = line.find(mistake) + 1
                        end_col = start_col + len(mistake)
                        
                        issues.append({
                            "category": "political",
                            "severity": "error",
                            "original": mistake,
                            "suggestion": term_item["term"],
                            "explanation": term_item["explanation"],
                            "range": {
                                "startLineNumber": line_num,
                                "startColumn": start_col,
                                "endLineNumber": line_num,
                                "endColumn": end_col
                            }
                        })
        
        return issues
    
    def _check_collocations(self, content: str) -> List[Dict]:
        issues = []
        lines = content.split("\n")
        
        for line_num, line in enumerate(lines, 1):
            for rule in self.collocation_rules:
                matches = re.finditer(rule["pattern"], line)
                for match in matches:
                    suggestion = rule["suggestions"].get(match)
                    if suggestion:
                        start_col = line.find(match) + 1
                        end_col = start_col + len(match)
                        
                        issues.append({
                            "category": "collocation",
                            "severity": "info",
                            "original": match,
                            "suggestion": suggestion,
                            "explanation": rule["explanation"],
                            "range": {
                                "startLineNumber": line_num,
                                "startColumn": start_col,
                                "endLineNumber": line_num,
                                "endColumn": end_col
                            }
                        })
        
        return issues
    
    def _check_punctuation(self, content: str) -> List[Dict]:
        issues = []
        lines = content.split("\n")
        
        for line_num, line in enumerate(lines, 1):
            for rule in self.punctuation_rules:
                matches = re.finditer(rule["pattern"], line)
                for match in matches:
                    issues.append({
                        "category": "punctuation",
                        "severity": rule["severity"],
                        "original": match.group(),
                        "suggestion": rule["suggestion"],
                        "explanation": rule["explanation"],
                        "range": {
                            "startLineNumber": line_num,
                            "startColumn": match.start() + 1,
                            "endLineNumber": line_num,
                            "endColumn": match.end() + 1
                        }
                    })
        
        return issues
    
    def _check_grammar(self, content: str) -> List[Dict]:
        issues = []
        lines = content.split("\n")
        
        grammar_patterns = [
            {
                "pattern": r"被\s*让\s*我|给\s*叫\s*我",
                "category": "grammar",
                "severity": "info",
                "explanation": "'被让'、'被给'等被动句式搭配不当",
                "suggestion": "考虑简化被动句式"
            },
            {
                "pattern": r"的\s*地\s*做|的\s*地\s*跑|的\s*地\s*走|的\s*地\s*说|的\s*地\s*看",
                "category": "grammar",
                "severity": "warning",
                "explanation": "副词修饰动词时应使用'地'而非'的'",
                "suggestion": "将'的'改为'地'"
            }
        ]
        
        for line_num, line in enumerate(lines, 1):
            for pattern in grammar_patterns:
                matches = re.finditer(pattern["pattern"], line)
                for match in matches:
                    issues.append({
                        "category": pattern["category"],
                        "severity": pattern["severity"],
                        "original": match.group(),
                        "suggestion": pattern["suggestion"],
                        "explanation": pattern["explanation"],
                        "range": {
                            "startLineNumber": line_num,
                            "startColumn": match.start() + 1,
                            "endLineNumber": line_num,
                            "endColumn": match.end() + 1
                        }
                    })
        
        return issues
    
    def _check_format(self, content: str, doc_number: str) -> List[Dict]:
        issues = []
        
        if doc_number:
            correct_pattern = r"^[\u4e00-\u9fa5]+〔\d{4}〕\d+号$"
            if not re.match(correct_pattern, doc_number):
                issues.append({
                    "type": "发文字号格式",
                    "description": f"发文字号'{doc_number}'格式不规范",
                    "suggestion": "发文字号格式应为：机关代字〔年份〕序号号，如：国发〔2024〕1号",
                    "severity": "error"
                })
        
        lines = content.split("\n")
        for line_num, line in enumerate(lines, 1):
            if re.search(r"[（(]\s*\d{4}\s*[）)]", line):
                if not re.search(r"〔\d{4}〕", line):
                    issues.append({
                        "type": "年份括号格式",
                        "description": f"第{line_num}行：年份应使用六角括号'〔〕'",
                        "suggestion": "将'(2024)'或'（2024）'改为'〔2024〕'",
                        "severity": "warning"
                    })
        
        return issues
    
    def _check_title_structure(self, content: str) -> List[Dict]:
        issues = []
        lines = content.split("\n")
        
        title_levels = {
            "一级": r"^\s*[一二三四五六七八九十]+、",
            "二级": r"^\s*（[一二三四五六七八九十]+）",
            "三级": r"^\s*\d+\.",
            "四级": r"^\s*（\d+）"
        }
        
        found_levels = []
        for line_num, line in enumerate(lines, 1):
            for level_name, pattern in title_levels.items():
                if re.match(pattern, line.strip()):
                    found_levels.append({
                        "level": level_name,
                        "line": line_num,
                        "content": line.strip()
                    })
        
        expected_order = ["一级", "二级", "三级", "四级"]
        current_level = 0
        
        for item in found_levels:
            level_index = expected_order.index(item["level"])
            if level_index > current_level + 1:
                issues.append({
                    "type": "标题层级错误",
                    "description": f"第{item['line']}行：标题层级跳跃，从{expected_order[current_level]}直接跳到{item['level']}",
                    "suggestion": "标题层级应按顺序使用：一、（一）1.（1）",
                    "severity": "warning"
                })
            current_level = level_index
        
        return issues
    
    def _check_polish(self, content: str) -> List[Dict]:
        suggestions = []
        lines = content.split("\n")
        
        for line_num, line in enumerate(lines, 1):
            for item in self.polish_dictionary:
                if item["colloquial"] in line:
                    if item["formal"] in line:
                        continue
                    
                    start_col = line.find(item["colloquial"]) + 1
                    end_col = start_col + len(item["colloquial"])
                    
                    suggestions.append({
                        "original": item["colloquial"],
                        "suggestion": item["formal"],
                        "category": item["category"],
                        "explanation": item["explanation"],
                        "range": {
                            "startLineNumber": line_num,
                            "startColumn": start_col,
                            "endLineNumber": line_num,
                            "endColumn": end_col
                        }
                    })
        
        seen = set()
        unique_suggestions = []
        for s in suggestions:
            key = (s["original"], s["suggestion"])
            if key not in seen:
                seen.add(key)
                unique_suggestions.append(s)
        
        return unique_suggestions
