from typing import Dict, List, Any, Optional
from collections import defaultdict
from .models import UserRating, Media, TasteProfile
import statistics


class TasteAnalyzer:
    def __init__(self, user_id: int):
        self.user_id = user_id
        self.user_ratings = UserRating.objects.filter(user_id=user_id).select_related('media')

    def calculate_rating_deviation(self) -> Dict[str, Any]:
        if not self.user_ratings.exists():
            return {
                'total_ratings': 0,
                'average_user_rating': 0.0,
                'average_tmdb_rating': 0.0,
                'rating_deviation': 0.0,
                'deviation_direction': 'no_data',
                'deviation_details': []
            }

        total_ratings = self.user_ratings.count()
        user_ratings_list = []
        tmdb_ratings_list = []
        deviation_details = []

        for rating in self.user_ratings:
            if rating.media.vote_average is not None:
                user_ratings_list.append(rating.rating)
                tmdb_ratings_list.append(rating.media.vote_average)
                
                deviation = rating.rating - rating.media.vote_average
                deviation_details.append({
                    'media_id': rating.media.id,
                    'media_title': rating.media.title,
                    'media_type': rating.media.media_type,
                    'user_rating': rating.rating,
                    'tmdb_rating': rating.media.vote_average,
                    'deviation': deviation,
                    'absolute_deviation': abs(deviation)
                })

        if not user_ratings_list:
            return {
                'total_ratings': total_ratings,
                'average_user_rating': 0.0,
                'average_tmdb_rating': 0.0,
                'rating_deviation': 0.0,
                'deviation_direction': 'no_comparison_data',
                'deviation_details': []
            }

        average_user_rating = statistics.mean(user_ratings_list)
        average_tmdb_rating = statistics.mean(tmdb_ratings_list)
        rating_deviation = average_user_rating - average_tmdb_rating

        if rating_deviation > 0.5:
            deviation_direction = 'more_generous'
        elif rating_deviation < -0.5:
            deviation_direction = 'more_strict'
        else:
            deviation_direction = 'similar'

        return {
            'total_ratings': total_ratings,
            'average_user_rating': round(average_user_rating, 2),
            'average_tmdb_rating': round(average_tmdb_rating, 2),
            'rating_deviation': round(rating_deviation, 2),
            'deviation_direction': deviation_direction,
            'deviation_details': deviation_details
        }

    def analyze_by_genre(self) -> List[Dict[str, Any]]:
        genre_stats = defaultdict(lambda: {
            'genre_name': '',
            'total_ratings': 0,
            'user_ratings': [],
            'tmdb_ratings': [],
            'deviations': []
        })

        for rating in self.user_ratings:
            media = rating.media
            if media.genres:
                for genre in media.genres:
                    genre_name = genre.get('name', 'Unknown')
                    genre_id = genre.get('id', 0)
                    
                    if media.vote_average is not None:
                        deviation = rating.rating - media.vote_average
                        genre_stats[genre_id]['genre_name'] = genre_name
                        genre_stats[genre_id]['total_ratings'] += 1
                        genre_stats[genre_id]['user_ratings'].append(rating.rating)
                        genre_stats[genre_id]['tmdb_ratings'].append(media.vote_average)
                        genre_stats[genre_id]['deviations'].append(deviation)

        result = []
        for genre_id, stats in genre_stats.items():
            if stats['total_ratings'] >= 3:
                avg_user = statistics.mean(stats['user_ratings'])
                avg_tmdb = statistics.mean(stats['tmdb_ratings'])
                avg_deviation = statistics.mean(stats['deviations'])
                
                if avg_deviation > 0.5:
                    preference = 'prefers_above_average'
                elif avg_deviation < -0.5:
                    preference = 'prefers_below_average'
                else:
                    preference = 'balanced'
                
                result.append({
                    'genre_id': genre_id,
                    'genre_name': stats['genre_name'],
                    'total_ratings': stats['total_ratings'],
                    'average_user_rating': round(avg_user, 2),
                    'average_tmdb_rating': round(avg_tmdb, 2),
                    'average_deviation': round(avg_deviation, 2),
                    'preference': preference
                })

        return sorted(result, key=lambda x: x['total_ratings'], reverse=True)

    def get_extreme_deviations(self, limit: int = 5) -> Dict[str, List[Dict[str, Any]]]:
        deviation_details = self.calculate_rating_deviation()['deviation_details']
        
        if not deviation_details:
            return {'highest_deviation': [], 'lowest_deviation': []}
        
        sorted_by_deviation = sorted(deviation_details, key=lambda x: x['deviation'])
        
        highest_deviation = sorted_by_deviation[-limit:][::-1]
        lowest_deviation = sorted_by_deviation[:limit]
        
        return {
            'highest_deviation': highest_deviation,
            'lowest_deviation': lowest_deviation
        }

    def generate_complete_analysis(self) -> Dict[str, Any]:
        rating_deviation = self.calculate_rating_deviation()
        genre_analysis = self.analyze_by_genre()
        extreme_deviations = self.get_extreme_deviations()
        
        favorite_genres = []
        if genre_analysis:
            favorite_genres = [
                {'genre_id': g['genre_id'], 'genre_name': g['genre_name']}
                for g in genre_analysis[:5]
            ]
        
        taste_profile, created = TasteProfile.objects.update_or_create(
            user_id=self.user_id,
            defaults={
                'favorite_genres': favorite_genres,
                'average_rating': rating_deviation['average_user_rating'],
                'total_ratings': rating_deviation['total_ratings'],
                'rating_deviation_from_tmdb': rating_deviation['rating_deviation']
            }
        )
        
        return {
            'user_id': self.user_id,
            'total_ratings': rating_deviation['total_ratings'],
            'average_user_rating': rating_deviation['average_user_rating'],
            'average_tmdb_rating': rating_deviation['average_tmdb_rating'],
            'rating_deviation': rating_deviation['rating_deviation'],
            'deviation_direction': rating_deviation['deviation_direction'],
            'genre_analysis': genre_analysis,
            'highest_deviation_media': extreme_deviations['highest_deviation'],
            'lowest_deviation_media': extreme_deviations['lowest_deviation']
        }

    def compare_with_other_users(self, other_user_ids: List[int]) -> Dict[str, Any]:
        my_analysis = self.generate_complete_analysis()
        
        comparisons = []
        for other_user_id in other_user_ids:
            other_analyzer = TasteAnalyzer(other_user_id)
            other_analysis = other_analyzer.generate_complete_analysis()
            
            common_media = self._find_common_media(other_user_id)
            
            similarity_score = self._calculate_similarity_score(common_media)
            
            comparisons.append({
                'user_id': other_user_id,
                'average_rating': other_analysis['average_user_rating'],
                'total_ratings': other_analysis['total_ratings'],
                'common_media_count': len(common_media),
                'similarity_score': similarity_score,
                'deviation_difference': abs(
                    my_analysis['rating_deviation'] - other_analysis['rating_deviation']
                )
            })
        
        return {
            'my_profile': my_analysis,
            'comparisons': sorted(comparisons, key=lambda x: x['similarity_score'], reverse=True)
        }

    def _find_common_media(self, other_user_id: int) -> List[Dict[str, Any]]:
        my_media_ids = set(self.user_ratings.values_list('media_id', flat=True))
        
        other_ratings = UserRating.objects.filter(
            user_id=other_user_id,
            media_id__in=my_media_ids
        ).select_related('media')
        
        common_media = []
        for other_rating in other_ratings:
            my_rating = self.user_ratings.get(media_id=other_rating.media_id)
            common_media.append({
                'media_id': other_rating.media_id,
                'media_title': other_rating.media.title,
                'my_rating': my_rating.rating,
                'other_rating': other_rating.rating,
                'difference': abs(my_rating.rating - other_rating.rating)
            })
        
        return common_media

    def _calculate_similarity_score(self, common_media: List[Dict[str, Any]]) -> float:
        if not common_media:
            return 0.0
        
        total_difference = sum(item['difference'] for item in common_media)
        max_possible_difference = len(common_media) * 10
        
        similarity = 1 - (total_difference / max_possible_difference)
        return round(similarity, 2)
