import re
from typing import List, Dict, Set

class TechEntityRecognizer:
    """技术实体识别器 - 识别帖子中提到的编程语言和头发相关关键词"""
    
    PROGRAMMING_LANGUAGES = {
        'Java': r'\bJava\b|\bJAVA\b',
        'Go': r'\bGo\b|\bGolang\b|\bgolang\b',
        'PHP': r'\bPHP\b|\bphp\b',
        'Python': r'\bPython\b|\bpython\b|\bPYTHON\b',
        'JavaScript': r'\bJavaScript\b|\bJS\b|\bjs\b|\bjavascript\b',
        'TypeScript': r'\bTypeScript\b|\bTS\b|\bts\b|\btypescript\b',
        'C++': r'\bC\+\+\b|\bc\+\+\b',
        'C#': r'\bC#\b|\bc#\b',
        'Ruby': r'\bRuby\b|\bruby\b',
        'Rust': r'\bRust\b|\brust\b',
        'Swift': r'\bSwift\b|\bswift\b',
        'Kotlin': r'\bKotlin\b|\bkotlin\b'
    }
    
    HAIR_KEYWORDS = {
        '头发', '发际线', '脱发', '秃头', '秃顶', '掉发', '植发',
        '发量', '发际线后移', 'M字秃', '地中海', '谢顶', '生发',
        '护发', '防脱', '密发', '增发', '植发', '假发'
    }
    
    def __init__(self):
        self.language_patterns = {
            lang: re.compile(pattern, re.IGNORECASE)
            for lang, pattern in self.PROGRAMMING_LANGUAGES.items()
        }
    
    def detect_languages(self, text: str) -> List[str]:
        """
        检测文本中提到的编程语言
        
        Args:
            text: 待检测的文本内容
            
        Returns:
            检测到的编程语言列表
        """
        detected = set()
        
        if not text or not isinstance(text, str):
            return []
        
        for lang, pattern in self.language_patterns.items():
            if pattern.search(text):
                detected.add(lang)
        
        return list(detected)
    
    def detect_hair_mention(self, text: str) -> bool:
        """
        检测文本中是否提到头发相关关键词
        
        Args:
            text: 待检测的文本内容
            
        Returns:
            是否提到头发相关内容
        """
        if not text or not isinstance(text, str):
            return False
        
        text_lower = text.lower()
        
        for keyword in self.HAIR_KEYWORDS:
            if keyword in text_lower:
                return True
        
        return False
    
    def analyze_post(self, post: Dict) -> Dict:
        """
        分析单篇帖子，提取编程语言和头发提及信息
        
        Args:
            post: 原始帖子数据
            
        Returns:
            增强后的帖子数据，包含检测到的语言和头发提及标记
        """
        title = post.get('title', '') or ''
        content = post.get('content', '') or ''
        full_text = f"{title} {content}"
        
        languages = self.detect_languages(full_text)
        has_hair_mention = self.detect_hair_mention(full_text)
        
        return {
            **post,
            'detected_languages': languages,
            'has_hair_mention': has_hair_mention
        }
    
    def analyze_posts(self, posts: List[Dict]) -> List[Dict]:
        """
        批量分析帖子
        
        Args:
            posts: 帖子列表
            
        Returns:
            增强后的帖子列表
        """
        return [self.analyze_post(post) for post in posts]
