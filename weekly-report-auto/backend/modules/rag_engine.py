import os
import json
from typing import List, Dict, Optional, Any
from datetime import datetime
import numpy as np

from langchain_core.documents import Document
from langchain_openai import OpenAIEmbeddings
from langchain_text_splitters import RecursiveCharacterTextSplitter

from config import config

CHROMA_AVAILABLE = False
Chroma = None

try:
    from langchain_chroma import Chroma
    CHROMA_AVAILABLE = True
    print("使用 langchain-chroma 向量存储")
except ImportError:
    try:
        import warnings
        warnings.filterwarnings("ignore", category=DeprecationWarning)
        from langchain_community.vectorstores import Chroma
        CHROMA_AVAILABLE = True
        print("使用 langchain_community Chroma（已弃用，建议安装 langchain-chroma）")
    except ImportError:
        pass

if not CHROMA_AVAILABLE:
    print("ChromaDB不可用，将使用内存向量存储模式")


class InMemoryVectorStore:
    def __init__(self, embeddings):
        self.embeddings = embeddings
        self.documents = []
        self.embeddings_list = []
        self.metadata_list = []
    
    def _cosine_similarity(self, a: np.ndarray, b: np.ndarray) -> float:
        dot_product = np.dot(a, b)
        norm_a = np.linalg.norm(a)
        norm_b = np.linalg.norm(b)
        if norm_a == 0 or norm_b == 0:
            return 0.0
        return dot_product / (norm_a * norm_b)
    
    def add_documents(self, documents: List[Document]) -> Dict:
        if not documents:
            return {'added_count': 0}
        
        texts = [doc.page_content for doc in documents]
        embeddings = self.embeddings.embed_documents(texts)
        
        for i, doc in enumerate(documents):
            self.documents.append(doc)
            self.embeddings_list.append(embeddings[i])
            self.metadata_list.append(doc.metadata)
        
        return {
            'added_count': len(documents),
            'success': True
        }
    
    def similarity_search_with_score(
        self,
        query: str,
        k: int = 5
    ) -> List:
        if not self.documents:
            return []
        
        query_embedding = self.embeddings.embed_query(query)
        query_embedding_np = np.array(query_embedding)
        
        scores = []
        for i, emb in enumerate(self.embeddings_list):
            emb_np = np.array(emb)
            score = self._cosine_similarity(query_embedding_np, emb_np)
            scores.append((i, score))
        
        scores.sort(key=lambda x: x[1], reverse=True)
        
        results = []
        for idx, score in scores[:k]:
            doc = self.documents[idx]
            results.append((doc, score))
        
        return results
    
    def similarity_search(
        self,
        query: str,
        k: int = 5,
        filter_dict: Optional[Dict] = None
    ) -> List[Document]:
        results_with_scores = self.similarity_search_with_score(query, k=k)
        
        filtered_results = []
        for doc, score in results_with_scores:
            if filter_dict:
                match = True
                for key, value in filter_dict.items():
                    if doc.metadata.get(key) != value:
                        match = False
                        break
                if match:
                    filtered_results.append(doc)
            else:
                filtered_results.append(doc)
        
        return filtered_results
    
    def persist(self):
        pass
    
    def delete_collection(self):
        self.documents = []
        self.embeddings_list = []
        self.metadata_list = []
    
    def count(self) -> int:
        return len(self.documents)


class RAGEngine:
    def __init__(self):
        self.embeddings = OpenAIEmbeddings(
            model=config.OPENAI_EMBEDDING_MODEL,
            api_key=config.OPENAI_API_KEY
        )
        
        self.use_chroma = CHROMA_AVAILABLE
        self._collection_name = "weekly_report_docs"
        
        if self.use_chroma:
            try:
                self.vector_store = Chroma(
                    persist_directory=config.CHROMA_PERSIST_DIRECTORY,
                    embedding_function=self.embeddings,
                    collection_name=self._collection_name
                )
                self.in_memory_store = None
                print(f"使用ChromaDB向量存储: {config.CHROMA_PERSIST_DIRECTORY}")
            except Exception as e:
                print(f"ChromaDB初始化失败，使用内存存储: {e}")
                self.use_chroma = False
                self.vector_store = InMemoryVectorStore(self.embeddings)
                self.in_memory_store = self.vector_store
        else:
            print("使用内存向量存储模式")
            self.vector_store = InMemoryVectorStore(self.embeddings)
            self.in_memory_store = self.vector_store
        
        self.text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=500,
            chunk_overlap=50,
            separators=["\n\n", "\n", ". ", " ", ""]
        )
    
    def add_documents(self, documents: List[Dict[str, Any]]) -> Dict:
        langchain_docs = []
        
        for doc in documents:
            metadata = doc.get('metadata', {})
            metadata['source_type'] = doc.get('source_type', 'unknown')
            metadata['timestamp'] = doc.get('timestamp', datetime.now().isoformat())
            
            langchain_docs.append(Document(
                page_content=doc.get('content', ''),
                metadata=metadata
            ))
        
        split_docs = self.text_splitter.split_documents(langchain_docs)
        
        if split_docs:
            if self.use_chroma:
                self.vector_store.add_documents(split_docs)
                self.vector_store.persist()
            else:
                self.in_memory_store.add_documents(split_docs)
        
        return {
            'success': True,
            'added_count': len(split_docs),
            'original_count': len(documents),
            'storage_mode': 'chromadb' if self.use_chroma else 'in_memory'
        }
    
    def search(
        self,
        query: str,
        top_k: int = 5,
        filter_dict: Optional[Dict] = None
    ) -> List[Dict]:
        if filter_dict:
            results = self.vector_store.similarity_search(
                query,
                k=top_k,
                filter_dict=filter_dict
            )
        else:
            results = self.vector_store.similarity_search(
                query,
                k=top_k
            )
        
        return [
            {
                'content': doc.page_content,
                'metadata': doc.metadata,
                'score': getattr(doc, 'score', None)
            }
            for doc in results
        ]
    
    def search_with_scores(
        self,
        query: str,
        top_k: int = 5
    ) -> List[Dict]:
        if self.use_chroma:
            results = self.vector_store.similarity_search_with_score(
                query,
                k=top_k
            )
        else:
            results = self.in_memory_store.similarity_search_with_score(
                query,
                k=top_k
            )
        
        return [
            {
                'content': doc.page_content,
                'metadata': doc.metadata,
                'score': score
            }
            for doc, score in results
        ]
    
    def add_chat_records(self, chat_records: List[Dict]) -> Dict:
        documents = []
        
        for record in chat_records:
            sender = record.get('sender', '未知')
            content = record.get('content', '')
            timestamp = record.get('timestamp', datetime.now().isoformat())
            source = record.get('source', 'unknown')
            
            doc_content = f"[{source}] {sender}: {content}"
            
            documents.append({
                'content': doc_content,
                'source_type': 'chat',
                'metadata': {
                    'sender': sender,
                    'source': source,
                    'timestamp': timestamp,
                    'conversation_id': record.get('conversationId'),
                    'is_self': record.get('isSelf', False)
                }
            })
        
        return self.add_documents(documents)
    
    def add_git_commits(self, commits: List[Dict]) -> Dict:
        documents = []
        
        for commit in commits:
            author = commit.get('author', '未知')
            message = commit.get('message', '')
            date = commit.get('date', datetime.now().isoformat())
            hash_val = commit.get('hash', '')
            short_hash = commit.get('shortHash', hash_val[:7])
            
            doc_content = f"[Git] {author} ({short_hash}): {message}"
            
            documents.append({
                'content': doc_content,
                'source_type': 'git',
                'metadata': {
                    'author': author,
                    'hash': hash_val,
                    'short_hash': short_hash,
                    'timestamp': date,
                    'files_changed': len(commit.get('files', []))
                }
            })
        
        return self.add_documents(documents)
    
    def get_context_for_report(
        self,
        since: Optional[str] = None,
        until: Optional[str] = None,
        top_k: int = 20
    ) -> Dict:
        queries = [
            "本周完成的工作 已完成 已解决 已修复",
            "遇到的问题 困难 阻塞 待解决",
            "下周计划 待办 将要 即将",
            "重要会议 讨论 决定 重要事项",
            "技术相关 代码 开发 实现 部署"
        ]
        
        all_results = []
        seen_contents = set()
        
        for query in queries:
            results = self.search(query, top_k=top_k // 2)
            for result in results:
                content = result['content']
                if content not in seen_contents:
                    seen_contents.add(content)
                    
                    if since or until:
                        timestamp = result['metadata'].get('timestamp')
                        if timestamp:
                            try:
                                ts_date = datetime.fromisoformat(timestamp.replace('Z', '+00:00'))
                                if since:
                                    since_date = datetime.fromisoformat(since.replace('Z', '+00:00'))
                                    if ts_date < since_date:
                                        continue
                                if until:
                                    until_date = datetime.fromisoformat(until.replace('Z', '+00:00'))
                                    if ts_date > until_date:
                                        continue
                            except (ValueError, TypeError):
                                pass
                    
                    all_results.append(result)
        
        all_results.sort(
            key=lambda x: x['metadata'].get('timestamp', ''),
            reverse=True
        )
        
        return {
            'total_count': len(all_results),
            'documents': all_results[:top_k],
            'chat_count': sum(1 for r in all_results if r['metadata'].get('source_type') == 'chat'),
            'git_count': sum(1 for r in all_results if r['metadata'].get('source_type') == 'git')
        }
    
    def clear_collection(self) -> Dict:
        if self.use_chroma:
            self.vector_store.delete_collection()
            self.vector_store = Chroma(
                persist_directory=config.CHROMA_PERSIST_DIRECTORY,
                embedding_function=self.embeddings,
                collection_name=self._collection_name
            )
        else:
            self.in_memory_store.delete_collection()
        
        return {'success': True, 'message': '向量数据库已清空'}
    
    def get_collection_stats(self) -> Dict:
        if self.use_chroma:
            collection = self.vector_store._collection
            count = collection.count()
        else:
            count = self.in_memory_store.count()
        
        return {
            'total_documents': count,
            'collection_name': self._collection_name,
            'storage_mode': 'chromadb' if self.use_chroma else 'in_memory'
        }
