from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.models.game_models import GameExample
from app.schemas import GameExampleResponse, GameExampleListResponse

router = APIRouter(prefix="/examples", tags=["Game Examples"])


@router.get("/", response_model=GameExampleListResponse)
def get_all_examples(db: Session = Depends(get_db)):
    examples = db.query(GameExample).all()
    return GameExampleListResponse(
        examples=[GameExampleResponse.model_validate(ex) for ex in examples]
    )


@router.get("/{example_id}", response_model=GameExampleResponse)
def get_example_by_id(example_id: int, db: Session = Depends(get_db)):
    example = db.query(GameExample).filter(GameExample.id == example_id).first()
    if not example:
        raise HTTPException(status_code=404, detail="博弈案例不存在")
    return GameExampleResponse.model_validate(example)


@router.get("/category/{category}", response_model=GameExampleListResponse)
def get_examples_by_category(category: str, db: Session = Depends(get_db)):
    examples = db.query(GameExample).filter(GameExample.category == category).all()
    return GameExampleListResponse(
        examples=[GameExampleResponse.model_validate(ex) for ex in examples]
    )


@router.get("/categories", response_model=List[str])
def get_categories(db: Session = Depends(get_db)):
    categories = db.query(GameExample.category).distinct().all()
    return [cat[0] for cat in categories if cat[0] is not None]
