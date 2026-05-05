from fastapi import APIRouter, HTTPException, Depends
from typing import List, Optional
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import GameExample
from ..services.nash_equilibrium import GAME_EXAMPLES

router = APIRouter(prefix="/api/examples", tags=["博弈案例"])


@router.get("/")
async def get_all_examples(db: Session = Depends(get_db)):
    """
    Get all game examples.
    
    Returns both built-in examples and custom examples from database.
    """
    db_examples = db.query(GameExample).all()
    
    all_examples = []
    
    for i, example in enumerate(GAME_EXAMPLES):
        all_examples.append({
            "id": i + 1,
            "name": example["name"],
            "category": example.get("category"),
            "description": example.get("description"),
            "player1_strategies": example["player1_strategies"],
            "player2_strategies": example["player2_strategies"],
            "payoff_matrix_player1": example["payoff_matrix_player1"],
            "payoff_matrix_player2": example["payoff_matrix_player2"],
            "is_builtin": True,
        })
    
    for example in db_examples:
        all_examples.append({
            "id": len(GAME_EXAMPLES) + example.id,
            "name": example.name,
            "category": example.category,
            "description": example.description,
            "player1_strategies": example.player1_strategies,
            "player2_strategies": example.player2_strategies,
            "payoff_matrix_player1": example.payoff_matrix_player1,
            "payoff_matrix_player2": example.payoff_matrix_player2,
            "is_builtin": False,
        })
    
    return all_examples


@router.get("/{example_id}")
async def get_example_by_id(example_id: int, db: Session = Depends(get_db)):
    """
    Get a specific game example by ID.
    
    Built-in examples have IDs starting from 1.
    Database examples have IDs offset by the number of built-in examples.
    """
    num_builtin = len(GAME_EXAMPLES)
    
    if 1 <= example_id <= num_builtin:
        example = GAME_EXAMPLES[example_id - 1]
        return {
            "id": example_id,
            "name": example["name"],
            "category": example.get("category"),
            "description": example.get("description"),
            "player1_strategies": example["player1_strategies"],
            "player2_strategies": example["player2_strategies"],
            "payoff_matrix_player1": example["payoff_matrix_player1"],
            "payoff_matrix_player2": example["payoff_matrix_player2"],
            "is_builtin": True,
        }
    
    db_id = example_id - num_builtin
    example = db.query(GameExample).filter(GameExample.id == db_id).first()
    
    if not example:
        raise HTTPException(status_code=404, detail="Example not found")
    
    return {
        "id": example_id,
        "name": example.name,
        "category": example.category,
        "description": example.description,
        "player1_strategies": example.player1_strategies,
        "player2_strategies": example.player2_strategies,
        "payoff_matrix_player1": example.payoff_matrix_player1,
        "payoff_matrix_player2": example.payoff_matrix_player2,
        "is_builtin": False,
    }
