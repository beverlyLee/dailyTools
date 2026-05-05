import re
import random
from typing import Dict, List, Any
import jieba


class EssayService:
    def __init__(self):
        self.typo_dict = self._load_typo_dictionary()
        self.idiom_rules = self._load_idiom_rules()
        self.grammar_rules = self._load_grammar_rules()
        
    def _load_typo_dictionary(self) -> Dict[str, str]:
        return {
            "在次": "再次",
            "在说": "再说",
            "的得": "的地",
            "作做": "做",
            "坐位": "座位",
            "坐位": "座位",
            "蓝球": "篮球",
            "好象": "好像",
            "在见": "再见",
            "工课": "功课",
            "由其": "尤其",
            "在次": "再次",
            "已为": "以为",
            "在说": "再说",
            "的得": "地",
            "作做": "做",
            "坐位": "座位",
            "蓝球": "篮球",
            "好象": "好像",
            "在见": "再见",
            "工课": "功课",
            "由其": "尤其",
            "已为": "以为"
        }
    
    def _load_idiom_rules(self) -> Dict[str, Dict]:
        return {
            "事半功倍": {
                "correct_usage": "指做事得法，因而费力小，收效大",
                "common_mistakes": ["事倍功半"],
                "explanation": "注意与'事倍功半'的区别，'事半功倍'表示效率高，'事倍功半'表示效率低"
            },
            "忍俊不禁": {
                "correct_usage": "指忍不住要发笑",
                "common_mistakes": ["忍俊不禁地笑"],
                "explanation": "'忍俊不禁'本身已有'笑'的意思，不能再说'忍俊不禁地笑'"
            },
            "莘莘学子": {
                "correct_usage": "指众多的学生",
                "common_mistakes": ["一位莘莘学子", "莘莘学子们"],
                "explanation": "'莘莘'已表示众多，不能与'一位'或'们'连用"
            },
            "相提并论": {
                "correct_usage": "把不同的人或不同的事放在一起谈论或看待",
                "common_mistakes": ["同日而语"],
                "explanation": "'相提并论'可用于人或事，'同日而语'多用于时间上的比较"
            }
        }
    
    def _load_grammar_rules(self) -> List[Dict]:
        return [
            {
                "pattern": r"的\s*[地|得]\s*[是|做|跑|跳|走|说|唱|看|听|写|读]",
                "type": "grammar",
                "severity": "warning",
                "suggestion": "将'的'改为'地'修饰动词",
                "explanation": "副词修饰动词时，应该使用'地'而不是'的'"
            },
            {
                "pattern": r"得\s*[的|地]\s*[美丽|漂亮|开心|高兴|难过|兴奋|激动|惊讶|害怕]",
                "type": "grammar",
                "severity": "warning",
                "suggestion": "将'得'改为'的'修饰名词",
                "explanation": "形容词修饰名词时，应该使用'的'而不是'得'"
            },
            {
                "pattern": r"被\s*[让|给|叫|使]\s*[我|你|他|她|它|我们|你们|他们|她们|它们]",
                "type": "grammar",
                "severity": "info",
                "suggestion": "考虑简化句式",
                "explanation": "'被让'、'被给'等句式略显冗余，可以考虑简化表达"
            }
        ]
    
    async def analyze_essay(
        self,
        content: str,
        title: str = "",
        grade: str = "middle",
        word_count: int = 800
    ) -> Dict[str, Any]:
        issues = []
        
        issues.extend(self._check_typos(content))
        issues.extend(self._check_idioms(content))
        issues.extend(self._check_grammar(content))
        issues.extend(self._check_punctuation(content))
        
        scores = self._calculate_scores(content, title, grade, word_count, issues)
        
        comment = self._generate_comment(scores, issues, content, grade)
        
        total_score = scores["content"] + scores["language"] + scores["structure"]
        
        suggestions = self._generate_suggestions(scores, issues, grade)
        
        return {
            "totalScore": total_score,
            "scores": scores,
            "issues": issues,
            "comment": comment,
            "suggestions": suggestions
        }
    
    def _check_typos(self, content: str) -> List[Dict]:
        issues = []
        lines = content.split("\n")
        
        for line_num, line in enumerate(lines, 1):
            for typo, correct in self.typo_dict.items():
                if typo in line:
                    start_col = line.find(typo) + 1
                    end_col = start_col + len(typo)
                    
                    issues.append({
                        "type": "typo",
                        "severity": "error",
                        "original": typo,
                        "suggestion": correct,
                        "explanation": f"'{typo}'是错别字，正确写法应为'{correct}'",
                        "range": {
                            "startLineNumber": line_num,
                            "startColumn": start_col,
                            "endLineNumber": line_num,
                            "endColumn": end_col
                        }
                    })
        
        return issues
    
    def _check_idioms(self, content: str) -> List[Dict]:
        issues = []
        lines = content.split("\n")
        
        for line_num, line in enumerate(lines, 1):
            for idiom, rule in self.idiom_rules.items():
                for mistake in rule["common_mistakes"]:
                    if mistake in line and mistake != idiom:
                        start_col = line.find(mistake) + 1
                        end_col = start_col + len(mistake)
                        
                        issues.append({
                            "type": "idiom",
                            "severity": "warning",
                            "original": mistake,
                            "suggestion": idiom,
                            "explanation": rule["explanation"],
                            "range": {
                                "startLineNumber": line_num,
                                "startColumn": start_col,
                                "endLineNumber": line_num,
                                "endColumn": end_col
                            }
                        })
        
        return issues
    
    def _check_grammar(self, content: str) -> List[Dict]:
        issues = []
        lines = content.split("\n")
        
        for line_num, line in enumerate(lines, 1):
            for rule in self.grammar_rules:
                matches = re.finditer(rule["pattern"], line)
                for match in matches:
                    issues.append({
                        "type": rule["type"],
                        "severity": rule["severity"],
                        "original": match.group(),
                        "suggestion": rule.get("suggestion"),
                        "explanation": rule["explanation"],
                        "range": {
                            "startLineNumber": line_num,
                            "startColumn": match.start() + 1,
                            "endLineNumber": line_num,
                            "endColumn": match.end() + 1
                        }
                    })
        
        return issues
    
    def _check_punctuation(self, content: str) -> List[Dict]:
        issues = []
        lines = content.split("\n")
        
        for line_num, line in enumerate(lines, 1):
            if re.search(r"[，。！？、；：]\s+[，。！？、；：]", line):
                issues.append({
                    "type": "punctuation",
                    "severity": "warning",
                    "original": "连续标点",
                    "suggestion": "删除重复的标点符号",
                    "explanation": "连续使用多个标点符号不符合规范",
                    "range": {
                        "startLineNumber": line_num,
                        "startColumn": 1,
                        "endLineNumber": line_num,
                        "endColumn": len(line) + 1
                    }
                })
            
            if re.search(r"[a-zA-Z][，。！？、；：]", line):
                issues.append({
                    "type": "punctuation",
                    "severity": "info",
                    "original": "英文标点混用",
                    "suggestion": "英文内容使用英文标点",
                    "explanation": "英文内容后应使用英文标点符号",
                    "range": {
                        "startLineNumber": line_num,
                        "startColumn": 1,
                        "endLineNumber": line_num,
                        "endColumn": len(line) + 1
                    }
                })
        
        return issues
    
    def _calculate_scores(
        self,
        content: str,
        title: str,
        grade: str,
        expected_word_count: int,
        issues: List[Dict]
    ) -> Dict[str, int]:
        actual_word_count = len(content.replace(" ", "").replace("\n", ""))
        
        content_score = 25
        if title and content:
            if len(title) > 5:
                content_score += 5
            if actual_word_count >= expected_word_count * 0.8:
                content_score += 5
            
            paragraphs = content.split("\n")
            if len(paragraphs) >= 3:
                content_score += 3
            
            sentences = re.split(r"[。！？]", content)
            if len([s for s in sentences if len(s.strip()) > 0]) >= 10:
                content_score += 2
        
        language_score = 25
        typo_count = len([i for i in issues if i["type"] == "typo"])
        grammar_count = len([i for i in issues if i["type"] == "grammar"])
        idiom_count = len([i for i in issues if i["type"] == "idiom"])
        
        language_score -= min(typo_count * 2, 10)
        language_score -= min(grammar_count * 1, 5)
        language_score -= min(idiom_count * 2, 5)
        language_score = max(0, language_score)
        
        words = jieba.lcut(content)
        unique_words = len(set(words))
        if unique_words > 100:
            language_score += 5
        language_score = min(35, language_score)
        
        structure_score = 15
        paragraphs = [p for p in content.split("\n") if p.strip()]
        if len(paragraphs) >= 5:
            structure_score += 5
        elif len(paragraphs) >= 3:
            structure_score += 3
        
        if any(p.startswith("首先") or p.startswith("第一") for p in paragraphs):
            structure_score += 3
        if any(p.startswith("其次") or p.startswith("第二") for p in paragraphs):
            structure_score += 2
        if any(p.startswith("最后") or p.startswith("总之") for p in paragraphs):
            structure_score += 2
        
        structure_score = min(30, structure_score)
        
        return {
            "content": min(40, content_score),
            "language": min(35, language_score),
            "structure": min(25, structure_score)
        }
    
    def _generate_comment(
        self,
        scores: Dict[str, int],
        issues: List[Dict],
        content: str,
        grade: str
    ) -> str:
        total = sum(scores.values())
        
        if total >= 85:
            grade_comment = "优秀"
        elif total >= 70:
            grade_comment = "良好"
        elif total >= 60:
            grade_comment = "及格"
        else:
            grade_comment = "需要努力"
        
        comments = []
        comments.append(f"综合评价：{grade_comment}（总分{total}分）。")
        
        if scores["content"] >= 32:
            comments.append("内容立意方面表现优秀，主题明确，选材恰当，中心突出。")
        elif scores["content"] >= 24:
            comments.append("内容立意方面表现良好，有明确的主题，选材基本恰当。")
        else:
            comments.append("内容立意方面需要加强，建议进一步明确主题，丰富内容。")
        
        if scores["language"] >= 28:
            comments.append("语言表达流畅，用词丰富，句式多样，展现了较好的语言功底。")
        elif scores["language"] >= 21:
            comments.append("语言表达基本通顺，有一定的词汇量，但句式可以更加多样化。")
        else:
            comments.append("语言表达需要提升，建议增加词汇积累，注意语法规范。")
        
        if scores["structure"] >= 20:
            comments.append("文章结构清晰，层次分明，段落衔接自然，有较强的逻辑感。")
        elif scores["structure"] >= 15:
            comments.append("文章结构基本完整，有开头、主体和结尾，段落划分合理。")
        else:
            comments.append("文章结构需要改进，建议明确段落划分，注意首尾呼应。")
        
        typo_count = len([i for i in issues if i["type"] == "typo"])
        grammar_count = len([i for i in issues if i["type"] == "grammar"])
        idiom_count = len([i for i in issues if i["type"] == "idiom"])
        
        if typo_count > 0:
            comments.append(f"发现{typo_count}个错别字，请注意汉字的正确书写。")
        if grammar_count > 0:
            comments.append(f"存在{grammar_count}处语法问题，建议复习'的、地、得'的用法。")
        if idiom_count > 0:
            comments.append(f"有{idiom_count}处成语使用不够恰当，请注意成语的正确搭配和语境。")
        
        return "".join(comments)
    
    def _generate_suggestions(
        self,
        scores: Dict[str, int],
        issues: List[Dict],
        grade: str
    ) -> List[str]:
        suggestions = []
        
        if scores["content"] < 28:
            suggestions.append("建议增加阅读量，积累写作素材，提升内容的丰富度和深度。")
            suggestions.append("写作前先列提纲，明确文章结构和各段落要点。")
        
        if scores["language"] < 24:
            suggestions.append("加强词汇积累，多练习同义词替换，丰富语言表达。")
            suggestions.append("注意'的、地、得'的正确使用：'的'修饰名词，'地'修饰动词，'得'补充说明。")
        
        if scores["structure"] < 18:
            suggestions.append("学习范文的结构安排，注意开头、中间、结尾的呼应。")
            suggestions.append("使用关联词（首先、其次、最后）使文章条理更清晰。")
        
        typo_count = len([i for i in issues if i["type"] == "typo"])
        if typo_count > 2:
            suggestions.append("写完后多读几遍，注意检查错别字，养成自查习惯。")
        
        idiom_count = len([i for i in issues if i["type"] == "idiom"])
        if idiom_count > 0:
            suggestions.append("使用成语前先确认其准确含义和适用语境，避免望文生义。")
        
        if not suggestions:
            suggestions.append("继续保持优秀的写作习惯，多读多写，不断提升写作水平。")
            suggestions.append("尝试使用更复杂的句式和修辞，增加文章的文采。")
        
        return suggestions
