from datetime import datetime
from typing import Optional
from uuid import uuid4

from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Query, Depends
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from app.models.document import (
    DocumentResponse,
    DocumentListResponse,
    DocumentUpdate,
)
from app.services.document_processor import get_document_processor, DocumentProcessor
from app.services.vector_store import get_vector_store_service, VectorStoreService

router = APIRouter(prefix="/documents", tags=["文档管理"])

# 内存中的文档存储（实际应用中应该使用数据库）
documents_store = {}


@router.post("/upload", response_model=DocumentResponse)
async def upload_document(
    file: UploadFile = File(..., description="上传的文件"),
    title: Optional[str] = Form(None, description="文档标题"),
    description: Optional[str] = Form(None, description="文档描述"),
    tags: str = Form("", description="标签，用逗号分隔"),
    document_processor: DocumentProcessor = Depends(get_document_processor),
    vector_store_service: VectorStoreService = Depends(get_vector_store_service),
):
    file_content = await file.read()
    file_name = file.filename or "unknown"
    file_size = len(file_content)
    
    try:
        file_type = document_processor.get_file_type(file_name)
    except ValueError:
        raise HTTPException(status_code=400, detail="不支持的文件格式")
    
    document_id = str(uuid4())
    
    try:
        split_documents = document_processor.process_document(file_content, file_name)
        
        if split_documents:
            vector_store_service.add_documents(split_documents, document_id)
        
        doc_title = title or file_name.rsplit(".", 1)[0]
        doc_tags = [tag.strip() for tag in tags.split(",") if tag.strip()] if tags else []
        
        document = DocumentResponse(
            id=document_id,
            title=doc_title,
            description=description,
            tags=doc_tags,
            file_type=file_type,
            file_name=file_name,
            file_size=file_size,
            upload_time=datetime.now(),
            processing_status="completed" if split_documents else "failed",
            chunk_count=len(split_documents) if split_documents else 0,
        )
        
        documents_store[document_id] = document
        
        return document
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"处理文档时出错: {str(e)}")


@router.get("", response_model=DocumentListResponse)
async def list_documents(
    page: int = Query(1, ge=1, description="页码"),
    page_size: int = Query(10, ge=1, le=100, description="每页数量"),
    search: Optional[str] = Query(None, description="搜索关键词"),
    file_type: Optional[str] = Query(None, description="文件类型筛选"),
):
    docs = list(documents_store.values())
    
    if search:
        search_lower = search.lower()
        docs = [
            doc for doc in docs
            if search_lower in doc.title.lower() or
               (doc.description and search_lower in doc.description.lower()) or
               any(search_lower in tag.lower() for tag in doc.tags)
        ]
    
    if file_type:
        docs = [doc for doc in docs if doc.file_type == file_type]
    
    total = len(docs)
    start = (page - 1) * page_size
    end = start + page_size
    paginated_docs = docs[start:end]
    
    return DocumentListResponse(
        documents=paginated_docs,
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/{document_id}", response_model=DocumentResponse)
async def get_document(document_id: str):
    document = documents_store.get(document_id)
    if not document:
        raise HTTPException(status_code=404, detail="文档不存在")
    return document


@router.put("/{document_id}", response_model=DocumentResponse)
async def update_document(
    document_id: str,
    update: DocumentUpdate,
):
    document = documents_store.get(document_id)
    if not document:
        raise HTTPException(status_code=404, detail="文档不存在")
    
    update_data = update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(document, key, value)
    
    documents_store[document_id] = document
    return document


@router.delete("/{document_id}")
async def delete_document(
    document_id: str,
    vector_store_service: VectorStoreService = Depends(get_vector_store_service),
):
    if document_id not in documents_store:
        raise HTTPException(status_code=404, detail="文档不存在")
    
    del documents_store[document_id]
    
    try:
        vector_store_service.delete_by_document_id(document_id)
    except Exception:
        pass
    
    return JSONResponse(content={"message": "文档已删除", "document_id": document_id})


@router.get("/stats/summary")
async def get_document_stats(
    vector_store_service: VectorStoreService = Depends(get_vector_store_service),
):
    total_documents = len(documents_store)
    
    type_counts = {}
    for doc in documents_store.values():
        file_type = doc.file_type
        type_counts[file_type] = type_counts.get(file_type, 0) + 1
    
    total_chunks = vector_store_service.get_document_count()
    
    return {
        "total_documents": total_documents,
        "total_chunks": total_chunks,
        "documents_by_type": type_counts,
    }
