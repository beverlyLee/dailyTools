from typing import List, Dict
from fastapi import APIRouter, Query

from ..models.document import Entity, Relation
from ..services import graph_service

router = APIRouter(prefix="/graph", tags=["knowledge-graph"])


@router.get("/entities", response_model=List[Entity])
async def get_entities(limit: int = Query(100, ge=1, le=500)):
    return graph_service.get_all_entities(limit=limit)


@router.get("/relations", response_model=List[Relation])
async def get_relations(limit: int = Query(100, ge=1, le=500)):
    return graph_service.get_all_relations(limit=limit)


@router.get("/visualize", response_model=Dict)
async def get_graph_visualization():
    return graph_service.get_graph_data()


@router.get("/search/{entity_name}", response_model=Dict)
async def search_related_entities(
    entity_name: str,
    limit: int = Query(20, ge=1, le=100),
):
    return graph_service.search_related(entity_name, limit=limit)
