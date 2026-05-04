from django.contrib import admin
from .models import Media, UserRating, ViewingHistory, TasteProfile


@admin.register(Media)
class MediaAdmin(admin.ModelAdmin):
    list_display = ['title', 'media_type', 'release_date', 'vote_average', 'vote_count']
    list_filter = ['media_type', 'release_date']
    search_fields = ['title', 'original_title']
    readonly_fields = ['created_at', 'updated_at']


@admin.register(UserRating)
class UserRatingAdmin(admin.ModelAdmin):
    list_display = ['user_id', 'media', 'rating', 'rating_date']
    list_filter = ['rating_date']
    search_fields = ['user_id', 'media__title']
    readonly_fields = ['rating_date']


@admin.register(ViewingHistory)
class ViewingHistoryAdmin(admin.ModelAdmin):
    list_display = ['user_id', 'media', 'watch_date', 'progress', 'completed']
    list_filter = ['watch_date', 'completed']
    search_fields = ['user_id', 'media__title']


@admin.register(TasteProfile)
class TasteProfileAdmin(admin.ModelAdmin):
    list_display = ['user_id', 'average_rating', 'total_ratings', 'updated_at']
    search_fields = ['user_id']
    readonly_fields = ['created_at', 'updated_at']
