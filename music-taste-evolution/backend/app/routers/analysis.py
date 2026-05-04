from datetime import datetime
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc, and_
from pydantic import BaseModel
from app.database import get_db
from app.models import User, ListeningHistory, AudioFeatures, MonthlyAnalysis
from app.routers.auth import get_current_user
from app.services.taste_evolution import taste_evolution_analyzer
from app.services.cache_service import cache_service
import json

router = APIRouter(prefix="/analysis", tags=["analysis"])


class EvolutionTrend(BaseModel):
    feature: str
    trend: str
    slope: float
    change_percent: float
    first_value: float
    last_value: float


class EvolutionSummary(BaseModel):
    total_months: int
    total_tracks: int
    time_range: Dict[str, Any]
    trends: Dict[str, Any]
    overall_top_genres: List[Any]
    overall_top_artists: List[Any]
    monthly_data: List[Dict[str, Any]]


@router.get("/evolution", response_model=EvolutionSummary)
async def get_evolution_analysis(
    year: Optional[int] = Query(None, description="Filter by year"),
    force_refresh: bool = Query(False, description="Force refresh cache"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    cache_key = f"evolution_{current_user.id}_{year or 'all'}"
    
    if not force_refresh:
        cached = cache_service.get(cache_key)
        if cached:
            return EvolutionSummary(**cached)
    
    try:
        history_query = select(ListeningHistory).where(
            ListeningHistory.user_id == current_user.id
        )
        
        if year:
            history_query = history_query.where(
                and_(
                    ListeningHistory.played_at >= datetime(year, 1, 1),
                    ListeningHistory.played_at < datetime(year + 1, 1, 1)
                )
            )
        
        history_query = history_query.order_by(ListeningHistory.played_at)
        
        history_result = await db.execute(history_query)
        history_list = history_result.scalars().all()
        
        if not history_list:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No listening history found. Please sync your data first."
            )
        
        track_ids = [h.track_id for h in history_list]
        
        features_result = await db.execute(
            select(AudioFeatures).where(
                AudioFeatures.user_id == current_user.id,
                AudioFeatures.track_id.in_(track_ids)
            )
        )
        features_list = features_result.scalars().all()
        
        features_map = {
            f.track_id: {
                "acousticness": f.acousticness,
                "danceability": f.danceability,
                "energy": f.energy,
                "instrumentalness": f.instrumentalness,
                "liveness": f.liveness,
                "loudness": f.loudness,
                "speechiness": f.speechiness,
                "tempo": f.tempo,
                "valence": f.valence,
                "genre": None
            }
            for f in features_list
        }
        
        history_dicts = []
        for h in history_list:
            features = features_map.get(h.track_id, {})
            
            if "rock" in h.artist_name.lower() or "punk" in h.artist_name.lower():
                features["genre"] = "rock"
            elif "pop" in h.artist_name.lower():
                features["genre"] = "pop"
            elif "jazz" in h.artist_name.lower():
                features["genre"] = "jazz"
            elif "classical" in h.artist_name.lower():
                features["genre"] = "classical"
            elif "hip" in h.artist_name.lower() or "rap" in h.artist_name.lower():
                features["genre"] = "hiphop"
            elif "electronic" in h.artist_name.lower() or "edm" in h.artist_name.lower():
                features["genre"] = "electronic"
            elif "r&b" in h.artist_name.lower() or "soul" in h.artist_name.lower():
                features["genre"] = "rnb"
            elif "metal" in h.artist_name.lower():
                features["genre"] = "metal"
            
            if h.track_id in features_map:
                features_map[h.track_id] = features
            
            history_dicts.append({
                "track_id": h.track_id,
                "played_at": h.played_at,
                "artist_name": h.artist_name
            })
        
        monthly_stats = taste_evolution_analyzer.aggregate_by_month(
            history_dicts,
            features_map
        )
        
        if not monthly_stats:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Not enough data to generate monthly analysis. Please sync more data."
            )
        
        summary = taste_evolution_analyzer.get_evolution_summary(monthly_stats)
        
        for stat, monthly_data in zip(monthly_stats, summary["monthly_data"]):
            existing_result = await db.execute(
                select(MonthlyAnalysis).where(
                    MonthlyAnalysis.user_id == current_user.id,
                    MonthlyAnalysis.year == stat.year,
                    MonthlyAnalysis.month == stat.month
                )
            )
            existing = existing_result.scalar_one_or_none()
            
            if existing:
                existing.total_tracks = stat.total_tracks
                existing.avg_acousticness = stat.avg_acousticness
                existing.avg_danceability = stat.avg_danceability
                existing.avg_energy = stat.avg_energy
                existing.avg_instrumentalness = stat.avg_instrumentalness
                existing.avg_liveness = stat.avg_liveness
                existing.avg_loudness = stat.avg_loudness
                existing.avg_speechiness = stat.avg_speechiness
                existing.avg_tempo = stat.avg_tempo
                existing.avg_valence = stat.avg_valence
                existing.top_genres = json.dumps(stat.top_genres) if stat.top_genres else None
                existing.top_artists = json.dumps(stat.top_artists) if stat.top_artists else None
            else:
                new_analysis = MonthlyAnalysis(
                    user_id=current_user.id,
                    year=stat.year,
                    month=stat.month,
                    total_tracks=stat.total_tracks,
                    avg_acousticness=stat.avg_acousticness,
                    avg_danceability=stat.avg_danceability,
                    avg_energy=stat.avg_energy,
                    avg_instrumentalness=stat.avg_instrumentalness,
                    avg_liveness=stat.avg_liveness,
                    avg_loudness=stat.avg_loudness,
                    avg_speechiness=stat.avg_speechiness,
                    avg_tempo=stat.avg_tempo,
                    avg_valence=stat.avg_valence,
                    top_genres=json.dumps(stat.top_genres) if stat.top_genres else None,
                    top_artists=json.dumps(stat.top_artists) if stat.top_artists else None
                )
                db.add(new_analysis)
        
        await db.commit()
        
        cache_service.set(cache_key, summary, ttl_hours=24)
        
        return EvolutionSummary(**summary)
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Analysis failed: {str(e)}"
        )


@router.get("/trends/{feature}", response_model=EvolutionTrend)
async def get_feature_trend(
    feature: str,
    year: Optional[int] = Query(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    valid_features = taste_evolution_analyzer.FEATURE_KEYS
    if feature not in valid_features:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid feature. Must be one of: {', '.join(valid_features)}"
        )
    
    try:
        history_query = select(ListeningHistory).where(
            ListeningHistory.user_id == current_user.id
        )
        
        if year:
            history_query = history_query.where(
                and_(
                    ListeningHistory.played_at >= datetime(year, 1, 1),
                    ListeningHistory.played_at < datetime(year + 1, 1, 1)
                )
            )
        
        history_query = history_query.order_by(ListeningHistory.played_at)
        
        history_result = await db.execute(history_query)
        history_list = history_result.scalars().all()
        
        if len(history_list) < 2:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Not enough data to calculate trends. Need at least 2 months of data."
            )
        
        track_ids = [h.track_id for h in history_list]
        
        features_result = await db.execute(
            select(AudioFeatures).where(
                AudioFeatures.user_id == current_user.id,
                AudioFeatures.track_id.in_(track_ids)
            )
        )
        features_list = features_result.scalars().all()
        
        features_map = {
            f.track_id: {
                "acousticness": f.acousticness,
                "danceability": f.danceability,
                "energy": f.energy,
                "instrumentalness": f.instrumentalness,
                "liveness": f.liveness,
                "loudness": f.loudness,
                "speechiness": f.speechiness,
                "tempo": f.tempo,
                "valence": f.valence
            }
            for f in features_list
        }
        
        history_dicts = [
            {
                "track_id": h.track_id,
                "played_at": h.played_at,
                "artist_name": h.artist_name
            }
            for h in history_list
        ]
        
        monthly_stats = taste_evolution_analyzer.aggregate_by_month(
            history_dicts,
            features_map
        )
        
        if len(monthly_stats) < 2:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Need data from at least 2 different months to calculate trends."
            )
        
        trend_data = taste_evolution_analyzer.calculate_trends(monthly_stats, feature)
        
        return EvolutionTrend(
            feature=feature,
            trend=trend_data["trend"],
            slope=trend_data.get("slope", 0.0),
            change_percent=trend_data["change_percent"],
            first_value=trend_data["first_value"],
            last_value=trend_data["last_value"]
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Trend calculation failed: {str(e)}"
        )


@router.get("/monthly", response_model=List[Dict[str, Any]])
async def get_monthly_analysis(
    year: Optional[int] = Query(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    query = select(MonthlyAnalysis).where(
        MonthlyAnalysis.user_id == current_user.id
    )
    
    if year:
        query = query.where(MonthlyAnalysis.year == year)
    
    query = query.order_by(MonthlyAnalysis.year, MonthlyAnalysis.month)
    
    result = await db.execute(query)
    monthly_list = result.scalars().all()
    
    response = []
    for m in monthly_list:
        top_genres = None
        if m.top_genres:
            try:
                top_genres = json.loads(m.top_genres)
            except (json.JSONDecodeError, TypeError):
                top_genres = []
        
        top_artists = None
        if m.top_artists:
            try:
                top_artists = json.loads(m.top_artists)
            except (json.JSONDecodeError, TypeError):
                top_artists = []
        
        response.append({
            "id": m.id,
            "year": m.year,
            "month": m.month,
            "total_tracks": m.total_tracks,
            "avg_acousticness": m.avg_acousticness,
            "avg_danceability": m.avg_danceability,
            "avg_energy": m.avg_energy,
            "avg_instrumentalness": m.avg_instrumentalness,
            "avg_liveness": m.avg_liveness,
            "avg_loudness": m.avg_loudness,
            "avg_speechiness": m.avg_speechiness,
            "avg_tempo": m.avg_tempo,
            "avg_valence": m.avg_valence,
            "top_genres": top_genres,
            "top_artists": top_artists,
            "created_at": m.created_at,
            "updated_at": m.updated_at
        })
    
    return response
