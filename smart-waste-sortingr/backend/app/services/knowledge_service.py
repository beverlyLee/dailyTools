import json
from typing import Dict, Optional, List
from pathlib import Path
import logging

from app.config import KNOWLEDGE_BASE_PATH

logger = logging.getLogger(__name__)


class KnowledgeService:
    _instance = None
    _knowledge_base: Optional[Dict] = None
    _is_loaded = False

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    def __init__(self):
        if not self._is_loaded:
            self._knowledge_base = None
            self._is_loaded = False

    def _load_knowledge_base(self):
        if self._is_loaded:
            return

        kb_path = Path(KNOWLEDGE_BASE_PATH)
        
        if not kb_path.exists():
            logger.warning(f"Knowledge base not found at {kb_path}. Using default knowledge.")
            self._knowledge_base = self._get_default_knowledge()
            self._is_loaded = True
            return

        try:
            with open(kb_path, 'r', encoding='utf-8') as f:
                self._knowledge_base = json.load(f)
            self._is_loaded = True
            logger.info("Knowledge base loaded successfully")
        except Exception as e:
            logger.error(f"Failed to load knowledge base: {e}")
            self._knowledge_base = self._get_default_knowledge()
            self._is_loaded = True

    def _get_default_knowledge(self) -> Dict:
        return {
            "categories": {
                "可回收物": {
                    "description": "适宜回收和资源利用的垃圾",
                    "color": "蓝色",
                    "disposal_guide": "轻投轻放，清洁干燥，避免污染；废纸尽量平整；立体包装物请清空内容物，清洁后压扁投放；有尖锐边角的，应包裹后投放。",
                    "examples": ["纸类", "塑料", "玻璃", "金属", "织物"]
                },
                "厨余垃圾": {
                    "description": "日常生活产生的易腐性垃圾",
                    "color": "绿色",
                    "disposal_guide": "纯流质的食物垃圾，如牛奶等，应直接倒进下水口；有包装物的厨余垃圾应将包装物去除后分类投放，包装物请投放到对应的可回收物或其他垃圾容器。",
                    "examples": ["剩菜剩饭", "瓜皮果核", "茶渣", "蛋壳"]
                },
                "有害垃圾": {
                    "description": "对人体健康或自然环境造成直接或潜在危害的垃圾",
                    "color": "红色",
                    "disposal_guide": "投放时请注意轻放；易破损的请连带包装或包裹后轻放；如易挥发，请密封后投放。",
                    "examples": ["废电池", "废灯管", "废药品", "废油漆"]
                },
                "其他垃圾": {
                    "description": "除上述垃圾之外的其他生活垃圾",
                    "color": "灰色或黑色",
                    "disposal_guide": "尽量沥干水分；难以辨识类别的生活垃圾投入其他垃圾容器内。",
                    "examples": ["餐巾纸", "尿不湿", "烟蒂", "陶瓷"]
                }
            },
            "items": {
                "矿泉水瓶": {
                    "category": "可回收物",
                    "disposal_tips": "请清空瓶内液体，可压扁后投放",
                    "recycling_value": "高",
                    "environmental_impact": "塑料瓶自然降解需要数百年"
                },
                "快递纸箱": {
                    "category": "可回收物",
                    "disposal_tips": "请去除胶带和标签，压扁后投放",
                    "recycling_value": "高",
                    "environmental_impact": "回收1吨废纸可节约17棵大树"
                },
                "旧报纸": {
                    "category": "可回收物",
                    "disposal_tips": "请保持干燥，叠放整齐",
                    "recycling_value": "高",
                    "environmental_impact": "回收1吨报纸可节约3立方米木材"
                },
                "塑料瓶": {
                    "category": "可回收物",
                    "disposal_tips": "请清空内容物，清洁后投放",
                    "recycling_value": "中",
                    "environmental_impact": "PET塑料可回收再利用"
                },
                "易拉罐": {
                    "category": "可回收物",
                    "disposal_tips": "请清空内容物，压扁后投放",
                    "recycling_value": "高",
                    "environmental_impact": "回收铝罐比生产新罐节约95%能源"
                },
                "玻璃酒瓶": {
                    "category": "可回收物",
                    "disposal_tips": "请清空内容物，小心破损",
                    "recycling_value": "高",
                    "environmental_impact": "玻璃可无限次回收利用"
                },
                "旧衣服": {
                    "category": "可回收物",
                    "disposal_tips": "请清洗干净后投放或捐赠",
                    "recycling_value": "中",
                    "environmental_impact": "旧衣物可再加工成新布料"
                },
                "菜叶": {
                    "category": "厨余垃圾",
                    "disposal_tips": "可直接投放，沥去多余水分",
                    "recycling_value": "中",
                    "environmental_impact": "可堆肥处理，转化为有机肥料"
                },
                "剩菜剩饭": {
                    "category": "厨余垃圾",
                    "disposal_tips": "请沥干水分，去除非食物杂质",
                    "recycling_value": "中",
                    "environmental_impact": "可进行厌氧发酵产生沼气"
                },
                "果皮": {
                    "category": "厨余垃圾",
                    "disposal_tips": "可直接投放",
                    "recycling_value": "中",
                    "environmental_impact": "易降解，适合堆肥"
                },
                "茶渣": {
                    "category": "厨余垃圾",
                    "disposal_tips": "请沥干水分",
                    "recycling_value": "低",
                    "environmental_impact": "可作为花肥使用"
                },
                "蛋壳": {
                    "category": "厨余垃圾",
                    "disposal_tips": "可直接投放",
                    "recycling_value": "低",
                    "environmental_impact": "富含钙质，可改良土壤"
                },
                "骨头": {
                    "category": "厨余垃圾",
                    "disposal_tips": "大骨头请敲碎后投放",
                    "recycling_value": "低",
                    "environmental_impact": "分解较慢，建议粉碎处理"
                },
                "过期食品": {
                    "category": "厨余垃圾",
                    "disposal_tips": "请去除包装后投放",
                    "recycling_value": "低",
                    "environmental_impact": "可堆肥处理"
                },
                "电池": {
                    "category": "有害垃圾",
                    "disposal_tips": "请单独投放到有害垃圾收集点",
                    "recycling_value": "低",
                    "environmental_impact": "含重金属，对土壤和水源危害大"
                },
                "过期药品": {
                    "category": "有害垃圾",
                    "disposal_tips": "请连同包装一起投放到专门回收点",
                    "recycling_value": "低",
                    "environmental_impact": "随意丢弃可能污染土壤和水源"
                },
                "油漆桶": {
                    "category": "有害垃圾",
                    "disposal_tips": "请确保密封，投放到专门回收点",
                    "recycling_value": "低",
                    "environmental_impact": "含有有机溶剂，对环境有害"
                },
                "温度计": {
                    "category": "有害垃圾",
                    "disposal_tips": "请小心包裹，避免水银泄漏",
                    "recycling_value": "低",
                    "environmental_impact": "水银是剧毒物质，危害极大"
                },
                "杀虫剂": {
                    "category": "有害垃圾",
                    "disposal_tips": "请保持原包装，投放到专门回收点",
                    "recycling_value": "低",
                    "environmental_impact": "含有毒化学物质"
                },
                "荧光灯管": {
                    "category": "有害垃圾",
                    "disposal_tips": "请小心包装，避免破碎",
                    "recycling_value": "低",
                    "environmental_impact": "含有汞蒸气"
                },
                "用过的纸巾": {
                    "category": "其他垃圾",
                    "disposal_tips": "请沥干水分后投放",
                    "recycling_value": "低",
                    "environmental_impact": "水溶性强，不可回收"
                },
                "烟蒂": {
                    "category": "其他垃圾",
                    "disposal_tips": "请确保熄灭后投放",
                    "recycling_value": "低",
                    "environmental_impact": "含有过滤嘴，难以降解"
                },
                "陶瓷碎片": {
                    "category": "其他垃圾",
                    "disposal_tips": "请包裹后投放，避免伤人",
                    "recycling_value": "低",
                    "environmental_impact": "不可回收"
                },
                "一次性餐具": {
                    "category": "其他垃圾",
                    "disposal_tips": "请清理后投放",
                    "recycling_value": "低",
                    "environmental_impact": "难以降解"
                },
                "旧牙刷": {
                    "category": "其他垃圾",
                    "disposal_tips": "可直接投放",
                    "recycling_value": "低",
                    "environmental_impact": "由多种材料组成，难以回收"
                },
                "尿不湿": {
                    "category": "其他垃圾",
                    "disposal_tips": "请包裹后投放",
                    "recycling_value": "低",
                    "environmental_impact": "含有吸水树脂，难以降解"
                },
                "贝壳": {
                    "category": "其他垃圾",
                    "disposal_tips": "可直接投放",
                    "recycling_value": "低",
                    "environmental_impact": "质地坚硬，难以处理"
                }
            }
        }

    def get_category_info(self, category: str) -> Optional[Dict]:
        self._load_knowledge_base()
        return self._knowledge_base.get("categories", {}).get(category)

    def get_item_info(self, item_name: str) -> Optional[Dict]:
        self._load_knowledge_base()
        return self._knowledge_base.get("items", {}).get(item_name)

    def get_disposal_guide(self, item_name: str, category: str) -> Dict:
        self._load_knowledge_base()
        
        result = {
            "item_name": item_name,
            "category": category,
            "category_info": None,
            "item_info": None,
            "disposal_instructions": ""
        }
        
        category_info = self.get_category_info(category)
        if category_info:
            result["category_info"] = category_info
            result["disposal_instructions"] = category_info.get("disposal_guide", "")
        
        item_info = self.get_item_info(item_name)
        if item_info:
            result["item_info"] = item_info
            if item_info.get("disposal_tips"):
                if result["disposal_instructions"]:
                    result["disposal_instructions"] += "\n\n特别提示：" + item_info["disposal_tips"]
                else:
                    result["disposal_instructions"] = item_info["disposal_tips"]
        
        return result

    def get_all_categories(self) -> List[Dict]:
        self._load_knowledge_base()
        categories = self._knowledge_base.get("categories", {})
        return [
            {"name": name, **info}
            for name, info in categories.items()
        ]
