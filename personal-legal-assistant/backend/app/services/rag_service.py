from typing import List, Dict, Optional, Any
import numpy as np
from pathlib import Path
import json


class RAGService:
    def __init__(self, index_path: Optional[Path] = None, dimension: int = 384):
        from ..config import settings
        
        self.index_path = index_path or settings.FAISS_INDEX_PATH
        self.dimension = dimension or settings.EMBEDDING_DIMENSION
        self._model = None
        self._faiss_index = None
        self._case_database = None
        self._init_components()

    def _init_components(self):
        try:
            from sentence_transformers import SentenceTransformer
            self._model = SentenceTransformer('all-MiniLM-L6-v2')
        except ImportError:
            print("sentence-transformers not installed, using fallback embedding method")
            self._model = None
        
        try:
            import faiss
            self._faiss_available = True
            self._faiss = faiss
            if self.index_path.exists():
                self._faiss_index = faiss.read_index(str(self.index_path))
            else:
                self._faiss_index = faiss.IndexFlatL2(self.dimension)
        except ImportError:
            print("faiss not installed, using fallback similarity method")
            self._faiss_available = False
            self._faiss_index = None
        
        self._init_case_database()

    def _init_case_database(self):
        self._case_database = [
            {
                "id": 1,
                "title": "张三诉李四民间借贷纠纷案",
                "description": "张三于2023年1月15日借款给李四人民币10万元，约定月利率1.5%，借款期限6个月。借款到期后，李四未偿还借款本息，张三多次催讨未果。",
                "case_type": "民间借贷",
                "court": "北京市朝阳区人民法院",
                "judgment_date": "2023-10-15",
                "keywords": ["民间借贷", "借款合同", "利息", "逾期还款"],
                "legal_articles": ["《民法典》第六百六十七条", "《民法典》第六百七十六条", "《最高人民法院关于审理民间借贷案件适用法律若干问题的规定》第二十五条"],
                "outcome": "法院判决李四偿还张三借款本金10万元及利息（以10万元为基数，自2023年1月15日起至实际清偿之日止，按年利率15.4%计算）。"
            },
            {
                "id": 2,
                "title": "王某诉某公司劳动合同纠纷案",
                "description": "王某于2021年3月入职某公司，担任销售经理职务，月工资15000元。2023年5月，公司以王某业绩不达标为由辞退王某，但未支付经济补偿金。",
                "case_type": "劳动争议",
                "court": "上海市浦东新区人民法院",
                "judgment_date": "2023-12-20",
                "keywords": ["劳动合同", "违法解除", "经济补偿", "赔偿金"],
                "legal_articles": ["《劳动合同法》第四十七条", "《劳动合同法》第八十七条", "《劳动合同法》第四十八条"],
                "outcome": "法院认定公司违法解除劳动合同，判决公司支付王某违法解除劳动合同赔偿金75000元（5个月工资×2）。"
            },
            {
                "id": 3,
                "title": "李某诉张某交通事故损害赔偿案",
                "description": "2023年8月10日，张某驾驶机动车在北京市海淀区某路口与李某发生交通事故，造成李某受伤。经交通管理部门认定，张某负事故全部责任。李某因此支付医疗费5万元，误工损失3万元。",
                "case_type": "交通事故",
                "court": "北京市海淀区人民法院",
                "judgment_date": "2024-01-08",
                "keywords": ["交通事故", "损害赔偿", "医疗费", "误工费", "交强险"],
                "legal_articles": ["《民法典》第一千一百七十九条", "《道路交通安全法》第七十六条", "《民法典》第一千二百一十三条"],
                "outcome": "法院判决保险公司在交强险限额内赔偿李某12万元，张某赔偿剩余损失5000元。"
            },
            {
                "id": 4,
                "title": "陈某诉刘某房屋买卖合同纠纷案",
                "description": "陈某与刘某于2023年3月签订房屋买卖合同，约定陈某以300万元购买刘某位于北京市西城区的一套房屋。陈某支付了定金30万元后，刘某反悔拒绝出售房屋。",
                "case_type": "房产纠纷",
                "court": "北京市西城区人民法院",
                "judgment_date": "2023-11-30",
                "keywords": ["房屋买卖", "定金", "违约", "双倍返还"],
                "legal_articles": ["《民法典》第五百八十七条", "《民法典》第五百七十七条", "《民法典》第五百八十四条"],
                "outcome": "法院判决刘某双倍返还陈某定金60万元，并赔偿陈某因房屋涨价造成的损失50万元。"
            },
            {
                "id": 5,
                "title": "赵某诉钱某离婚纠纷案",
                "description": "赵某与钱某于2018年登记结婚，婚后育有一子。2023年，双方因感情不和分居满一年。赵某提起离婚诉讼，要求取得孩子抚养权，并分割夫妻共同财产。",
                "case_type": "婚姻家庭",
                "court": "广东省深圳市南山区人民法院",
                "judgment_date": "2024-02-15",
                "keywords": ["离婚", "抚养权", "财产分割", "分居"],
                "legal_articles": ["《民法典》第一千零七十九条", "《民法典》第一千零八十四条", "《民法典》第一千零八十七条"],
                "outcome": "法院判决准予离婚，孩子由赵某抚养，钱某每月支付抚养费3000元，夫妻共同财产平均分割。"
            },
            {
                "id": 6,
                "title": "孙某诉某商场侵权责任纠纷案",
                "description": "2023年6月，孙某在某商场购物时，因商场地面湿滑摔倒，造成左腿骨折。孙某认为商场未尽到安全保障义务，要求商场赔偿医疗费、误工费等损失。",
                "case_type": "侵权责任",
                "court": "江苏省南京市鼓楼区人民法院",
                "judgment_date": "2023-12-05",
                "keywords": ["安全保障义务", "侵权责任", "人身损害", "赔偿"],
                "legal_articles": ["《民法典》第一千一百九十八条", "《民法典》第一千一百七十九条", "《民法典》第一千一百八十四条"],
                "outcome": "法院认定商场未尽到安全保障义务，判决商场赔偿孙某各项损失共计12万元。"
            },
            {
                "id": 7,
                "title": "周某诉吴某合同纠纷案",
                "description": "周某与吴某签订装修合同，约定吴某为周某装修房屋，工期3个月，总价款15万元。吴某逾期2个月完工，且装修质量存在多处问题。周某要求吴某承担违约责任。",
                "case_type": "合同纠纷",
                "court": "浙江省杭州市西湖区人民法院",
                "judgment_date": "2024-01-20",
                "keywords": ["装修合同", "逾期完工", "质量问题", "违约责任"],
                "legal_articles": ["《民法典》第五百零九条", "《民法典》第五百七十七条", "《民法典》第五百八十二条"],
                "outcome": "法院判决吴某支付逾期违约金3万元，并对质量问题进行返工修复。"
            }
        ]
        
        if self._faiss_available and self._model is not None:
            self._build_index()

    def _build_index(self):
        if self._faiss_index is None or self._model is None:
            return
        
        texts = [
            f"{case['title']} {case['description']} {' '.join(case['keywords'])}" 
            for case in self._case_database
        ]
        
        embeddings = self._model.encode(texts, convert_to_numpy=True)
        
        if self._faiss_index.ntotal > 0:
            self._faiss_index = self._faiss.IndexFlatL2(self.dimension)
        
        self._faiss_index.add(embeddings)
        
        self._faiss.write_index(self._faiss_index, str(self.index_path))
        print(f"FAISS index built with {self._faiss_index.ntotal} cases")

    def _embed_text(self, text: str) -> np.ndarray:
        if self._model is not None:
            return self._model.encode([text], convert_to_numpy=True)[0]
        
        words = text.replace("，", " ").replace("。", " ").replace("；", " ").split()
        word_to_idx = {word: idx for idx, word in enumerate(set(words))}
        vec = np.zeros(self.dimension, dtype=np.float32)
        for word in words:
            idx = hash(word) % self.dimension
            vec[idx] += 1
        
        norm = np.linalg.norm(vec)
        if norm > 0:
            vec = vec / norm
        return vec

    def _compute_similarity(self, vec1: np.ndarray, vec2: np.ndarray) -> float:
        dot_product = np.dot(vec1, vec2)
        norm1 = np.linalg.norm(vec1)
        norm2 = np.linalg.norm(vec2)
        if norm1 == 0 or norm2 == 0:
            return 0.0
        return float(dot_product / (norm1 * norm2))

    def _keyword_match_score(self, query: str, case: Dict[str, Any]) -> float:
        query_keywords = set(query.replace("，", " ").replace("。", " ").replace("；", " ").split())
        case_keywords = set(case.get("keywords", []))
        case_title_words = set(case.get("title", "").replace("，", " ").replace("。", " ").split())
        case_desc_words = set(case.get("description", "").replace("，", " ").replace("。", " ").split())
        
        all_case_words = case_keywords.union(case_title_words).union(case_desc_words)
        
        if not query_keywords:
            return 0.5
        
        intersection = query_keywords.intersection(all_case_words)
        return len(intersection) / len(query_keywords)

    def search_similar_cases(self, query: str, top_k: int = 5) -> List[Dict[str, Any]]:
        results = []
        
        if self._faiss_available and self._faiss_index is not None and self._faiss_index.ntotal > 0:
            query_embedding = self._embed_text(query).reshape(1, -1)
            distances, indices = self._faiss_index.search(query_embedding, min(top_k, self._faiss_index.ntotal))
            
            for i, idx in enumerate(indices[0]):
                if idx < len(self._case_database):
                    case = self._case_database[idx].copy()
                    similarity = 1.0 - float(distances[0][i]) / 2.0
                    case["similarity_score"] = max(0.0, min(1.0, similarity))
                    case["source"] = "faiss_vector_search"
                    results.append(case)
        else:
            query_embedding = self._embed_text(query)
            
            for case in self._case_database:
                case_text = f"{case['title']} {case['description']} {' '.join(case['keywords'])}"
                case_embedding = self._embed_text(case_text)
                
                vector_similarity = self._compute_similarity(query_embedding, case_embedding)
                keyword_score = self._keyword_match_score(query, case)
                
                combined_score = vector_similarity * 0.5 + keyword_score * 0.5
                
                case_result = case.copy()
                case_result["similarity_score"] = combined_score
                case_result["source"] = "hybrid_search"
                results.append(case_result)
            
            results.sort(key=lambda x: x["similarity_score"], reverse=True)
            results = results[:top_k]
        
        return results

    def add_case_to_index(self, case_data: Dict[str, Any]) -> bool:
        if not all(key in case_data for key in ["title", "description", "case_type"]):
            return False
        
        new_id = max([c["id"] for c in self._case_database], default=0) + 1
        
        new_case = {
            "id": new_id,
            "title": case_data["title"],
            "description": case_data["description"],
            "case_type": case_data.get("case_type", "其他纠纷"),
            "court": case_data.get("court", "未知法院"),
            "judgment_date": case_data.get("judgment_date", ""),
            "keywords": case_data.get("keywords", []),
            "legal_articles": case_data.get("legal_articles", []),
            "outcome": case_data.get("outcome", "")
        }
        
        self._case_database.append(new_case)
        
        if self._faiss_available and self._model is not None:
            case_text = f"{new_case['title']} {new_case['description']} {' '.join(new_case['keywords'])}"
            embedding = self._model.encode([case_text], convert_to_numpy=True)
            
            if self._faiss_index is None:
                self._faiss_index = self._faiss.IndexFlatL2(self.dimension)
            
            self._faiss_index.add(embedding)
            self._faiss.write_index(self._faiss_index, str(self.index_path))
        
        return True

    def get_all_cases(self) -> List[Dict[str, Any]]:
        return self._case_database.copy()

    def get_case_by_id(self, case_id: int) -> Optional[Dict[str, Any]]:
        for case in self._case_database:
            if case["id"] == case_id:
                return case.copy()
        return None

    def search_legal_articles(self, query: str) -> List[Dict[str, Any]]:
        legal_database = {
            "民间借贷": [
                {
                    "article_name": "《民法典》第六百六十七条",
                    "article_content": "借款合同是借款人向贷款人借款，到期返还借款并支付利息的合同。",
                    "law_type": "民法典",
                    "relevance": 0.9
                },
                {
                    "article_name": "《民法典》第六百七十六条",
                    "article_content": "借款人未按照约定的期限返还借款的，应当按照约定或者国家有关规定支付逾期利息。",
                    "law_type": "民法典",
                    "relevance": 0.85
                },
                {
                    "article_name": "《最高人民法院关于审理民间借贷案件适用法律若干问题的规定》第二十五条",
                    "article_content": "出借人请求借款人按照合同约定利率支付利息的，人民法院应予支持，但是双方约定的利率超过合同成立时一年期贷款市场报价利率四倍的除外。",
                    "law_type": "司法解释",
                    "relevance": 0.85
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
                    "article_name": "《劳动合同法》第四十七条",
                    "article_content": "经济补偿按劳动者在本单位工作的年限，每满一年支付一个月工资的标准向劳动者支付。六个月以上不满一年的，按一年计算；不满六个月的，向劳动者支付半个月工资的经济补偿。",
                    "law_type": "劳动合同法",
                    "relevance": 0.85
                },
                {
                    "article_name": "《劳动合同法》第八十七条",
                    "article_content": "用人单位违反本法规定解除或者终止劳动合同的，应当依照本法第四十七条规定的经济补偿标准的二倍向劳动者支付赔偿金。",
                    "law_type": "劳动合同法",
                    "relevance": 0.85
                }
            ],
            "交通事故": [
                {
                    "article_name": "《民法典》第一千一百七十九条",
                    "article_content": "侵害他人造成人身损害的，应当赔偿医疗费、护理费、交通费、营养费、住院伙食补助费等为治疗和康复支出的合理费用，以及因误工减少的收入。",
                    "law_type": "民法典",
                    "relevance": 0.9
                },
                {
                    "article_name": "《道路交通安全法》第七十六条",
                    "article_content": "机动车发生交通事故造成人身伤亡、财产损失的，由保险公司在机动车第三者责任强制保险责任限额范围内予以赔偿；不足的部分，按照下列规定承担赔偿责任：",
                    "law_type": "道路交通安全法",
                    "relevance": 0.85
                }
            ],
            "离婚": [
                {
                    "article_name": "《民法典》第一千零七十九条",
                    "article_content": "夫妻一方要求离婚的，可以由有关组织进行调解或者直接向人民法院提起离婚诉讼。人民法院审理离婚案件，应当进行调解；如果感情确已破裂，调解无效的，应当准予离婚。",
                    "law_type": "民法典",
                    "relevance": 0.9
                },
                {
                    "article_name": "《民法典》第一千零八十四条",
                    "article_content": "父母与子女间的关系，不因父母离婚而消除。离婚后，子女无论由父或者母直接抚养，仍是父母双方的子女。",
                    "law_type": "民法典",
                    "relevance": 0.85
                },
                {
                    "article_name": "《民法典》第一千零八十七条",
                    "article_content": "离婚时，夫妻的共同财产由双方协议处理；协议不成的，由人民法院根据财产的具体情况，按照照顾子女、女方和无过错方权益的原则判决。",
                    "law_type": "民法典",
                    "relevance": 0.85
                }
            ],
            "合同": [
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
                }
            ],
            "侵权": [
                {
                    "article_name": "《民法典》第一千一百六十五条",
                    "article_content": "行为人因过错侵害他人民事权益造成损害的，应当承担侵权责任。",
                    "law_type": "民法典",
                    "relevance": 0.9
                },
                {
                    "article_name": "《民法典》第一千一百九十八条",
                    "article_content": "宾馆、商场、银行、车站、机场、体育场馆、娱乐场所等经营场所、公共场所的经营者、管理者或者群众性活动的组织者，未尽到安全保障义务，造成他人损害的，应当承担侵权责任。",
                    "law_type": "民法典",
                    "relevance": 0.85
                }
            ]
        }
        
        keywords = {
            "民间借贷": ["借款", "贷款", "借条", "欠条", "利息", "还款", "本金", "债权人", "债务人"],
            "劳动争议": ["工资", "加班", "劳动合同", "辞退", "离职", "社保", "补偿", "赔偿金"],
            "交通事故": ["车祸", "肇事", "保险", "赔偿", "伤残", "责任", "事故", "车辆", "交警"],
            "离婚": ["离婚", "抚养", "赡养", "财产", "继承", "分割", "抚养权", "探视"],
            "合同": ["合同", "协议", "违约", "解除", "履行", "支付", "违约金", "定金"],
            "侵权": ["侵权", "损害", "赔偿", "名誉", "隐私", "肖像", "知识产权", "安全保障"]
        }
        
        matched_categories = set()
        for category, kws in keywords.items():
            for kw in kws:
                if kw in query:
                    matched_categories.add(category)
                    break
        
        results = []
        for category in matched_categories:
            if category in legal_database:
                results.extend(legal_database[category])
        
        if not results:
            results = [
                {
                    "article_name": "《民法典》第一百七十六条",
                    "article_content": "民事主体依照法律规定或者按照当事人约定，履行民事义务，承担民事责任。",
                    "law_type": "民法典",
                    "relevance": 0.7
                }
            ]
        
        return results


rag_service = RAGService()
