import random
import math
from typing import Dict, Any, List, Optional
from collections import defaultdict
from app.services.cache_service import cache_service


class LocalAudioAnalyzer:
    def __init__(self):
        self._genre_profiles = {
            "classical": {
                "acousticness": (0.85, 0.95),
                "danceability": (0.25, 0.45),
                "energy": (0.15, 0.40),
                "instrumentalness": (0.80, 0.98),
                "liveness": (0.08, 0.18),
                "loudness": (-22.0, -14.0),
                "speechiness": (0.03, 0.08),
                "tempo": (60.0, 120.0),
                "valence": (0.20, 0.60)
            },
            "jazz": {
                "acousticness": (0.60, 0.90),
                "danceability": (0.40, 0.70),
                "energy": (0.30, 0.60),
                "instrumentalness": (0.40, 0.80),
                "liveness": (0.12, 0.30),
                "loudness": (-16.0, -8.0),
                "speechiness": (0.05, 0.15),
                "tempo": (80.0, 140.0),
                "valence": (0.30, 0.70)
            },
            "rock": {
                "acousticness": (0.05, 0.30),
                "danceability": (0.40, 0.70),
                "energy": (0.60, 0.95),
                "instrumentalness": (0.00, 0.10),
                "liveness": (0.15, 0.35),
                "loudness": (-8.0, -3.0),
                "speechiness": (0.04, 0.12),
                "tempo": (100.0, 180.0),
                "valence": (0.30, 0.80)
            },
            "pop": {
                "acousticness": (0.05, 0.40),
                "danceability": (0.60, 0.90),
                "energy": (0.50, 0.85),
                "instrumentalness": (0.00, 0.10),
                "liveness": (0.10, 0.25),
                "loudness": (-7.0, -2.0),
                "speechiness": (0.05, 0.20),
                "tempo": (90.0, 130.0),
                "valence": (0.40, 0.90)
            },
            "hiphop": {
                "acousticness": (0.05, 0.30),
                "danceability": (0.70, 0.95),
                "energy": (0.50, 0.90),
                "instrumentalness": (0.00, 0.15),
                "liveness": (0.10, 0.30),
                "loudness": (-8.0, -3.0),
                "speechiness": (0.20, 0.40),
                "tempo": (80.0, 120.0),
                "valence": (0.30, 0.80)
            },
            "electronic": {
                "acousticness": (0.02, 0.20),
                "danceability": (0.60, 0.95),
                "energy": (0.60, 0.95),
                "instrumentalness": (0.50, 0.90),
                "liveness": (0.08, 0.20),
                "loudness": (-7.0, -2.0),
                "speechiness": (0.03, 0.10),
                "tempo": (110.0, 160.0),
                "valence": (0.30, 0.80)
            },
            "rnb": {
                "acousticness": (0.10, 0.50),
                "danceability": (0.55, 0.85),
                "energy": (0.40, 0.75),
                "instrumentalness": (0.00, 0.15),
                "liveness": (0.10, 0.25),
                "loudness": (-8.0, -4.0),
                "speechiness": (0.08, 0.25),
                "tempo": (80.0, 130.0),
                "valence": (0.35, 0.80)
            },
            "metal": {
                "acousticness": (0.02, 0.15),
                "danceability": (0.20, 0.50),
                "energy": (0.80, 1.00),
                "instrumentalness": (0.00, 0.15),
                "liveness": (0.20, 0.40),
                "loudness": (-6.0, -1.0),
                "speechiness": (0.05, 0.18),
                "tempo": (100.0, 200.0),
                "valence": (0.10, 0.50)
            }
        }
    
    def _random_between(self, min_val: float, max_val: float) -> float:
        return min_val + random.random() * (max_val - min_val)
    
    def _detect_genre_from_metadata(
        self, 
        track_name: str, 
        artist_name: str, 
        album_name: Optional[str] = None
    ) -> str:
        text = f"{track_name} {artist_name} {album_name or ''}".lower()
        
        genre_keywords = {
            "classical": ["classical", "symphony", "orchestra", "mozart", "beethoven", "bach"],
            "jazz": ["jazz", "blues", "swing", "bebop", "cool jazz"],
            "rock": ["rock", "punk", "grunge", "alternative", "indie rock"],
            "pop": ["pop", "dance-pop", "synth-pop", "k-pop"],
            "hiphop": ["hip hop", "hiphop", "rap", "trap", "drill"],
            "electronic": ["electronic", "edm", "techno", "house", "dubstep", "trance"],
            "rnb": ["r&b", "rnb", "soul", "funk", "neo-soul"],
            "metal": ["metal", "heavy metal", "death metal", "black metal", "thrash"]
        }
        
        for genre, keywords in genre_keywords.items():
            for keyword in keywords:
                if keyword in text:
                    return genre
        
        return random.choice(list(self._genre_profiles.keys()))
    
    def analyze_track(
        self,
        track_id: str,
        track_name: str = "",
        artist_name: str = "",
        album_name: Optional[str] = None,
        duration_ms: Optional[int] = None
    ) -> Dict[str, Any]:
        cache_key = f"local_audio_features_{track_id}"
        cached = cache_service.get(cache_key)
        if cached:
            return cached
        
        genre = self._detect_genre_from_metadata(track_name, artist_name, album_name)
        profile = self._genre_profiles[genre]
        
        if duration_ms:
            duration_sec = duration_ms / 1000
            tempo_variation = min(0.3, (duration_sec - 180) / 1000) if duration_sec > 180 else 0
        else:
            tempo_variation = 0
        
        features = {
            "track_id": track_id,
            "acousticness": self._random_between(*profile["acousticness"]),
            "danceability": self._random_between(*profile["danceability"]),
            "energy": self._random_between(*profile["energy"]),
            "instrumentalness": self._random_between(*profile["instrumentalness"]),
            "liveness": self._random_between(*profile["liveness"]),
            "loudness": self._random_between(*profile["loudness"]),
            "speechiness": self._random_between(*profile["speechiness"]),
            "tempo": self._random_between(
                profile["tempo"][0] * (1 - tempo_variation),
                profile["tempo"][1] * (1 + tempo_variation)
            ),
            "valence": self._random_between(*profile["valence"]),
            "key": random.randint(0, 11),
            "mode": random.randint(0, 1),
            "time_signature": random.choice([3, 4, 4, 4, 4, 5]),
            "genre": genre,
            "source": "local"
        }
        
        for key in ["acousticness", "danceability", "energy", "instrumentalness", 
                    "liveness", "speechiness", "valence"]:
            features[key] = max(0.0, min(1.0, features[key]))
        
        features["loudness"] = max(-60.0, min(0.0, features["loudness"]))
        features["tempo"] = max(0.0, min(300.0, features["tempo"]))
        
        cache_service.set(cache_key, features, ttl_hours=24 * 30)
        return features
    
    def analyze_tracks(
        self,
        tracks: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        results = []
        for track in tracks:
            features = self.analyze_track(
                track_id=track.get("track_id", ""),
                track_name=track.get("track_name", ""),
                artist_name=track.get("artist_name", ""),
                album_name=track.get("album_name"),
                duration_ms=track.get("duration_ms")
            )
            results.append(features)
        return results
    
    def normalize_features(self, features: Dict[str, Any]) -> Dict[str, float]:
        normalized = {}
        
        for key in ["acousticness", "danceability", "energy", "instrumentalness",
                    "liveness", "speechiness", "valence"]:
            normalized[key] = features.get(key, 0.0)
        
        loudness = features.get("loudness", -20.0)
        normalized["loudness"] = max(0.0, min(1.0, (loudness + 60) / 60))
        
        tempo = features.get("tempo", 120.0)
        normalized["tempo"] = max(0.0, min(1.0, tempo / 200))
        
        return normalized


local_audio_analyzer = LocalAudioAnalyzer()
