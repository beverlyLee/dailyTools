from rest_framework import serializers
from .models import Media, UserRating, ViewingHistory, TasteProfile


class MediaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Media
        fields = [
            'id', 'tmdb_id', 'title', 'original_title', 'media_type',
            'overview', 'release_date', 'poster_path', 'backdrop_path',
            'vote_average', 'vote_count', 'popularity', 'genres',
            'runtime', 'imdb_id'
        ]


class UserRatingSerializer(serializers.ModelSerializer):
    media_title = serializers.CharField(source='media.title', read_only=True)
    media_type = serializers.CharField(source='media.media_type', read_only=True)
    tmdb_vote_average = serializers.FloatField(source='media.vote_average', read_only=True)
    
    class Meta:
        model = UserRating
        fields = [
            'id', 'media', 'media_title', 'media_type', 'user_id',
            'rating', 'rating_date', 'comment', 'tmdb_vote_average'
        ]
        read_only_fields = ['rating_date']


class ViewingHistorySerializer(serializers.ModelSerializer):
    media_title = serializers.CharField(source='media.title', read_only=True)
    media_type = serializers.CharField(source='media.media_type', read_only=True)
    
    class Meta:
        model = ViewingHistory
        fields = [
            'id', 'media', 'media_title', 'media_type', 'user_id',
            'watch_date', 'progress', 'completed'
        ]


class TasteProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = TasteProfile
        fields = [
            'id', 'user_id', 'favorite_genres', 'average_rating',
            'total_ratings', 'rating_deviation_from_imdb',
            'rating_deviation_from_tmdb', 'created_at', 'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at']


class TasteAnalysisResultSerializer(serializers.Serializer):
    user_id = serializers.IntegerField()
    total_ratings = serializers.IntegerField()
    average_user_rating = serializers.FloatField()
    average_tmdb_rating = serializers.FloatField()
    rating_deviation = serializers.FloatField()
    deviation_direction = serializers.CharField()
    genre_analysis = serializers.ListField(child=serializers.DictField())
    highest_deviation_media = serializers.ListField(child=serializers.DictField())
    lowest_deviation_media = serializers.ListField(child=serializers.DictField())
