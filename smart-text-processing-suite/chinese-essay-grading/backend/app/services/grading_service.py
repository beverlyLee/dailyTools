import re
import jieba
from typing import Dict, Any, List, Optional, Tuple
from dataclasses import dataclass
from abc import ABC, abstractmethod


@dataclass
class GradingResult:
    content_score: float
    language_score: float
    structure_score: float
    total_score: float
    
    content_comment: str
    language_comment: str
    structure_comment: str
    overall_comment: str
    
    suggestions: str
    highlights: str


class BaseGradingStrategy(ABC):
    
    @abstractmethod
    def grade(self, text: str, metadata: Dict[str, Any] = None) -> GradingResult:
        pass


class PrimarySchoolGradingStrategy(BaseGradingStrategy):
    
    def __init__(self):
        self.content_weights = {
            'theme_clarity': 0.3,
            'theme_relevance': 0.3,
            'content_richness': 0.2,
            'emotion_authenticity': 0.2
        }
        self.language_weights = {
            'word_accuracy': 0.3,
            'sentence_smoothness': 0.3,
            'rhetorical_devices': 0.2,
            'vocabulary_richness': 0.2
        }
        self.structure_weights = {
            'paragraph_structure': 0.4,
            'logical_order': 0.3,
            'beginning_end': 0.3
        }
    
    def grade(self, text: str, metadata: Dict[str, Any] = None) -> GradingResult:
        content_score = self._grade_content(text, metadata)
        language_score = self._grade_language(text, metadata)
        structure_score = self._grade_structure(text, metadata)
        
        total_score = (content_score * 0.4 + 
                       language_score * 0.35 + 
                       structure_score * 0.25)
        
        total_score = round(total_score, 1)
        
        content_comment = self._generate_content_comment(content_score, text)
        language_comment = self._generate_language_comment(language_score, text)
        structure_comment = self._generate_structure_comment(structure_score, text)
        overall_comment = self._generate_overall_comment(total_score, text)
        
        suggestions = self._generate_suggestions(content_score, language_score, structure_score, text)
        highlights = self._generate_highlights(content_score, language_score, structure_score, text)
        
        return GradingResult(
            content_score=content_score,
            language_score=language_score,
            structure_score=structure_score,
            total_score=total_score,
            content_comment=content_comment,
            language_comment=language_comment,
            structure_comment=structure_comment,
            overall_comment=overall_comment,
            suggestions=suggestions,
            highlights=highlights
        )
    
    def _grade_content(self, text: str, metadata: Dict[str, Any] = None) -> float:
        score = 0.0
        
        if len(text) >= 300:
            score += 20
        elif len(text) >= 200:
            score += 15
        elif len(text) >= 100:
            score += 10
        else:
            score += 5
        
        paragraph_count = text.count('\n\n') + 1
        if paragraph_count >= 3:
            score += 15
        elif paragraph_count >= 2:
            score += 10
        else:
            score += 5
        
        sentences = re.split(r'[。！？]', text)
        sentences = [s.strip() for s in sentences if s.strip()]
        if len(sentences) >= 15:
            score += 15
        elif len(sentences) >= 10:
            score += 12
        elif len(sentences) >= 5:
            score += 8
        else:
            score += 3
        
        words = list(jieba.cut(text))
        adjectives = sum(1 for w in words if len(w) >= 2 and self._is_adjective(w))
        if adjectives >= 8:
            score += 20
        elif adjectives >= 5:
            score += 15
        elif adjectives >= 3:
            score += 10
        else:
            score += 5
        
        verbs = sum(1 for w in words if len(w) >= 2 and self._is_verb(w))
        if verbs >= 10:
            score += 15
        elif verbs >= 6:
            score += 12
        elif verbs >= 3:
            score += 8
        else:
            score += 5
        
        if '我' in text or '我们' in text:
            score += 10
        
        rhetorical_count = self._count_rhetorical_devices(text)
        if rhetorical_count >= 3:
            score += 5
        
        score = min(score, 100)
        
        return round(score, 1)
    
    def _grade_language(self, text: str, metadata: Dict[str, Any] = None) -> float:
        score = 0.0
        
        sentences = re.split(r'[。！？\n]', text)
        sentences = [s.strip() for s in sentences if s.strip()]
        
        long_sentences = sum(1 for s in sentences if len(s) > 50)
        if long_sentences <= 2:
            score += 20
        elif long_sentences <= 5:
            score += 15
        else:
            score += 10
        
        word_count = len(list(jieba.cut(text)))
        unique_words = len(set(jieba.cut(text)))
        if word_count > 0:
            diversity = unique_words / word_count
            if diversity > 0.6:
                score += 25
            elif diversity > 0.4:
                score += 20
            elif diversity > 0.2:
                score += 15
            else:
                score += 10
        
        adjectives = sum(1 for w in jieba.cut(text) if len(w) >= 2 and self._is_adjective(w))
        if adjectives >= 10:
            score += 20
        elif adjectives >= 6:
            score += 15
        elif adjectives >= 3:
            score += 10
        else:
            score += 5
        
        verbs = sum(1 for w in jieba.cut(text) if len(w) >= 2 and self._is_verb(w))
        if verbs >= 15:
            score += 20
        elif verbs >= 10:
            score += 15
        elif verbs >= 5:
            score += 10
        else:
            score += 5
        
        adverbs = sum(1 for w in jieba.cut(text) if len(w) >= 2 and self._is_adverb(w))
        if adverbs >= 5:
            score += 15
        elif adverbs >= 3:
            score += 10
        elif adverbs >= 1:
            score += 5
        
        score = min(score, 100)
        
        return round(score, 1)
    
    def _grade_structure(self, text: str, metadata: Dict[str, Any] = None) -> float:
        score = 0.0
        
        paragraph_count = text.count('\n\n') + 1
        if paragraph_count >= 5:
            score += 30
        elif paragraph_count >= 4:
            score += 25
        elif paragraph_count >= 3:
            score += 20
        elif paragraph_count >= 2:
            score += 15
        else:
            score += 10
        
        lines = text.split('\n')
        lines = [l.strip() for l in lines if l.strip()]
        
        if len(lines) >= 1:
            first_line = lines[0]
            if len(first_line) <= 50 and len(first_line) >= 5:
                score += 20
            elif len(first_line) <= 100:
                score += 15
            else:
                score += 10
        
        if len(lines) >= 2:
            last_line = lines[-1]
            if '总结' in last_line or '总之' in last_line or '因此' in last_line or '所以' in last_line:
                score += 25
            elif len(last_line) <= 50:
                score += 20
            else:
                score += 15
        
        transition_words = ['首先', '其次', '然后', '接着', '最后', '总之', '因此', '所以', '但是', '然而', '不仅如此', '除此之外']
        transition_count = sum(1 for w in transition_words if w in text)
        if transition_count >= 4:
            score += 25
        elif transition_count >= 2:
            score += 20
        elif transition_count >= 1:
            score += 15
        else:
            score += 10
        
        score = min(score, 100)
        
        return round(score, 1)
    
    def _is_adjective(self, word: str) -> bool:
        adj_suffixes = ['的', '了', '很', '真', '太', '最', '更']
        adj_words = ['美丽', '漂亮', '可爱', '高兴', '快乐', '开心', '难过', '伤心', 
                      '大', '小', '高', '矮', '长', '短', '多', '少', '好', '坏',
                      '优秀', '精彩', '出色', '棒', '厉害', '聪明', '笨', '傻',
                      '温暖', '寒冷', '炎热', '凉爽', '舒服', '难受', '辛苦', '轻松',
                      '丰富', '多彩', '绚烂', '美丽', '壮观', '雄伟', '宏伟']
        
        if word in adj_words:
            return True
        if len(word) >= 2 and word[-1] in adj_suffixes:
            return True
        return False
    
    def _is_verb(self, word: str) -> bool:
        verb_suffixes = ['了', '着', '过', '去', '来', '到']
        verb_words = ['跑', '跳', '走', '来', '去', '看', '听', '说', '写', '读',
                      '学习', '工作', '吃饭', '睡觉', '起床', '洗脸', '刷牙',
                      '喜欢', '讨厌', '爱', '恨', '想', '希望', '期待', '愿望',
                      '打', '踢', '扔', '捡', '拿', '放', '推', '拉', '开', '关',
                      '唱', '跳', '舞', '画', '写', '读', '算', '思考', '想象']
        
        if word in verb_words:
            return True
        if len(word) >= 2 and word[-1] in verb_suffixes:
            return True
        return False
    
    def _is_adverb(self, word: str) -> bool:
        adverb_words = ['很', '非常', '特别', '十分', '太', '真', '最', '更',
                        '渐渐', '慢慢', '悄悄', '匆匆', '静静', '轻轻',
                        '终于', '突然', '忽然', '立刻', '马上', '赶紧',
                        '还', '又', '再', '也', '都', '就', '才']
        
        return word in adverb_words
    
    def _count_rhetorical_devices(self, text: str) -> int:
        count = 0
        
        metaphor_words = ['像', '似', '如', '仿佛', '犹如', '宛如', '好比', '是']
        for w in metaphor_words:
            count += text.count(w + ' ')
        
        questions = re.findall(r'[？?]', text)
        count += len(questions)
        
        exclamations = re.findall(r'[！!]', text)
        count += len(exclamations) // 2
        
        return count
    
    def _generate_content_comment(self, score: float, text: str) -> str:
        if score >= 85:
            return "作文内容充实，主题明确，立意积极向上。作者能够围绕中心展开叙述，选材恰当，内容丰富。情感表达真挚自然，能够让读者感受到作者的真实想法和感受。"
        elif score >= 70:
            return "作文内容较为充实，主题基本明确，立意较为积极。作者能够围绕中心进行叙述，但选材可以更加典型。情感表达比较自然，建议增加一些具体的细节描写。"
        elif score >= 60:
            return "作文内容基本完整，能够表达基本意思。但主题不够明确，内容较为单薄。建议在写作前先确定中心思想，然后围绕中心选择具体的事例进行叙述。"
        else:
            return "作文内容不够完整，表达不够清晰。建议先明确要表达的中心思想，然后围绕中心组织材料。注意选择具体的事例来支撑观点。"
    
    def _generate_language_comment(self, score: float, text: str) -> str:
        if score >= 85:
            return "语言表达流畅自然，用词准确恰当。作者能够运用丰富的词汇和多样的句式，使文章生动形象。修辞手法运用得当，增强了文章的表达效果。"
        elif score >= 70:
            return "语言表达较为流畅，用词基本准确。词汇量尚可，但句式变化不够丰富。建议多运用一些修辞手法，使文章更加生动。"
        elif score >= 60:
            return "语言表达基本通顺，但存在一些用词不当和句式单调的问题。建议增加词汇积累，注意词语的准确使用。同时尝试运用不同的句式，使文章更加生动。"
        else:
            return "语言表达存在较多问题，用词不够准确，句子不够通顺。建议加强基础词汇和语法的学习，多阅读优秀范文，学习他人的表达方式。"
    
    def _generate_structure_comment(self, score: float, text: str) -> str:
        if score >= 85:
            return "文章结构严谨，层次分明。开头引人入胜，结尾点明主旨。段落之间过渡自然，逻辑清晰。详略得当，重点突出。"
        elif score >= 70:
            return "文章结构较为完整，层次基本清晰。开头和结尾都有交代，但段落之间的过渡可以更加自然。注意段落之间的逻辑关系。"
        elif score >= 60:
            return "文章结构不够完整，层次不够清晰。建议在写作前先构思好文章的结构，明确开头、中间和结尾各写什么。注意段落之间的过渡和衔接。"
        else:
            return "文章结构松散，缺乏条理。建议在写作前先列好提纲，明确文章的结构安排。注意段落之间的逻辑关系，使文章层次分明。"
    
    def _generate_overall_comment(self, score: float, text: str) -> str:
        if score >= 90:
            return f"这是一篇优秀的作文，总分{score}分。文章主题鲜明，内容充实，语言流畅，结构严谨。作者展现了良好的写作能力和语言素养。继续保持！"
        elif score >= 80:
            return f"这是一篇很好的作文，总分{score}分。文章主题明确，内容丰富，语言通顺，结构完整。作者写作基础扎实，建议在细节描写和修辞手法上再下功夫。"
        elif score >= 70:
            return f"这是一篇不错的作文，总分{score}分。文章基本符合要求，表达比较清楚。建议在内容充实、语言丰富和结构严谨方面继续努力。"
        elif score >= 60:
            return f"这篇作文基本及格，总分{score}分。文章能够表达基本意思，但在内容、语言和结构上都有较大提升空间。建议多阅读多练习，逐步提高写作能力。"
        else:
            return f"这篇作文需要改进，总分{score}分。建议从基础开始练习，先学习如何把句子写通顺，把意思表达清楚。多阅读范文，积累词汇和句式。"
    
    def _generate_suggestions(self, content_score: float, language_score: float, structure_score: float, text: str) -> str:
        suggestions = []
        
        if content_score < 70:
            suggestions.append("1. 内容方面：建议在写作前先确定中心思想，然后围绕中心选择具体的事例。注意增加细节描写，使内容更加充实。")
        
        if language_score < 70:
            suggestions.append("2. 语言方面：建议增加词汇积累，注意词语的准确使用。尝试运用不同的句式和修辞手法，使语言更加生动。")
        
        if structure_score < 70:
            suggestions.append("3. 结构方面：建议在写作前先列好提纲，明确文章的结构安排。注意段落之间的过渡和衔接，使文章层次分明。")
        
        if not suggestions:
            suggestions.append("你的作文已经写得很好了！建议继续保持，并尝试在以下方面突破：\n1. 尝试运用更多样化的修辞手法\n2. 增加一些新颖的观点和角度\n3. 注意语言的锤炼，使表达更加精准")
        
        return "\n".join(suggestions)
    
    def _generate_highlights(self, content_score: float, language_score: float, structure_score: float, text: str) -> str:
        highlights = []
        
        if content_score >= 80:
            highlights.append("✓ 内容充实，选材恰当，情感真挚")
        
        if language_score >= 80:
            highlights.append("✓ 语言流畅，用词准确，修辞手法运用得当")
        
        if structure_score >= 80:
            highlights.append("✓ 结构严谨，层次分明，过渡自然")
        
        if not highlights:
            highlights.append("继续努力，你的作文会越来越好！")
        
        return "\n".join(highlights)


class MiddleSchoolGradingStrategy(PrimarySchoolGradingStrategy):
    
    def __init__(self):
        super().__init__()
        self.content_weights = {
            'theme_clarity': 0.25,
            'theme_profundity': 0.25,
            'innovation': 0.2,
            'emotion_authenticity': 0.15,
            'content_richness': 0.15
        }
    
    def _grade_content(self, text: str, metadata: Dict[str, Any] = None) -> float:
        base_score = super()._grade_content(text, metadata)
        
        innovation_score = self._evaluate_innovation(text)
        
        final_score = base_score * 0.7 + innovation_score * 0.3
        
        return round(final_score, 1)
    
    def _evaluate_innovation(self, text: str) -> float:
        score = 0.0
        
        unique_words = len(set(jieba.cut(text)))
        if unique_words > 100:
            score += 30
        elif unique_words > 70:
            score += 20
        elif unique_words > 50:
            score += 15
        else:
            score += 10
        
        unique_phrases = self._extract_unique_phrases(text)
        if len(unique_phrases) > 5:
            score += 35
        elif len(unique_phrases) > 3:
            score += 25
        elif len(unique_phrases) > 1:
            score += 15
        else:
            score += 10
        
        if '我认为' in text or '在我看来' in text or '我觉得' in text:
            score += 20
        elif '有人说' in text or '常言道' in text:
            score += 15
        
        score = min(score, 100)
        
        return score
    
    def _extract_unique_phrases(self, text: str) -> List[str]:
        words = list(jieba.cut(text))
        phrases = []
        for i in range(len(words) - 1):
            if len(words[i]) >= 2 and len(words[i+1]) >= 2:
                phrases.append(words[i] + words[i+1])
        return list(set(phrases))


class GradingService:
    
    def __init__(self):
        self.strategies = {
            'primary': PrimarySchoolGradingStrategy(),
            'middle': MiddleSchoolGradingStrategy(),
            'high': MiddleSchoolGradingStrategy()
        }
    
    def grade(self, text: str, grade_level: str = 'primary', metadata: Dict[str, Any] = None) -> GradingResult:
        strategy = self.strategies.get(grade_level, PrimarySchoolGradingStrategy())
        return strategy.grade(text, metadata)
    
    def grade_to_dict(self, result: GradingResult) -> Dict[str, Any]:
        return {
            'content_score': result.content_score,
            'language_score': result.language_score,
            'structure_score': result.structure_score,
            'total_score': result.total_score,
            'content_comment': result.content_comment,
            'language_comment': result.language_comment,
            'structure_comment': result.structure_comment,
            'overall_comment': result.overall_comment,
            'suggestions': result.suggestions,
            'highlights': result.highlights
        }


def get_grading_service() -> GradingService:
    return GradingService()
