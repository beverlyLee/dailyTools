from django.db import models


class Media(models.Model):
    MEDIA_TYPE_MOVIE = 'movie'
    MEDIA_TYPE_TV = 'tv'
    MEDIA_TYPE_CHOICES = [
        (MEDIA_TYPE_MOVIE, 'Movie'),
        (MEDIA_TYPE_TV, 'TV Show'),
    ]

    tmdb_id = models.IntegerField(unique=True)
    title = models.CharField(max_length=255)
    original_title = models.CharField(max_length=255, blank=True, null=True)
    media_type = models.CharField(max_length=10, choices=MEDIA_TYPE_CHOICES)
    overview = models.TextField(blank=True, null=True)
    release_date = models.DateField(blank=True, null=True)
    poster_path = models.CharField(max_length=255, blank=True, null=True)
    backdrop_path = models.CharField(max_length=255, blank=True, null=True)
    vote_average = models.FloatField(blank=True, null=True)
    vote_count = models.IntegerField(default=0)
    popularity = models.FloatField(blank=True, null=True)
    genres = models.JSONField(default=list, blank=True)
    runtime = models.IntegerField(blank=True, null=True)
    imdb_id = models.CharField(max_length=20, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-release_date']
        verbose_name_plural = 'Media'

    def __str__(self):
        return f"{self.title} ({self.media_type})"


class UserRating(models.Model):
    media = models.ForeignKey(Media, on_delete=models.CASCADE, related_name='user_ratings')
    user_id = models.IntegerField()
    rating = models.FloatField()
    rating_date = models.DateTimeField(auto_now_add=True)
    comment = models.TextField(blank=True, null=True)

    class Meta:
        unique_together = ['media', 'user_id']
        ordering = ['-rating_date']

    def __str__(self):
        return f"User {self.user_id} rated {self.media.title}: {self.rating}"


class ViewingHistory(models.Model):
    media = models.ForeignKey(Media, on_delete=models.CASCADE, related_name='viewing_history')
    user_id = models.IntegerField()
    watch_date = models.DateTimeField()
    progress = models.FloatField(default=0.0)
    completed = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-watch_date']
        verbose_name_plural = 'Viewing History'

    def __str__(self):
        return f"User {self.user_id} watched {self.media.title} on {self.watch_date}"


class TasteProfile(models.Model):
    user_id = models.IntegerField(unique=True)
    favorite_genres = models.JSONField(default=list, blank=True)
    average_rating = models.FloatField(default=0.0)
    total_ratings = models.IntegerField(default=0)
    rating_deviation_from_imdb = models.FloatField(default=0.0)
    rating_deviation_from_tmdb = models.FloatField(default=0.0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-updated_at']

    def __str__(self):
        return f"Taste Profile for User {self.user_id}"
