import json
import os
import hashlib
from datetime import datetime, timedelta
from typing import Any, Optional
from app.config import settings


class CacheService:
    def __init__(self):
        self.cache_dir = settings.CACHE_DIR
        self.ttl_hours = settings.CACHE_TTL_HOURS
        os.makedirs(self.cache_dir, exist_ok=True)
    
    def _get_cache_file_path(self, key: str) -> str:
        key_hash = hashlib.sha256(key.encode()).hexdigest()
        return os.path.join(self.cache_dir, f"{key_hash}.json")
    
    def get(self, key: str) -> Optional[Any]:
        cache_file = self._get_cache_file_path(key)
        
        if not os.path.exists(cache_file):
            return None
        
        try:
            with open(cache_file, 'r', encoding='utf-8') as f:
                cache_data = json.load(f)
            
            cached_at = datetime.fromisoformat(cache_data.get('cached_at', ''))
            if datetime.utcnow() - cached_at > timedelta(hours=self.ttl_hours):
                os.remove(cache_file)
                return None
            
            return cache_data.get('data')
        except (json.JSONDecodeError, KeyError, ValueError):
            if os.path.exists(cache_file):
                os.remove(cache_file)
            return None
    
    def set(self, key: str, data: Any, ttl_hours: Optional[int] = None) -> None:
        cache_file = self._get_cache_file_path(key)
        effective_ttl = ttl_hours or self.ttl_hours
        
        cache_data = {
            'cached_at': datetime.utcnow().isoformat(),
            'ttl_hours': effective_ttl,
            'data': data
        }
        
        with open(cache_file, 'w', encoding='utf-8') as f:
            json.dump(cache_data, f, ensure_ascii=False, default=str)
    
    def delete(self, key: str) -> None:
        cache_file = self._get_cache_file_path(key)
        if os.path.exists(cache_file):
            os.remove(cache_file)
    
    def clear_expired(self) -> int:
        deleted_count = 0
        for filename in os.listdir(self.cache_dir):
            if not filename.endswith('.json'):
                continue
            
            filepath = os.path.join(self.cache_dir, filename)
            try:
                with open(filepath, 'r', encoding='utf-8') as f:
                    cache_data = json.load(f)
                
                cached_at = datetime.fromisoformat(cache_data.get('cached_at', ''))
                ttl = cache_data.get('ttl_hours', self.ttl_hours)
                
                if datetime.utcnow() - cached_at > timedelta(hours=ttl):
                    os.remove(filepath)
                    deleted_count += 1
            except (json.JSONDecodeError, KeyError, ValueError):
                if os.path.exists(filepath):
                    os.remove(filepath)
                    deleted_count += 1
        
        return deleted_count
    
    def clear_all(self) -> int:
        deleted_count = 0
        for filename in os.listdir(self.cache_dir):
            if filename.endswith('.json'):
                filepath = os.path.join(self.cache_dir, filename)
                os.remove(filepath)
                deleted_count += 1
        return deleted_count


cache_service = CacheService()
