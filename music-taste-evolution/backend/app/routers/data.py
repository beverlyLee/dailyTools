from datetime import datetime
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from pydantic import BaseModel
from app.database import get_db
from app.models import User, ListeningHistory, AudioFeatures, MonthlyAnalysis
from app.routers.auth import get_current_user
from app.services.spotify_service import spotify_data_service
from app.services.audio_analyzer import local_audio_analyzer
from app.services.taste_evolution import taste_evolution_analyzer
from app.services.cache_service import cache_service

router = APIRouter(prefix="/data", tags=["data"])


class TrackResponse(BaseModel):
    id: int
    track_id: str
    track_name: str
    artist_name: str
    artist_id: Optional[str]
    album_name: Optional[str]
    album_id: Optional[str]
    played_at: Optional[datetime]
    duration_ms: Optional[int]
    popularity: Optional[int]


class AudioFeaturesResponse(BaseModel):
    track_id: str
    acousticness: Optional[float]
    danceability: Optional[float]
    energy: Optional[float]
    instrumentalness: Optional[float]
    liveness: Optional[float]
    loudness: Optional[float]
    speechiness: Optional[float]
    tempo: Optional[float]
    valence: Optional[float]
    key: Optional[int]
    mode: Optional[int]
    time_signature: Optional[int]
    source: str


class MonthlyAnalysisResponse(BaseModel):
    id: int
    year: int
    month: int
    total_tracks: int
    avg_acousticness: Optional[float]
    avg_danceability: Optional[float]
    avg_energy: Optional[float]
    avg_instrumentalness: Optional[float]
    avg_liveness: Optional[float]
    avg_loudness: Optional[float]
    avg_speechiness: Optional[float]
    avg_tempo: Optional[float]
    avg_valence: Optional[float]
    top_genres: Optional[List[Any]]
    top_artists: Optional[List[Any]]


@router.get("/sync", response_model=Dict[str, Any])
async def sync_data(
    force: bool = Query(False, description="Force refresh ignoring cache"),
    use_local_fallback: bool = Query(True, description="Use local audio analyzer if Spotify API fails"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    if force:
        cache_service.delete(f"recently_played_{current_user.id}")
    
    try:
        if not current_user.access_token:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="No access token available. Please re-authenticate."
            )
        
        recent_tracks = await spotify_data_service.get_recently_played(
            current_user.access_token,
            limit=50
        )
        
        track_ids = [t["track_id"] for t in recent_tracks if t.get("track_id")]
        
        existing_result = await db.execute(
            select(ListeningHistory.track_id)
            .where(ListeningHistory.user_id == current_user.id)
            .where(ListeningHistory.track_id.in_(track_ids))
        )
        existing_track_ids = set(row[0] for row in existing_result.all())
        
        new_tracks = [
            t for t in recent_tracks 
            if t.get("track_id") and t["track_id"] not in existing_track_ids
        ]
        
        for track in new_tracks:
            played_at_str = track.get("played_at")
            played_at = None
            if played_at_str:
                try:
                    played_at = datetime.fromisoformat(played_at_str.replace("Z", "+00:00"))
                except ValueError:
                    pass
            
            history = ListeningHistory(
                user_id=current_user.id,
                track_id=track.get("track_id"),
                track_name=track.get("track_name", ""),
                artist_name=track.get("artist_name", ""),
                artist_id=track.get("artist_id"),
                album_name=track.get("album_name"),
                album_id=track.get("album_id"),
                played_at=played_at,
                duration_ms=track.get("duration_ms"),
                popularity=track.get("popularity")
            )
            db.add(history)
        
        await db.commit()
        
        new_track_ids = [t["track_id"] for t in new_tracks]
        
        if new_track_ids:
            existing_features_result = await db.execute(
                select(AudioFeatures.track_id)
                .where(AudioFeatures.track_id.in_(new_track_ids))
            )
            existing_feature_ids = set(row[0] for row in existing_features_result.all())
            
            features_to_fetch = [
                tid for tid in new_track_ids if tid not in existing_feature_ids
            ]
            
            if features_to_fetch:
                try:
                    spotify_features = await spotify_data_service.get_audio_features(
                        current_user.access_token,
                        features_to_fetch
                    )
                    
                    for features in spotify_features:
                        track_id = features.get("track_id")
                        if track_id:
                            af = AudioFeatures(
                                user_id=current_user.id,
                                track_id=track_id,
                                acousticness=features.get("acousticness"),
                                danceability=features.get("danceability"),
                                energy=features.get("energy"),
                                instrumentalness=features.get("instrumentalness"),
                                liveness=features.get("liveness"),
                                loudness=features.get("loudness"),
                                speechiness=features.get("speechiness"),
                                tempo=features.get("tempo"),
                                valence=features.get("valence"),
                                key=features.get("key"),
                                mode=features.get("mode"),
                                time_signature=features.get("time_signature"),
                                source="spotify"
                            )
                            db.add(af)
                    
                    fetched_ids = set(f.get("track_id") for f in spotify_features if f)
                    
                    if use_local_fallback:
                        missing_ids = [tid for tid in features_to_fetch if tid not in fetched_ids]
                        
                        for missing_id in missing_ids:
                            track_info = next(
                                (t for t in recent_tracks if t.get("track_id") == missing_id),
                                {}
                            )
                            
                            local_features = local_audio_analyzer.analyze_track(
                                track_id=missing_id,
                                track_name=track_info.get("track_name", ""),
                                artist_name=track_info.get("artist_name", ""),
                                album_name=track_info.get("album_name"),
                                duration_ms=track_info.get("duration_ms")
                            )
                            
                            af = AudioFeatures(
                                user_id=current_user.id,
                                track_id=missing_id,
                                acousticness=local_features.get("acousticness"),
                                danceability=local_features.get("danceability"),
                                energy=local_features.get("energy"),
                                instrumentalness=local_features.get("instrumentalness"),
                                liveness=local_features.get("liveness"),
                                loudness=local_features.get("loudness"),
                                speechiness=local_features.get("speechiness"),
                                tempo=local_features.get("tempo"),
                                valence=local_features.get("valence"),
                                key=local_features.get("key"),
                                mode=local_features.get("mode"),
                                time_signature=local_features.get("time_signature"),
                                source="local"
                            )
                            db.add(af)
                
                except Exception as e:
                    if not use_local_fallback:
                        raise e
                    
                    for track_id in features_to_fetch:
                        track_info = next(
                            (t for t in recent_tracks if t.get("track_id") == track_id),
                            {}
                        )
                        
                        local_features = local_audio_analyzer.analyze_track(
                            track_id=track_id,
                            track_name=track_info.get("track_name", ""),
                            artist_name=track_info.get("artist_name", ""),
                            album_name=track_info.get("album_name"),
                            duration_ms=track_info.get("duration_ms")
                        )
                        
                        af = AudioFeatures(
                            user_id=current_user.id,
                            track_id=track_id,
                            acousticness=local_features.get("acousticness"),
                            danceability=local_features.get("danceability"),
                            energy=local_features.get("energy"),
                            instrumentalness=local_features.get("instrumentalness"),
                            liveness=local_features.get("liveness"),
                            loudness=local_features.get("loudness"),
                            speechiness=local_features.get("speechiness"),
                            tempo=local_features.get("tempo"),
                            valence=local_features.get("valence"),
                            key=local_features.get("key"),
                            mode=local_features.get("mode"),
                            time_signature=local_features.get("time_signature"),
                            source="local"
                        )
                        db.add(af)
                
                await db.commit()
        
        return {
            "status": "success",
            "synced_tracks": len(new_tracks),
            "total_tracks_in_db": len(recent_tracks),
            "message": f"Successfully synced {len(new_tracks)} new tracks"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Sync failed: {str(e)}"
        )


@router.get("/history", response_model=List[TrackResponse])
async def get_listening_history(
    limit: int = Query(50, ge=1, le=500),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(ListeningHistory)
        .where(ListeningHistory.user_id == current_user.id)
        .order_by(desc(ListeningHistory.played_at))
        .limit(limit)
        .offset(offset)
    )
    tracks = result.scalars().all()
    
    return [
        TrackResponse(
            id=t.id,
            track_id=t.track_id,
            track_name=t.track_name,
            artist_name=t.artist_name,
            artist_id=t.artist_id,
            album_name=t.album_name,
            album_id=t.album_id,
            played_at=t.played_at,
            duration_ms=t.duration_ms,
            popularity=t.popularity
        )
        for t in tracks
    ]


@router.get("/features/{track_id}", response_model=AudioFeaturesResponse)
async def get_audio_features(
    track_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(AudioFeatures)
        .where(AudioFeatures.track_id == track_id)
        .where(AudioFeatures.user_id == current_user.id)
    )
    features = result.scalar_one_or_none()
    
    if not features:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Audio features not found for track {track_id}"
        )
    
    return AudioFeaturesResponse(
        track_id=features.track_id,
        acousticness=features.acousticness,
        danceability=features.danceability,
        energy=features.energy,
        instrumentalness=features.instrumentalness,
        liveness=features.liveness,
        loudness=features.loudness,
        speechiness=features.speechiness,
        tempo=features.tempo,
        valence=features.valence,
        key=features.key,
        mode=features.mode,
        time_signature=features.time_signature,
        source=features.source
    )


@router.get("/stats/count")
async def get_stats_count(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    history_result = await db.execute(
        select(ListeningHistory).where(ListeningHistory.user_id == current_user.id)
    )
    history_count = len(history_result.scalars().all())
    
    features_result = await db.execute(
        select(AudioFeatures).where(AudioFeatures.user_id == current_user.id)
    )
    features_count = len(features_result.scalars().all())
    
    monthly_result = await db.execute(
        select(MonthlyAnalysis).where(MonthlyAnalysis.user_id == current_user.id)
    )
    monthly_count = len(monthly_result.scalars().all())
    
    return {
        "history_count": history_count,
        "features_count": features_count,
        "monthly_analysis_count": monthly_count
    }
