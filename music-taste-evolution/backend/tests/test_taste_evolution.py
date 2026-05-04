import pytest
from datetime import datetime
from app.services.taste_evolution import TasteEvolutionAnalyzer, MonthlyStats


class TestTasteEvolutionAnalyzer:
    def setup_method(self):
        self.analyzer = TasteEvolutionAnalyzer()
    
    def test_aggregate_by_month_single_month(self):
        history = [
            {
                "track_id": "track1",
                "played_at": "2024-01-15T10:00:00Z",
                "artist_name": "Artist A"
            },
            {
                "track_id": "track2",
                "played_at": "2024-01-20T14:00:00Z",
                "artist_name": "Artist B"
            }
        ]
        
        features_map = {
            "track1": {
                "acousticness": 0.5,
                "danceability": 0.6,
                "energy": 0.7,
                "instrumentalness": 0.1,
                "liveness": 0.2,
                "loudness": -10.0,
                "speechiness": 0.05,
                "tempo": 120.0,
                "valence": 0.8,
                "genre": "pop"
            },
            "track2": {
                "acousticness": 0.3,
                "danceability": 0.8,
                "energy": 0.9,
                "instrumentalness": 0.05,
                "liveness": 0.15,
                "loudness": -8.0,
                "speechiness": 0.1,
                "tempo": 130.0,
                "valence": 0.6,
                "genre": "rock"
            }
        }
        
        results = self.analyzer.aggregate_by_month(history, features_map)
        
        assert len(results) == 1
        assert results[0].year == 2024
        assert results[0].month == 1
        assert results[0].total_tracks == 2
        assert results[0].avg_acousticness == pytest.approx(0.4)
        assert results[0].avg_danceability == pytest.approx(0.7)
        assert results[0].avg_energy == pytest.approx(0.8)
        assert results[0].avg_tempo == pytest.approx(125.0)
    
    def test_aggregate_by_month_multiple_months(self):
        history = [
            {
                "track_id": "track1",
                "played_at": "2024-01-15T10:00:00Z",
                "artist_name": "Artist A"
            },
            {
                "track_id": "track2",
                "played_at": "2024-02-10T14:00:00Z",
                "artist_name": "Artist B"
            },
            {
                "track_id": "track3",
                "played_at": "2024-02-20T14:00:00Z",
                "artist_name": "Artist C"
            }
        ]
        
        features_map = {
            "track1": {
                "acousticness": 0.5,
                "danceability": 0.6,
                "energy": 0.7,
                "instrumentalness": 0.1,
                "liveness": 0.2,
                "loudness": -10.0,
                "speechiness": 0.05,
                "tempo": 120.0,
                "valence": 0.8,
                "genre": "pop"
            },
            "track2": {
                "acousticness": 0.3,
                "danceability": 0.8,
                "energy": 0.9,
                "instrumentalness": 0.05,
                "liveness": 0.15,
                "loudness": -8.0,
                "speechiness": 0.1,
                "tempo": 130.0,
                "valence": 0.6,
                "genre": "rock"
            },
            "track3": {
                "acousticness": 0.4,
                "danceability": 0.7,
                "energy": 0.8,
                "instrumentalness": 0.02,
                "liveness": 0.1,
                "loudness": -9.0,
                "speechiness": 0.08,
                "tempo": 125.0,
                "valence": 0.7,
                "genre": "pop"
            }
        }
        
        results = self.analyzer.aggregate_by_month(history, features_map)
        
        assert len(results) == 2
        assert results[0].year == 2024
        assert results[0].month == 1
        assert results[0].total_tracks == 1
        
        assert results[1].year == 2024
        assert results[1].month == 2
        assert results[1].total_tracks == 2
        assert results[1].avg_acousticness == pytest.approx(0.35)
        assert results[1].avg_tempo == pytest.approx(127.5)
    
    def test_aggregate_by_month_empty_data(self):
        results = self.analyzer.aggregate_by_month([], {})
        assert len(results) == 0
    
    def test_aggregate_by_month_missing_features(self):
        history = [
            {
                "track_id": "track1",
                "played_at": "2024-01-15T10:00:00Z",
                "artist_name": "Artist A"
            }
        ]
        
        features_map = {}
        
        results = self.analyzer.aggregate_by_month(history, features_map)
        assert len(results) == 0
    
    def test_aggregate_by_month_invalid_dates(self):
        history = [
            {
                "track_id": "track1",
                "played_at": "invalid-date",
                "artist_name": "Artist A"
            }
        ]
        
        features_map = {
            "track1": {
                "acousticness": 0.5,
                "danceability": 0.6,
                "energy": 0.7,
                "instrumentalness": 0.1,
                "liveness": 0.2,
                "loudness": -10.0,
                "speechiness": 0.05,
                "tempo": 120.0,
                "valence": 0.8,
                "genre": "pop"
            }
        }
        
        results = self.analyzer.aggregate_by_month(history, features_map)
        assert len(results) == 0
    
    def test_calculate_trends_increasing(self):
        stats = [
            MonthlyStats(
                year=2024, month=1, total_tracks=10,
                avg_acousticness=0.2, avg_danceability=0.5, avg_energy=0.3,
                avg_instrumentalness=0.1, avg_liveness=0.1, avg_loudness=-10.0,
                avg_speechiness=0.1, avg_tempo=100.0, avg_valence=0.3,
                top_genres=[], top_artists=[]
            ),
            MonthlyStats(
                year=2024, month=2, total_tracks=10,
                avg_acousticness=0.4, avg_danceability=0.6, avg_energy=0.5,
                avg_instrumentalness=0.1, avg_liveness=0.1, avg_loudness=-10.0,
                avg_speechiness=0.1, avg_tempo=100.0, avg_valence=0.3,
                top_genres=[], top_artists=[]
            ),
            MonthlyStats(
                year=2024, month=3, total_tracks=10,
                avg_acousticness=0.6, avg_danceability=0.7, avg_energy=0.7,
                avg_instrumentalness=0.1, avg_liveness=0.1, avg_loudness=-10.0,
                avg_speechiness=0.1, avg_tempo=100.0, avg_valence=0.3,
                top_genres=[], top_artists=[]
            )
        ]
        
        result = self.analyzer.calculate_trends(stats, "energy")
        
        assert result["trend"] == "increasing"
        assert result["change_percent"] == pytest.approx(133.33, rel=1e-2)
        assert result["first_value"] == pytest.approx(0.3)
        assert result["last_value"] == pytest.approx(0.7)
    
    def test_calculate_trends_decreasing(self):
        stats = [
            MonthlyStats(
                year=2024, month=1, total_tracks=10,
                avg_acousticness=0.8, avg_danceability=0.5, avg_energy=0.8,
                avg_instrumentalness=0.1, avg_liveness=0.1, avg_loudness=-10.0,
                avg_speechiness=0.1, avg_tempo=100.0, avg_valence=0.3,
                top_genres=[], top_artists=[]
            ),
            MonthlyStats(
                year=2024, month=2, total_tracks=10,
                avg_acousticness=0.6, avg_danceability=0.6, avg_energy=0.6,
                avg_instrumentalness=0.1, avg_liveness=0.1, avg_loudness=-10.0,
                avg_speechiness=0.1, avg_tempo=100.0, avg_valence=0.3,
                top_genres=[], top_artists=[]
            ),
            MonthlyStats(
                year=2024, month=3, total_tracks=10,
                avg_acousticness=0.4, avg_danceability=0.7, avg_energy=0.4,
                avg_instrumentalness=0.1, avg_liveness=0.1, avg_loudness=-10.0,
                avg_speechiness=0.1, avg_tempo=100.0, avg_valence=0.3,
                top_genres=[], top_artists=[]
            )
        ]
        
        result = self.analyzer.calculate_trends(stats, "acousticness")
        
        assert result["trend"] == "decreasing"
        assert result["change_percent"] == pytest.approx(-50.0, rel=1e-2)
    
    def test_calculate_trends_stable(self):
        stats = [
            MonthlyStats(
                year=2024, month=1, total_tracks=10,
                avg_acousticness=0.5, avg_danceability=0.5, avg_energy=0.5,
                avg_instrumentalness=0.1, avg_liveness=0.1, avg_loudness=-10.0,
                avg_speechiness=0.1, avg_tempo=100.0, avg_valence=0.3,
                top_genres=[], top_artists=[]
            ),
            MonthlyStats(
                year=2024, month=2, total_tracks=10,
                avg_acousticness=0.5, avg_danceability=0.6, avg_energy=0.5001,
                avg_instrumentalness=0.1, avg_liveness=0.1, avg_loudness=-10.0,
                avg_speechiness=0.1, avg_tempo=100.0, avg_valence=0.3,
                top_genres=[], top_artists=[]
            ),
            MonthlyStats(
                year=2024, month=3, total_tracks=10,
                avg_acousticness=0.5, avg_danceability=0.7, avg_energy=0.4999,
                avg_instrumentalness=0.1, avg_liveness=0.1, avg_loudness=-10.0,
                avg_speechiness=0.1, avg_tempo=100.0, avg_valence=0.3,
                top_genres=[], top_artists=[]
            )
        ]
        
        result = self.analyzer.calculate_trends(stats, "energy")
        
        assert result["trend"] == "stable"
    
    def test_calculate_trends_insufficient_data(self):
        stats = [
            MonthlyStats(
                year=2024, month=1, total_tracks=10,
                avg_acousticness=0.5, avg_danceability=0.5, avg_energy=0.5,
                avg_instrumentalness=0.1, avg_liveness=0.1, avg_loudness=-10.0,
                avg_speechiness=0.1, avg_tempo=100.0, avg_valence=0.3,
                top_genres=[], top_artists=[]
            )
        ]
        
        result = self.analyzer.calculate_trends(stats, "energy")
        assert result["trend"] == "insufficient_data"
    
    def test_get_evolution_summary(self):
        stats = [
            MonthlyStats(
                year=2024, month=1, total_tracks=10,
                avg_acousticness=0.2, avg_danceability=0.5, avg_energy=0.3,
                avg_instrumentalness=0.1, avg_liveness=0.1, avg_loudness=-10.0,
                avg_speechiness=0.1, avg_tempo=100.0, avg_valence=0.3,
                top_genres=[("pop", 5), ("rock", 3)],
                top_artists=[("Artist A", 4), ("Artist B", 3)]
            ),
            MonthlyStats(
                year=2024, month=2, total_tracks=15,
                avg_acousticness=0.4, avg_danceability=0.6, avg_energy=0.5,
                avg_instrumentalness=0.15, avg_liveness=0.12, avg_loudness=-9.0,
                avg_speechiness=0.12, avg_tempo=110.0, avg_valence=0.4,
                top_genres=[("electronic", 8), ("pop", 5)],
                top_artists=[("Artist C", 6), ("Artist A", 5)]
            )
        ]
        
        summary = self.analyzer.get_evolution_summary(stats)
        
        assert summary["total_months"] == 2
        assert summary["total_tracks"] == 25
        assert "trends" in summary
        assert "time_range" in summary
        assert summary["time_range"]["start"]["year"] == 2024
        assert summary["time_range"]["start"]["month"] == 1
        assert summary["time_range"]["end"]["year"] == 2024
        assert summary["time_range"]["end"]["month"] == 2
        assert len(summary["monthly_data"]) == 2
