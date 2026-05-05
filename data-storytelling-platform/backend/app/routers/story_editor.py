from typing import List
from fastapi import APIRouter, HTTPException, Depends
from datetime import datetime
import uuid
import json
import os
from app.models import (
    Story, StoryCreate, StoryUpdate,
    Slide, SlideElement, Parameter
)
from app.config import settings, create_directories

router = APIRouter()

create_directories()
STORIES_FILE = os.path.join(settings.DATA_DIR, "stories.json")

def load_stories() -> List[Story]:
    if not os.path.exists(STORIES_FILE):
        return []
    with open(STORIES_FILE, "r", encoding="utf-8") as f:
        data = json.load(f)
        return [Story(**s) for s in data]

def save_stories(stories: List[Story]):
    with open(STORIES_FILE, "w", encoding="utf-8") as f:
        json.dump([s.model_dump() for s in stories], f, default=str, ensure_ascii=False, indent=2)

@router.get("/", response_model=List[Story])
def get_stories():
    return load_stories()

@router.get("/{story_id}", response_model=Story)
def get_story(story_id: str):
    stories = load_stories()
    for story in stories:
        if story.id == story_id:
            return story
    raise HTTPException(status_code=404, detail="故事不存在")

@router.post("/", response_model=Story)
def create_story(story_create: StoryCreate):
    stories = load_stories()
    new_story = Story(
        id=str(uuid.uuid4()),
        title=story_create.title,
        description=story_create.description,
        slides=[],
        createdAt=datetime.utcnow(),
        updatedAt=datetime.utcnow()
    )
    stories.append(new_story)
    save_stories(stories)
    return new_story

@router.put("/{story_id}", response_model=Story)
def update_story(story_id: str, story_update: StoryUpdate):
    stories = load_stories()
    for i, story in enumerate(stories):
        if story.id == story_id:
            update_data = story_update.model_dump(exclude_unset=True)
            for key, value in update_data.items():
                setattr(story, key, value)
            story.updatedAt = datetime.utcnow()
            save_stories(stories)
            return story
    raise HTTPException(status_code=404, detail="故事不存在")

@router.delete("/{story_id}")
def delete_story(story_id: str):
    stories = load_stories()
    for i, story in enumerate(stories):
        if story.id == story_id:
            del stories[i]
            save_stories(stories)
            return {"message": "故事已删除"}
    raise HTTPException(status_code=404, detail="故事不存在")

@router.post("/{story_id}/slides", response_model=Slide)
def add_slide(story_id: str, slide: Slide):
    stories = load_stories()
    for story in stories:
        if story.id == story_id:
            if not slide.id:
                slide.id = str(uuid.uuid4())
            story.slides.append(slide)
            story.updatedAt = datetime.utcnow()
            save_stories(stories)
            return slide
    raise HTTPException(status_code=404, detail="故事不存在")

@router.put("/{story_id}/slides/{slide_id}", response_model=Slide)
def update_slide(story_id: str, slide_id: str, slide: Slide):
    stories = load_stories()
    for story in stories:
        if story.id == story_id:
            for i, s in enumerate(story.slides):
                if s.id == slide_id:
                    story.slides[i] = slide
                    story.updatedAt = datetime.utcnow()
                    save_stories(stories)
                    return slide
            raise HTTPException(status_code=404, detail="幻灯片不存在")
    raise HTTPException(status_code=404, detail="故事不存在")

@router.delete("/{story_id}/slides/{slide_id}")
def delete_slide(story_id: str, slide_id: str):
    stories = load_stories()
    for story in stories:
        if story.id == story_id:
            for i, s in enumerate(story.slides):
                if s.id == slide_id:
                    del story.slides[i]
                    story.updatedAt = datetime.utcnow()
                    save_stories(stories)
                    return {"message": "幻灯片已删除"}
            raise HTTPException(status_code=404, detail="幻灯片不存在")
    raise HTTPException(status_code=404, detail="故事不存在")

@router.post("/sample-data")
def create_sample_data():
    stories = load_stories()
    
    sample_story = Story(
        id=str(uuid.uuid4()),
        title="销售数据分析报告",
        description="基于月度销售数据的交互式分析报告",
        slides=[
            Slide(
                id=str(uuid.uuid4()),
                title="销售概览",
                elements=[
                    SlideElement(
                        id=str(uuid.uuid4()),
                        type="text",
                        content="本报告展示了2024年各季度的销售数据趋势分析。",
                        style={"fontSize": "18px", "color": "#333"}
                    ),
                    SlideElement(
                        id=str(uuid.uuid4()),
                        type="chart",
                        content="quarterly_sales",
                        style={"width": "100%", "height": "400px"},
                        dataSource="sales_data"
                    )
                ],
                parameters=[
                    Parameter(
                        id=str(uuid.uuid4()),
                        name="year",
                        type="dropdown",
                        label="年份",
                        value="2024",
                        options=[{"label": "2022", "value": "2022"}, {"label": "2023", "value": "2023"}, {"label": "2024", "value": "2024"}]
                    )
                ]
            ),
            Slide(
                id=str(uuid.uuid4()),
                title="产品类别分析",
                elements=[
                    SlideElement(
                        id=str(uuid.uuid4()),
                        type="chart",
                        content="category_distribution",
                        style={"width": "100%", "height": "400px"},
                        dataSource="category_data"
                    )
                ],
                parameters=[
                    Parameter(
                        id=str(uuid.uuid4()),
                        name="threshold",
                        type="slider",
                        label="销售额阈值（万元）",
                        value=50,
                        min=10,
                        max=100,
                        step=5
                    )
                ]
            )
        ],
        createdAt=datetime.utcnow(),
        updatedAt=datetime.utcnow()
    )
    
    stories.append(sample_story)
    save_stories(stories)
    
    return {"message": "示例数据已创建", "story_id": sample_story.id}
