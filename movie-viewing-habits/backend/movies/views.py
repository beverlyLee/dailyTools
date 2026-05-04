from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db import transaction
from datetime import datetime

from .models import Media, UserRating, ViewingHistory, TasteProfile
from .serializers import (
    MediaSerializer, UserRatingSerializer, ViewingHistorySerializer,
    TasteProfileSerializer, TasteAnalysisResultSerializer
)
from .tmdb_client import tmdb_client
from .taste_analysis import TasteAnalyzer


class MediaViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Media.objects.all()
    serializer_class = MediaSerializer

    @action(detail=False, methods=['get'])
    def search(self, request):
        query = request.query_params.get('q', '')
        media_type = request.query_params.get('type', 'movie')
        page = int(request.query_params.get('page', 1))

        if not query:
            return Response(
                {'error': 'Query parameter is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            if media_type == 'movie':
                result = tmdb_client.search_movies(query, page)
            else:
                result = tmdb_client.search_tv(query, page)

            if result:
                return Response(result)
            else:
                return Response(
                    {'error': 'Failed to search TMDb'},
                    status=status.HTTP_503_SERVICE_UNAVAILABLE
                )
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=False, methods=['get'])
    def popular(self, request):
        media_type = request.query_params.get('type', 'movie')
        page = int(request.query_params.get('page', 1))

        try:
            if media_type == 'movie':
                result = tmdb_client.get_popular_movies(page)
            else:
                result = tmdb_client.get_trending('tv', 'week')

            if result:
                return Response(result)
            else:
                return Response(
                    {'error': 'Failed to fetch popular media'},
                    status=status.HTTP_503_SERVICE_UNAVAILABLE
                )
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=False, methods=['get'])
    def trending(self, request):
        media_type = request.query_params.get('type', 'all')
        time_window = request.query_params.get('time_window', 'week')

        try:
            result = tmdb_client.get_trending(media_type, time_window)
            if result:
                return Response(result)
            else:
                return Response(
                    {'error': 'Failed to fetch trending media'},
                    status=status.HTTP_503_SERVICE_UNAVAILABLE
                )
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=True, methods=['get', 'post'])
    def details(self, request, pk=None):
        tmdb_id = int(pk)
        media_type = request.query_params.get('type', 'movie')

        try:
            media = Media.objects.filter(tmdb_id=tmdb_id, media_type=media_type).first()

            if request.method == 'POST' or not media:
                if media_type == 'movie':
                    tmdb_data = tmdb_client.get_movie_details(tmdb_id)
                else:
                    tmdb_data = tmdb_client.get_tv_details(tmdb_id)

                if not tmdb_data:
                    return Response(
                        {'error': 'Media not found in TMDb'},
                        status=status.HTTP_404_NOT_FOUND
                    )

                external_ids = None
                if media_type == 'movie':
                    external_ids = tmdb_client.get_movie_external_ids(tmdb_id)
                else:
                    external_ids = tmdb_client.get_tv_external_ids(tmdb_id)

                media_data = {
                    'tmdb_id': tmdb_id,
                    'title': tmdb_data.get('title') or tmdb_data.get('name', ''),
                    'original_title': tmdb_data.get('original_title') or tmdb_data.get('original_name', ''),
                    'media_type': media_type,
                    'overview': tmdb_data.get('overview', ''),
                    'release_date': tmdb_data.get('release_date') or tmdb_data.get('first_air_date'),
                    'poster_path': tmdb_data.get('poster_path', ''),
                    'backdrop_path': tmdb_data.get('backdrop_path', ''),
                    'vote_average': tmdb_data.get('vote_average'),
                    'vote_count': tmdb_data.get('vote_count', 0),
                    'popularity': tmdb_data.get('popularity'),
                    'genres': tmdb_data.get('genres', []),
                    'runtime': tmdb_data.get('runtime') or tmdb_data.get('episode_run_time', [0])[0] if tmdb_data.get('episode_run_time') else None,
                    'imdb_id': external_ids.get('imdb_id') if external_ids else None
                }

                with transaction.atomic():
                    if media:
                        for key, value in media_data.items():
                            setattr(media, key, value)
                        media.save()
                    else:
                        media = Media.objects.create(**media_data)

            serializer = self.get_serializer(media)
            return Response(serializer.data)

        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=False, methods=['get'])
    def genres(self, request):
        media_type = request.query_params.get('type', 'movie')
        
        try:
            result = tmdb_client.get_genre_list(media_type)
            if result:
                return Response(result)
            else:
                return Response(
                    {'error': 'Failed to fetch genres'},
                    status=status.HTTP_503_SERVICE_UNAVAILABLE
                )
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class UserRatingViewSet(viewsets.ModelViewSet):
    queryset = UserRating.objects.all()
    serializer_class = UserRatingSerializer

    def get_queryset(self):
        queryset = super().get_queryset()
        user_id = self.request.query_params.get('user_id')
        if user_id:
            queryset = queryset.filter(user_id=int(user_id))
        return queryset

    @action(detail=False, methods=['post'])
    def rate(self, request):
        media_id = request.data.get('media_id')
        user_id = request.data.get('user_id')
        rating = request.data.get('rating')
        comment = request.data.get('comment', '')

        if not all([media_id, user_id, rating]):
            return Response(
                {'error': 'media_id, user_id, and rating are required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            media = Media.objects.get(id=media_id)
        except Media.DoesNotExist:
            return Response(
                {'error': 'Media not found'},
                status=status.HTTP_404_NOT_FOUND
            )

        try:
            rating_obj, created = UserRating.objects.update_or_create(
                media=media,
                user_id=int(user_id),
                defaults={
                    'rating': float(rating),
                    'comment': comment
                }
            )

            serializer = self.get_serializer(rating_obj)
            return Response(serializer.data, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)

        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class ViewingHistoryViewSet(viewsets.ModelViewSet):
    queryset = ViewingHistory.objects.all()
    serializer_class = ViewingHistorySerializer

    def get_queryset(self):
        queryset = super().get_queryset()
        user_id = self.request.query_params.get('user_id')
        if user_id:
            queryset = queryset.filter(user_id=int(user_id))
        return queryset

    @action(detail=False, methods=['post'])
    def log(self, request):
        media_id = request.data.get('media_id')
        user_id = request.data.get('user_id')
        progress = request.data.get('progress', 0.0)
        completed = request.data.get('completed', False)
        watch_date = request.data.get('watch_date')

        if not all([media_id, user_id]):
            return Response(
                {'error': 'media_id and user_id are required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            media = Media.objects.get(id=media_id)
        except Media.DoesNotExist:
            return Response(
                {'error': 'Media not found'},
                status=status.HTTP_404_NOT_FOUND
            )

        if watch_date:
            try:
                watch_date = datetime.fromisoformat(watch_date.replace('Z', '+00:00'))
            except ValueError:
                watch_date = datetime.now()
        else:
            watch_date = datetime.now()

        try:
            history_obj = ViewingHistory.objects.create(
                media=media,
                user_id=int(user_id),
                watch_date=watch_date,
                progress=float(progress),
                completed=completed
            )

            serializer = self.get_serializer(history_obj)
            return Response(serializer.data, status=status.HTTP_201_CREATED)

        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class TasteAnalysisViewSet(viewsets.ViewSet):
    serializer_class = TasteAnalysisResultSerializer

    @action(detail=False, methods=['get'])
    def analyze(self, request):
        user_id = request.query_params.get('user_id')
        
        if not user_id:
            return Response(
                {'error': 'user_id is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            analyzer = TasteAnalyzer(int(user_id))
            result = analyzer.generate_complete_analysis()
            
            serializer = TasteAnalysisResultSerializer(result)
            return Response(serializer.data)

        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=False, methods=['get'])
    def deviation(self, request):
        user_id = request.query_params.get('user_id')
        
        if not user_id:
            return Response(
                {'error': 'user_id is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            analyzer = TasteAnalyzer(int(user_id))
            result = analyzer.calculate_rating_deviation()
            return Response(result)

        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=False, methods=['get'])
    def genres(self, request):
        user_id = request.query_params.get('user_id')
        
        if not user_id:
            return Response(
                {'error': 'user_id is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            analyzer = TasteAnalyzer(int(user_id))
            result = analyzer.analyze_by_genre()
            return Response(result)

        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=False, methods=['get'])
    def extremes(self, request):
        user_id = request.query_params.get('user_id')
        limit = int(request.query_params.get('limit', 5))
        
        if not user_id:
            return Response(
                {'error': 'user_id is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            analyzer = TasteAnalyzer(int(user_id))
            result = analyzer.get_extreme_deviations(limit)
            return Response(result)

        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=False, methods=['post'])
    def compare(self, request):
        user_id = request.data.get('user_id')
        other_user_ids = request.data.get('other_user_ids', [])
        
        if not user_id or not other_user_ids:
            return Response(
                {'error': 'user_id and other_user_ids are required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            analyzer = TasteAnalyzer(int(user_id))
            result = analyzer.compare_with_other_users([int(uid) for uid in other_user_ids])
            return Response(result)

        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class TasteProfileViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = TasteProfile.objects.all()
    serializer_class = TasteProfileSerializer

    def get_queryset(self):
        queryset = super().get_queryset()
        user_id = self.request.query_params.get('user_id')
        if user_id:
            queryset = queryset.filter(user_id=int(user_id))
        return queryset
