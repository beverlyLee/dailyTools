import base64
import time
from datetime import datetime
from pathlib import Path
from typing import List, Optional
from fastapi import APIRouter, HTTPException, Query, UploadFile, File, Form
from fastapi.responses import FileResponse
from pydantic import BaseModel

from ..models.document import (
    DocumentCreate,
    DocumentUpdate,
    DocumentResponse,
    SearchResponse,
    SearchResult,
    DocumentType,
)
from ..services import (
    index_service,
    embedding_service,
    vector_store,
    graph_service,
)
from ..config import settings

router = APIRouter(prefix="/documents", tags=["documents"])


class CaptureRequest(BaseModel):
    title: str
    content: str
    url: Optional[str] = None
    document_type: DocumentType = DocumentType.WEB_PAGE
    tags: List[str] = []
    screenshot: Optional[str] = None
    screenshot_filename: Optional[str] = None


@router.post("/capture", response_model=DocumentResponse, status_code=201)
async def capture_document(request: CaptureRequest):
    try:
        doc_create = DocumentCreate(
            title=request.title,
            content=request.content,
            url=request.url,
            document_type=request.document_type,
            tags=request.tags,
        )
        
        document = index_service.create_document(doc_create)
        
        screenshot_path = None
        if request.screenshot and request.screenshot_filename:
            try:
                screenshot_data = base64.b64decode(request.screenshot.split(",")[1] if "," in request.screenshot else request.screenshot)
                timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
                ext = Path(request.screenshot_filename).suffix or ".png"
                filename = f"{document.id}_{timestamp}{ext}"
                filepath = settings.SCREENSHOTS_DIR / filename
                filepath.write_bytes(screenshot_data)
                screenshot_path = str(filename)
            except Exception as e:
                print(f"Failed to save screenshot: {e}")
        
        try:
            embedding = embedding_service.generate_embedding(document.content)
            embedding_id = vector_store.add_embedding(document.id, embedding)
        except Exception as e:
            print(f"Failed to generate embedding: {e}")
            embedding_id = None
        
        updated_document = index_service.update_document(
            document.id,
            {},
            embedding_id=embedding_id,
            screenshot_path=screenshot_path,
        )
        
        try:
            graph_service.process_document(updated_document)
        except Exception as e:
            print(f"Failed to process document for graph: {e}")
        
        return updated_document
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("", response_model=List[DocumentResponse])
async def list_documents(limit: int = Query(100, ge=1, le=500)):
    return index_service.get_all_documents(limit=limit)


@router.get("/{doc_id}", response_model=DocumentResponse)
async def get_document(doc_id: str):
    document = index_service.get_document(doc_id)
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    return document


@router.put("/{doc_id}", response_model=DocumentResponse)
async def update_document(doc_id: str, update: DocumentUpdate):
    updates = {}
    if update.title is not None:
        updates["title"] = update.title
    if update.content is not None:
        updates["content"] = update.content
    if update.tags is not None:
        updates["tags"] = update.tags
    if update.metadata is not None:
        updates["metadata"] = update.metadata
    
    document = index_service.update_document(doc_id, updates)
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    
    try:
        embedding = embedding_service.generate_embedding(document.content)
        vector_store.delete_by_document_id(doc_id)
        embedding_id = vector_store.add_embedding(doc_id, embedding)
        index_service.update_document(doc_id, {}, embedding_id=embedding_id)
    except Exception as e:
        print(f"Failed to update embedding: {e}")
    
    return index_service.get_document(doc_id)


@router.delete("/{doc_id}", status_code=204)
async def delete_document(doc_id: str):
    vector_store.delete_by_document_id(doc_id)
    success = index_service.delete_document(doc_id)
    if not success:
        raise HTTPException(status_code=404, detail="Document not found")


@router.get("/screenshot/{filename}")
async def get_screenshot(filename: str):
    filepath = settings.SCREENSHOTS_DIR / filename
    if not filepath.exists():
        raise HTTPException(status_code=404, detail="Screenshot not found")
    return FileResponse(
        filepath,
        media_type="image/png" if filename.endswith(".png") else "image/jpeg",
    )


@router.get("/search/text", response_model=SearchResponse)
async def search_text(
    q: str = Query(..., min_length=1),
    limit: int = Query(20, ge=1, le=100),
    tags: Optional[List[str]] = Query(None),
):
    start_time = time.time()
    
    results = index_service.search_documents(q, top_k=limit, tags=tags)
    
    search_time_ms = (time.time() - start_time) * 1000
    
    return SearchResponse(
        query=q,
        total_results=len(results),
        results=results,
        search_time_ms=search_time_ms,
    )


@router.get("/search/semantic", response_model=SearchResponse)
async def search_semantic(
    q: str = Query(..., min_length=1),
    limit: int = Query(20, ge=1, le=100),
):
    start_time = time.time()
    
    try:
        query_embedding = embedding_service.generate_embedding(q)
        vector_results = vector_store.search(query_embedding, top_k=limit)
        
        results = []
        for doc_id, score in vector_results:
            document = index_service.get_document(doc_id)
            if document:
                results.append(SearchResult(document=document, score=score, highlight=None))
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Semantic search failed: {str(e)}")
    
    search_time_ms = (time.time() - start_time) * 1000
    
    return SearchResponse(
        query=q,
        total_results=len(results),
        results=results,
        search_time_ms=search_time_ms,
    )


@router.get("/stats/count", response_model=int)
async def get_document_count():
    return index_service.get_document_count()
