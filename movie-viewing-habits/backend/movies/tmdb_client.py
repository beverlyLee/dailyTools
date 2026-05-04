import os
import time
import requests
from django.conf import settings
from typing import Optional, Dict, Any, List
import logging

logger = logging.getLogger(__name__)


class TMDbClient:
    def __init__(self):
        self.api_key = settings.TMDB_API_KEY
        self.base_url = settings.TMDB_BASE_URL
        self.session = requests.Session()
        self.session.params = {'api_key': self.api_key}
        
        self.rate_limit_remaining = 40
        self.rate_limit_reset = 0
        self.max_retries = 3
        self.retry_delay = 1
        self.rate_limit_delay = 0.25

    def _handle_rate_limit(self, response):
        remaining = response.headers.get('X-RateLimit-Remaining')
        reset = response.headers.get('X-RateLimit-Reset')
        
        if remaining is not None:
            self.rate_limit_remaining = int(remaining)
        if reset is not None:
            self.rate_limit_reset = int(reset)
        
        if self.rate_limit_remaining <= 1:
            current_time = int(time.time())
            wait_time = self.rate_limit_reset - current_time + 1
            if wait_time > 0:
                logger.warning(f"Rate limit reached. Waiting {wait_time} seconds...")
                time.sleep(wait_time)

    def _make_request(self, endpoint: str, params: Optional[Dict[str, Any]] = None) -> Optional[Dict[str, Any]]:
        if params is None:
            params = {}
        
        url = f"{self.base_url}{endpoint}"
        
        for attempt in range(self.max_retries):
            try:
                time.sleep(self.rate_limit_delay)
                
                response = self.session.get(url, params=params, timeout=10)
                
                self._handle_rate_limit(response)
                
                if response.status_code == 200:
                    return response.json()
                elif response.status_code == 429:
                    retry_after = int(response.headers.get('Retry-After', 5))
                    logger.warning(f"Rate limit exceeded. Retrying after {retry_after} seconds...")
                    time.sleep(retry_after)
                    continue
                elif response.status_code >= 500:
                    logger.warning(f"Server error {response.status_code}. Retrying...")
                    time.sleep(self.retry_delay * (attempt + 1))
                    continue
                else:
                    logger.error(f"API request failed with status {response.status_code}")
                    response.raise_for_status()
                    
            except requests.exceptions.RequestException as e:
                logger.error(f"Request exception: {e}")
                if attempt < self.max_retries - 1:
                    time.sleep(self.retry_delay * (attempt + 1))
                    continue
                else:
                    raise
        
        return None

    def get_movie_details(self, movie_id: int) -> Optional[Dict[str, Any]]:
        return self._make_request(f'/movie/{movie_id}', {'append_to_response': 'credits,videos'})

    def get_tv_details(self, tv_id: int) -> Optional[Dict[str, Any]]:
        return self._make_request(f'/tv/{tv_id}', {'append_to_response': 'credits,videos'})

    def search_movies(self, query: str, page: int = 1) -> Optional[Dict[str, Any]]:
        return self._make_request('/search/movie', {'query': query, 'page': page})

    def search_tv(self, query: str, page: int = 1) -> Optional[Dict[str, Any]]:
        return self._make_request('/search/tv', {'query': query, 'page': page})

    def get_popular_movies(self, page: int = 1) -> Optional[Dict[str, Any]]:
        return self._make_request('/movie/popular', {'page': page})

    def get_top_rated_movies(self, page: int = 1) -> Optional[Dict[str, Any]]:
        return self._make_request('/movie/top_rated', {'page': page})

    def get_trending(self, media_type: str = 'all', time_window: str = 'week') -> Optional[Dict[str, Any]]:
        return self._make_request(f'/trending/{media_type}/{time_window}')

    def get_movie_external_ids(self, movie_id: int) -> Optional[Dict[str, Any]]:
        return self._make_request(f'/movie/{movie_id}/external_ids')

    def get_tv_external_ids(self, tv_id: int) -> Optional[Dict[str, Any]]:
        return self._make_request(f'/tv/{tv_id}/external_ids')

    def get_genre_list(self, media_type: str = 'movie') -> Optional[Dict[str, Any]]:
        return self._make_request(f'/genre/{media_type}/list')

    def discover_movies(self, params: Optional[Dict[str, Any]] = None) -> Optional[Dict[str, Any]]:
        return self._make_request('/discover/movie', params)

    def discover_tv(self, params: Optional[Dict[str, Any]] = None) -> Optional[Dict[str, Any]]:
        return self._make_request('/discover/tv', params)


tmdb_client = TMDbClient()
