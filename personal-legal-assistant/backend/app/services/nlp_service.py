from typing import List, Dict, Optional, Tuple
import re


class NLPService:
    def __init__(self):
        self._hanlp_available = False
        self._try_import_hanlp()
        
        self.legal_keywords = {
            "合同纠纷": ["合同", "协议", "违约", "解除", "履行", "支付", "款项", "违约金"],
            "劳动争议": ["工资", "加班", "劳动合同", "辞退", "离职", "社保", "公积金", "补偿"],
            "交通事故": ["车祸", "肇事", "保险", "赔偿", "伤残", "责任", "事故", "车辆"],
            "民间借贷": ["借款", "欠条", "借条", "利息", "还款", "本金", "债权人", "债务人"],
            "婚姻家庭": ["离婚", "抚养", "赡养", "财产", "继承", "分割", "抚养权", "探视"],
            "侵权责任": ["侵权", "损害", "赔偿", "名誉", "隐私", "肖像", "知识产权"],
            "房产纠纷": ["房屋", "产权", "过户", "买卖", "租赁", "拆迁", "物业", "业主"],
        }
        
        self.entity_types = {
            "Person": ["先生", "女士", "原告", "被告", "甲方", "乙方", "当事人", "张三", "李四", "王五"],
            "Organization": ["公司", "有限公司", "责任公司", "银行", "保险公司", "律师事务所", "法院", "公安局"],
            "Location": ["市", "省", "区", "县", "街道", "路", "号", "小区", "大厦"],
            "Money": ["元", "万", "亿", "人民币", "美元", "港币", "英镑"],
            "Time": ["年", "月", "日", "时", "分", "今天", "昨天", "明天", "上周", "上月"],
        }
        
        self.relation_types = {
            "签订合同": ["签订", "签署", "订立", "达成协议"],
            "支付款项": ["支付", "付款", "转账", "汇款", "还款"],
            "违约行为": ["违约", "逾期", "未按时", "拒绝"],
            "造成损害": ["造成", "导致", "致使", "损害", "伤害"],
            "承担责任": ["承担", "负责", "赔偿", "补偿"],
        }

    def _try_import_hanlp(self):
        try:
            import hanlp
            self._hanlp = hanlp
            self._hanlp_available = True
            self._tok = hanlp.load(hanlp.pretrained.tok.COARSE_ELECTRA_SMALL_ZH)
            self._ner = hanlp.load(hanlp.pretrained.ner.MSRA_NER_ELECTRA_SMALL_ZH)
            self._dep = hanlp.load(hanlp.pretrained.dep.PTB_BIAFFINE_DEP_ZH)
        except ImportError:
            self._hanlp_available = False
            print("HanLP not installed, using fallback NLP methods")

    def analyze_case(self, text: str) -> Dict:
        entities = self.extract_entities(text)
        relations = self.extract_relations(text, entities)
        case_type = self.classify_case_type(text)
        legal_articles = self.match_legal_articles(text, case_type)
        
        return {
            "entities": entities,
            "relations": relations,
            "case_type": case_type,
            "legal_articles": legal_articles
        }

    def extract_entities(self, text: str) -> List[Dict]:
        entities = []
        
        if self._hanlp_available:
            try:
                tok_result = self._tok(text)
                ner_result = self._ner(tok_result)
                
                current_entity = None
                current_type = None
                start_pos = 0
                
                for i, (token, ner_tag) in enumerate(zip(tok_result, ner_result)):
                    if ner_tag.startswith("B-"):
                        if current_entity:
                            entities.append({
                                "text": current_entity,
                                "type": current_type,
                                "start_pos": start_pos,
                                "end_pos": start_pos + len(current_entity)
                            })
                        current_entity = token
                        current_type = ner_tag[2:]
                        start_pos = text.find(token, start_pos if start_pos > 0 else 0)
                    elif ner_tag.startswith("I-") and current_entity:
                        current_entity += token
                    elif ner_tag == "O" and current_entity:
                        entities.append({
                            "text": current_entity,
                            "type": current_type,
                            "start_pos": start_pos,
                            "end_pos": start_pos + len(current_entity)
                        })
                        current_entity = None
                        current_type = None
                
                if current_entity:
                    entities.append({
                        "text": current_entity,
                        "type": current_type,
                        "start_pos": start_pos,
                        "end_pos": start_pos + len(current_entity)
                    })
            except Exception as e:
                print(f"HanLP NER error: {e}")
                entities = self._fallback_entity_extraction(text)
        else:
            entities = self._fallback_entity_extraction(text)
        
        return entities

    def _fallback_entity_extraction(self, text: str) -> List[Dict]:
        entities = []
        
        money_pattern = r'\d+(?:\.\d+)?\s*(?:元|万|亿|万元|亿元|人民币|美元|港币)'
        for match in re.finditer(money_pattern, text):
            entities.append({
                "text": match.group(),
                "type": "Money",
                "start_pos": match.start(),
                "end_pos": match.end()
            })
        
        date_pattern = r'\d{4}年\d{1,2}月\d{1,2}日|\d{1,2}月\d{1,2}日'
        for match in re.finditer(date_pattern, text):
            entities.append({
                "text": match.group(),
                "type": "Time",
                "start_pos": match.start(),
                "end_pos": match.end()
            })
        
        for entity_type, keywords in self.entity_types.items():
            for keyword in keywords:
                for match in re.finditer(re.escape(keyword), text):
                    if not any(e["start_pos"] <= match.start() < e["end_pos"] for e in entities):
                        context = text[max(0, match.start() - 10):min(len(text), match.end() + 10)]
                        entities.append({
                            "text": context.strip(),
                            "type": entity_type,
                            "start_pos": max(0, match.start() - 10),
                            "end_pos": min(len(text), match.end() + 10)
                        })
        
        return entities

    def extract_relations(self, text: str, entities: List[Dict]) -> List[Dict]:
        relations = []
        
        if self._hanlp_available:
            try:
                tok_result = self._tok(text)
                dep_result = self._dep(tok_result)
                
                for i, (token, dep) in enumerate(zip(tok_result, dep_result)):
                    head_idx = dep[0] - 1
                    rel = dep[1]
                    
                    if rel in ["nsubj", "dobj", "iobj", "conj", "ccomp"]:
                        if head_idx >= 0 and head_idx < len(tok_result):
                            head_token = tok_result[head_idx]
                            for rel_type, keywords in self.relation_types.items():
                                if any(kw in token or kw in head_token for kw in keywords):
                                    relations.append({
                                        "relation_type": rel_type,
                                        "subject": head_token,
                                        "object": token,
                                        "sentence": text
                                    })
            except Exception as e:
                print(f"HanLP dependency parsing error: {e}")
                relations = self._fallback_relation_extraction(text, entities)
        else:
            relations = self._fallback_relation_extraction(text, entities)
        
        return relations

    def _fallback_relation_extraction(self, text: str, entities: List[Dict]) -> List[Dict]:
        relations = []
        sentences = re.split(r'[。！？；]', text)
        
        for sentence in sentences:
            if not sentence.strip():
                continue
            
            for rel_type, keywords in self.relation_types.items():
                for keyword in keywords:
                    if keyword in sentence:
                        person_entities = [e for e in entities if e["type"] in ["Person", "Organization"]]
                        if len(person_entities) >= 2:
                            relations.append({
                                "relation_type": rel_type,
                                "subject": person_entities[0]["text"] if person_entities else "",
                                "object": person_entities[1]["text"] if len(person_entities) > 1 else "",
                                "sentence": sentence.strip()
                            })
                        elif len(person_entities) == 1:
                            relations.append({
                                "relation_type": rel_type,
                                "subject": person_entities[0]["text"],
                                "object": "另一方",
                                "sentence": sentence.strip()
                            })
        
        return relations

    def classify_case_type(self, text: str) -> str:
        scores = {}
        
        for case_type, keywords in self.legal_keywords.items():
            score = 0
            for keyword in keywords:
                count = text.count(keyword)
                if count > 0:
                    score += count * len(keyword)
            if score > 0:
                scores[case_type] = score
        
        if scores:
            return max(scores, key=scores.get)
        
        return "其他纠纷"

    def match_legal_articles(self, text: str, case_type: str) -> List[Dict]:
        legal_articles = []
        
        legal_database = {
            "合同纠纷": [
                {
                    "article_name": "《民法典》第五百零九条",
                    "article_content": "当事人应当按照约定全面履行自己的义务。",
                    "law_type": "民法典",
                    "relevance": 0.9
                },
                {
                    "article_name": "《民法典》第五百七十七条",
                    "article_content": "当事人一方不履行合同义务或者履行合同义务不符合约定的，应当承担继续履行、采取补救措施或者赔偿损失等违约责任。",
                    "law_type": "民法典",
                    "relevance": 0.85
                },
                {
                    "article_name": "《民法典》第五百八十五条",
                    "article_content": "当事人可以约定一方违约时应当根据违约情况向对方支付一定数额的违约金，也可以约定因违约产生的损失赔偿额的计算方法。",
                    "law_type": "民法典",
                    "relevance": 0.8
                }
            ],
            "劳动争议": [
                {
                    "article_name": "《劳动合同法》第三十条",
                    "article_content": "用人单位应当按照劳动合同约定和国家规定，向劳动者及时足额支付劳动报酬。",
                    "law_type": "劳动合同法",
                    "relevance": 0.9
                },
                {
                    "article_name": "《劳动合同法》第四十六条",
                    "article_content": "有下列情形之一的，用人单位应当向劳动者支付经济补偿：（一）劳动者依照本法第三十八条规定解除劳动合同的；（二）用人单位依照本法第三十六条规定向劳动者提出解除劳动合同并与劳动者协商一致解除劳动合同的；",
                    "law_type": "劳动合同法",
                    "relevance": 0.85
                },
                {
                    "article_name": "《劳动合同法》第八十七条",
                    "article_content": "用人单位违反本法规定解除或者终止劳动合同的，应当依照本法第四十七条规定的经济补偿标准的二倍向劳动者支付赔偿金。",
                    "law_type": "劳动合同法",
                    "relevance": 0.8
                }
            ],
            "交通事故": [
                {
                    "article_name": "《道路交通安全法》第七十六条",
                    "article_content": "机动车发生交通事故造成人身伤亡、财产损失的，由保险公司在机动车第三者责任强制保险责任限额范围内予以赔偿；不足的部分，按照下列规定承担赔偿责任：",
                    "law_type": "道路交通安全法",
                    "relevance": 0.9
                },
                {
                    "article_name": "《民法典》第一千一百七十九条",
                    "article_content": "侵害他人造成人身损害的，应当赔偿医疗费、护理费、交通费、营养费、住院伙食补助费等为治疗和康复支出的合理费用，以及因误工减少的收入。",
                    "law_type": "民法典",
                    "relevance": 0.85
                }
            ],
            "民间借贷": [
                {
                    "article_name": "《民法典》第六百六十七条",
                    "article_content": "借款合同是借款人向贷款人借款，到期返还借款并支付利息的合同。",
                    "law_type": "民法典",
                    "relevance": 0.9
                },
                {
                    "article_name": "《最高人民法院关于审理民间借贷案件适用法律若干问题的规定》第二十五条",
                    "article_content": "出借人请求借款人按照合同约定利率支付利息的，人民法院应予支持，但是双方约定的利率超过合同成立时一年期贷款市场报价利率四倍的除外。",
                    "law_type": "司法解释",
                    "relevance": 0.85
                }
            ],
            "婚姻家庭": [
                {
                    "article_name": "《民法典》第一千零七十九条",
                    "article_content": "夫妻一方要求离婚的，可以由有关组织进行调解或者直接向人民法院提起离婚诉讼。人民法院审理离婚案件，应当进行调解；如果感情确已破裂，调解无效的，应当准予离婚。",
                    "law_type": "民法典",
                    "relevance": 0.9
                },
                {
                    "article_name": "《民法典》第一千零八十四条",
                    "article_content": "父母与子女间的关系，不因父母离婚而消除。离婚后，子女无论由父或者母直接抚养，仍是父母双方的子女。离婚后，父母对于子女仍有抚养、教育、保护的权利和义务。",
                    "law_type": "民法典",
                    "relevance": 0.85
                },
                {
                    "article_name": "《民法典》第一千零八十七条",
                    "article_content": "离婚时，夫妻的共同财产由双方协议处理；协议不成的，由人民法院根据财产的具体情况，按照照顾子女、女方和无过错方权益的原则判决。",
                    "law_type": "民法典",
                    "relevance": 0.8
                }
            ],
            "侵权责任": [
                {
                    "article_name": "《民法典》第一千一百六十五条",
                    "article_content": "行为人因过错侵害他人民事权益造成损害的，应当承担侵权责任。依照法律规定推定行为人有过错，其不能证明自己没有过错的，应当承担侵权责任。",
                    "law_type": "民法典",
                    "relevance": 0.9
                },
                {
                    "article_name": "《民法典》第一千一百八十四条",
                    "article_content": "侵害他人财产的，财产损失按照损失发生时的市场价格或者其他合理方式计算。",
                    "law_type": "民法典",
                    "relevance": 0.85
                }
            ],
            "房产纠纷": [
                {
                    "article_name": "《民法典》第二百零九条",
                    "article_content": "不动产物权的设立、变更、转让和消灭，经依法登记，发生效力；未经登记，不发生效力，但是法律另有规定的除外。",
                    "law_type": "民法典",
                    "relevance": 0.9
                },
                {
                    "article_name": "《民法典》第五百九十五条",
                    "article_content": "买卖合同是出卖人转移标的物的所有权于买受人，买受人支付价款的合同。",
                    "law_type": "民法典",
                    "relevance": 0.85
                }
            ]
        }
        
        if case_type in legal_database:
            legal_articles = legal_database[case_type]
        else:
            legal_articles = [
                {
                    "article_name": "《民法典》第一百七十六条",
                    "article_content": "民事主体依照法律规定或者按照当事人约定，履行民事义务，承担民事责任。",
                    "law_type": "民法典",
                    "relevance": 0.7
                }
            ]
        
        return legal_articles


nlp_service = NLPService()
