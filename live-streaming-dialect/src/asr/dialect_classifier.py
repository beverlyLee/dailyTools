from typing import Dict, List, Tuple
import re


class DialectClassifier:
    def __init__(self):
        self.dialect_features = {
            "东北话": {
                "keywords": ["咋整", "干啥", "唠嗑", "老铁", "没毛病", "嘎嘎", "老鼻子", "贼拉", "整啥", "那嘎达", "忽悠", "埋汰", "得劲", "稀罕", "尿性"],
                "pronunciation": ["r音化", "平翘舌不分"]
            },
            "四川话": {
                "keywords": ["巴适", "要得", "搞啥子", "安逸", "晓得", "摆龙门阵", "幺妹", "瓜娃子", "雄起", "恼火", "扯把子", "打望", "扎起", "洗白", "锤子"],
                "pronunciation": ["鼻音重", "声调特殊"]
            },
            "广东话": {
                "keywords": ["唔该", "系唔系", "点解", "咩", "嘅", "咁", "佢", "点样", "睇", "食饭", "早唞", "靓仔", "靓女", "唔好", "犀利"],
                "pronunciation": ["九声六调", "入声"]
            },
            "陕西话": {
                "keywords": ["谝寒传", "嘹咋咧", "碎娃", "额", "咋向", "克里马擦", "麻达", "瓷马二楞", "毕咧", "耍", "美滴很", "谝闲传", "咥饭", "倭也", "扎势"],
                "pronunciation": ["声调下沉", "后鼻音重"]
            },
            "河南话": {
                "keywords": ["中", "弄啥嘞", "中不中", "俺", "恁", "咋着", "排场", "得劲", "孬", "信球", "木牛", "冇", "搁", "弄啥类", "怪得劲"],
                "pronunciation": ["尖团音", "声调简化"]
            }
        }
        
        self.dialect_regions = {
            "东北话": ["黑龙江", "吉林", "辽宁"],
            "四川话": ["四川", "重庆", "贵州", "云南"],
            "广东话": ["广东", "香港", "澳门"],
            "陕西话": ["陕西", "山西"],
            "河南话": ["河南", "河北南部"]
        }

    def classify_text(self, text: str) -> Tuple[str, float]:
        scores = {}
        total_keywords = 0
        
        for dialect, features in self.dialect_features.items():
            score = 0
            keyword_count = 0
            for keyword in features["keywords"]:
                count = len(re.findall(re.escape(keyword), text))
                if count > 0:
                    score += count
                    keyword_count += count
            
            total_keywords += keyword_count
            scores[dialect] = score
        
        if total_keywords == 0:
            return "普通话", 0.0
        
        max_dialect = max(scores, key=scores.get)
        confidence = scores[max_dialect] / total_keywords if total_keywords > 0 else 0
        
        return max_dialect, confidence

    def batch_classify(self, texts: List[str]) -> List[Dict]:
        results = []
        for text in texts:
            dialect, confidence = self.classify_text(text)
            results.append({
                "text": text[:50] + "..." if len(text) > 50 else text,
                "dialect": dialect,
                "confidence": round(confidence, 2)
            })
        return results

    def get_dialect_regions(self, dialect: str) -> List[str]:
        return self.dialect_regions.get(dialect, [])


classifier = DialectClassifier()
