import re
import jieba
from collections import Counter

class GradingService:
    def __init__(self):
        self._init_keywords()
    
    def _init_keywords(self):
        self.positive_words = {
            '美丽', '漂亮', '美好', '精彩', '出色', '优秀', '卓越', '杰出',
            '幸福', '快乐', '开心', '喜悦', '愉快', '欢乐', '高兴', '兴奋',
            '成功', '胜利', '成就', '成绩', '进步', '提高', '成长', '发展',
            '希望', '梦想', '目标', '追求', '奋斗', '努力', '坚持', '不懈',
            '温暖', '温馨', '和谐', '友爱', '友谊', '亲情', '爱情', '感情',
            '感恩', '感谢', '感激', '欣赏', '赞美', '表扬', '鼓励', '支持',
            '勇敢', '坚强', '自信', '乐观', '积极', '向上', '进取', '勤奋',
            '诚实', '真诚', '守信', '宽容', '理解', '尊重', '礼貌', '谦逊',
        }
        
        self.negative_words = {
            '丑陋', '糟糕', '恶劣', '差劲', '失望', '失败', '挫折', '困难',
            '悲伤', '痛苦', '难过', '伤心', '忧愁', '烦恼', '焦虑', '紧张',
            '恐惧', '害怕', '担忧', '不安', '愤怒', '生气', '恼火', '烦躁',
            '懒惰', '松懈', '放弃', '退缩', '逃避', '犹豫', '迷茫', '困惑',
            '自私', '贪婪', '虚伪', '欺骗', '背叛', '伤害', '恶意', '敌意',
        }
        
        self.topic_keywords = {
            '亲情': ['妈妈', '爸爸', '父母', '爷爷', '奶奶', '外公', '外婆', '家人', '家庭', '爱', '温暖', '关心'],
            '友情': ['朋友', '同学', '伙伴', '闺蜜', '哥们', '友谊', '帮助', '支持', '陪伴'],
            '成长': ['成长', '长大', '变化', '进步', '学习', '努力', '奋斗', '目标', '梦想'],
            '自然': ['春天', '夏天', '秋天', '冬天', '花', '树', '草', '山', '水', '大海', '天空', '阳光'],
            '感恩': ['感谢', '感恩', '感激', '回报', '奉献', '帮助', '爱心'],
            '坚持': ['坚持', '不懈', '努力', '不放弃', '毅力', '恒心', '决心'],
        }
    
    def grade_essay(self, text, analysis_result):
        content_score, content_comment = self._grade_content(text)
        language_score, language_comment = self._grade_language(text, analysis_result)
        structure_score, structure_comment = self._grade_structure(text)
        
        total_score = round((content_score * 0.4 + language_score * 0.35 + structure_score * 0.25), 2)
        
        overall_comment = self._generate_overall_comment(content_score, language_score, structure_score, total_score)
        
        suggestions = self._generate_suggestions(content_score, language_score, structure_score, text, analysis_result)
        
        return {
            'content_score': content_score,
            'language_score': language_score,
            'structure_score': structure_score,
            'total_score': total_score,
            'content_comment': content_comment,
            'language_comment': language_comment,
            'structure_comment': structure_comment,
            'overall_comment': overall_comment,
            'suggestions': suggestions
        }
    
    def _grade_content(self, text):
        score = 60.0
        comments = []
        
        word_count = len(text)
        if word_count >= 800:
            score += 10
            comments.append('作文篇幅充足，内容详实。')
        elif word_count >= 600:
            score += 5
            comments.append('作文篇幅基本符合要求。')
        elif word_count >= 400:
            comments.append('作文篇幅稍短，建议增加内容。')
        else:
            score -= 10
            comments.append('作文篇幅过短，需要补充更多内容。')
        
        words = list(jieba.cut(text))
        positive_count = sum(1 for w in words if w in self.positive_words)
        negative_count = sum(1 for w in words if w in self.negative_words)
        
        if positive_count >= 5:
            score += 10
            comments.append('文章情感真挚，富有感染力。')
        elif positive_count >= 3:
            score += 5
            comments.append('文章有一定的情感表达。')
        
        topics_detected = []
        for topic, keywords in self.topic_keywords.items():
            count = sum(1 for w in words if w in keywords)
            if count >= 3:
                topics_detected.append(topic)
        
        if topics_detected:
            score += 15
            comments.append(f'文章主题明确，围绕"{topics_detected[0]}"展开叙述。')
        else:
            score -= 5
            comments.append('文章主题不够鲜明，建议明确中心思想。')
        
        unique_words = len(set(words))
        lexical_diversity = unique_words / len(words) if words else 0
        
        if lexical_diversity >= 0.6:
            score += 5
            comments.append('词汇丰富，表达多样。')
        
        score = min(100, max(0, score))
        
        return round(score, 2), ' '.join(comments) if comments else '文章内容基本完整。'
    
    def _grade_language(self, text, analysis_result):
        score = 60.0
        comments = []
        
        syntax = analysis_result.get('syntax_analysis', {})
        sentence_count = syntax.get('sentence_count', 0)
        avg_length = syntax.get('avg_sentence_length', 0)
        
        if sentence_count >= 10:
            score += 5
            comments.append('句子数量充足，段落层次分明。')
        elif sentence_count < 5:
            score -= 5
            comments.append('句子数量较少，建议增加分句。')
        
        if 10 <= avg_length <= 25:
            score += 10
            comments.append('句子长度适中，节奏感强。')
        elif avg_length > 30:
            score -= 5
            comments.append('部分句子过长，建议适当拆分。')
        elif avg_length < 8:
            score -= 5
            comments.append('句子过于简短，建议合并或扩展。')
        
        patterns = syntax.get('sentence_patterns', {})
        total = sum(patterns.values()) if patterns else 1
        
        if patterns.get('exclamatory', 0) > 0:
            score += 3
            comments.append('能够使用感叹句增强表达效果。')
        
        if patterns.get('interrogative', 0) > 0:
            score += 3
            comments.append('能够使用设问句引发思考。')
        
        typos = analysis_result.get('typos', [])
        if len(typos) == 0:
            score += 10
            comments.append('未发现明显错别字，书写规范。')
        elif len(typos) <= 2:
            score += 5
            comments.append('错别字较少，不影响整体阅读。')
        elif len(typos) <= 5:
            score -= 5
            comments.append(f'发现{len(typos)}处错别字，建议仔细检查。')
        else:
            score -= 15
            comments.append(f'发现{len(typos)}处错别字，需要加强字词练习。')
        
        idiom_issues = analysis_result.get('idiom_issues', [])
        if len(idiom_issues) > 0:
            score -= 5
            comments.append(f'发现{len(idiom_issues)}处成语使用问题，建议注意成语的感情色彩和使用语境。')
        
        words = list(jieba.cut(text))
        idiom_count = sum(1 for w in words if len(w) >= 4)
        if idiom_count >= 3:
            score += 5
            comments.append('能够运用成语丰富语言表达。')
        
        score = min(100, max(0, score))
        
        return round(score, 2), ' '.join(comments) if comments else '语言表达基本通顺。'
    
    def _grade_structure(self, text):
        score = 60.0
        comments = []
        
        paragraphs = re.split(r'\n\s*\n', text)
        paragraphs = [p.strip() for p in paragraphs if p.strip()]
        
        if len(paragraphs) >= 5:
            score += 10
            comments.append('文章结构完整，段落划分清晰。')
        elif len(paragraphs) >= 3:
            score += 5
            comments.append('文章有基本的段落结构。')
        else:
            score -= 10
            comments.append('文章段落划分不明显，建议增加分段。')
        
        intro_words = ['开头', '首先', '第一', '记得', '那是', '在我', '从前']
        conclusion_words = ['总之', '总而言之', '因此', '所以', '最后', '结尾', '通过']
        
        if len(paragraphs) > 0:
            intro = paragraphs[0][:50] if len(paragraphs[0]) > 50 else paragraphs[0]
            if any(w in intro for w in intro_words) or len(paragraphs[0]) < 150:
                score += 5
                comments.append('开头简洁，能够引出主题。')
        
        if len(paragraphs) >= 2:
            conclusion = paragraphs[-1][-100:] if len(paragraphs[-1]) > 100 else paragraphs[-1]
            if any(w in conclusion for w in conclusion_words) or len(paragraphs[-1]) < 150:
                score += 10
                comments.append('结尾能够总结全文，点明中心。')
        
        if len(paragraphs) >= 3:
            body_lengths = [len(p) for p in paragraphs[1:-1]]
            avg_body = sum(body_lengths) / len(body_lengths) if body_lengths else 0
            if avg_body >= 100:
                score += 5
                comments.append('中间部分内容充实，论证充分。')
        
        score = min(100, max(0, score))
        
        return round(score, 2), ' '.join(comments) if comments else '文章结构基本完整。'
    
    def _generate_overall_comment(self, content_score, language_score, structure_score, total_score):
        if total_score >= 90:
            return (f'这是一篇优秀的作文！总分{total_score}分。'
                    f'内容立意{content_score}分，语言表达{language_score}分，结构层次{structure_score}分。'
                    '文章主题鲜明，情感真挚，语言流畅，结构完整，值得表扬！')
        elif total_score >= 80:
            return (f'这是一篇良好的作文，总分{total_score}分。'
                    f'内容立意{content_score}分，语言表达{language_score}分，结构层次{structure_score}分。'
                    '文章整体表现不错，有一些亮点，但也有可以改进的地方。')
        elif total_score >= 70:
            return (f'这是一篇中等水平的作文，总分{total_score}分。'
                    f'内容立意{content_score}分，语言表达{language_score}分，结构层次{structure_score}分。'
                    '文章基本符合要求，但在内容充实度、语言表达或结构安排上还需要加强。')
        elif total_score >= 60:
            return (f'这篇作文刚刚及格，总分{total_score}分。'
                    f'内容立意{content_score}分，语言表达{language_score}分，结构层次{structure_score}分。'
                    '文章存在较多问题，建议在以下方面加强：增加内容篇幅、注意语言规范、理清文章结构。')
        else:
            return (f'这篇作文需要大幅改进，总分{total_score}分。'
                    f'内容立意{content_score}分，语言表达{language_score}分，结构层次{structure_score}分。'
                    '建议从基础开始练习：先确定一个明确的主题，然后围绕主题组织材料，注意语言规范和段落划分。')
    
    def _generate_suggestions(self, content_score, language_score, structure_score, text, analysis_result):
        suggestions = []
        
        if content_score < 70:
            suggestions.append('【内容建议】建议增加文章篇幅，围绕主题补充更多细节和例子。')
            suggestions.append('【内容建议】可以尝试使用更多的描写，让文章更加生动具体。')
        
        if language_score < 70:
            typos = analysis_result.get('typos', [])
            if typos:
                suggestions.append(f'【语言建议】注意纠正以下错别字：{", ".join([t["original"] for t in typos[:5]])}')
            suggestions.append('【语言建议】建议增加句子的多样性，交替使用长短句。')
            suggestions.append('【语言建议】可以适当运用成语、修辞手法来丰富语言表达。')
        
        if structure_score < 70:
            suggestions.append('【结构建议】建议明确划分段落，每段围绕一个中心意思展开。')
            suggestions.append('【结构建议】注意文章的开头、中间和结尾的比例分配。')
            suggestions.append('【结构建议】可以使用过渡词（如"首先"、"其次"、"最后"）来使文章更有条理。')
        
        if not suggestions:
            suggestions.append('你的作文表现优秀！建议继续保持，尝试更多样的写作风格和题材。')
        
        return '\n'.join(suggestions)
