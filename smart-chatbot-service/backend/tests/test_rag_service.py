import os
import shutil
import pytest
from unittest.mock import patch, MagicMock

# 添加父目录到路径
import sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.services.rag_service import RAGService


class TestRAGService:
    @pytest.fixture
    def test_persist_dir(self):
        # 创建临时测试目录
        test_dir = "./test_chroma_db"
        if os.path.exists(test_dir):
            shutil.rmtree(test_dir)
        os.makedirs(test_dir, exist_ok=True)
        yield test_dir
        # 清理测试目录
        if os.path.exists(test_dir):
            shutil.rmtree(test_dir)
    
    @patch('app.services.rag_service.OllamaEmbeddings')
    @patch('app.services.rag_service.Chroma')
    def test_init_rag_service(self, mock_chroma, mock_embeddings, test_persist_dir):
        """测试RAG服务初始化"""
        # 设置模拟
        mock_embeddings_instance = MagicMock()
        mock_embeddings.return_value = mock_embeddings_instance
        
        mock_chroma_instance = MagicMock()
        mock_chroma.return_value = mock_chroma_instance
        
        # 初始化服务
        rag_service = RAGService(persist_directory=test_persist_dir)
        
        # 验证初始化
        mock_embeddings.assert_called_once()
        mock_chroma.assert_called_once()
        assert rag_service.persist_directory == test_persist_dir
        assert rag_service.collection_name == "documents"
    
    @patch('app.services.rag_service.OllamaEmbeddings')
    @patch('app.services.rag_service.Chroma')
    def test_add_document(self, mock_chroma, mock_embeddings, test_persist_dir):
        """测试添加文档"""
        # 设置模拟
        mock_embeddings_instance = MagicMock()
        mock_embeddings.return_value = mock_embeddings_instance
        
        mock_chroma_instance = MagicMock()
        mock_chroma.return_value = mock_chroma_instance
        mock_chroma_instance.add_texts.return_value = ["test_id_1", "test_id_2"]
        
        # 初始化服务
        rag_service = RAGService(persist_directory=test_persist_dir)
        
        # 测试添加文档
        test_content = "这是一个测试文档。它包含一些关于产品的信息。产品名称是智能客服机器人。"
        test_metadata = {"source": "test.txt", "type": "text"}
        
        ids = rag_service.add_document(content=test_content, metadata=test_metadata)
        
        # 验证
        mock_chroma_instance.add_texts.assert_called_once()
        mock_chroma_instance.persist.assert_called_once()
        assert len(ids) > 0
    
    @patch('app.services.rag_service.OllamaEmbeddings')
    @patch('app.services.rag_service.Chroma')
    def test_retrieve_with_results(self, mock_chroma, mock_embeddings, test_persist_dir):
        """测试检索功能（有结果）"""
        # 设置模拟
        mock_embeddings_instance = MagicMock()
        mock_embeddings.return_value = mock_embeddings_instance
        
        # 创建模拟文档
        mock_doc1 = MagicMock()
        mock_doc1.page_content = "智能客服机器人可以帮助用户解答常见问题。"
        mock_doc1.metadata = {"source": "product_info.txt"}
        
        mock_doc2 = MagicMock()
        mock_doc2.page_content = "客服机器人支持多轮对话，能够理解上下文。"
        mock_doc2.metadata = {"source": "features.txt"}
        
        mock_chroma_instance = MagicMock()
        mock_chroma.return_value = mock_chroma_instance
        mock_chroma_instance.similarity_search.return_value = [mock_doc1, mock_doc2]
        
        # 初始化服务
        rag_service = RAGService(persist_directory=test_persist_dir)
        
        # 测试检索
        query = "智能客服机器人有什么功能？"
        result = rag_service.retrieve(query, k=2)
        
        # 验证
        mock_chroma_instance.similarity_search.assert_called_once_with(query, k=2)
        assert "智能客服机器人" in result
        assert "product_info.txt" in result
        assert "features.txt" in result
    
    @patch('app.services.rag_service.OllamaEmbeddings')
    @patch('app.services.rag_service.Chroma')
    def test_retrieve_no_results(self, mock_chroma, mock_embeddings, test_persist_dir):
        """测试检索功能（无结果）"""
        # 设置模拟
        mock_embeddings_instance = MagicMock()
        mock_embeddings.return_value = mock_embeddings_instance
        
        mock_chroma_instance = MagicMock()
        mock_chroma.return_value = mock_chroma_instance
        mock_chroma_instance.similarity_search.return_value = []
        
        # 初始化服务
        rag_service = RAGService(persist_directory=test_persist_dir)
        
        # 测试检索
        query = "不存在的内容"
        result = rag_service.retrieve(query, k=2)
        
        # 验证
        assert result == "没有找到相关的文档信息。"
    
    @patch('app.services.rag_service.OllamaEmbeddings')
    @patch('app.services.rag_service.Chroma')
    def test_clear_collection(self, mock_chroma, mock_embeddings, test_persist_dir):
        """测试清空集合"""
        # 设置模拟
        mock_embeddings_instance = MagicMock()
        mock_embeddings.return_value = mock_embeddings_instance
        
        mock_collection = MagicMock()
        mock_collection.get.return_value = {"ids": ["id1", "id2"], "metadatas": [], "documents": []}
        
        mock_chroma_instance = MagicMock()
        mock_chroma_instance._collection = mock_collection
        mock_chroma.return_value = mock_chroma_instance
        
        # 初始化服务
        rag_service = RAGService(persist_directory=test_persist_dir)
        
        # 测试清空集合
        result = rag_service.clear_collection()
        
        # 验证
        mock_collection.get.assert_called_once()
        mock_collection.delete.assert_called_once_with(ids=["id1", "id2"])
        mock_chroma_instance.persist.assert_called_once()
        assert result == True
    
    @patch('app.services.rag_service.OllamaEmbeddings')
    @patch('app.services.rag_service.Chroma')
    def test_delete_document(self, mock_chroma, mock_embeddings, test_persist_dir):
        """测试删除文档"""
        # 设置模拟
        mock_embeddings_instance = MagicMock()
        mock_embeddings.return_value = mock_embeddings_instance
        
        mock_collection = MagicMock()
        
        mock_chroma_instance = MagicMock()
        mock_chroma_instance._collection = mock_collection
        mock_chroma.return_value = mock_chroma_instance
        
        # 初始化服务
        rag_service = RAGService(persist_directory=test_persist_dir)
        
        # 测试删除文档
        test_id = "test_document_id"
        result = rag_service.delete_document(test_id)
        
        # 验证
        mock_collection.delete.assert_called_once_with(ids=[test_id])
        mock_chroma_instance.persist.assert_called_once()
        assert result == True
    
    def test_text_splitter_behavior(self):
        """测试文本分割器行为"""
        from langchain.text_splitter import RecursiveCharacterTextSplitter
        
        # 创建文本分割器
        text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=100,
            chunk_overlap=20,
            length_function=len,
        )
        
        # 测试长文本分割
        long_text = "这是一个很长的测试文本。" * 50
        chunks = text_splitter.split_text(long_text)
        
        # 验证
        assert len(chunks) > 1
        # 每个块的大小应该接近chunk_size
        for chunk in chunks:
            assert len(chunk) <= 150  # 允许一些偏差
