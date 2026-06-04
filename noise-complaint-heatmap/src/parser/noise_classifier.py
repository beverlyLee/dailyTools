from typing import Dict, List, Tuple


class NoiseClassifier:
    def __init__(self):
        self.categories = {
            'construction': {
                'name': '夜间施工',
                'keywords': [
                    {'word': '施工', 'weight': 2},
                    {'word': '建筑', 'weight': 2},
                    {'word': '工地', 'weight': 2},
                    {'word': '工程', 'weight': 2},
                    {'word': '夜间施工', 'weight': 3},
                    {'word': '通宵施工', 'weight': 3},
                    {'word': '打桩', 'weight': 2},
                    {'word': '混凝土', 'weight': 2},
                    {'word': '挖掘机', 'weight': 2},
                    {'word': '推土机', 'weight': 2},
                    {'word': '渣土车', 'weight': 2},
                    {'word': '机械', 'weight': 1},
                    {'word': '机器', 'weight': 1},
                    {'word': '轰鸣', 'weight': 2},
                    {'word': '地铁施工', 'weight': 3},
                    {'word': '道路施工', 'weight': 2},
                    {'word': '电钻', 'weight': 1},
                    {'word': '切割机', 'weight': 1}
                ],
                'color': '#ff4444',
                'icon': '🏗️'
            },
            'square_dance': {
                'name': '广场舞',
                'keywords': [
                    {'word': '广场舞', 'weight': 3},
                    {'word': '广场', 'weight': 1},
                    {'word': '跳舞', 'weight': 2},
                    {'word': '舞蹈', 'weight': 2},
                    {'word': '健身操', 'weight': 2},
                    {'word': '音响', 'weight': 1},
                    {'word': '喇叭', 'weight': 1},
                    {'word': '音乐', 'weight': 1},
                    {'word': '公园', 'weight': 1},
                    {'word': '晨练', 'weight': 2},
                    {'word': '晚练', 'weight': 2},
                    {'word': '中老年活动', 'weight': 2},
                    {'word': '坝坝舞', 'weight': 3}
                ],
                'color': '#ff9800',
                'icon': '💃'
            },
            'food_stall': {
                'name': '大排档',
                'keywords': [
                    {'word': '大排档', 'weight': 3},
                    {'word': '夜宵', 'weight': 2},
                    {'word': '烧烤', 'weight': 2},
                    {'word': '路边摊', 'weight': 2},
                    {'word': '夜市', 'weight': 2},
                    {'word': '食客', 'weight': 2},
                    {'word': '划拳', 'weight': 2},
                    {'word': '喝酒', 'weight': 1},
                    {'word': '酒瓶', 'weight': 2},
                    {'word': '喧闹', 'weight': 1},
                    {'word': '喧哗', 'weight': 1},
                    {'word': '摆摊', 'weight': 2},
                    {'word': '露天餐饮', 'weight': 2},
                    {'word': '小吃摊', 'weight': 2}
                ],
                'color': '#e91e63',
                'icon': '🍢'
            },
            'neighbor': {
                'name': '邻里纠纷',
                'keywords': [
                    {'word': '邻居', 'weight': 3},
                    {'word': '邻里', 'weight': 3},
                    {'word': '楼上', 'weight': 3},
                    {'word': '楼下', 'weight': 3},
                    {'word': '隔壁', 'weight': 3},
                    {'word': '狗叫', 'weight': 2},
                    {'word': '宠物', 'weight': 2},
                    {'word': '家庭', 'weight': 2},
                    {'word': '小孩', 'weight': 2},
                    {'word': '吵闹', 'weight': 1},
                    {'word': '生活噪音', 'weight': 2},
                    {'word': '麻将', 'weight': 2},
                    {'word': '电视', 'weight': 1},
                    {'word': '音响', 'weight': 1},
                    {'word': '钢琴', 'weight': 2},
                    {'word': '乐器', 'weight': 2},
                    {'word': '装修', 'weight': 2},
                    {'word': '敲打', 'weight': 1}
                ],
                'color': '#9c27b0',
                'icon': '🏠'
            }
        }

        self.context_rules = [
            {
                'name': '邻里装修',
                'conditions': ['邻居', '邻里', '楼上', '楼下', '隔壁', '小区'],
                'trigger_words': ['装修', '电钻', '敲打'],
                'target_category': 'neighbor',
                'bonus': 5
            },
            {
                'name': '夜间施工',
                'conditions': ['夜间', '晚上', '深夜', '凌晨', '通宵'],
                'trigger_words': ['施工', '工地', '工程', '建筑'],
                'target_category': 'construction',
                'bonus': 3
            }
        ]

    def _check_context_rules(self, text: str) -> Dict[str, int]:
        bonuses = {}
        
        for rule in self.context_rules:
            has_condition = any(cond in text for cond in rule['conditions'])
            has_trigger = any(trigger in text for trigger in rule['trigger_words'])
            
            if has_condition and has_trigger:
                if rule['target_category'] not in bonuses:
                    bonuses[rule['target_category']] = 0
                bonuses[rule['target_category']] += rule['bonus']
        
        return bonuses

    def classify(self, text: str) -> Dict:
        if not text:
            return {
                'category': 'unknown',
                'category_name': '未知',
                'confidence': 0.0,
                'color': '#999999',
                'icon': '❓'
            }

        scores = {}
        for cat_id, cat_info in self.categories.items():
            score = 0
            for keyword_info in cat_info['keywords']:
                if keyword_info['word'] in text:
                    score += keyword_info['weight']
            if score > 0:
                scores[cat_id] = score

        context_bonuses = self._check_context_rules(text)
        for cat_id, bonus in context_bonuses.items():
            if cat_id not in scores:
                scores[cat_id] = 0
            scores[cat_id] += bonus

        if not scores:
            return {
                'category': 'unknown',
                'category_name': '其他噪音',
                'confidence': 0.0,
                'color': '#999999',
                'icon': '🔊'
            }

        best_cat = max(scores, key=scores.get)
        total_score = sum(scores.values())
        confidence = scores[best_cat] / total_score if total_score > 0 else 0

        cat_info = self.categories[best_cat]
        return {
            'category': best_cat,
            'category_name': cat_info['name'],
            'confidence': round(confidence, 2),
            'color': cat_info['color'],
            'icon': cat_info['icon']
        }

    def batch_classify(self, complaints: List[Dict]) -> List[Dict]:
        classified = []
        for complaint in complaints:
            text = complaint.get('title', '') + ' ' + complaint.get('content', '')
            classification = self.classify(text)
            complaint.update(classification)
            classified.append(complaint)
        return classified

    def get_category_info(self, category_id: str) -> Dict:
        return self.categories.get(category_id, {
            'name': '未知',
            'color': '#999999',
            'icon': '❓'
        })

    def get_all_categories(self) -> Dict:
        return self.categories


if __name__ == '__main__':
    classifier = NoiseClassifier()

    test_texts = [
        '邻居家深夜装修噪音扰民',
        '静安区南京西路1618号附近小区，邻居家经常深夜还在装修，电钻声音很大，属于邻里纠纷问题',
        '浦东新区张江高科技园区博云路2号附近，每晚10点后仍有大型工程机械作业',
        '黄浦区人民广场南京西路这边，每天早上6点和晚上7点都有广场舞活动',
        '徐汇区天钥桥路333号附近，夜市大排档每天营业到凌晨3点',
        '楼上住户养的大型犬经常狂叫不止，特别是晚上叫得厉害'
    ]

    for text in test_texts:
        result = classifier.classify(text)
        print(f"文本: {text[:40]}...")
        print(f"分类: {result['icon']} {result['category_name']} (置信度: {result['confidence']})\n")
