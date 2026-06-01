import re
import random
import pandas as pd
from typing import Dict, List, Tuple, Optional
from dataclasses import dataclass


@dataclass
class OCRResult:
    region: str
    text: str
    confidence: float
    correction_note: Optional[str] = None


class OCRSimulator:
    def __init__(self):
        self.homophone_map = {
            '京': '惊',
            '户': '护',
            '房': '方',
            '硕': '朔',
            '士': '土',
            '本': '笨',
            '科': '棵',
            '博': '薄'
        }
        
        self.shape_similar_map = {
            '京': '凉',
            '户': '尸',
            '房': '屋',
            '硕': '顾',
            '士': '土',
            '本': '木',
            '科': '料',
            '有': '友'
        }
        
        self.card_regions = [
            ('个人信息区', 0.95),
            ('学历信息区', 0.90),
            ('户籍房产区', 0.85),
            ('择偶要求区', 0.80),
            ('联系方式区', 0.70)
        ]
    
    def inject_error(self, text: str, error_rate: float = 0.05) -> Tuple[str, Optional[str]]:
        if random.random() > error_rate:
            return text, None
        
        chars = list(text)
        if not chars:
            return text, None
        
        error_pos = random.randint(0, len(chars) - 1)
        original_char = chars[error_pos]
        
        error_type = random.choice(['homophone', 'shape', 'missing'])
        correction_note = None
        
        if error_type == 'homophone' and original_char in self.homophone_map:
            chars[error_pos] = self.homophone_map[original_char]
            correction_note = f"同音字错误: '{original_char}' -> '{chars[error_pos]}'"
        elif error_type == 'shape' and original_char in self.shape_similar_map:
            chars[error_pos] = self.shape_similar_map[original_char]
            correction_note = f"形近字错误: '{original_char}' -> '{chars[error_pos]}'"
        elif error_type == 'missing':
            del chars[error_pos]
            correction_note = f"缺字错误: 缺失'{original_char}'"
        
        return ''.join(chars), correction_note
    
    def simulate_multi_region_ocr(self, content: str) -> List[OCRResult]:
        results = []
        
        for region_name, base_confidence in self.card_regions:
            region_text = self._extract_region_text(content, region_name)
            
            if region_text:
                error_rate = 0.15 * (1 - base_confidence)
                ocr_text, correction = self.inject_error(region_text, error_rate)
                
                final_confidence = base_confidence * random.uniform(0.8, 1.0)
                
                results.append(OCRResult(
                    region=region_name,
                    text=ocr_text,
                    confidence=round(final_confidence, 2),
                    correction_note=correction
                ))
        
        return results
    
    def _extract_region_text(self, content: str, region_name: str) -> str:
        if '信息' in region_name:
            match = re.search(r'[男女].*?\d+岁.*?\d+cm.*?(本科|硕士|博士|大专)', content)
            return match.group(0) if match else content[:30]
        elif '户籍' in region_name:
            if '京户' in content:
                return '京户'
            elif '户口' in content:
                return '有户口'
            return ''
        elif '房产' in region_name:
            if '有房' in content:
                return '有房'
            return ''
        elif '要求' in region_name:
            match = re.search(r'要求.*', content)
            return match.group(0) if match else ''
        elif '联系方式' in region_name:
            return ''
        
        return content[:20]
    
    def get_overall_confidence(self, ocr_results: List[OCRResult]) -> float:
        if not ocr_results:
            return 0.0
        confidences = [r.confidence for r in ocr_results]
        return round(sum(confidences) / len(confidences), 2)


class CardParser:
    def __init__(self, enable_ocr_simulation: bool = True):
        self.hukou_patterns = ['京户', '北京户口', '上海户口', '深户', '深圳户口', '广州户口', '杭州户口', '成都户口', '户口']
        self.house_patterns = ['有房', '房产', '房子']
        self.education_patterns = ['博士', '硕士', '本科', '大专', '高中']
        self.ocr_simulator = OCRSimulator() if enable_ocr_simulation else None
        self.enable_ocr_simulation = enable_ocr_simulation
        
        self.fault_tolerance_map = {
            '京户': ['惊户', '京护', '惊护', '凉户', '京尸'],
            '有房': ['友房', '有方', '友方', '屋房'],
            '硕士': ['朔士', '硕土', '顾士', '顾土'],
            '博士': ['薄士', '博土', '薄土'],
            '本科': ['笨科', '木科', '棵科', '料科']
        }
    
    def _fuzzy_match(self, text: str, patterns: List[str]) -> List[str]:
        matched = []
        
        for pattern in patterns:
            if pattern in text:
                matched.append(pattern)
                continue
            
            if pattern in self.fault_tolerance_map:
                for error_variant in self.fault_tolerance_map[pattern]:
                    if error_variant in text:
                        matched.append(pattern)
                        break
        
        return matched
    
    def parse_card(self, content: str) -> Dict[str, List[str]]:
        result = {
            'hukou': [],
            'house': [],
            'education': []
        }
        
        processed_content = content
        correction_notes = []
        
        if self.enable_ocr_simulation and self.ocr_simulator:
            ocr_results = self.ocr_simulator.simulate_multi_region_ocr(content)
            processed_content = ' '.join([r.text for r in ocr_results])
            correction_notes = [r.correction_note for r in ocr_results if r.correction_note]
        
        result['hukou'] = self._fuzzy_match(processed_content, self.hukou_patterns)
        result['house'] = self._fuzzy_match(processed_content, self.house_patterns)
        result['education'] = self._fuzzy_match(processed_content, self.education_patterns)
        result['correction_notes'] = correction_notes
        
        return result
    
    def parse_csv(self, csv_path: str) -> pd.DataFrame:
        df = pd.read_csv(csv_path)
        
        parsed_data = []
        for _, row in df.iterrows():
            parsed = self.parse_card(row['content'])
            
            ocr_confidence = 0.95
            ocr_notes = ''
            if self.enable_ocr_simulation and self.ocr_simulator:
                ocr_results = self.ocr_simulator.simulate_multi_region_ocr(row['content'])
                ocr_confidence = self.ocr_simulator.get_overall_confidence(ocr_results)
                ocr_notes = '; '.join([r.correction_note for r in ocr_results if r.correction_note])
            
            parsed_data.append({
                'id': row['id'],
                'city': row['city'],
                'content': row['content'],
                'has_hukou': len(parsed['hukou']) > 0,
                'hukou_keywords': ','.join(parsed['hukou']),
                'has_house': len(parsed['house']) > 0,
                'house_keywords': ','.join(parsed['house']),
                'has_education': len(parsed['education']) > 0,
                'education_keywords': ','.join(parsed['education']),
                'ocr_confidence': ocr_confidence,
                'ocr_corrections': ocr_notes
            })
        
        return pd.DataFrame(parsed_data)
    
    def extract_all_keywords(self, content: str) -> List[str]:
        keywords = []
        
        for pattern in self.hukou_patterns:
            if pattern in content:
                keywords.append(pattern)
        
        for pattern in self.house_patterns:
            if pattern in content:
                keywords.append(pattern)
        
        for pattern in self.education_patterns:
            if pattern in content:
                keywords.append(pattern)
        
        return keywords
    
    def get_ocr_details(self, content: str) -> Dict:
        if not self.enable_ocr_simulation or not self.ocr_simulator:
            return {}
        
        ocr_results = self.ocr_simulator.simulate_multi_region_ocr(content)
        return {
            'overall_confidence': self.ocr_simulator.get_overall_confidence(ocr_results),
            'regions': [
                {
                    'name': r.region,
                    'text': r.text,
                    'confidence': r.confidence,
                    'correction': r.correction_note
                }
                for r in ocr_results
            ]
        }
