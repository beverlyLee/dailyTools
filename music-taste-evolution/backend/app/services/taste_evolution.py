from collections import defaultdict
from datetime import datetime
from typing import Dict, Any, List, Optional, Tuple
from dataclasses import dataclass


@dataclass
class MonthlyStats:
    year: int
    month: int
    total_tracks: int
    avg_acousticness: float
    avg_danceability: float
    avg_energy: float
    avg_instrumentalness: float
    avg_liveness: float
    avg_loudness: float
    avg_speechiness: float
    avg_tempo: float
    avg_valence: float
    top_genres: List[Tuple[str, int]]
    top_artists: List[Tuple[str, int]]


class TasteEvolutionAnalyzer:
    FEATURE_KEYS = [
        "acousticness", "danceability", "energy", "instrumentalness",
        "liveness", "loudness", "speechiness", "tempo", "valence"
    ]
    
    def __init__(self):
        pass
    
    def _get_month_key(self, dt: datetime) -> Tuple[int, int]:
        return (dt.year, dt.month)
    
    def _parse_datetime(self, date_str: Any) -> Optional[datetime]:
        if isinstance(date_str, datetime):
            return date_str
        if not isinstance(date_str, str):
            return None
        
        formats = [
            "%Y-%m-%dT%H:%M:%S.%fZ",
            "%Y-%m-%dT%H:%M:%SZ",
            "%Y-%m-%d %H:%M:%S",
            "%Y-%m-%d"
        ]
        
        for fmt in formats:
            try:
                return datetime.strptime(date_str, fmt)
            except (ValueError, TypeError):
                continue
        
        return None
    
    def aggregate_by_month(
        self,
        history: List[Dict[str, Any]],
        features_map: Dict[str, Dict[str, Any]]
    ) -> List[MonthlyStats]:
        monthly_data = defaultdict(lambda: {
            "tracks": [],
            "genre_counts": defaultdict(int),
            "artist_counts": defaultdict(int)
        })
        
        for item in history:
            played_at = item.get("played_at")
            track_id = item.get("track_id")
            
            if not track_id:
                continue
            
            dt = self._parse_datetime(played_at)
            if not dt:
                continue
            
            month_key = self._get_month_key(dt)
            
            features = features_map.get(track_id)
            if features:
                monthly_data[month_key]["tracks"].append(features)
            
            genre = features.get("genre") if features else None
            if genre:
                monthly_data[month_key]["genre_counts"][genre] += 1
            
            artist_name = item.get("artist_name")
            if artist_name:
                monthly_data[month_key]["artist_counts"][artist_name] += 1
        
        results = []
        for month_key, data in sorted(monthly_data.items()):
            year, month = month_key
            tracks = data["tracks"]
            total_tracks = len(tracks)
            
            if total_tracks == 0:
                continue
            
            sums = defaultdict(float)
            counts = defaultdict(int)
            
            for track in tracks:
                for key in self.FEATURE_KEYS:
                    val = track.get(key)
                    if val is not None and isinstance(val, (int, float)):
                        sums[key] += val
                        counts[key] += 1
            
            def safe_avg(key: str) -> float:
                if counts.get(key, 0) == 0:
                    return 0.0
                return sums[key] / counts[key]
            
            top_genres = sorted(
                data["genre_counts"].items(),
                key=lambda x: x[1],
                reverse=True
            )[:5]
            
            top_artists = sorted(
                data["artist_counts"].items(),
                key=lambda x: x[1],
                reverse=True
            )[:5]
            
            stats = MonthlyStats(
                year=year,
                month=month,
                total_tracks=total_tracks,
                avg_acousticness=safe_avg("acousticness"),
                avg_danceability=safe_avg("danceability"),
                avg_energy=safe_avg("energy"),
                avg_instrumentalness=safe_avg("instrumentalness"),
                avg_liveness=safe_avg("liveness"),
                avg_loudness=safe_avg("loudness"),
                avg_speechiness=safe_avg("speechiness"),
                avg_tempo=safe_avg("tempo"),
                avg_valence=safe_avg("valence"),
                top_genres=top_genres,
                top_artists=top_artists
            )
            results.append(stats)
        
        return results
    
    def calculate_trends(
        self,
        monthly_stats: List[MonthlyStats],
        feature: str
    ) -> Dict[str, Any]:
        if len(monthly_stats) < 2:
            return {
                "trend": "insufficient_data",
                "change_percent": 0.0,
                "values": []
            }
        
        sorted_stats = sorted(monthly_stats, key=lambda x: (x.year, x.month))
        
        values = []
        for stat in sorted_stats:
            val = getattr(stat, f"avg_{feature}", None)
            if val is not None:
                values.append(val)
        
        if len(values) < 2:
            return {
                "trend": "insufficient_data",
                "change_percent": 0.0,
                "values": values
            }
        
        first = values[0]
        last = values[-1]
        
        if abs(first) < 0.0001:
            change_percent = 100.0 if last > 0 else 0.0
        else:
            change_percent = ((last - first) / abs(first)) * 100
        
        n = len(values)
        x = list(range(n))
        x_mean = sum(x) / n
        y_mean = sum(values) / n
        
        numerator = sum((x[i] - x_mean) * (values[i] - y_mean) for i in range(n))
        denominator = sum((x[i] - x_mean) ** 2 for i in range(n))
        
        if abs(denominator) < 0.0001:
            slope = 0
        else:
            slope = numerator / denominator
        
        if slope > 0.001:
            trend = "increasing"
        elif slope < -0.001:
            trend = "decreasing"
        else:
            trend = "stable"
        
        return {
            "trend": trend,
            "slope": slope,
            "change_percent": round(change_percent, 2),
            "first_value": round(first, 4),
            "last_value": round(last, 4),
            "values": [round(v, 4) for v in values],
            "periods": [
                {"year": s.year, "month": s.month} 
                for s in sorted_stats
            ]
        }
    
    def get_evolution_summary(
        self,
        monthly_stats: List[MonthlyStats]
    ) -> Dict[str, Any]:
        if not monthly_stats:
            return {
                "total_months": 0,
                "total_tracks": 0,
                "trends": {},
                "time_range": None
            }
        
        sorted_stats = sorted(monthly_stats, key=lambda x: (x.year, x.month))
        
        total_tracks = sum(s.total_tracks for s in sorted_stats)
        
        trends = {}
        for feature in self.FEATURE_KEYS:
            trends[feature] = self.calculate_trends(sorted_stats, feature)
        
        time_range = {
            "start": {"year": sorted_stats[0].year, "month": sorted_stats[0].month},
            "end": {"year": sorted_stats[-1].year, "month": sorted_stats[-1].month}
        }
        
        all_genres = defaultdict(int)
        all_artists = defaultdict(int)
        
        for stat in sorted_stats:
            for genre, count in stat.top_genres:
                all_genres[genre] += count
            for artist, count in stat.top_artists:
                all_artists[artist] += count
        
        return {
            "total_months": len(sorted_stats),
            "total_tracks": total_tracks,
            "trends": trends,
            "time_range": time_range,
            "overall_top_genres": sorted(all_genres.items(), key=lambda x: x[1], reverse=True)[:10],
            "overall_top_artists": sorted(all_artists.items(), key=lambda x: x[1], reverse=True)[:10],
            "monthly_data": [
                {
                    "year": s.year,
                    "month": s.month,
                    "total_tracks": s.total_tracks,
                    "avg_acousticness": round(s.avg_acousticness, 4),
                    "avg_danceability": round(s.avg_danceability, 4),
                    "avg_energy": round(s.avg_energy, 4),
                    "avg_instrumentalness": round(s.avg_instrumentalness, 4),
                    "avg_liveness": round(s.avg_liveness, 4),
                    "avg_loudness": round(s.avg_loudness, 4),
                    "avg_speechiness": round(s.avg_speechiness, 4),
                    "avg_tempo": round(s.avg_tempo, 4),
                    "avg_valence": round(s.avg_valence, 4),
                    "top_genres": s.top_genres,
                    "top_artists": s.top_artists
                }
                for s in sorted_stats
            ]
        }


taste_evolution_analyzer = TasteEvolutionAnalyzer()
