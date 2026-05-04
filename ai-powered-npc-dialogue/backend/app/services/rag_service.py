import os
from typing import List, Optional, Dict, Any
from pathlib import Path
import logging

from app.config import settings

logger = logging.getLogger(__name__)

class RAGService:
    def __init__(self):
        self.knowledge_base_path = Path(settings.KNOWLEDGE_BASE_PATH)
        self.vector_store_path = Path(settings.VECTOR_STORE_PATH)
        
        self.vector_store = None
        self.documents = []
        
        # 确保目录存在
        self.knowledge_base_path.mkdir(parents=True, exist_ok=True)
        self.vector_store_path.mkdir(parents=True, exist_ok=True)
    
    def load_documents(self) -> List[Dict[str, Any]]:
        """加载知识库文档"""
        documents = []
        
        if not self.knowledge_base_path.exists():
            logger.warning(f"知识库目录不存在: {self.knowledge_base_path}")
            return documents
        
        # 加载所有txt文件
        for file_path in self.knowledge_base_path.glob("*.txt"):
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    content = f.read()
                
                # 简单地按段落分割文档
                chunks = self._split_text(content)
                
                for i, chunk in enumerate(chunks):
                    if chunk.strip():
                        documents.append({
                            "id": f"{file_path.stem}_{i}",
                            "content": chunk,
                            "source": file_path.name,
                            "metadata": {
                                "filename": file_path.name,
                                "chunk_index": i
                            }
                        })
                
                logger.info(f"加载文档: {file_path.name}, 分割为 {len(chunks)} 个块")
            except Exception as e:
                logger.error(f"加载文档失败 {file_path}: {e}")
        
        self.documents = documents
        return documents
    
    def _split_text(self, text: str, chunk_size: int = 500, chunk_overlap: int = 50) -> List[str]:
        """简单的文本分割"""
        # 先按段落分割
        paragraphs = [p.strip() for p in text.split('\n\n') if p.strip()]
        
        chunks = []
        current_chunk = ""
        
        for para in paragraphs:
            if len(current_chunk) + len(para) > chunk_size:
                if current_chunk:
                    chunks.append(current_chunk)
                current_chunk = para
            else:
                current_chunk += ("\n\n" + para) if current_chunk else para
        
        if current_chunk:
            chunks.append(current_chunk)
        
        return chunks
    
    def build_index(self):
        """构建向量索引"""
        documents = self.load_documents()
        
        if not documents:
            logger.warning("没有文档可索引")
            return
        
        logger.info(f"构建向量索引，共 {len(documents)} 个文档块")
        
        # 简单的内存索引（实际项目中应该使用FAISS等向量数据库）
        # 这里我们使用一个简单的基于关键词的索引作为演示
        # 实际项目中应该集成FAISS和Embedding模型
        
        # 为了演示，我们将文档存储在内存中
        self.vector_store = {
            "documents": documents,
            "index_type": "in_memory"
        }
        
        logger.info("向量索引构建完成")
    
    def search(self, query: str, top_k: int = 3) -> List[Dict[str, Any]]:
        """
        搜索相关文档
        
        Args:
            query: 查询语句
            top_k: 返回最相关的k个结果
        
        Returns:
            相关文档列表
        """
        if not self.vector_store or not self.vector_store.get("documents"):
            logger.warning("向量索引未初始化，尝试重建...")
            self.build_index()
        
        if not self.vector_store or not self.vector_store.get("documents"):
            logger.warning("没有可用的文档")
            return []
        
        documents = self.vector_store["documents"]
        
        # 简单的关键词匹配评分（演示用）
        # 实际项目中应该使用向量相似度搜索
        query_words = set(query.lower().split())
        
        scored_docs = []
        for doc in documents:
            content_words = set(doc["content"].lower().split())
            # 计算匹配词数量
            matches = query_words & content_words
            score = len(matches) / (len(query_words) + 1e-6)  # 避免除零
            
            if score > 0:
                scored_docs.append((score, doc))
        
        # 按分数排序
        scored_docs.sort(key=lambda x: x[0], reverse=True)
        
        # 返回前top_k个
        results = []
        for score, doc in scored_docs[:top_k]:
            results.append({
                "content": doc["content"],
                "source": doc["source"],
                "score": score,
                "metadata": doc.get("metadata", {})
            })
        
        logger.info(f"搜索 '{query}' 返回 {len(results)} 个相关文档")
        return results
    
    def get_context_for_query(self, query: str, top_k: int = 3) -> str:
        """
        获取用于增强LLM提示词的上下文
        
        Args:
            query: 用户查询
            top_k: 取前k个文档
        
        Returns:
            格式化的上下文字符串
        """
        results = self.search(query, top_k)
        
        if not results:
            return ""
        
        context_parts = []
        for i, result in enumerate(results):
            context_parts.append(
                f"【相关文档 {i+1}】\n"
                f"来源: {result['source']}\n"
                f"内容: {result['content']}\n"
            )
        
        return "\n".join(context_parts)
    
    def add_document(self, content: str, source: str = "manual"):
        """
        动态添加文档到知识库
        
        Args:
            content: 文档内容
            source: 来源标识
        """
        chunks = self._split_text(content)
        
        for i, chunk in enumerate(chunks):
            if chunk.strip():
                self.documents.append({
                    "id": f"{source}_{len(self.documents)}_{i}",
                    "content": chunk,
                    "source": source,
                    "metadata": {
                        "source": source,
                        "chunk_index": i
                    }
                })
        
        # 重建索引
        if self.vector_store:
            self.vector_store["documents"] = self.documents
        
        logger.info(f"添加文档: {source}, 共 {len(chunks)} 个块")


# 创建全局RAG服务实例
rag_service = RAGService()
