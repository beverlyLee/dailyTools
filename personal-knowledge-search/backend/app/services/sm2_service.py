import json
import uuid
from datetime import datetime, timedelta
from pathlib import Path
from typing import List, Optional, Dict
from collections import defaultdict
from ..models.card import (
    CardResponse,
    CardCreate,
    CardStatus,
    SM2Stats,
    ReviewResponse,
    DailyStats,
)


class SM2Service:
    MIN_EASE_FACTOR = 1.3
    DEFAULT_EASE_FACTOR = 2.5
    MIN_INTERVAL = 1
    MAX_INTERVAL = 365 * 4
    
    def __init__(self, data_dir: Path):
        self.data_dir = data_dir
        self.cards_file = data_dir / "cards.json"
        self.stats_file = data_dir / "card_stats.json"
        self.cards: Dict[str, dict] = {}
        self.daily_stats: Dict[str, dict] = {}
        
        self._load_data()
    
    def _load_data(self):
        if self.cards_file.exists():
            with open(self.cards_file, "r", encoding="utf-8") as f:
                data = json.load(f)
                self.cards = data.get("cards", {})
        else:
            self.cards = {}
        
        if self.stats_file.exists():
            with open(self.stats_file, "r", encoding="utf-8") as f:
                data = json.load(f)
                self.daily_stats = data.get("daily_stats", {})
        else:
            self.daily_stats = {}
    
    def _save_data(self):
        with open(self.cards_file, "w", encoding="utf-8") as f:
            json.dump({"cards": self.cards}, f, ensure_ascii=False, indent=2)
        
        with open(self.stats_file, "w", encoding="utf-8") as f:
            json.dump({"daily_stats": self.daily_stats}, f, ensure_ascii=False, indent=2)
    
    def _get_today_key(self) -> str:
        return datetime.now().strftime("%Y-%m-%d")
    
    def _record_review(self, quality: int):
        today = self._get_today_key()
        if today not in self.daily_stats:
            self.daily_stats[today] = {
                "date": today,
                "cards_reviewed": 0,
                "total_quality": 0,
                "cards_added": 0,
            }
        
        self.daily_stats[today]["cards_reviewed"] += 1
        self.daily_stats[today]["total_quality"] += quality
    
    def _record_card_added(self):
        today = self._get_today_key()
        if today not in self.daily_stats:
            self.daily_stats[today] = {
                "date": today,
                "cards_reviewed": 0,
                "total_quality": 0,
                "cards_added": 0,
            }
        
        self.daily_stats[today]["cards_added"] += 1
    
    def create_card(self, card_create: CardCreate) -> CardResponse:
        card_id = str(uuid.uuid4())
        now = datetime.now()
        
        sm2_stats = SM2Stats(
            interval=self.MIN_INTERVAL,
            repetitions=0,
            ease_factor=self.DEFAULT_EASE_FACTOR,
            next_review=now + timedelta(days=self.MIN_INTERVAL),
        )
        
        card_data = {
            "id": card_id,
            "question": card_create.question,
            "answer": card_create.answer,
            "tags": card_create.tags,
            "document_id": card_create.document_id,
            "status": CardStatus.NEW,
            "created_at": now.isoformat(),
            "updated_at": now.isoformat(),
            "last_reviewed": None,
            "sm2_stats": {
                "interval": sm2_stats.interval,
                "repetitions": sm2_stats.repetitions,
                "ease_factor": sm2_stats.ease_factor,
                "next_review": sm2_stats.next_review.isoformat() if sm2_stats.next_review else None,
            },
        }
        
        self.cards[card_id] = card_data
        self._record_card_added()
        self._save_data()
        
        return self._dict_to_response(card_data)
    
    def get_card(self, card_id: str) -> Optional[CardResponse]:
        if card_id not in self.cards:
            return None
        return self._dict_to_response(self.cards[card_id])
    
    def get_all_cards(self, limit: int = 100) -> List[CardResponse]:
        sorted_cards = sorted(
            self.cards.values(),
            key=lambda x: x["created_at"],
            reverse=True,
        )
        return [self._dict_to_response(card) for card in sorted_cards[:limit]]
    
    def get_cards_due(self, limit: int = 50) -> List[CardResponse]:
        now = datetime.now()
        due_cards = []
        
        for card_data in self.cards.values():
            try:
                next_review_str = card_data["sm2_stats"]["next_review"]
                if next_review_str:
                    next_review = datetime.fromisoformat(next_review_str)
                    if next_review <= now:
                        due_cards.append(card_data)
            except (KeyError, ValueError):
                continue
        
        due_cards.sort(key=lambda x: x["sm2_stats"]["next_review"])
        return [self._dict_to_response(card) for card in due_cards[:limit]]
    
    def review_card(self, card_id: str, quality: int) -> Optional[ReviewResponse]:
        if card_id not in self.cards:
            return None
        
        card_data = self.cards[card_id]
        sm2 = card_data["sm2_stats"]
        now = datetime.now()
        
        interval = sm2["interval"]
        repetitions = sm2["repetitions"]
        ease_factor = sm2["ease_factor"]
        
        if quality >= 3:
            if repetitions == 0:
                interval = 1
            elif repetitions == 1:
                interval = 6
            else:
                interval = int(round(interval * ease_factor))
            
            interval = min(interval, self.MAX_INTERVAL)
            repetitions += 1
            ease_factor = ease_factor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))
            ease_factor = max(ease_factor, self.MIN_EASE_FACTOR)
            
            if repetitions >= 8:
                new_status = CardStatus.GRADUATED
            elif repetitions >= 3:
                new_status = CardStatus.REVIEW
            else:
                new_status = CardStatus.LEARNING
        else:
            repetitions = 0
            interval = self.MIN_INTERVAL
            new_status = CardStatus.LEARNING
        
        next_review = now + timedelta(days=interval)
        
        card_data["sm2_stats"]["interval"] = interval
        card_data["sm2_stats"]["repetitions"] = repetitions
        card_data["sm2_stats"]["ease_factor"] = ease_factor
        card_data["sm2_stats"]["next_review"] = next_review.isoformat()
        card_data["status"] = new_status
        card_data["last_reviewed"] = now.isoformat()
        card_data["updated_at"] = now.isoformat()
        
        self._record_review(quality)
        self._save_data()
        
        return ReviewResponse(
            card_id=card_id,
            next_review=next_review,
            new_interval=interval,
            new_ease_factor=ease_factor,
            new_repetitions=repetitions,
            status=new_status,
        )
    
    def delete_card(self, card_id: str) -> bool:
        if card_id not in self.cards:
            return False
        del self.cards[card_id]
        self._save_data()
        return True
    
    def get_daily_stats(self, days: int = 30) -> List[DailyStats]:
        stats_list = []
        today = datetime.now()
        
        for i in range(days - 1, -1, -1):
            date = today - timedelta(days=i)
            date_key = date.strftime("%Y-%m-%d")
            
            if date_key in self.daily_stats:
                stat = self.daily_stats[date_key]
                cards_reviewed = stat["cards_reviewed"]
                total_quality = stat["total_quality"]
                
                avg_quality = total_quality / cards_reviewed if cards_reviewed > 0 else 0.0
                
                stats_list.append(DailyStats(
                    date=date,
                    cards_reviewed=cards_reviewed,
                    average_quality=avg_quality,
                    cards_added=stat["cards_added"],
                ))
            else:
                stats_list.append(DailyStats(
                    date=date,
                    cards_reviewed=0,
                    average_quality=0.0,
                    cards_added=0,
                ))
        
        return stats_list
    
    def get_card_count_by_status(self) -> Dict[str, int]:
        counts = defaultdict(int)
        for card_data in self.cards.values():
            counts[card_data["status"]] += 1
        return dict(counts)
    
    def _dict_to_response(self, card_data: dict) -> CardResponse:
        sm2_data = card_data["sm2_stats"]
        
        next_review = None
        if sm2_data.get("next_review"):
            try:
                next_review = datetime.fromisoformat(sm2_data["next_review"])
            except ValueError:
                pass
        
        last_reviewed = None
        if card_data.get("last_reviewed"):
            try:
                last_reviewed = datetime.fromisoformat(card_data["last_reviewed"])
            except ValueError:
                pass
        
        return CardResponse(
            id=card_data["id"],
            question=card_data["question"],
            answer=card_data["answer"],
            tags=card_data.get("tags", []),
            document_id=card_data.get("document_id"),
            status=card_data["status"],
            created_at=datetime.fromisoformat(card_data["created_at"]),
            updated_at=datetime.fromisoformat(card_data["updated_at"]),
            last_reviewed=last_reviewed,
            sm2_stats=SM2Stats(
                interval=sm2_data["interval"],
                repetitions=sm2_data["repetitions"],
                ease_factor=sm2_data["ease_factor"],
                next_review=next_review,
            ),
        )
    
    def clear(self):
        self.cards = {}
        self.daily_stats = {}
        if self.cards_file.exists():
            self.cards_file.unlink()
        if self.stats_file.exists():
            self.stats_file.unlink()


sm2_service = SM2Service(settings.DATA_DIR)
