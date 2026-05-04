from django.test import TestCase
from django.utils import timezone
from unittest.mock import patch, MagicMock
from .models import Media, UserRating, TasteProfile
from .taste_analysis import TasteAnalyzer


class TasteAnalyzerTests(TestCase):
    def setUp(self):
        self.media1 = Media.objects.create(
            tmdb_id=1,
            title='Test Movie 1',
            media_type='movie',
            vote_average=7.5,
            genres=[{'id': 28, 'name': 'Action'}, {'id': 12, 'name': 'Adventure'}]
        )
        
        self.media2 = Media.objects.create(
            tmdb_id=2,
            title='Test Movie 2',
            media_type='movie',
            vote_average=6.0,
            genres=[{'id': 28, 'name': 'Action'}, {'id': 80, 'name': 'Crime'}]
        )
        
        self.media3 = Media.objects.create(
            tmdb_id=3,
            title='Test Movie 3',
            media_type='movie',
            vote_average=8.5,
            genres=[{'id': 18, 'name': 'Drama'}]
        )
        
        self.media4 = Media.objects.create(
            tmdb_id=4,
            title='Test Movie 4',
            media_type='movie',
            vote_average=5.5,
            genres=[{'id': 28, 'name': 'Action'}, {'id': 12, 'name': 'Adventure'}]
        )
        
        self.media5 = Media.objects.create(
            tmdb_id=5,
            title='Test Movie 5',
            media_type='movie',
            vote_average=7.0,
            genres=[{'id': 28, 'name': 'Action'}, {'id': 12, 'name': 'Adventure'}]
        )
        
        self.user_id = 1
        self.other_user_id = 2
        
        UserRating.objects.create(
            media=self.media1,
            user_id=self.user_id,
            rating=8.0
        )
        
        UserRating.objects.create(
            media=self.media2,
            user_id=self.user_id,
            rating=7.0
        )
        
        UserRating.objects.create(
            media=self.media3,
            user_id=self.user_id,
            rating=6.0
        )
        
        UserRating.objects.create(
            media=self.media4,
            user_id=self.user_id,
            rating=5.0
        )
        
        UserRating.objects.create(
            media=self.media5,
            user_id=self.user_id,
            rating=9.0
        )
        
        UserRating.objects.create(
            media=self.media1,
            user_id=self.other_user_id,
            rating=7.0
        )
        
        UserRating.objects.create(
            media=self.media2,
            user_id=self.other_user_id,
            rating=6.5
        )

    def test_calculate_rating_deviation(self):
        analyzer = TasteAnalyzer(self.user_id)
        result = analyzer.calculate_rating_deviation()
        
        self.assertEqual(result['total_ratings'], 5)
        
        expected_user_avg = (8.0 + 7.0 + 6.0 + 5.0 + 9.0) / 5
        expected_tmdb_avg = (7.5 + 6.0 + 8.5 + 5.5 + 7.0) / 5
        expected_deviation = expected_user_avg - expected_tmdb_avg
        
        self.assertAlmostEqual(result['average_user_rating'], round(expected_user_avg, 2))
        self.assertAlmostEqual(result['average_tmdb_rating'], round(expected_tmdb_avg, 2))
        self.assertAlmostEqual(result['rating_deviation'], round(expected_deviation, 2))
        
        self.assertIn(result['deviation_direction'], ['more_generous', 'more_strict', 'similar'])

    def test_calculate_rating_deviation_no_data(self):
        analyzer = TasteAnalyzer(999)
        result = analyzer.calculate_rating_deviation()
        
        self.assertEqual(result['total_ratings'], 0)
        self.assertEqual(result['average_user_rating'], 0.0)
        self.assertEqual(result['average_tmdb_rating'], 0.0)
        self.assertEqual(result['rating_deviation'], 0.0)
        self.assertEqual(result['deviation_direction'], 'no_data')

    def test_analyze_by_genre(self):
        analyzer = TasteAnalyzer(self.user_id)
        result = analyzer.analyze_by_genre()
        
        self.assertIsInstance(result, list)
        
        for genre in result:
            self.assertIn('genre_id', genre)
            self.assertIn('genre_name', genre)
            self.assertIn('total_ratings', genre)
            self.assertIn('average_user_rating', genre)
            self.assertIn('average_tmdb_rating', genre)
            self.assertIn('average_deviation', genre)
            self.assertIn('preference', genre)
            
            self.assertGreaterEqual(genre['total_ratings'], 3)
            self.assertIn(genre['preference'], ['prefers_above_average', 'prefers_below_average', 'balanced'])

    def test_analyze_by_genre_no_sufficient_data(self):
        new_user_id = 3
        UserRating.objects.create(
            media=self.media1,
            user_id=new_user_id,
            rating=8.0
        )
        
        analyzer = TasteAnalyzer(new_user_id)
        result = analyzer.analyze_by_genre()
        
        self.assertEqual(result, [])

    def test_get_extreme_deviations(self):
        analyzer = TasteAnalyzer(self.user_id)
        result = analyzer.get_extreme_deviations(limit=2)
        
        self.assertIn('highest_deviation', result)
        self.assertIn('lowest_deviation', result)
        
        self.assertLessEqual(len(result['highest_deviation']), 2)
        self.assertLessEqual(len(result['lowest_deviation']), 2)
        
        for item in result['highest_deviation']:
            self.assertIn('media_id', item)
            self.assertIn('media_title', item)
            self.assertIn('user_rating', item)
            self.assertIn('tmdb_rating', item)
            self.assertIn('deviation', item)
            self.assertIn('absolute_deviation', item)

    def test_get_extreme_deviations_no_data(self):
        analyzer = TasteAnalyzer(999)
        result = analyzer.get_extreme_deviations()
        
        self.assertEqual(result['highest_deviation'], [])
        self.assertEqual(result['lowest_deviation'], [])

    def test_generate_complete_analysis(self):
        analyzer = TasteAnalyzer(self.user_id)
        result = analyzer.generate_complete_analysis()
        
        self.assertIn('user_id', result)
        self.assertIn('total_ratings', result)
        self.assertIn('average_user_rating', result)
        self.assertIn('average_tmdb_rating', result)
        self.assertIn('rating_deviation', result)
        self.assertIn('deviation_direction', result)
        self.assertIn('genre_analysis', result)
        self.assertIn('highest_deviation_media', result)
        self.assertIn('lowest_deviation_media', result)
        
        self.assertEqual(result['user_id'], self.user_id)
        
        taste_profile = TasteProfile.objects.filter(user_id=self.user_id).first()
        self.assertIsNotNone(taste_profile)
        self.assertEqual(taste_profile.total_ratings, result['total_ratings'])

    def test_calculate_similarity_score(self):
        analyzer = TasteAnalyzer(self.user_id)
        
        common_media = [
            {'difference': 1.0},
            {'difference': 0.5},
            {'difference': 2.0}
        ]
        
        score = analyzer._calculate_similarity_score(common_media)
        
        total_diff = 1.0 + 0.5 + 2.0
        max_diff = 3 * 10
        expected_score = 1 - (total_diff / max_diff)
        
        self.assertAlmostEqual(score, round(expected_score, 2))
        self.assertGreaterEqual(score, 0.0)
        self.assertLessEqual(score, 1.0)

    def test_calculate_similarity_score_no_common_media(self):
        analyzer = TasteAnalyzer(self.user_id)
        
        score = analyzer._calculate_similarity_score([])
        
        self.assertEqual(score, 0.0)

    def test_find_common_media(self):
        analyzer = TasteAnalyzer(self.user_id)
        
        common_media = analyzer._find_common_media(self.other_user_id)
        
        self.assertEqual(len(common_media), 2)
        
        for media in common_media:
            self.assertIn('media_id', media)
            self.assertIn('media_title', media)
            self.assertIn('my_rating', media)
            self.assertIn('other_rating', media)
            self.assertIn('difference', media)

    def test_deviation_direction_more_generous(self):
        generous_user_id = 100
        
        media_high = Media.objects.create(
            tmdb_id=100,
            title='High Rated Movie',
            media_type='movie',
            vote_average=5.0
        )
        
        UserRating.objects.create(
            media=media_high,
            user_id=generous_user_id,
            rating=9.0
        )
        
        analyzer = TasteAnalyzer(generous_user_id)
        result = analyzer.calculate_rating_deviation()
        
        self.assertGreater(result['rating_deviation'], 0.5)
        self.assertEqual(result['deviation_direction'], 'more_generous')

    def test_deviation_direction_more_strict(self):
        strict_user_id = 101
        
        media_low = Media.objects.create(
            tmdb_id=101,
            title='Low Rated Movie',
            media_type='movie',
            vote_average=9.0
        )
        
        UserRating.objects.create(
            media=media_low,
            user_id=strict_user_id,
            rating=5.0
        )
        
        analyzer = TasteAnalyzer(strict_user_id)
        result = analyzer.calculate_rating_deviation()
        
        self.assertLess(result['rating_deviation'], -0.5)
        self.assertEqual(result['deviation_direction'], 'more_strict')

    def test_deviation_direction_similar(self):
        similar_user_id = 102
        
        media_similar = Media.objects.create(
            tmdb_id=102,
            title='Similar Rated Movie',
            media_type='movie',
            vote_average=7.0
        )
        
        UserRating.objects.create(
            media=media_similar,
            user_id=similar_user_id,
            rating=7.2
        )
        
        analyzer = TasteAnalyzer(similar_user_id)
        result = analyzer.calculate_rating_deviation()
        
        self.assertAlmostEqual(abs(result['rating_deviation']), 0.2, places=1)
        self.assertEqual(result['deviation_direction'], 'similar')
