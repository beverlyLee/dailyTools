import faiss
import numpy as np
import json
from pathlib import Path
from typing import List, Optional, Tuple
from ..config import settings


class VectorStore:
    def __init__(self, index_path: Path, dimension: int):
        self.index_path = index_path
        self.dimension = dimension
        self.index: Optional[faiss.Index] = None
        self.metadata_file = index_path.parent / "vector_metadata.json"
        self.id_map: dict = {}
        self.next_id: int = 0
    
    def _initialize_index(self):
        if self.index is None:
            if self.index_path.exists():
                self.index = faiss.read_index(str(self.index_path))
                self._load_metadata()
            else:
                self.index = faiss.IndexFlatL2(self.dimension)
                self.id_map = {}
                self.next_id = 0
    
    def _load_metadata(self):
        if self.metadata_file.exists():
            with open(self.metadata_file, "r", encoding="utf-8") as f:
                data = json.load(f)
                self.id_map = data.get("id_map", {})
                self.next_id = data.get("next_id", 0)
        else:
            self.id_map = {}
            self.next_id = 0
    
    def _save_metadata(self):
        with open(self.metadata_file, "w", encoding="utf-8") as f:
            json.dump({"id_map": self.id_map, "next_id": self.next_id}, f)
    
    def _save_index(self):
        if self.index is not None:
            faiss.write_index(self.index, str(self.index_path))
            self._save_metadata()
    
    def add_embedding(self, document_id: str, embedding: np.ndarray) -> int:
        self._initialize_index()
        
        if embedding.ndim == 1:
            embedding = embedding.reshape(1, -1)
        
        vector_id = self.next_id
        self.index.add(embedding)
        self.id_map[str(vector_id)] = document_id
        self.next_id += 1
        
        self._save_index()
        return vector_id
    
    def add_embeddings(self, document_ids: List[str], embeddings: np.ndarray) -> List[int]:
        self._initialize_index()
        
        vector_ids = []
        start_id = self.next_id
        
        for i, doc_id in enumerate(document_ids):
            vector_id = start_id + i
            vector_ids.append(vector_id)
            self.id_map[str(vector_id)] = doc_id
        
        self.index.add(embeddings)
        self.next_id = start_id + len(document_ids)
        
        self._save_index()
        return vector_ids
    
    def search(
        self, query_embedding: np.ndarray, top_k: int = 10
    ) -> List[Tuple[str, float]]:
        self._initialize_index()
        
        if self.index.ntotal == 0:
            return []
        
        if query_embedding.ndim == 1:
            query_embedding = query_embedding.reshape(1, -1)
        
        distances, indices = self.index.search(query_embedding, min(top_k, self.index.ntotal))
        
        results = []
        for i, idx in enumerate(indices[0]):
            if idx != -1 and str(idx) in self.id_map:
                document_id = self.id_map[str(idx)]
                distance = float(distances[0][i])
                score = 1.0 / (1.0 + distance)
                results.append((document_id, score))
        
        return results
    
    def delete_by_document_id(self, document_id: str) -> bool:
        self._initialize_index()
        
        vector_id = None
        for vid, doc_id in self.id_map.items():
            if doc_id == document_id:
                vector_id = int(vid)
                break
        
        if vector_id is None:
            return False
        
        del self.id_map[str(vector_id)]
        self._save_metadata()
        return True
    
    def get_total_vectors(self) -> int:
        self._initialize_index()
        return self.index.ntotal if self.index else 0
    
    def clear(self):
        self.index = faiss.IndexFlatL2(self.dimension)
        self.id_map = {}
        self.next_id = 0
        if self.index_path.exists():
            self.index_path.unlink()
        if self.metadata_file.exists():
            self.metadata_file.unlink()


vector_store = VectorStore(
    index_path=settings.FAISS_INDEX_PATH,
    dimension=settings.EMBEDDING_DIMENSION
)
