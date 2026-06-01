from dataclasses import dataclass
from typing import Optional

@dataclass
class ScoreResult:
    office_score: float
    escape_score: float
    overall_score: float
    office_rating: str
    escape_rating: str
    recommendation: str

class ProductivityScorer:
    def __init__(self):
        self.wifi_weight = 0.35
        self.socket_weight = 0.35
        self.noise_weight = 0.30

    def calculate_scores(
        self,
        wifi_score: float,
        socket_count: int,
        noise_level: float,
        price_level: Optional[float] = None,
        seat_comfort: Optional[float] = None
    ) -> ScoreResult:
        normalized_socket = min(socket_count / 10.0, 1.0)
        
        office_score = self._calculate_office_score(
            wifi_score, normalized_socket, noise_level
        )
        
        escape_score = self._calculate_escape_score(
            wifi_score, normalized_socket, noise_level, price_level, seat_comfort
        )
        
        overall_score = (office_score + escape_score) / 2
        
        office_rating = self._get_rating(office_score)
        escape_rating = self._get_rating(escape_score)
        
        recommendation = self._generate_recommendation(
            office_score, escape_score, wifi_score, socket_count, noise_level
        )
        
        return ScoreResult(
            office_score=round(office_score, 2),
            escape_score=round(escape_score, 2),
            overall_score=round(overall_score, 2),
            office_rating=office_rating,
            escape_rating=escape_rating,
            recommendation=recommendation
        )

    def _calculate_office_score(
        self,
        wifi_score: float,
        normalized_socket: float,
        noise_level: float
    ) -> float:
        score = (
            wifi_score * self.wifi_weight * 10 +
            normalized_socket * self.socket_weight * 10 +
            noise_level * self.noise_weight * 10
        )
        return min(10.0, max(0.0, score))

    def _calculate_escape_score(
        self,
        wifi_score: float,
        normalized_socket: float,
        noise_level: float,
        price_level: Optional[float],
        seat_comfort: Optional[float]
    ) -> float:
        base_score = (
            wifi_score * 0.25 * 10 +
            normalized_socket * 0.25 * 10 +
            noise_level * 0.50 * 10
        )
        
        if price_level is not None:
            base_score += price_level * 0.1
        
        if seat_comfort is not None:
            base_score += seat_comfort * 0.1
        
        return min(10.0, max(0.0, base_score))

    def _get_rating(self, score: float) -> str:
        if score >= 9.0:
            return 'S级'
        elif score >= 8.0:
            return 'A级'
        elif score >= 7.0:
            return 'B级'
        elif score >= 6.0:
            return 'C级'
        elif score >= 5.0:
            return 'D级'
        else:
            return 'F级'

    def _generate_recommendation(
        self,
        office_score: float,
        escape_score: float,
        wifi_score: float,
        socket_count: int,
        noise_level: float
    ) -> str:
        recommendations = []
        
        if office_score >= 8.0 and escape_score >= 8.0:
            recommendations.append('🌟 办公摸鱼双栖圣地！')
        elif office_score >= 8.0:
            recommendations.append('💼 高效办公首选之地')
        elif escape_score >= 8.0:
            recommendations.append('🎮 摸鱼发呆绝佳去处')
        
        if wifi_score >= 0.8:
            recommendations.append('📶 WiFi 速度爆表')
        elif wifi_score <= 0.3:
            recommendations.append('⚠️ WiFi 不太给力')
        
        if socket_count >= 5:
            recommendations.append('🔌 插座资源丰富')
        elif socket_count == 0:
            recommendations.append('⚠️ 几乎找不到插座')
        
        if noise_level >= 0.8:
            recommendations.append('🤫 安静得能听见针落')
        elif noise_level <= 0.3:
            recommendations.append('🔊 环境较为嘈杂')
        
        if not recommendations:
            recommendations.append('📍 一个普通的去处')
        
        return ' | '.join(recommendations)

scorer = ProductivityScorer()
