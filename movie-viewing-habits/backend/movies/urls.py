from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    MediaViewSet, UserRatingViewSet, ViewingHistoryViewSet,
    TasteAnalysisViewSet, TasteProfileViewSet
)

router = DefaultRouter()
router.register(r'media', MediaViewSet, basename='media')
router.register(r'ratings', UserRatingViewSet, basename='ratings')
router.register(r'history', ViewingHistoryViewSet, basename='history')
router.register(r'taste-profile', TasteProfileViewSet, basename='taste-profile')

taste_analysis_list = TasteAnalysisViewSet.as_view({
    'get': 'list',
})

urlpatterns = [
    path('', include(router.urls)),
    path('taste/analyze/', TasteAnalysisViewSet.as_view({'get': 'analyze'}), name='taste-analyze'),
    path('taste/deviation/', TasteAnalysisViewSet.as_view({'get': 'deviation'}), name='taste-deviation'),
    path('taste/genres/', TasteAnalysisViewSet.as_view({'get': 'genres'}), name='taste-genres'),
    path('taste/extremes/', TasteAnalysisViewSet.as_view({'get': 'extremes'}), name='taste-extremes'),
    path('taste/compare/', TasteAnalysisViewSet.as_view({'post': 'compare'}), name='taste-compare'),
]
