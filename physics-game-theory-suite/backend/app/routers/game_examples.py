from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app.models import GameExample
from app.schemas import GameExampleResponse, GameExampleListResponse

router = APIRouter(prefix="/game-examples", tags=["Game Examples"])

DEFAULT_EXAMPLES = [
    {
        "name": "囚徒困境",
        "description": "经典的囚徒困境博弈。两个囚犯被逮捕，各自可以选择合作或背叛。",
        "player1_strategies": ["沉默", "坦白"],
        "player2_strategies": ["沉默", "坦白"],
        "payoff_matrix_player1": [
            [-1, -10],
            [0, -5]
        ],
        "payoff_matrix_player2": [
            [-1, 0],
            [-10, -5]
        ],
        "category": "经典博弈"
    },
    {
        "name": "性别之战",
        "description": "一对夫妇决定去哪里约会。丈夫喜欢足球，妻子喜欢歌剧，但他们更愿意在一起。",
        "player1_strategies": ["足球", "歌剧"],
        "player2_strategies": ["足球", "歌剧"],
        "payoff_matrix_player1": [
            [2, 0],
            [0, 1]
        ],
        "payoff_matrix_player2": [
            [1, 0],
            [0, 2]
        ],
        "category": "协调博弈"
    },
    {
        "name": "石头剪刀布",
        "description": "经典的石头剪刀布游戏。",
        "player1_strategies": ["石头", "剪刀", "布"],
        "player2_strategies": ["石头", "剪刀", "布"],
        "payoff_matrix_player1": [
            [0, 1, -1],
            [-1, 0, 1],
            [1, -1, 0]
        ],
        "payoff_matrix_player2": [
            [0, -1, 1],
            [1, 0, -1],
            [-1, 1, 0]
        ],
        "category": "零和博弈"
    },
    {
        "name": "猎鹿博弈",
        "description": "两个猎人可以选择合作猎鹿或单独猎兔。",
        "player1_strategies": ["猎鹿", "猎兔"],
        "player2_strategies": ["猎鹿", "猎兔"],
        "payoff_matrix_player1": [
            [4, 0],
            [3, 3]
        ],
        "payoff_matrix_player2": [
            [4, 3],
            [0, 3]
        ],
        "category": "协调博弈"
    },
    {
        "name": "懦夫博弈",
        "description": "两辆车相向而行，谁先转向谁就是懦夫。",
        "player1_strategies": ["转向", "直行"],
        "player2_strategies": ["转向", "直行"],
        "payoff_matrix_player1": [
            [0, -1],
            [1, -10]
        ],
        "payoff_matrix_player2": [
            [0, 1],
            [-1, -10]
        ],
        "category": "经典博弈"
    },
    {
        "name": "协调博弈",
        "description": "两个参与者选择相同策略获得收益更高。",
        "player1_strategies": ["策略A", "策略B"],
        "player2_strategies": ["策略A", "策略B"],
        "payoff_matrix_player1": [
            [2, 0],
            [0, 1]
        ],
        "payoff_matrix_player2": [
            [2, 0],
            [0, 1]
        ],
        "category": "协调博弈"
    },
]


def init_examples(db: Session):
    existing = db.query(GameExample).count()
    if existing > 0:
        return
    
    for example in DEFAULT_EXAMPLES:
        db_example = GameExample(**example)
        db.add(db_example)
    
    db.commit()


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
