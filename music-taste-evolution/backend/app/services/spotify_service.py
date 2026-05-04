import spotipy
from spotipy.oauth2 import SpotifyOAuth
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models import User, ListeningHistory, AudioFeatures
from app.config import settings
from app.services.cache_service import cache_service
import asyncio


class SpotifyAuthService:
    def __init__(self):
        self.oauth = None
        self._init_oauth()
    
    def _init_oauth(self):
        if settings.SPOTIFY_CLIENT_ID and settings.SPOTIFY_CLIENT_SECRET:
            self.oauth = SpotifyOAuth(
                client_id=settings.SPOTIFY_CLIENT_ID,
                client_secret=settings.SPOTIFY_CLIENT_SECRET,
                redirect_uri=settings.SPOTIFY_REDIRECT_URI,
                scope="user-read-recently-played user-read-private user-read-email user-top-read",
                cache_path=None,
                show_dialog=True
            )
    
    def get_auth_url(self) -> str:
        if not self.oauth:
            raise RuntimeError("Spotify credentials not configured")
        return self.oauth.get_authorize_url()
    
    def get_token_from_code(self, code: str) -> Dict[str, Any]:
        if not self.oauth:
            raise RuntimeError("Spotify credentials not configured")
        return self.oauth.get_access_token(code, check_cache=False)
    
    def refresh_token(self, refresh_token: str) -> Dict[str, Any]:
        if not self.oauth:
            raise RuntimeError("Spotify credentials not configured")
        return self.oauth.refresh_access_token(refresh_token)


class SpotifyDataService:
    def __init__(self):
        self.auth_service = SpotifyAuthService()
    
    def _get_spotipy_client(self, access_token: str) -> spotipy.Spotify:
        return spotipy.Spotify(auth=access_token)
    
    async def get_user_profile(self, access_token: str) -> Dict[str, Any]:
        cache_key = f"user_profile_{access_token[:20]}"
        cached = cache_service.get(cache_key)
        if cached:
            return cached
        
        sp = self._get_spotipy_client(access_token)
        user = sp.current_user()
        
        result = {
            "id": user.get("id"),
            "display_name": user.get("display_name"),
            "email": user.get("email"),
            "image_url": user.get("images", [{}])[0].get("url") if user.get("images") else None,
            "country": user.get("country"),
            "product": user.get("product")
        }
        
        cache_service.set(cache_key, result, ttl_hours=1)
        return result
    
    async def get_recently_played(
        self, 
        access_token: str, 
        limit: int = 50,
        after: Optional[int] = None
    ) -> List[Dict[str, Any]]:
        cache_key = f"recently_played_{access_token[:20]}_{limit}_{after}"
        cached = cache_service.get(cache_key)
        if cached:
            return cached
        
        sp = self._get_spotipy_client(access_token)
        
        params = {"limit": min(limit, 50)}
        if after:
            params["after"] = after
        
        results = sp.current_user_recently_played(**params)
        
        tracks = []
        for item in results.get("items", []):
            track = item.get("track", {})
            album = track.get("album", {})
            artists = track.get("artists", [])
            
            tracks.append({
                "track_id": track.get("id"),
                "track_name": track.get("name"),
                "artist_name": ", ".join([a.get("name", "") for a in artists]),
                "artist_id": artists[0].get("id") if artists else None,
                "album_name": album.get("name"),
                "album_id": album.get("id"),
                "played_at": item.get("played_at"),
                "duration_ms": track.get("duration_ms"),
                "popularity": track.get("popularity")
            })
        
        cache_service.set(cache_key, tracks, ttl_hours=2)
        return tracks
    
    async def get_audio_features(
        self, 
        access_token: str, 
        track_ids: List[str]
    ) -> List[Dict[str, Any]]:
        if not track_ids:
            return []
        
        result = []
        uncached_ids = []
        
        for track_id in track_ids:
            cache_key = f"audio_features_{track_id}"
            cached = cache_service.get(cache_key)
            if cached:
                result.append(cached)
            else:
                uncached_ids.append(track_id)
        
        if uncached_ids:
            sp = self._get_spotipy_client(access_token)
            
            for i in range(0, len(uncached_ids), 100):
                batch = uncached_ids[i:i+100]
                features_list = sp.audio_features(batch)
                
                for features in features_list:
                    if features:
                        feature_data = {
                            "track_id": features.get("id"),
                            "acousticness": features.get("acousticness"),
                            "danceability": features.get("danceability"),
                            "energy": features.get("energy"),
                            "instrumentalness": features.get("instrumentalness"),
                            "liveness": features.get("liveness"),
                            "loudness": features.get("loudness"),
                            "speechiness": features.get("speechiness"),
                            "tempo": features.get("tempo"),
                            "valence": features.get("valence"),
                            "key": features.get("key"),
                            "mode": features.get("mode"),
                            "time_signature": features.get("time_signature"),
                            "source": "spotify"
                        }
                        result.append(feature_data)
                        cache_service.set(
                            f"audio_features_{features.get('id')}", 
                            feature_data,
                            ttl_hours=24 * 7
                        )
        
        return result


spotify_auth_service = SpotifyAuthService()
spotify_data_service = SpotifyDataService()
