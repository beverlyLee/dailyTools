import json
import uuid
from datetime import datetime
from pathlib import Path
from typing import List, Optional, Dict
from whoosh import index
from whoosh.fields import Schema, TEXT, ID, DATETIME, KEYWORD, STORED, NUMERIC
from whoosh.qparser import QueryParser, MultifieldParser
from whoosh.query import Term, And
from whoosh.highlight import Highlighter, ContextFragmenter
from ..config import settings
from ..models.document import DocumentResponse, DocumentCreate, SearchResult


class IndexService:
    def __init__(self, index_dir: Path):
        self.index_dir = index_dir
        self.schema = Schema(
            id=ID(stored=True, unique=True),
            title=TEXT(stored=True, field_boost=2.0),
            content=TEXT(stored=True),
            url=ID(stored=True),
            document_type=ID(stored=True),
            tags=KEYWORD(stored=True, commas=True, lowercase=True),
            created_at=DATETIME(stored=True),
            updated_at=DATETIME(stored=True),
            embedding_id=NUMERIC(stored=True),
            screenshot_path=STORED(),
            metadata=STORED(),
        )
        self.ix = self._get_or_create_index()
    
    def _get_or_create_index(self):
        if not index.exists_in(str(self.index_dir)):
            return index.create_in(str(self.index_dir), self.schema)
        return index.open_dir(str(self.index_dir))
    
    def create_document(self, doc_create: DocumentCreate) -> DocumentResponse:
        doc_id = str(uuid.uuid4())
        now = datetime.now()
        
        writer = self.ix.writer()
        writer.add_document(
            id=doc_id,
            title=doc_create.title,
            content=doc_create.content,
            url=doc_create.url or "",
            document_type=doc_create.document_type,
            tags=",".join(doc_create.tags) if doc_create.tags else "",
            created_at=now,
            updated_at=now,
            embedding_id=None,
            screenshot_path=None,
            metadata=json.dumps(doc_create.metadata),
        )
        writer.commit()
        
        return DocumentResponse(
            id=doc_id,
            title=doc_create.title,
            content=doc_create.content,
            url=doc_create.url,
            document_type=doc_create.document_type,
            tags=doc_create.tags,
            created_at=now,
            updated_at=now,
            embedding_id=None,
            screenshot_path=None,
            metadata=doc_create.metadata,
        )
    
    def get_document(self, doc_id: str) -> Optional[DocumentResponse]:
        with self.ix.searcher() as searcher:
            query = Term("id", doc_id)
            results = searcher.search(query)
            
            if len(results) == 0:
                return None
            
            hit = results[0]
            return self._hit_to_response(hit)
    
    def update_document(
        self, doc_id: str, updates: Dict, embedding_id: Optional[int] = None,
        screenshot_path: Optional[str] = None
    ) -> Optional[DocumentResponse]:
        writer = self.ix.writer()
        
        with self.ix.searcher() as searcher:
            query = Term("id", doc_id)
            results = searcher.search(query)
            
            if len(results) == 0:
                return None
            
            hit = results[0]
            updated_fields = dict(hit)
            
            for key, value in updates.items():
                if key in self.schema.names() and value is not None:
                    if key == "tags":
                        updated_fields[key] = ",".join(value) if value else ""
                    elif key == "metadata":
                        updated_fields[key] = json.dumps(value)
                    else:
                        updated_fields[key] = value
            
            if embedding_id is not None:
                updated_fields["embedding_id"] = embedding_id
            if screenshot_path is not None:
                updated_fields["screenshot_path"] = screenshot_path
            
            updated_fields["updated_at"] = datetime.now()
            
            writer.update_document(**updated_fields)
            writer.commit()
        
        return self.get_document(doc_id)
    
    def delete_document(self, doc_id: str) -> bool:
        writer = self.ix.writer()
        writer.delete_by_term("id", doc_id)
        writer.commit()
        
        with self.ix.searcher() as searcher:
            query = Term("id", doc_id)
            results = searcher.search(query)
            return len(results) == 0
    
    def search_documents(
        self, query_str: str, top_k: int = 20, tags: Optional[List[str]] = None
    ) -> List[SearchResult]:
        with self.ix.searcher() as searcher:
            parser = MultifieldParser(
                ["title", "content", "tags"], schema=self.ix.schema
            )
            query = parser.parse(query_str)
            
            if tags and len(tags) > 0:
                tag_queries = [Term("tags", tag.lower()) for tag in tags]
                query = And([query, And(tag_queries)])
            
            results = searcher.search(query, limit=top_k)
            
            highlighter = Highlighter(fragmenter=ContextFragmenter(surround=40))
            
            search_results = []
            for hit in results:
                doc_response = self._hit_to_response(hit)
                highlight = None
                
                try:
                    if "content" in hit.fields():
                        highlight = highlighter.highlight_hit(hit, "content")
                except Exception:
                    pass
                
                search_results.append(
                    SearchResult(
                        document=doc_response,
                        score=float(hit.score),
                        highlight=highlight,
                    )
                )
            
            return search_results
    
    def get_all_documents(self, limit: int = 100) -> List[DocumentResponse]:
        with self.ix.searcher() as searcher:
            from whoosh.query import Every
            results = searcher.search(Every(), limit=limit)
            return [self._hit_to_response(hit) for hit in results]
    
    def _hit_to_response(self, hit) -> DocumentResponse:
        metadata = {}
        if "metadata" in hit.fields():
            try:
                metadata = json.loads(hit["metadata"])
            except Exception:
                pass
        
        tags = []
        if "tags" in hit.fields() and hit["tags"]:
            tags = [t.strip() for t in hit["tags"].split(",") if t.strip()]
        
        screenshot_path = hit.get("screenshot_path")
        if screenshot_path == "":
            screenshot_path = None
        
        return DocumentResponse(
            id=hit["id"],
            title=hit.get("title", ""),
            content=hit.get("content", ""),
            url=hit.get("url") or None,
            document_type=hit.get("document_type", "web_page"),
            tags=tags,
            created_at=hit.get("created_at"),
            updated_at=hit.get("updated_at"),
            embedding_id=hit.get("embedding_id"),
            screenshot_path=screenshot_path,
            metadata=metadata,
        )
    
    def get_document_count(self) -> int:
        with self.ix.searcher() as searcher:
            return searcher.doc_count()


index_service = IndexService(settings.INDEX_DIR)
