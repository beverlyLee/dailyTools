import re
import jieba
from typing import Dict, List, Tuple
from dataclasses import dataclass

@dataclass
class FeatureResult:
    wifi_score: float
    socket_count: int
    noise_level: float
    socket_tips: List[str]
    wifi_tips: List[str]
    noise_tips: List[str]
    raw_keywords: List[str]

class FeatureExtractor:
    def __init__(self):
        self.wifi_positive_keywords = [
            'wifi快', 'wifi好', '网速快', '网速好', '网络快', '网络好',
            'wifi稳定', '网络稳定', '信号好', '信号强', '网速很快',
            'wifi很快', '上网快', '不卡', '流畅', 'wifi给力'
        ]
        self.wifi_negative_keywords = [
            'wifi慢', '网速慢', '网络慢', 'wifi不好', '网络不好',
            '信号差', 'wifi差', '网速差', '卡', '卡顿', '连不上',
            'wifi不稳定', '网络不稳定'
        ]
        self.socket_keywords = [
            '插座', '充电', '电源', '插头', '插板', '排插', '接线板',
            '有插座', '可充电', '能充电', '充电宝', '电源插座'
        ]
        self.quiet_keywords = [
            '安静', '清静', '不吵', '很静', '宁静', '噪音小', '声音小',
            '很安静', '特别安静', '超级安静', '适合办公'
        ]
        self.noisy_keywords = [
            '吵', '吵闹', '嘈杂', '噪音大', '声音大', '太吵', '很吵',
            '喧闹', '喧哗', '人多吵', '音乐大'
        ]
        self.socket_location_keywords = [
            '墙角', '窗边', '桌子底下', '桌下', '桌子下面', '墙边',
            '角落', '靠窗', '吧台', '二楼', '三楼', '包间', '里间',
            '进门', '门口', '厕所旁', '卫生间旁', '柱子边', '柱子旁'
        ]

    def extract_features(self, comments: List[str]) -> FeatureResult:
        all_text = ' '.join(comments)
        
        wifi_score = self._calculate_wifi_score(all_text)
        socket_count = self._calculate_socket_count(comments)
        noise_level = self._calculate_noise_level(all_text)
        
        socket_tips = self._extract_socket_tips(comments)
        wifi_tips = self._extract_wifi_tips(comments)
        noise_tips = self._extract_noise_tips(comments)
        
        raw_keywords = self._extract_all_keywords(all_text)
        
        return FeatureResult(
            wifi_score=wifi_score,
            socket_count=socket_count,
            noise_level=noise_level,
            socket_tips=socket_tips,
            wifi_tips=wifi_tips,
            noise_tips=noise_tips,
            raw_keywords=raw_keywords
        )

    def _calculate_wifi_score(self, text: str) -> float:
        positive_count = sum(1 for kw in self.wifi_positive_keywords if kw in text)
        negative_count = sum(1 for kw in self.wifi_negative_keywords if kw in text)
        
        total = positive_count + negative_count
        if total == 0:
            return 0.5
        
        score = positive_count / total
        return min(1.0, max(0.0, score))

    def _calculate_socket_count(self, comments: List[str]) -> int:
        socket_mentions = 0
        for comment in comments:
            mentions = sum(1 for kw in self.socket_keywords if kw in comment)
            if mentions > 0:
                socket_mentions += 1
        
        if socket_mentions == 0:
            return 0
        elif socket_mentions <= 2:
            return 2
        elif socket_mentions <= 5:
            return 5
        else:
            return 10

    def _calculate_noise_level(self, text: str) -> float:
        quiet_count = sum(1 for kw in self.quiet_keywords if kw in text)
        noisy_count = sum(1 for kw in self.noisy_keywords if kw in text)
        
        total = quiet_count + noisy_count
        if total == 0:
            return 0.5
        
        level = quiet_count / total
        return min(1.0, max(0.0, level))

    def _extract_socket_tips(self, comments: List[str]) -> List[str]:
        tips = []
        for comment in comments:
            if any(kw in comment for kw in self.socket_keywords):
                sentences = re.split(r'[。！？；]', comment)
                for sentence in sentences:
                    if any(kw in sentence for kw in self.socket_keywords):
                        if any(loc in sentence for loc in self.socket_location_keywords):
                            tips.append(sentence.strip())
                        elif len(sentence.strip()) > 5:
                            tips.append(sentence.strip())
        return list(set(tips))[:5]

    def _extract_wifi_tips(self, comments: List[str]) -> List[str]:
        tips = []
        for comment in comments:
            if any(kw in comment for kw in self.wifi_positive_keywords + self.wifi_negative_keywords):
                sentences = re.split(r'[。！？；]', comment)
                for sentence in sentences:
                    if any(kw in sentence for kw in self.wifi_positive_keywords + self.wifi_negative_keywords):
                        if len(sentence.strip()) > 5:
                            tips.append(sentence.strip())
        return list(set(tips))[:3]

    def _extract_noise_tips(self, comments: List[str]) -> List[str]:
        tips = []
        for comment in comments:
            if any(kw in comment for kw in self.quiet_keywords + self.noisy_keywords):
                sentences = re.split(r'[。！？；]', comment)
                for sentence in sentences:
                    if any(kw in sentence for kw in self.quiet_keywords + self.noisy_keywords):
                        if len(sentence.strip()) > 5:
                            tips.append(sentence.strip())
        return list(set(tips))[:3]

    def _extract_all_keywords(self, text: str) -> List[str]:
        words = jieba.lcut(text)
        keywords = []
        for word in words:
            if len(word) >= 2:
                keywords.append(word)
        return list(set(keywords))[:20]

feature_extractor = FeatureExtractor()
