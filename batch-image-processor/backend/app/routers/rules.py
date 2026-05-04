from fastapi import APIRouter, HTTPException, Query, Body
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime

from app.models.database import SessionLocal, RenameRule

router = APIRouter()

class RenameRuleCreate(BaseModel):
    name: str
    description: Optional[str] = None
    
    use_sequence: bool = True
    sequence_start: int = 1
    sequence_padding: int = 4
    sequence_prefix: str = ""
    sequence_suffix: str = ""
    
    use_date: bool = False
    date_format: str = "%Y%m%d"
    date_source: str = "file_modified"
    
    use_exif: bool = False
    exif_fields: Optional[str] = None
    
    use_custom_text: bool = False
    custom_text: str = ""
    custom_text_position: str = "prefix"
    
    separator: str = "_"

class RenameRuleUpdate(RenameRuleCreate):
    pass

class RenameRuleResponse(BaseModel):
    id: int
    name: str
    description: Optional[str]
    
    use_sequence: bool
    sequence_start: int
    sequence_padding: int
    sequence_prefix: str
    sequence_suffix: str
    
    use_date: bool
    date_format: str
    date_source: str
    
    use_exif: bool
    exif_fields: Optional[str]
    
    use_custom_text: bool
    custom_text: str
    custom_text_position: str
    
    separator: str
    
    created_at: str
    updated_at: str
    
    class Config:
        from_attributes = True

@router.post("/", response_model=RenameRuleResponse)
async def create_rule(rule: RenameRuleCreate):
    db = SessionLocal()
    
    existing = db.query(RenameRule).filter(RenameRule.name == rule.name).first()
    if existing:
        db.close()
        raise HTTPException(status_code=400, detail="Rule with this name already exists")
    
    db_rule = RenameRule(
        name=rule.name,
        description=rule.description,
        use_sequence=rule.use_sequence,
        sequence_start=rule.sequence_start,
        sequence_padding=rule.sequence_padding,
        sequence_prefix=rule.sequence_prefix,
        sequence_suffix=rule.sequence_suffix,
        use_date=rule.use_date,
        date_format=rule.date_format,
        date_source=rule.date_source,
        use_exif=rule.use_exif,
        exif_fields=rule.exif_fields,
        use_custom_text=rule.use_custom_text,
        custom_text=rule.custom_text,
        custom_text_position=rule.custom_text_position,
        separator=rule.separator
    )
    
    db.add(db_rule)
    db.commit()
    db.refresh(db_rule)
    
    response = RenameRuleResponse(
        id=db_rule.id,
        name=db_rule.name,
        description=db_rule.description,
        use_sequence=db_rule.use_sequence,
        sequence_start=db_rule.sequence_start,
        sequence_padding=db_rule.sequence_padding,
        sequence_prefix=db_rule.sequence_prefix,
        sequence_suffix=db_rule.sequence_suffix,
        use_date=db_rule.use_date,
        date_format=db_rule.date_format,
        date_source=db_rule.date_source,
        use_exif=db_rule.use_exif,
        exif_fields=db_rule.exif_fields,
        use_custom_text=db_rule.use_custom_text,
        custom_text=db_rule.custom_text,
        custom_text_position=db_rule.custom_text_position,
        separator=db_rule.separator,
        created_at=db_rule.created_at.isoformat() if db_rule.created_at else "",
        updated_at=db_rule.updated_at.isoformat() if db_rule.updated_at else ""
    )
    
    db.close()
    return response

@router.get("/", response_model=List[RenameRuleResponse])
async def get_all_rules(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200)
):
    db = SessionLocal()
    rules = db.query(RenameRule).order_by(RenameRule.updated_at.desc()).offset(skip).limit(limit).all()
    
    response = [
        RenameRuleResponse(
            id=rule.id,
            name=rule.name,
            description=rule.description,
            use_sequence=rule.use_sequence,
            sequence_start=rule.sequence_start,
            sequence_padding=rule.sequence_padding,
            sequence_prefix=rule.sequence_prefix,
            sequence_suffix=rule.sequence_suffix,
            use_date=rule.use_date,
            date_format=rule.date_format,
            date_source=rule.date_source,
            use_exif=rule.use_exif,
            exif_fields=rule.exif_fields,
            use_custom_text=rule.use_custom_text,
            custom_text=rule.custom_text,
            custom_text_position=rule.custom_text_position,
            separator=rule.separator,
            created_at=rule.created_at.isoformat() if rule.created_at else "",
            updated_at=rule.updated_at.isoformat() if rule.updated_at else ""
        )
        for rule in rules
    ]
    
    db.close()
    return response

@router.get("/{rule_id}", response_model=RenameRuleResponse)
async def get_rule(rule_id: int):
    db = SessionLocal()
    rule = db.query(RenameRule).filter(RenameRule.id == rule_id).first()
    db.close()
    
    if not rule:
        raise HTTPException(status_code=404, detail="Rule not found")
    
    return RenameRuleResponse(
        id=rule.id,
        name=rule.name,
        description=rule.description,
        use_sequence=rule.use_sequence,
        sequence_start=rule.sequence_start,
        sequence_padding=rule.sequence_padding,
        sequence_prefix=rule.sequence_prefix,
        sequence_suffix=rule.sequence_suffix,
        use_date=rule.use_date,
        date_format=rule.date_format,
        date_source=rule.date_source,
        use_exif=rule.use_exif,
        exif_fields=rule.exif_fields,
        use_custom_text=rule.use_custom_text,
        custom_text=rule.custom_text,
        custom_text_position=rule.custom_text_position,
        separator=rule.separator,
        created_at=rule.created_at.isoformat() if rule.created_at else "",
        updated_at=rule.updated_at.isoformat() if rule.updated_at else ""
    )

@router.put("/{rule_id}", response_model=RenameRuleResponse)
async def update_rule(rule_id: int, rule: RenameRuleUpdate):
    db = SessionLocal()
    
    db_rule = db.query(RenameRule).filter(RenameRule.id == rule_id).first()
    if not db_rule:
        db.close()
        raise HTTPException(status_code=404, detail="Rule not found")
    
    existing = db.query(RenameRule).filter(
        RenameRule.name == rule.name,
        RenameRule.id != rule_id
    ).first()
    if existing:
        db.close()
        raise HTTPException(status_code=400, detail="Rule with this name already exists")
    
    db_rule.name = rule.name
    db_rule.description = rule.description
    db_rule.use_sequence = rule.use_sequence
    db_rule.sequence_start = rule.sequence_start
    db_rule.sequence_padding = rule.sequence_padding
    db_rule.sequence_prefix = rule.sequence_prefix
    db_rule.sequence_suffix = rule.sequence_suffix
    db_rule.use_date = rule.use_date
    db_rule.date_format = rule.date_format
    db_rule.date_source = rule.date_source
    db_rule.use_exif = rule.use_exif
    db_rule.exif_fields = rule.exif_fields
    db_rule.use_custom_text = rule.use_custom_text
    db_rule.custom_text = rule.custom_text
    db_rule.custom_text_position = rule.custom_text_position
    db_rule.separator = rule.separator
    db_rule.updated_at = datetime.utcnow()
    
    db.commit()
    db.refresh(db_rule)
    
    response = RenameRuleResponse(
        id=db_rule.id,
        name=db_rule.name,
        description=db_rule.description,
        use_sequence=db_rule.use_sequence,
        sequence_start=db_rule.sequence_start,
        sequence_padding=db_rule.sequence_padding,
        sequence_prefix=db_rule.sequence_prefix,
        sequence_suffix=db_rule.sequence_suffix,
        use_date=db_rule.use_date,
        date_format=db_rule.date_format,
        date_source=db_rule.date_source,
        use_exif=db_rule.use_exif,
        exif_fields=db_rule.exif_fields,
        use_custom_text=db_rule.use_custom_text,
        custom_text=db_rule.custom_text,
        custom_text_position=db_rule.custom_text_position,
        separator=db_rule.separator,
        created_at=db_rule.created_at.isoformat() if db_rule.created_at else "",
        updated_at=db_rule.updated_at.isoformat() if db_rule.updated_at else ""
    )
    
    db.close()
    return response

@router.delete("/{rule_id}")
async def delete_rule(rule_id: int):
    db = SessionLocal()
    
    db_rule = db.query(RenameRule).filter(RenameRule.id == rule_id).first()
    if not db_rule:
        db.close()
        raise HTTPException(status_code=404, detail="Rule not found")
    
    db.delete(db_rule)
    db.commit()
    db.close()
    
    return {"success": True, "message": "Rule deleted successfully"}

@router.post("/preview-filename")
async def preview_filename(
    rule_id: int = Body(...),
    image_path: str = Body(...),
    index: int = Body(1),
    total: int = Body(1)
):
    db = SessionLocal()
    rule = db.query(RenameRule).filter(RenameRule.id == rule_id).first()
    db.close()
    
    if not rule:
        raise HTTPException(status_code=404, detail="Rule not found")
    
    from app.services.rule_engine import RuleEngine
    engine = RuleEngine(rule)
    
    filename = engine.generate_filename(image_path, index, total)
    
    return {
        "original_filename": os.path.basename(image_path),
        "new_filename": filename,
        "preview": filename
    }

import os
