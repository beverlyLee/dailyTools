"""
博弈论纳什均衡求解器 API 路由
"""

import sys
import os
from typing import List, Dict, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session
from datetime import datetime
import uuid

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.db.database import get_db
from app.models.models import GameRecord, GameTemplate
from app.core.game_solver import (
    NashEquilibriumSolver,
    GAME_TEMPLATES as CORE_GAME_TEMPLATES,
)


router = APIRouter(prefix="/game", tags=["博弈论求解器"])


class GameConfig(BaseModel):
    """博弈配置"""
    name: str = "未命名博弈"
    description: Optional[str] = None
    player1_strategies: List[str]
    player2_strategies: List[str]
    payoff_matrix: List[List[Dict]]  # [[{"player1": a, "player2": b}, ...], ...]
    result: Optional[Dict] = None  # 可选，用于保存已有结果


@router.post("/solve")
async def solve_nash_equilibrium(
    config: GameConfig,
):
    """
    求解纳什均衡
    
    计算纯策略纳什均衡和混合策略纳什均衡
    """
    try:
        # 验证输入
        n_rows = len(config.player1_strategies)
        n_cols = len(config.player2_strategies)
        
        if len(config.payoff_matrix) != n_rows:
            raise HTTPException(
                status_code=400,
                detail=f"收益矩阵行数({len(config.payoff_matrix)})与策略数({n_rows})不匹配"
            )
        
        for i, row in enumerate(config.payoff_matrix):
            if len(row) != n_cols:
                raise HTTPException(
                    status_code=400,
                    detail=f"第{i+1}行收益矩阵列数({len(row)})与策略数({n_cols})不匹配"
                )
        
        # 创建求解器
        solver = NashEquilibriumSolver()
        solver.set_game(
            payoff_matrix=config.payoff_matrix,
            row_strategies=config.player1_strategies,
            col_strategies=config.player2_strategies,
        )
        
        # 求解
        result = solver.solve()
        
        # 添加元数据
        result["game_name"] = config.name
        result["solved_at"] = datetime.utcnow().isoformat()
        
        return JSONResponse(
            content={
                "success": True,
                "message": "求解完成",
                "result": result,
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"求解失败: {str(e)}")


@router.post("/save")
async def save_game(
    config: GameConfig,
    db: Session = Depends(get_db),
):
    """
    保存博弈配置和结果到数据库
    """
    try:
        game_id = str(uuid.uuid4())
        
        db_game = GameRecord(
            game_id=game_id,
            name=config.name,
            description=config.description,
            player1_strategies=config.player1_strategies,
            player2_strategies=config.player2_strategies,
            payoff_matrix=config.payoff_matrix,
            result=config.result,
        )
        db.add(db_game)
        db.commit()
        db.refresh(db_game)
        
        return JSONResponse(
            content={
                "success": True,
                "game_id": game_id,
                "message": "博弈已保存",
            }
        )
        
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"保存失败: {str(e)}")


@router.get("/game/{game_id}")
async def get_game(
    game_id: str,
    db: Session = Depends(get_db),
):
    """获取指定博弈"""
    db_game = db.query(GameRecord).filter(GameRecord.game_id == game_id).first()
    
    if not db_game:
        raise HTTPException(status_code=404, detail="博弈不存在")
    
    return JSONResponse(
        content={
            "success": True,
            "game": {
                "game_id": db_game.game_id,
                "name": db_game.name,
                "description": db_game.description,
                "player1_strategies": db_game.player1_strategies,
                "player2_strategies": db_game.player2_strategies,
                "payoff_matrix": db_game.payoff_matrix,
                "result": db_game.result,
                "created_at": db_game.created_at.isoformat() if db_game.created_at else None,
                "updated_at": db_game.updated_at.isoformat() if db_game.updated_at else None,
            },
        }
    )


@router.get("/games")
async def list_games(
    db: Session = Depends(get_db),
    limit: int = Query(50, ge=1, le=200),
):
    """获取所有博弈列表"""
    games = db.query(GameRecord).order_by(
        GameRecord.updated_at.desc()
    ).limit(limit).all()
    
    result = []
    for game in games:
        result.append({
            "game_id": game.game_id,
            "name": game.name,
            "description": game.description,
            "player1_strategies": game.player1_strategies,
            "player2_strategies": game.player2_strategies,
            "n_pure_equilibria": len(game.result.get("pure_equilibria", [])) if game.result else None,
            "n_mixed_equilibria": len(game.result.get("mixed_equilibria", [])) if game.result else None,
            "created_at": game.created_at.isoformat() if game.created_at else None,
            "updated_at": game.updated_at.isoformat() if game.updated_at else None,
        })
    
    return JSONResponse(
        content={
            "success": True,
            "games": result,
            "count": len(result),
        }
    )


@router.get("/templates")
async def get_game_templates(
    db: Session = Depends(get_db),
):
    """
    获取经典博弈模板
    
    优先返回数据库中的模板，如果没有则返回内置模板
    """
    # 检查数据库中的模板
    db_templates = db.query(GameTemplate).filter(
        GameTemplate.is_active == 1
    ).all()
    
    if db_templates:
        result = []
        for t in db_templates:
            result.append({
                "template_key": t.template_key,
                "name": t.name,
                "description": t.description,
                "player1_strategies": t.player1_strategies,
                "player2_strategies": t.player2_strategies,
                "payoff_matrix": t.payoff_matrix,
            })
        return JSONResponse(
            content={
                "success": True,
                "source": "database",
                "templates": result,
            }
        )
    
    # 返回内置模板
    result = []
    for key, template in CORE_GAME_TEMPLATES.items():
        result.append({
            "template_key": key,
            "name": template["name"],
            "description": template["description"],
            "player1_strategies": template["player1_strategies"],
            "player2_strategies": template["player2_strategies"],
            "payoff_matrix": template["payoff_matrix"],
        })
    
    return JSONResponse(
        content={
            "success": True,
            "source": "builtin",
            "templates": result,
        }
    )


@router.post("/templates/init")
async def initialize_templates(
    db: Session = Depends(get_db),
):
    """
    初始化数据库模板（将内置模板导入数据库）
    """
    try:
        for key, template in CORE_GAME_TEMPLATES.items():
            # 检查是否已存在
            existing = db.query(GameTemplate).filter(
                GameTemplate.template_key == key
            ).first()
            
            if not existing:
                db_template = GameTemplate(
                    template_key=key,
                    name=template["name"],
                    description=template["description"],
                    player1_strategies=template["player1_strategies"],
                    player2_strategies=template["player2_strategies"],
                    payoff_matrix=template["payoff_matrix"],
                    is_active=1,
                )
                db.add(db_template)
        
        db.commit()
        
        return JSONResponse(
            content={
                "success": True,
                "message": f"已初始化 {len(CORE_GAME_TEMPLATES)} 个经典博弈模板",
                "templates": list(CORE_GAME_TEMPLATES.keys()),
            }
        )
        
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"初始化模板失败: {str(e)}")


@router.post("/templates/add")
async def add_custom_template(
    template: GameConfig,
    template_key: str = Query(..., description="模板唯一标识"),
    db: Session = Depends(get_db),
):
    """添加自定义模板"""
    try:
        # 检查是否已存在
        existing = db.query(GameTemplate).filter(
            GameTemplate.template_key == template_key
        ).first()
        
        if existing:
            # 更新
            existing.name = template.name
            existing.description = template.description
            existing.player1_strategies = template.player1_strategies
            existing.player2_strategies = template.player2_strategies
            existing.payoff_matrix = template.payoff_matrix
        else:
            # 新建
            db_template = GameTemplate(
                template_key=template_key,
                name=template.name,
                description=template.description,
                player1_strategies=template.player1_strategies,
                player2_strategies=template.player2_strategies,
                payoff_matrix=template.payoff_matrix,
                is_active=1,
            )
            db.add(db_template)
        
        db.commit()
        
        return JSONResponse(
            content={
                "success": True,
                "message": "模板已保存",
                "template_key": template_key,
            }
        )
        
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"保存模板失败: {str(e)}")
