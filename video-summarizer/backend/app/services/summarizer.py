import re
import math
from collections import defaultdict
from typing import List, Dict, Any, Optional
import jieba


class TextRankSummarizer:
    def __init__(self, d: float = 0.85, max_iter: int = 100, tol: float = 1e-6):
        self.d = d
        self.max_iter = max_iter
        self.tol = tol
    
    def split_sentences(self, text: str) -> List[str]:
        sentences = re.split(r'[。！？.!?]+', text)
        sentences = [s.strip() for s in sentences if s.strip()]
        return sentences
    
    def preprocess_sentence(self, sentence: str) -> List[str]:
        words = jieba.lcut(sentence)
        stopwords = set([
            '的', '了', '是', '在', '我', '有', '和', '就', '不', '人', '都', '一', '一个',
            '上', '也', '很', '到', '说', '要', '去', '你', '会', '着', '没有', '看', '好',
            '自己', '这', '那', '他', '她', '它', '们', '这个', '那个', '什么', '怎么',
            '为什么', '哪', '哪里', '谁', '多少', '几', '啊', '吧', '呢', '吗', '呀', '哦',
            '嗯', '哈', '哎', '唉', '噢', '啦', '咯', '喽', '呗', '的话', '而已', '罢了',
            'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
            'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
            'should', 'may', 'might', 'must', 'shall', 'can', 'need', 'dare',
            'and', 'or', 'but', 'if', 'because', 'as', 'until', 'while', 'of',
            'at', 'by', 'for', 'with', 'about', 'against', 'between', 'into',
            'through', 'during', 'before', 'after', 'above', 'below', 'to', 'from',
            'up', 'down', 'in', 'out', 'on', 'off', 'over', 'under', 'again',
            'further', 'then', 'once', 'here', 'there', 'when', 'where', 'why',
            'how', 'all', 'each', 'few', 'more', 'most', 'other', 'some', 'such',
            'no', 'nor', 'not', 'only', 'own', 'same', 'so', 'than', 'too', 'very',
            's', 't', 'just', 'don', 'now', 'i', 'me', 'my', 'myself', 'we', 'our',
            'ours', 'ourselves', 'you', 'your', 'yours', 'yourself', 'yourselves',
            'he', 'him', 'his', 'himself', 'she', 'her', 'hers', 'herself', 'it',
            'its', 'itself', 'they', 'them', 'their', 'theirs', 'themselves', 'what',
            'which', 'who', 'whom', 'this', 'that', 'these', 'those', 'am',
        ])
        words = [w for w in words if w not in stopwords and len(w) > 1]
        return words
    
    def calculate_similarity(self, sent1: List[str], sent2: List[str]) -> float:
        if not sent1 or not sent2:
            return 0.0
        
        words1 = set(sent1)
        words2 = set(sent2)
        
        common_words = words1 & words2
        if not common_words:
            return 0.0
        
        score = len(common_words) / (math.log(len(words1)) + math.log(len(words2)))
        return score
    
    def build_similarity_matrix(self, sentences: List[List[str]]) -> List[List[float]]:
        n = len(sentences)
        matrix = [[0.0 for _ in range(n)] for _ in range(n)]
        
        for i in range(n):
            for j in range(n):
                if i != j:
                    matrix[i][j] = self.calculate_similarity(sentences[i], sentences[j])
        
        row_sums = [sum(row) for row in matrix]
        for i in range(n):
            if row_sums[i] > 0:
                for j in range(n):
                    matrix[i][j] /= row_sums[i]
        
        return matrix
    
    def textrank(self, sentences: List[str], top_n: int = 5) -> List[Dict[str, Any]]:
        if not sentences:
            return []
        
        processed_sentences = [self.preprocess_sentence(s) for s in sentences]
        n = len(sentences)
        
        if n <= top_n:
            return [{"sentence": s, "score": 1.0, "index": i} for i, s in enumerate(sentences)]
        
        matrix = self.build_similarity_matrix(processed_sentences)
        
        scores = [1.0 for _ in range(n)]
        
        for _ in range(self.max_iter):
            new_scores = [0.0 for _ in range(n)]
            
            for i in range(n):
                for j in range(n):
                    if i != j:
                        new_scores[i] += matrix[j][i] * scores[j]
                
                new_scores[i] = (1 - self.d) + self.d * new_scores[i]
            
            diff = sum(abs(new_scores[i] - scores[i]) for i in range(n))
            scores = new_scores
            
            if diff < self.tol:
                break
        
        scored_sentences = [
            {"sentence": sentences[i], "score": scores[i], "index": i}
            for i in range(n)
        ]
        
        scored_sentences.sort(key=lambda x: x["score"], reverse=True)
        
        return scored_sentences[:top_n]
    
    def summarize(self, text: str, top_n: int = 10) -> Dict[str, Any]:
        sentences = self.split_sentences(text)
        
        if not sentences:
            return {
                "summary": "",
                "key_points": [],
                "original_sentence_count": 0,
                "summary_sentence_count": 0,
            }
        
        top_sentences = self.textrank(sentences, top_n)
        
        top_sentences.sort(key=lambda x: x["index"])
        
        summary = "。".join([s["sentence"] for s in top_sentences]) + "。"
        
        key_points = [
            {
                "text": s["sentence"],
                "score": s["score"],
                "position": s["index"],
            }
            for s in top_sentences
        ]
        
        return {
            "summary": summary,
            "key_points": key_points,
            "original_sentence_count": len(sentences),
            "summary_sentence_count": len(top_sentences),
        }


text_rank_summarizer = TextRankSummarizer()
