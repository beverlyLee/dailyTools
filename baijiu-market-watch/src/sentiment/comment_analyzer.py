#!/usr/bin/env python3
"""
白酒评论情感分析模块
支持火山引擎ARK API和规则分析两种模式
统一字段命名规范:
- sentiment_score: 整体情感评分(0-1)
- taste_score: 口感评分(0-1)
- packaging_score: 包装评分(0-1)
- logistics_score: 物流评分(0-1)
- has_counterfeit_mention: 是否提及假酒相关关键词
- analysis_source: 分析来源(ai/rule/mock)
"""

import os
import sys
import json
import re
from typing import Dict
import requests

# 添加项目根目录到Python路径
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, PROJECT_ROOT)

from config.settings import settings


class CommentAnalyzer:
    """评论情感分析器"""
    
    # 统一的字段名常量
    FIELD_SENTIMENT_SCORE = "sentiment_score"
    FIELD_TASTE_SCORE = "taste_score"
    FIELD_PACKAGING_SCORE = "packaging_score"
    FIELD_LOGISTICS_SCORE = "logistics_score"
    FIELD_HAS_COUNTERFEIT = "has_counterfeit_mention"
    FIELD_ANALYSIS_SOURCE = "analysis_source"
    
    def __init__(self):
        self.api_key = settings.ARK_API_KEY
        self.api_endpoint = settings.ARK_MODEL_ENDPOINT or "https://ark.cn-beijing.volces.com/api/v3/chat/completions"
        self.model = settings.ARK_MODEL or "doubao-seed-2-0-code-preview-260215"
        self.use_ai = self._validate_api_config()
        
        if self.use_ai:
            print(f"✅ 火山引擎API已配置，使用AI情感分析")
            print(f"   模型: {self.model}")
        else:
            print(f"⚠️  火山引擎API未配置，使用规则分析模式")
        
        # 初始化关键词库
        self._init_keywords()
    
    def _init_keywords(self):
        """初始化关键词库"""
        # 正面关键词
        self.positive_words = [
            "好", "不错", "棒", "赞", "优秀", "满意", "喜欢", "推荐", "正品",
            "醇厚", "绵柔", "香", "快", "及时", "精美", "严实", "放心",
            "正宗", "好喝", "完美", "超值", "划算", "给力", "太棒了",
            "真", "正", "醇", "佳", "妙", "绝", "棒极了", "可以", "nice",
            "ok", "赞", "牛", "爽", "舒服", "到位", "满分"
        ]
        
        # 负面关键词
        self.negative_words = [
            "差", "不好", "烂", "失望", "问题", "假", "伪", "仿", "怀疑",
            "破损", "慢", "漏", "简陋", "难喝", "坑", "骗", "垃圾",
            "不好喝", "差得很", "糟糕", "劣质", "次品", "假的", "坑爹",
            "不行", "烂透了", "垃圾", "废物", "差劲", "恶心", "差评"
        ]
        
        # 口感相关关键词
        self.taste_words = [
            "口感", "味道", "喝", "醇", "香", "绵柔", "辣", "喉", "上头",
            "入口", "酱香", "浓香", "清香", "口感好", "口感差", "酒味",
            "醇厚度", "回味", "回甘", "涩", "苦", "甜", "烈", "柔和",
            "顺", "滑", "细腻", "厚重", "淡", "浓", "醇厚", "纯正"
        ]
        
        # 包装相关关键词
        self.packaging_words = [
            "包装", "盒", "瓶", "破损", "严实", "精美", "简陋", "完好",
            "包装好", "包装差", "礼盒", "包装精美", "箱子", "包裹",
            "外观", "大气", "高档", "精致", "好看", "漂亮", "完好无损"
        ]
        
        # 物流相关关键词
        self.logistics_words = [
            "物流", "快递", "配送", "快", "慢", "及时", "次日达", "当日达",
            "配送快", "配送慢", "快递员", "发货", "送货", "速度",
            "准时", "延误", "快的", "慢的", "迅速", "高效", "神速"
        ]
        
        # 假酒相关关键词（增强版）
        self.counterfeit_words = [
            # 基础词
            "假", "伪", "仿", "假货", "假酒", "伪造", "仿造", "不是正品",
            "怀疑", "山寨", "高仿", "假冒", "伪劣", "冒充", "假货",
            
            # 同义词和相关表达
            "不是真的", "不对劲", "有问题", "是不是真的", "真假", "真伪",
            "会不会假", "会不会是假", "感觉不对", "味道不对", "口感不对",
            "不像是真的", "不像是正品", "像是假的", "像是假货", "可能是假",
            "估计是假", "怕是假", "怀疑是假", "疑是假", "疑似假", "假的吧",
            "假的么", "假的吗", "是假的", "真是假", "很假", "太假了",
            "假货吧", "假货么", "假货吗", "是假货", "假酒啊", "假酒吧",
            
            # 网络用语和口语
            "智商税", "交学费", "翻车", "踩雷", "避坑", "雷品", "坑",
            "被骗", "上当", "被坑", "被忽悠", "买错了", "买亏了",
            
            # 品牌相关怀疑
            "不是茅台", "不是五粮液", "不是正品吧", "不是正品吗",
            "不像真的茅台", "不像真的五粮液", "味道不一样", "和之前不一样"
        ]
    
    def _validate_api_config(self) -> bool:
        """验证API配置是否有效"""
        if not self.api_key or self.api_key == "your_ark_api_key_here":
            return False
        if not self.api_endpoint:
            return False
        return True
    
    def analyze(self, comment_text: str) -> Dict:
        """
        分析评论情感 - 统一入口
        Args:
            comment_text: 评论文本
        Returns:
            包含各维度评分的字典（统一字段名）
        """
        if not comment_text or not comment_text.strip():
            return {
                self.FIELD_SENTIMENT_SCORE: 0.5,
                self.FIELD_TASTE_SCORE: 0.5,
                self.FIELD_PACKAGING_SCORE: 0.5,
                self.FIELD_LOGISTICS_SCORE: 0.5,
                self.FIELD_HAS_COUNTERFEIT: False,
                self.FIELD_ANALYSIS_SOURCE: "mock"
            }
        
        if self.use_ai:
            try:
                result = self._analyze_with_ai(comment_text)
                result[self.FIELD_ANALYSIS_SOURCE] = "ai"
                return result
            except Exception as e:
                print(f"AI分析失败，降级到规则分析: {e}")
                result = self._analyze_with_rules(comment_text)
                result[self.FIELD_ANALYSIS_SOURCE] = "rule"
                return result
        else:
            result = self._analyze_with_rules(comment_text)
            result[self.FIELD_ANALYSIS_SOURCE] = "rule"
            return result
    
    def _analyze_with_ai(self, comment_text: str) -> Dict:
        """使用火山引擎ARK API进行情感分析 - 使用新的/responses端点"""
        system_prompt = """你是一个专业的白酒评论情感分析专家。请分析用户评论，从四个维度评分（0-1分，1分为最高分）：
1. 整体情感倾向（1为非常正面，0为非常负面）
2. 口感评分（1为口感很好，0为口感很差）
3. 包装评分（1为包装很好，0为包装很差）
4. 物流评分（1为物流很好，0为物流很差）

同时判断评论中是否有提到"假酒"、"假货"、"伪造"、"仿造"、"不是正品"、"山寨"等相关词汇。

请严格按照以下JSON格式返回结果，不要有其他文字说明：
{
    "sentiment_score": 0.85,
    "taste_score": 0.9,
    "packaging_score": 0.7,
    "logistics_score": 0.95,
    "has_counterfeit_mention": false
}"""

        full_prompt = f"{system_prompt}\n\n请分析这条白酒评论：{comment_text}"

        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {self.api_key}"
        }

        # 使用新的 /responses 端点格式
        api_endpoint = "https://ark.cn-beijing.volces.com/api/v3/responses"
        
        payload = {
            "model": self.model,
            "input": [
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "input_text",
                            "text": full_prompt
                        }
                    ]
                }
            ]
        }

        # 发送RESTful请求
        response = requests.post(
            api_endpoint,
            headers=headers,
            json=payload,
            timeout=30,
            verify=True
        )
        
        # 检查响应状态
        if response.status_code != 200:
            raise Exception(f"API请求失败: {response.status_code} - {response.text}")
        
        result = response.json()
        
        # 解析响应 - 新的 /responses 端点格式
        if "output" not in result:
            raise ValueError("API响应格式错误: 缺少output字段")
        
        content = result["output"]
        
        # 提取JSON
        json_match = re.search(r'\{[\s\S]*\}', content)
        if json_match:
            return json.loads(json_match.group())
        
        raise ValueError(f"无法解析AI响应: {content}")
    
    def _analyze_with_rules(self, comment_text: str) -> Dict:
        """使用规则引擎进行情感分析（降级方案）"""
        
        def calculate_score(text: str, related_words: list, positive: list, negative: list) -> float:
            """计算评分"""
            score = 0.5
            text_lower = text.lower()
            
            # 统计正面词
            pos_count = sum(1 for word in positive if word in text_lower)
            # 统计负面词
            neg_count = sum(1 for word in negative if word in text_lower)
            
            # 计算分数
            score += (pos_count - neg_count) * 0.1
            
            return max(0, min(1, score))
        
        # 统一转换为小写后检测假酒关键词
        comment_lower = comment_text.lower()
        has_counterfeit = any(word.lower() in comment_lower for word in self.counterfeit_words)
        
        # 计算整体情感
        sentiment_score = calculate_score(comment_text, [], self.positive_words, self.negative_words)
        
        # 检测各维度相关词是否存在
        taste_related = any(word in comment_lower for word in self.taste_words)
        packaging_related = any(word in comment_lower for word in self.packaging_words)
        logistics_related = any(word in comment_lower for word in self.logistics_words)
        
        # 计算各维度评分
        taste_score = calculate_score(comment_text, self.taste_words, self.positive_words, self.negative_words) if taste_related else sentiment_score
        packaging_score = calculate_score(comment_text, self.packaging_words, self.positive_words, self.negative_words) if packaging_related else sentiment_score
        logistics_score = calculate_score(comment_text, self.logistics_words, self.positive_words, self.negative_words) if logistics_related else sentiment_score
        
        return {
            self.FIELD_SENTIMENT_SCORE: round(sentiment_score, 2),
            self.FIELD_TASTE_SCORE: round(taste_score, 2),
            self.FIELD_PACKAGING_SCORE: round(packaging_score, 2),
            self.FIELD_LOGISTICS_SCORE: round(logistics_score, 2),
            self.FIELD_HAS_COUNTERFEIT: has_counterfeit
        }


# 全局单例
analyzer = CommentAnalyzer()


def analyze_comment(comment_text: str) -> Dict:
    """
    便捷函数：分析评论情感
    Args:
        comment_text: 评论文本
    Returns:
        情感分析结果字典（统一字段名）
    """
    return analyzer.analyze(comment_text)


if __name__ == "__main__":
    # 测试代码
    test_comments = [
        "口感醇厚，酱香味十足，包装精美，物流很快，正品无疑！",
        "感觉这次的酒有点问题，口感不对，会不会是假酒？",
        "物流太慢了，包装也破损了，很不满意！",
        "酒不错，入口绵柔不上头，就是包装简陋了点。",
        "这酒喝着感觉不对，不像是真的茅台，太坑了！"
    ]
    
    for comment in test_comments:
        result = analyze_comment(comment)
        print(f"\n评论: {comment}")
        print(f"结果: {json.dumps(result, ensure_ascii=False, indent=2)}")
