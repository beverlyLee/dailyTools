import io
import os
from typing import List, Optional
from abc import ABC, abstractmethod

from langchain_core.documents import Document as LangChainDocument
from langchain_text_splitters import RecursiveCharacterTextSplitter

from app.core.config import get_settings

settings = get_settings()


class DocumentParser(ABC):
    @abstractmethod
    def parse(self, file_content: bytes, file_name: str) -> List[LangChainDocument]:
        pass


class PDFParser(DocumentParser):
    def parse(self, file_content: bytes, file_name: str) -> List[LangChainDocument]:
        try:
            from langchain_community.document_loaders import PyPDFLoader
            import tempfile
            
            with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as temp_file:
                temp_file.write(file_content)
                temp_path = temp_file.name
            
            try:
                loader = PyPDFLoader(temp_path)
                documents = loader.load()
                
                for i, doc in enumerate(documents):
                    doc.metadata["source"] = file_name
                    doc.metadata["file_type"] = "pdf"
                    doc.metadata["page_number"] = i + 1
                
                return documents
            finally:
                os.unlink(temp_path)
        except ImportError:
            return self._fallback_parse(file_content, file_name)
    
    def _fallback_parse(self, file_content: bytes, file_name: str) -> List[LangChainDocument]:
        try:
            text = file_content.decode("utf-8", errors="ignore")
            return [LangChainDocument(
                page_content=text,
                metadata={
                    "source": file_name,
                    "file_type": "pdf",
                }
            )]
        except Exception:
            return []


class WordParser(DocumentParser):
    def parse(self, file_content: bytes, file_name: str) -> List[LangChainDocument]:
        try:
            from langchain_community.document_loaders import Docx2txtLoader
            import tempfile
            
            suffix = ".docx" if file_name.endswith(".docx") else ".doc"
            with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as temp_file:
                temp_file.write(file_content)
                temp_path = temp_file.name
            
            try:
                loader = Docx2txtLoader(temp_path)
                documents = loader.load()
                
                for doc in documents:
                    doc.metadata["source"] = file_name
                    doc.metadata["file_type"] = "word"
                
                return documents
            finally:
                os.unlink(temp_path)
        except ImportError:
            return self._fallback_parse(file_content, file_name)
    
    def _fallback_parse(self, file_content: bytes, file_name: str) -> List[LangChainDocument]:
        try:
            text = file_content.decode("utf-8", errors="ignore")
            return [LangChainDocument(
                page_content=text,
                metadata={
                    "source": file_name,
                    "file_type": "word",
                }
            )]
        except Exception:
            return []


class MarkdownParser(DocumentParser):
    def parse(self, file_content: bytes, file_name: str) -> List[LangChainDocument]:
        try:
            text = file_content.decode("utf-8", errors="ignore")
            from langchain_community.document_loaders import UnstructuredMarkdownLoader
            
            import tempfile
            with tempfile.NamedTemporaryFile(suffix=".md", delete=False, mode="w") as temp_file:
                temp_file.write(text)
                temp_path = temp_file.name
            
            try:
                loader = UnstructuredMarkdownLoader(temp_path)
                documents = loader.load()
                
                for doc in documents:
                    doc.metadata["source"] = file_name
                    doc.metadata["file_type"] = "markdown"
                
                return documents
            finally:
                os.unlink(temp_path)
        except Exception:
            return self._fallback_parse(text, file_name)
    
    def _fallback_parse(self, text: str, file_name: str) -> List[LangChainDocument]:
        return [LangChainDocument(
            page_content=text,
            metadata={
                "source": file_name,
                "file_type": "markdown",
            }
        )]


class DocumentProcessor:
    def __init__(self):
        self.parsers = {
            "pdf": PDFParser(),
            "doc": WordParser(),
            "docx": WordParser(),
            "md": MarkdownParser(),
        }
        self.text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=settings.chunk_size,
            chunk_overlap=settings.chunk_overlap,
            separators=["\n\n", "\n", ".", "!", "?", ",", " ", ""],
        )
    
    def get_file_type(self, file_name: str) -> str:
        ext = os.path.splitext(file_name)[1].lower().lstrip(".")
        return ext
    
    def parse_document(self, file_content: bytes, file_name: str) -> List[LangChainDocument]:
        file_type = self.get_file_type(file_name)
        parser = self.parsers.get(file_type)
        
        if not parser:
            raise ValueError(f"不支持的文件类型: {file_type}")
        
        return parser.parse(file_content, file_name)
    
    def split_document(self, documents: List[LangChainDocument]) -> List[LangChainDocument]:
        return self.text_splitter.split_documents(documents)
    
    def process_document(self, file_content: bytes, file_name: str) -> List[LangChainDocument]:
        documents = self.parse_document(file_content, file_name)
        split_documents = self.split_document(documents)
        
        for i, doc in enumerate(split_documents):
            doc.metadata["chunk_id"] = f"{doc.metadata.get('source', 'unknown')}_{i}"
            doc.metadata["chunk_index"] = i
        
        return split_documents


def get_document_processor() -> DocumentProcessor:
    return DocumentProcessor()
