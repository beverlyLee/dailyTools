import os
from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi.responses import JSONResponse
from typing import List

from app.services.faiss_service import FAISSService
from app.config import get_settings

router = APIRouter()
settings = get_settings()

SUPPORTED_EXTENSIONS = {'.txt', '.md', '.pdf', '.docx'}

@router.post("/upload")
async def upload_documents(files: List[UploadFile] = File(...)):
    faiss_service = FAISSService()
    
    files_data = []
    failed_files = []
    
    for file in files:
        file_ext = os.path.splitext(file.filename)[1].lower()
        if file_ext not in SUPPORTED_EXTENSIONS:
            failed_files.append({
                "filename": file.filename,
                "reason": f"Unsupported file type: {file_ext}"
            })
            continue
        
        try:
            content = await file.read()
            
            file_type = file_ext[1:]
            if file_ext == '.pdf':
                file_type = 'pdf'
            
            files_data.append({
                "filename": file.filename,
                "content": content,
                "type": file_type
            })
            
        except Exception as e:
            failed_files.append({
                "filename": file.filename,
                "reason": str(e)
            })
    
    if files_data:
        result = faiss_service.add_documents_from_files(files_data)
        uploaded_files = result.get("uploaded_files", [])
        failed_files.extend(result.get("failed_files", []))
    else:
        uploaded_files = []
    
    return JSONResponse(content={
        "message": "Document upload completed",
        "uploaded_files": uploaded_files,
        "failed_files": failed_files,
        "total_documents": len(uploaded_files)
    })

@router.post("/add-text")
async def add_text_document(content: str, source: str = "manual"):
    faiss_service = FAISSService()
    
    try:
        ids = faiss_service.add_document(
            content=content,
            metadata={"source": source, "type": "text"}
        )
        return {
            "message": "Text document added successfully",
            "document_ids": ids,
            "chunks_count": len(ids)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/list")
async def list_documents():
    faiss_service = FAISSService()
    
    try:
        documents = faiss_service.get_all_documents()
        return {
            "total": len(documents),
            "documents": documents
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/{document_id}")
async def delete_document(document_id: str):
    faiss_service = FAISSService()
    
    try:
        success = faiss_service.delete_document(document_id)
        if success:
            return {"message": "Document deleted successfully"}
        else:
            raise HTTPException(status_code=404, detail="Document not found")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/clear")
async def clear_all_documents():
    faiss_service = FAISSService()
    
    try:
        success = faiss_service.clear_collection()
        if success:
            return {"message": "All documents cleared successfully"}
        else:
            raise HTTPException(status_code=500, detail="Failed to clear documents")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/search")
async def search_documents(query: str, k: int = 4):
    faiss_service = FAISSService()
    
    try:
        context = faiss_service.retrieve(query, k=k)
        docs_with_scores = faiss_service.retrieve_with_scores(query, k=k)
        
        results = []
        for doc, score in docs_with_scores:
            results.append({
                "content": doc.page_content,
                "metadata": doc.metadata,
                "score": float(score),
                "similarity": float(1.0 / (1.0 + score)) if score >= 0 else 0.0
            })
        
        return {
            "query": query,
            "context": context,
            "results": results,
            "total": len(results)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
