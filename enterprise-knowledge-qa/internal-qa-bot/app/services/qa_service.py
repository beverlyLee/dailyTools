import time
from typing import List, Optional
from uuid import uuid4
from datetime import datetime

from langchain_core.documents import Document as LangChainDocument
from langchain_core.output_parsers import StrOutputParser
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.runnables import RunnablePassthrough

from app.core.config import get_settings
from app.models.qa import (
    QueryRequest,
    QueryResponse,
    SourceReference,
    SearchRequest,
    SearchResponse,
    SearchResult,
    Conversation,
    ConversationMessage,
)
from app.services.vector_store import VectorStoreService, get_vector_store_service

settings = get_settings()


class QAService:
    def __init__(self, vector_store_service: Optional[VectorStoreService] = None):
        self._vector_store_service = vector_store_service or get_vector_store_service()
        self._llm = None
        self._conversations: dict[str, Conversation] = {}
    
    @property
    def llm(self):
        if self._llm is None:
            self._llm = self._initialize_llm()
        return self._llm
    
    def _initialize_llm(self):
        if settings.llm_type == "openai":
            from langchain_openai import ChatOpenAI
            
            if not settings.openai_api_key:
                raise ValueError("OpenAI API key is required when using OpenAI LLM")
            
            return ChatOpenAI(
                model_name=settings.openai_model_name,
                temperature=settings.local_llm_temperature,
                max_tokens=settings.local_llm_max_tokens,
                openai_api_key=settings.openai_api_key,
            )
        else:
            from langchain_community.llms import LlamaCpp
            
            if not settings.local_llm_path:
                return self._create_fallback_llm()
            
            try:
                return LlamaCpp(
                    model_path=settings.local_llm_path,
                    temperature=settings.local_llm_temperature,
                    max_tokens=settings.local_llm_max_tokens,
                    top_p=1,
                    verbose=False,
                    n_ctx=2048,
                )
            except Exception:
                return self._create_fallback_llm()
    
    def _create_fallback_llm(self):
        from langchain_core.language_models import BaseLanguageModel
        from langchain_core.callbacks import CallbackManagerForLLMRun
        from typing import Any, List, Optional
        
        class FallbackLLM(BaseLanguageModel):
            def _call(
                self,
                prompt: str,
                stop: Optional[List[str]] = None,
                run_manager: Optional[CallbackManagerForLLMRun] = None,
                **kwargs: Any,
            ) -> str:
                return (
                    "这是一个演示回答。在实际使用中，请配置本地LLM模型或OpenAI API。\n\n"
                    "系统检测到您的查询与知识库中的以下内容相关："
                )
        
        return FallbackLLM()
    
    def _build_prompt_template(self) -> ChatPromptTemplate:
        template = """你是一个专业的企业知识库助手。请根据以下上下文信息回答用户的问题。
如果上下文中没有足够的信息来回答问题，请诚实地说"我无法根据现有知识库回答这个问题"，不要编造答案。

上下文:
{context}

用户问题: {question}

请用中文回答，并在回答中引用相关的上下文内容。如果有多个相关来源，请分别引用。

回答:"""
        
        return ChatPromptTemplate.from_template(template)
    
    def _format_docs(self, docs: List[LangChainDocument]) -> str:
        return "\n\n".join(doc.page_content for doc in docs)
    
    def _create_source_references(
        self, 
        docs_with_scores: List[tuple[LangChainDocument, float]]
    ) -> List[SourceReference]:
        references = []
        
        for doc, score in docs_with_scores:
            metadata = doc.metadata
            reference = SourceReference(
                document_id=metadata.get("document_id", "unknown"),
                document_title=metadata.get("source", "未知文档"),
                chunk_id=metadata.get("chunk_id", "unknown"),
                content=doc.page_content[:200] + "..." if len(doc.page_content) > 200 else doc.page_content,
                page_number=metadata.get("page_number"),
                similarity_score=float(score),
            )
            references.append(reference)
        
        return references
    
    def search(self, request: SearchRequest) -> SearchResponse:
        start_time = time.time()
        
        filter_dict = None
        if request.document_types:
            filter_dict = {"file_type": {"$in": request.document_types}}
        
        results_with_scores = self._vector_store_service.search_with_score(
            query=request.query,
            k=request.top_k,
            filter_dict=filter_dict,
        )
        
        search_results = []
        for doc, score in results_with_scores:
            metadata = doc.metadata
            search_result = SearchResult(
                document_id=metadata.get("document_id", "unknown"),
                document_title=metadata.get("source", "未知文档"),
                chunk_id=metadata.get("chunk_id", "unknown"),
                content=doc.page_content,
                similarity_score=float(score),
                metadata=metadata,
            )
            search_results.append(search_result)
        
        response_time = time.time() - start_time
        
        return SearchResponse(
            query=request.query,
            results=search_results,
            total=len(search_results),
            response_time=response_time,
        )
    
    def query(self, request: QueryRequest) -> QueryResponse:
        start_time = time.time()
        
        docs_with_scores = self._vector_store_service.search_with_score(
            query=request.query,
            k=request.top_k,
        )
        
        docs = [doc for doc, _ in docs_with_scores]
        
        if not docs:
            return QueryResponse(
                answer="抱歉，知识库中没有找到与您问题相关的内容。请尝试调整您的问题或上传更多相关文档。",
                sources=[],
                conversation_id=request.conversation_id or str(uuid4()),
                query=request.query,
                response_time=time.time() - start_time,
            )
        
        prompt = self._build_prompt_template()
        chain = (
            {"context": self._format_docs, "question": RunnablePassthrough()}
            | prompt
            | self.llm
            | StrOutputParser()
        )
        
        try:
            answer = chain.invoke(request.query)
        except Exception as e:
            answer = f"处理您的问题时出现错误: {str(e)}"
        
        sources = []
        if request.include_sources:
            sources = self._create_source_references(docs_with_scores)
        
        conversation_id = request.conversation_id or str(uuid4())
        
        if conversation_id not in self._conversations:
            self._conversations[conversation_id] = Conversation(
                id=conversation_id,
                title=request.query[:50] + "..." if len(request.query) > 50 else request.query,
                messages=[],
            )
        
        conversation = self._conversations[conversation_id]
        
        user_message = ConversationMessage(
            id=str(uuid4()),
            role="user",
            content=request.query,
        )
        
        assistant_message = ConversationMessage(
            id=str(uuid4()),
            role="assistant",
            content=answer,
            sources=sources if sources else None,
        )
        
        conversation.messages.append(user_message)
        conversation.messages.append(assistant_message)
        conversation.updated_at = datetime.now()
        
        if len(conversation.messages) == 2:
            conversation.title = request.query[:50] + "..." if len(request.query) > 50 else request.query
        
        response_time = time.time() - start_time
        
        return QueryResponse(
            answer=answer,
            sources=sources,
            conversation_id=conversation_id,
            query=request.query,
            response_time=response_time,
        )
    
    def get_conversation(self, conversation_id: str) -> Optional[Conversation]:
        return self._conversations.get(conversation_id)
    
    def get_all_conversations(self) -> List[Conversation]:
        return list(self._conversations.values())
    
    def delete_conversation(self, conversation_id: str) -> bool:
        if conversation_id in self._conversations:
            del self._conversations[conversation_id]
            return True
        return False
    
    def share_conversation(self, conversation_id: str) -> Optional[str]:
        conversation = self._conversations.get(conversation_id)
        if not conversation:
            return None
        
        share_id = str(uuid4())[:8]
        conversation.is_shared = True
        conversation.share_id = share_id
        
        return share_id


def get_qa_service() -> QAService:
    return QAService()
