import numpy as np
from typing import List, Optional
from sentence_transformers import SentenceTransformer
from ..config import settings


class EmbeddingService:
    def __init__(self):
        self.model: Optional[SentenceTransformer] = None
        self.model_name = settings.EMBEDDING_MODEL
        self.embedding_dim = settings.EMBEDDING_DIMENSION
    
    def _load_model(self):
        if self.model is None:
            self.model = SentenceTransformer(self.model_name)
    
    def generate_embedding(self, text: str) -> np.ndarray:
        self._load_model()
        embedding = self.model.encode(text, convert_to_numpy=True)
        return embedding.astype(np.float32)
    
    def generate_embeddings(self, texts: List[str]) -> np.ndarray:
        self._load_model()
        embeddings = self.model.encode(texts, convert_to_numpy=True, show_progress_bar=False)
        return embeddings.astype(np.float32)
    
    def get_embedding_dimension(self) -> int:
        return self.embedding_dim


embedding_service = EmbeddingService()
