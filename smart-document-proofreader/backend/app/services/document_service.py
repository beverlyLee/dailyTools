from sqlalchemy.orm import Session
from typing import List, Optional
from ..models import Document, DocumentVersion, Correction
from datetime import datetime

class DocumentService:
    def __init__(self, db: Session):
        self.db = db

    def create_document(self, title: str, content: str, document_type: str = "general") -> Document:
        document = Document(
            title=title,
            current_content=content,
            document_type=document_type
        )
        self.db.add(document)
        self.db.commit()
        self.db.refresh(document)
        
        self.create_version(document.id, content, "初始版本")
        
        return document

    def get_document(self, document_id: int) -> Optional[Document]:
        return self.db.query(Document).filter(Document.id == document_id).first()

    def get_all_documents(self) -> List[Document]:
        return self.db.query(Document).order_by(Document.updated_at.desc()).all()

    def update_document(self, document_id: int, content: str, change_description: str = None) -> Optional[Document]:
        document = self.get_document(document_id)
        if not document:
            return None
        
        document.current_content = content
        document.updated_at = datetime.utcnow()
        
        version_number = self.get_next_version_number(document_id)
        self.create_version(document_id, content, change_description or f"版本更新 v{version_number}")
        
        self.db.commit()
        self.db.refresh(document)
        return document

    def delete_document(self, document_id: int) -> bool:
        document = self.get_document(document_id)
        if not document:
            return False
        
        self.db.delete(document)
        self.db.commit()
        return True

    def create_version(self, document_id: int, content: str, change_description: str) -> DocumentVersion:
        version_number = self.get_next_version_number(document_id)
        version = DocumentVersion(
            document_id=document_id,
            version_number=version_number,
            content=content,
            change_description=change_description
        )
        self.db.add(version)
        self.db.commit()
        self.db.refresh(version)
        return version

    def get_next_version_number(self, document_id: int) -> int:
        max_version = self.db.query(DocumentVersion).filter(
            DocumentVersion.document_id == document_id
        ).order_by(DocumentVersion.version_number.desc()).first()
        
        return max_version.version_number + 1 if max_version else 1

    def get_versions(self, document_id: int) -> List[DocumentVersion]:
        return self.db.query(DocumentVersion).filter(
            DocumentVersion.document_id == document_id
        ).order_by(DocumentVersion.version_number.desc()).all()

    def get_version(self, document_id: int, version_number: int) -> Optional[DocumentVersion]:
        return self.db.query(DocumentVersion).filter(
            DocumentVersion.document_id == document_id,
            DocumentVersion.version_number == version_number
        ).first()

    def restore_version(self, document_id: int, version_number: int) -> Optional[Document]:
        version = self.get_version(document_id, version_number)
        if not version:
            return None
        
        return self.update_document(
            document_id,
            version.content,
            f"恢复到版本 v{version_number}"
        )

    def save_correction(self, document_id: int, version_id: int, original_text: str, 
                        suggested_text: str, correction_type: str, category: str,
                        explanation: str, start_position: int, end_position: int) -> Correction:
        correction = Correction(
            document_id=document_id,
            version_id=version_id,
            original_text=original_text,
            suggested_text=suggested_text,
            correction_type=correction_type,
            category=category,
            explanation=explanation,
            start_position=start_position,
            end_position=end_position
        )
        self.db.add(correction)
        self.db.commit()
        self.db.refresh(correction)
        return correction

    def get_corrections(self, document_id: int) -> List[Correction]:
        return self.db.query(Correction).filter(
            Correction.document_id == document_id
        ).order_by(Correction.created_at.desc()).all()

    def apply_correction(self, correction_id: int) -> Optional[Correction]:
        correction = self.db.query(Correction).filter(Correction.id == correction_id).first()
        if not correction:
            return None
        
        correction.is_applied = 1
        self.db.commit()
        self.db.refresh(correction)
        return correction
