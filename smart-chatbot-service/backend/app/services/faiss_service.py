import os
from typing import List, Optional
from uuid import uuid4
import faiss
import numpy as np
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_community.embeddings import OllamaEmbeddings
from langchain_community.docstore.in_memory import InMemoryDocstore
from langchain_community.vectorstores import FAISS as LangChainFAISS
from langchain_core.documents import Document

from app.config import get_settings

class FAISSService:
    def __init__(self, index_path: Optional[str] = None, embedding_model: Optional[str] = None):
        settings = get_settings()
        self.index_path = index_path or settings.faiss_index_path
        self.embedding_model = embedding_model or settings.embedding_model
        
        self.embeddings = OllamaEmbeddings(
            base_url=settings.ollama_base_url,
            model=self.embedding_model
        )
        
        os.makedirs(self.index_path, exist_ok=True)
        
        self.index_file = os.path.join(self.index_path, "index.faiss")
        self.store_file = os.path.join(self.index_path, "store.pkl")
        
        self.vectorstore: Optional[LangChainFAISS] = None
        self._load_or_create_index()
        
        self.text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=1000,
            chunk_overlap=200,
            length_function=len,
        )
    
    def _load_or_create_index(self):
        if os.path.exists(self.index_file):
            try:
                self.vectorstore = LangChainFAISS.load_local(
                    self.index_path,
                    self.embeddings,
                    allow_dangerous_deserialization=True
                )
                return
            except Exception:
                pass
        
        index = faiss.IndexFlatL2(768)
        self.vectorstore = LangChainFAISS(
            embedding_function=self.embeddings,
            index=index,
            docstore=InMemoryDocstore(),
            index_to_docstore_id={},
        )
    
    def _save_index(self):
        if self.vectorstore:
            self.vectorstore.save_local(self.index_path)
    
    def add_document(self, content: str, metadata: dict = None) -> List[str]:
        if metadata is None:
            metadata = {}
        
        docs = self.text_splitter.create_documents([content], [metadata])
        
        ids = [str(uuid4()) for _ in range(len(docs))]
        
        if self.vectorstore:
            self.vectorstore.add_documents(docs, ids=ids)
            self._save_index()
        
        return ids
    
    def add_documents_from_files(self, files_data: List[dict]) -> dict:
        uploaded_files = []
        failed_files = []
        
        for file_data in files_data:
            filename = file_data.get("filename", "unknown")
            content = file_data.get("content", "")
            file_type = file_data.get("type", "text")
            
            try:
                if file_type == "pdf":
                    from langchain_community.document_loaders import PyPDFLoader
                    import tempfile
                    
                    with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as tmp:
                        if isinstance(content, bytes):
                            tmp.write(content)
                        else:
                            tmp.write(content.encode("utf-8"))
                        tmp_path = tmp.name
                    
                    loader = PyPDFLoader(tmp_path)
                    pdf_docs = loader.load()
                    
                    all_text = "\n".join([doc.page_content for doc in pdf_docs])
                    
                    os.unlink(tmp_path)
                    
                    self.add_document(all_text, {"source": filename, "type": "pdf"})
                else:
                    if isinstance(content, bytes):
                        text_content = content.decode("utf-8")
                    else:
                        text_content = content
                    
                    self.add_document(text_content, {"source": filename, "type": file_type})
                
                uploaded_files.append(filename)
            except Exception as e:
                failed_files.append({
                    "filename": filename,
                    "reason": str(e)
                })
        
        return {
            "uploaded_files": uploaded_files,
            "failed_files": failed_files
        }
    
    def retrieve(self, query: str, k: int = 4) -> str:
        if not self.vectorstore:
            return "没有找到相关的文档信息。"
        
        docs = self.vectorstore.similarity_search(query, k=k)
        
        if not docs:
            return "没有找到相关的文档信息。"
        
        context_parts = []
        for i, doc in enumerate(docs):
            source = doc.metadata.get("source", "未知来源")
            context_parts.append(f"[文档 {i+1} - 来源: {source}]\n{doc.page_content}\n")
        
        return "\n".join(context_parts)
    
    def retrieve_with_scores(self, query: str, k: int = 4) -> List[tuple]:
        if not self.vectorstore:
            return []
        
        docs_with_scores = self.vectorstore.similarity_search_with_score(query, k=k)
        return docs_with_scores
    
    def get_relevance_score(self, query: str) -> float:
        docs_with_scores = self.retrieve_with_scores(query, k=1)
        if not docs_with_scores:
            return 0.0
        
        _, score = docs_with_scores[0]
        similarity_score = 1.0 / (1.0 + score) if score >= 0 else 0.0
        
        return similarity_score
    
    def get_all_documents(self) -> List[dict]:
        if not self.vectorstore:
            return []
        
        documents = []
        docstore = self.vectorstore.docstore
        
        if hasattr(docstore, '_dict'):
            for doc_id, doc in docstore._dict.items():
                documents.append({
                    "id": doc_id,
                    "metadata": doc.metadata,
                    "preview": doc.page_content[:100] if len(doc.page_content) > 100 else doc.page_content
                })
        
        return documents
    
    def delete_document(self, document_id: str) -> bool:
        if not self.vectorstore:
            return False
        
        try:
            self.vectorstore.delete([document_id])
            self._save_index()
            return True
        except Exception:
            return False
    
    def clear_collection(self) -> bool:
        try:
            index = faiss.IndexFlatL2(768)
            self.vectorstore = LangChainFAISS(
                embedding_function=self.embeddings,
                index=index,
                docstore=InMemoryDocstore(),
                index_to_docstore_id={},
            )
            self._save_index()
            return True
        except Exception:
            return False
