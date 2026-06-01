from fastapi import APIRouter
from .. import schemas
from ..services.ai_service import AIService
from ..config import settings

router = APIRouter(prefix="/api/settings", tags=["settings"])


@router.post("/test", response_model=schemas.SettingsTestResponse)
async def test_settings(request: schemas.SettingsTestRequest):
    ai_service = AIService(
        api_key=request.api_key,
        base_url=request.base_url,
        model=request.model,
    )

    result = await ai_service.test_connection()

    return schemas.SettingsTestResponse(
        success=result["success"],
        message=result["message"],
    )


@router.get("/models")
def get_available_models():
    return {
        "models": [
            {
                "id": "doubao-seed-1-8-250328",
                "name": "豆包 Seed 1.8",
                "description": "适合通用对话和文本处理",
            },
            {
                "id": "doubao-seed-2-0-code-preview-260215",
                "name": "豆包 Seed 2.0 Code",
                "description": "适合代码相关任务",
            },
            {
                "id": "doubao-pro-1-8-250328",
                "name": "豆包 Pro 1.8",
                "description": "更强大的模型能力",
            },
            {
                "id": "doubao-ultra-1-8-250328",
                "name": "豆包 Ultra 1.8",
                "description": "最高能力模型",
            },
        ],
        "default_base_url": settings.ARK_BASE_URL,
    }
