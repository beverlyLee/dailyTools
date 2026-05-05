import os
from typing import List, Optional
from uuid import uuid4

from langchain_core.documents import Document as LangChainDocument
from langchain_community.embeddings import HuggingFaceEmbeddings
from langchain_chroma import Chroma

from app.core.config import get_settings

settings = get_settings()


class VectorStoreService:
    def __init__(self):
        self._embeddings = None
        self._vectorstore = None
        self._collection_name = settings.chroma_collection_name
        self._persist_directory = settings.chroma_db_path
    
    @property
    def embeddings(self):
        if self._embeddings is None:
            self._embeddings = HuggingFaceEmbeddings(
                model_name=settings.embedding_model_name,
                model_kwargs={"device": settings.embedding_model_device},
                encode_kwargs={"normalize_embeddings": True},
            )
        return self._embeddings
    
    @property
    def vectorstore(self):
        if self._vectorstore is None:
            os.makedirs(self._persist_directory, exist_ok=True)
            self._vectorstore = Chroma(
                collection_name=self._collection_name,
                embedding_function=self.embeddings,
                persist_directory=self._persist_directory,
            )
        return self._vectorstore
    
    def add_documents(
        self, 
        documents: List[LangChainDocument], 
        document_id: Optional[str] = None
    ) -> List[str]:
        if document_id:
            for doc in documents:
                doc.metadata["document_id"] = document_id
        
        uuids = [str(uuid4()) for _ in range(len(documents))]
        
        self.vectorstore.add_documents(
            documents=documents,
            ids=uuids,
        )
        
        return uuids
    
    def search(
        self, 
        query: str, 
        k: int = 5,
        filter_dict: Optional[dict] = None
    ) -> List[LangChainDocument]:
        if filter_dict:
            results = self.vectorstore.similarity_search(
                query=query,
                k=k,
                filter=filter_dict,
            )
        else:
            results = self.vectorstore.similarity_search(
                query=query,
                k=k,
            )
        
        return results
    
    def search_with_score(
        self, 
        query: str, 
        k: int = 5,
        filter_dict: Optional[dict] = None
    ) -> List[tuple[LangChainDocument, float]]:
        if filter_dict:
            results = self.vectorstore.similarity_search_with_score(
                query=query,
                k=k,
                filter=filter_dict,
            )
        else:
            results = self.vectorstore.similarity_search_with_score(
                query=query,
                k=k,
            )
        
        return results
    
    def delete_by_document_id(self, document_id: str) -> bool:
        try:
            collection = self.vectorstore._collection
            results = collection.get(
                where={"document_id": document_id}
            )
            
            if results["ids"]:
                collection.delete(ids=results["ids"])
                return True
            return False
        except Exception:
            return False
    
    def get_document_count(self) -> int:
        try:
            return self.vectorstore._collection.count()
        except Exception:
            return 0
    
    def get_all_documents(self) -> List[LangChainDocument]:
        try:
            collection = self.vectorstore._collection
            results = collection.get()
            
            documents = []
            for i, doc_id in enumerate(results["ids"]):
                document = LangChainDocument(
                    page_content=results["documents"][i] if results["documents"] else "",
                    metadata=results["metadatas"][i] if results["metadatas"] else {},
                )
                documents.append(document)
            
            return documents
        except Exception:
            return []
    
    def clear_collection(self) -> bool:
        try:
            import chromadb
            client = chromadb.PersistentClient(path=self._persist_directory)
            
            try:
                client.delete_collection(self._collection_name)
            except ValueError:
                pass
            
            client.create_collection(self._collection_name)
            self._vectorstore = None
            return True
        except Exception:
            return False


def get_vector_store_service() -> VectorStoreService:
    return VectorStoreService()
