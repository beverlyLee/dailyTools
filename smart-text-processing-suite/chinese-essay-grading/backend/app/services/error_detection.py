import re
import jieba
from typing import List, Dict, Any, Optional, Tuple
from abc import ABC, abstractmethod
from dataclasses import dataclass


@dataclass
class DetectedError:
    error_type: str
    original_text: str
    corrected_text: Optional[str] = None
    explanation: Optional[str] = None
    position_start: int = -1
    position_end: int = -1
    line_number: int = -1
    severity: str = "minor"
    confidence: float = 1.0


class BaseErrorDetector(ABC):
    
    @abstractmethod
    def detect(self, text: str) -> List[DetectedError]:
        pass


class CharacterErrorDetector(BaseErrorDetector):
    
    def __init__(self):
        self.common_mistakes = self._load_common_mistakes()
        self.similar_chars = self._load_similar_chars()
    
    def _load_common_mistakes(self) -> Dict[str, str]:
        return {
            '在': '再',
            '再': '在',
            '的': '得',
            '得': '的',
            '地': '的',
            '那': '哪',
            '哪': '那',
            '坐': '座',
            '座': '坐',
            '做': '作',
            '作': '做',
            '象': '像',
            '像': '象',
            '进': '近',
            '近': '进',
            '到': '道',
            '道': '到',
            '已': '己',
            '己': '已',
            '在': '载',
            '载': '在',
            '飘': '漂',
            '漂': '飘',
            '挺': '铤',
            '铤': '挺',
            '辨': '辩',
            '辩': '辨',
            '辫': '辨',
            '采': '彩',
            '彩': '采',
            '长': '常',
            '常': '长',
            '充': '冲',
            '冲': '充',
            '戴': '带',
            '带': '戴',
            '订': '定',
            '定': '订',
            '度': '渡',
            '渡': '度',
            '反': '返',
            '返': '反',
            '分': '份',
            '份': '分',
            '风': '丰',
            '丰': '风',
            '复': '覆',
            '覆': '复',
            '副': '幅',
            '幅': '副',
            '概': '慨',
            '慨': '概',
            '干': '甘',
            '甘': '干',
        }
    
    def _load_similar_chars(self) -> List[Tuple[str, str]]:
        return [
            ('己', '已', '巳'),
            ('戌', '戍', '戊'),
            ('辩', '辨', '辫'),
            ('载', '栽', '裁'),
            ('飘', '漂', '瓢'),
            ('挺', '铤', '蜓'),
        ]
    
    def detect(self, text: str) -> List[DetectedError]:
        errors = []
        
        errors.extend(self._detect_common_mistakes(text))
        errors.extend(self._detect_similar_char_usage(text))
        errors.extend(self._detect_punctuation_errors(text))
        
        return errors
    
    def _detect_common_mistakes(self, text: str) -> List[DetectedError]:
        errors = []
        
        for wrong, correct in self.common_mistakes.items():
            pattern = re.escape(wrong)
            for match in re.finditer(pattern, text):
                if self._is_valid_usage(text, match.start(), match.end(), wrong, correct):
                    continue
                
                errors.append(DetectedError(
                    error_type="错别字",
                    original_text=wrong,
                    corrected_text=correct,
                    explanation=f"此处应为「{correct}」，「{wrong}」与「{correct}」为常见易混淆字",
                    position_start=match.start(),
                    position_end=match.end(),
                    severity="minor",
                    confidence=0.7
                ))
        
        return errors
    
    def _is_valid_usage(self, text: str, start: int, end: int, char: str, correct: str) -> bool:
        if start > 0:
            prev_char = text[start - 1]
            if prev_char + char in ['现在', '在家', '正在', '再见', '再三', '再来']:
                if char == '在' and prev_char + char in ['现在', '在家', '正在']:
                    return True
                if char == '再' and prev_char + char in ['再见', '再三', '再来']:
                    return True
        
        if end < len(text):
            next_char = text[end]
            if char + next_char in ['的确', '目的', '得到', '跑得快', '美丽的']:
                return True
        
        return False
    
    def _detect_similar_char_usage(self, text: str) -> List[DetectedError]:
        errors = []
        return errors
    
    def _detect_punctuation_errors(self, text: str) -> List[DetectedError]:
        errors = []
        
        for match in re.finditer(r'([。，！？；：、])\1+', text):
            errors.append(DetectedError(
                error_type="标点符号",
                original_text=match.group(),
                corrected_text=match.group()[0],
                explanation=f"标点符号重复使用，应只保留一个「{match.group()[0]}」",
                position_start=match.start(),
                position_end=match.end(),
                severity="minor",
                confidence=0.9
            ))
        
        for match in re.finditer(r'([,;!?])', text):
            char = match.group()
            cn_punct = {',': '，', ';': '；', '!': '！', '?': '？'}
            if char in cn_punct:
                errors.append(DetectedError(
                    error_type="标点符号",
                    original_text=char,
                    corrected_text=cn_punct[char],
                    explanation=f"建议使用中文标点「{cn_punct[char]}」而非英文标点「{char}」",
                    position_start=match.start(),
                    position_end=match.end(),
                    severity="minor",
                    confidence=0.8
                ))
        
        return errors


class IdiomUsageDetector(BaseErrorDetector):
    
    def __init__(self):
        self.idiom_patterns = self._load_idiom_patterns()
        self.common_misused = self._load_common_misused_idioms()
    
    def _load_idiom_patterns(self) -> Dict[str, Dict]:
        return {
            "首当其冲": {
                "correct_meaning": "最先受到攻击或遭遇灾难",
                "wrong_usages": ["首先", "第一", "首要任务", "首要目标"],
                "confidence": 0.8
            },
            "汗牛充栋": {
                "correct_meaning": "形容藏书非常多",
                "wrong_contexts": ["人", "事物", "物品"],
                "confidence": 0.75
            },
            "豆蔻年华": {
                "correct_meaning": "指女子十三四岁的年纪",
                "wrong_usages": ["男子", "青年", "少年", "老年"],
                "confidence": 0.9
            },
            "美轮美奂": {
                "correct_meaning": "形容房屋高大美观",
                "wrong_usages": ["风景", "景色", "人", "服装"],
                "confidence": 0.7
            },
            "鬼斧神工": {
                "correct_meaning": "形容技艺精巧，非人力所能及",
                "wrong_usages": ["自然", "天然"],
                "confidence": 0.75
            },
            "相敬如宾": {
                "correct_meaning": "形容夫妻互相尊敬像对待宾客一样",
                "wrong_usages": ["朋友", "同事", "家人", "兄弟"],
                "confidence": 0.85
            },
            "破镜重圆": {
                "correct_meaning": "比喻夫妻失散或决裂后重新团聚",
                "wrong_usages": ["朋友", "兄弟", "团队"],
                "confidence": 0.85
            },
            "琴瑟之好": {
                "correct_meaning": "比喻夫妇感情非常好",
                "wrong_usages": ["朋友", "兄弟", "同事"],
                "confidence": 0.9
            },
            "炙手可热": {
                "correct_meaning": "比喻权势大，气焰盛（贬义）",
                "wrong_usages": ["热门", "受欢迎", "流行"],
                "confidence": 0.7
            },
            "万人空巷": {
                "correct_meaning": "形容庆祝、欢迎等盛况",
                "wrong_usages": ["冷清", "没人", "空荡"],
                "confidence": 0.7
            },
            "屡试不爽": {
                "correct_meaning": "屡次试验都没有差错",
                "wrong_usages": ["不高兴", "不爽快"],
                "confidence": 0.85
            },
            "不以为然": {
                "correct_meaning": "不认为是对的，表示不同意",
                "wrong_usages": ["不在意", "不放在心上"],
                "confidence": 0.8
            },
            "不以为意": {
                "correct_meaning": "不放在心上，表示不重视",
                "wrong_usages": ["不同意", "不对"],
                "confidence": 0.8
            },
            "不刊之论": {
                "correct_meaning": "比喻不能改动或不可磨灭的言论",
                "wrong_usages": ["不能刊登", "不能发表"],
                "confidence": 0.8
            },
            "不足为训": {
                "correct_meaning": "不值得作为遵循或仿效的法则",
                "wrong_usages": ["不值得教训", "不值得批评"],
                "confidence": 0.8
            },
        }
    
    def _load_common_misused_idioms(self) -> Dict[str, str]:
        return {
            "再接再励": "再接再厉",
            "走头无路": "走投无路",
            "迫不急待": "迫不及待",
            "阴谋鬼计": "阴谋诡计",
            "再接再励": "再接再厉",
            "按步就班": "按部就班",
            "变本加利": "变本加厉",
            "病入膏盲": "病入膏肓",
            "不可思义": "不可思议",
            "层峦迭嶂": "层峦叠嶂",
            "长年累月": "长年累月",
            "陈词烂调": "陈词滥调",
            "穿流不息": "川流不息",
            "惮精竭虑": "殚精竭虑",
            "独挡一面": "独当一面",
            "耳儒目染": "耳濡目染",
            "飞扬拔扈": "飞扬跋扈",
            "份内之事": "分内之事",
            "蜂涌而至": "蜂拥而至",
            "富丽堂煌": "富丽堂皇",
            "肝脑途地": "肝脑涂地",
            "感人肺腹": "感人肺腑",
            "膏梁子弟": "膏粱子弟",
            "功亏一匮": "功亏一篑",
            "鬼计多端": "诡计多端",
            "海角天崖": "海角天涯",
            "汗流夹背": "汗流浃背",
            "好高鹜远": "好高骛远",
            "轰堂大笑": "哄堂大笑",
            "怙恶不俊": "怙恶不悛",
            "涣然一新": "焕然一新",
            "荒涎不经": "荒诞不经",
            "昏昏噩噩": "浑浑噩噩",
            "混然一体": "浑然一体",
            "及及可危": "岌岌可危",
            "集液成裘": "集腋成裘",
            "既往不究": "既往不咎",
            "金壁辉煌": "金碧辉煌",
            "精兵减政": "精兵简政",
            "精心竭虑": "殚精竭虑",
            "居心叵侧": "居心叵测",
            "鞠躬尽粹": "鞠躬尽瘁",
            "开成布公": "开诚布公",
            "克敌致胜": "克敌制胜",
            "口密腹剑": "口蜜腹剑",
            "滥芋充数": "滥竽充数",
            "老奸巨滑": "老奸巨猾",
            "礼上往来": "礼尚往来",
            "励精图治": "励精图治",
            "厉精图治": "励精图治",
            "两全齐美": "两全其美",
            "流言非语": "流言蜚语",
            "龙盘虎据": "龙盘虎踞",
            "录录无为": "碌碌无为",
            "落英宾纷": "落英缤纷",
            "貌和神离": "貌合神离",
            "美玉无暇": "美玉无瑕",
            "明辩是非": "明辨是非",
            "名列前矛": "名列前茅",
            "明火执杖": "明火执仗",
            "名符其实": "名副其实",
            "莫忠一是": "莫衷一是",
            "牟取暴利": "牟取暴利",
            "目不遐接": "目不暇接",
            "入不付出": "入不敷出",
            "脑羞成怒": "恼羞成怒",
            "凤毛鳞角": "凤毛麟角",
            "篷荜生辉": "蓬荜生辉",
            "披星带月": "披星戴月",
            "披肝历胆": "披肝沥胆",
            "凭心而论": "平心而论",
            "破斧沉舟": "破釜沉舟",
            "迫不及待": "迫不及待",
            "气冲宵汉": "气冲霄汉",
            "恰如其份": "恰如其分",
            "巧夺天功": "巧夺天工",
            "磬竹难书": "罄竹难书",
            "屈意逢迎": "曲意逢迎",
            "曲指可数": "屈指可数",
            "人才倍出": "人才辈出",
            "人心向背": "人心向背",
            "融会贯通": "融会贯通",
            "世外桃园": "世外桃源",
            "事必恭亲": "事必躬亲",
            "拭目以待": "拭目以待",
            "首曲一指": "首屈一指",
            "授受不亲": "授受不亲",
            "书声朗朗": "书声琅琅",
            "水乳交融": "水乳交融",
            "水泻不通": "水泄不通",
            "烁石流金": "铄石流金",
            "素味平生": "素昧平生",
            "随声附合": "随声附和",
            "谈笑风声": "谈笑风生",
            "天翻地复": "天翻地覆",
            "天网灰灰": "天网恢恢",
            "挺而走险": "铤而走险",
            "通货膨涨": "通货膨胀",
            "通情达礼": "通情达理",
            "同等学历": "同等学力",
            "歪风斜气": "歪风邪气",
            "万古常青": "万古长青",
            "万冠齐喑": "万马齐喑",
            "望风披糜": "望风披靡",
            "无耻滥言": "无耻谰言",
            "无礼漫骂": "无理谩骂",
            "无庸置疑": "毋庸置疑",
            "五体头地": "五体投地",
            "息息相通": "息息相通",
            "喜笑怒骂": "嬉笑怒骂",
            "相得益章": "相得益彰",
            "消声匿迹": "销声匿迹",
            "心浮气燥": "心浮气躁",
            "形消骨立": "形销骨立",
            "修茸一新": "修葺一新",
            "虚座以待": "虚席以待",
            "渲宾夺主": "喧宾夺主",
            "烜赫一时": "烜赫一时",
            "循情枉法": "徇情枉法",
            "徇私舞弊": "徇私舞弊",
            "偃苗助长": "揠苗助长",
            "言简意骇": "言简意赅",
            "掩旗息鼓": "偃旗息鼓",
            "奄奄一息": "奄奄一息",
            "扬扬洒洒": "洋洋洒洒",
            "摇拽多姿": "摇曳多姿",
            "一笔钩销": "一笔勾销",
            "一脉相成": "一脉相承",
            "一愁莫展": "一筹莫展",
            "一视同人": "一视同仁",
            "一往直前": "一往直前",
            "一如继往": "一如既往",
            "一鼓作气": "一鼓作气",
            "一幅对联": "一副对联",
            "一诺千斤": "一诺千金",
            "有持无恐": "有恃无恐",
            "意气用事": "意气用事",
            "义气用事": "意气用事",
            "因才施教": "因材施教",
            "饮鸠止渴": "饮鸩止渴",
            "蝇营狗苟": "蝇营狗苟",
            "赢弱不堪": "羸弱不堪",
            "优柔寡断": "优柔寡断",
            "怨天忧人": "怨天尤人",
            "渊远流长": "源远流长",
            "再接再励": "再接再厉",
            "责无旁代": "责无旁贷",
            "仗义直言": "仗义执言",
            "张慌失措": "张皇失措",
            "真知卓见": "真知灼见",
            "振聋发馈": "振聋发聩",
            "震耳欲聋": "震耳欲聋",
            "蛛丝蚂迹": "蛛丝马迹",
            "置若惘闻": "置若罔闻",
            "中流坻柱": "中流砥柱",
            "众口烁金": "众口铄金",
            "纵横稗阖": "纵横捭阖",
            "走头无路": "走投无路",
            "左右逢源": "左右逢源",
            "坐收鱼利": "坐收渔利",
            "座无虚席": "座无虚席",
        }
    
    def detect(self, text: str) -> List[DetectedError]:
        errors = []
        
        errors.extend(self._detect_misspelled_idioms(text))
        errors.extend(self._detect_misused_idioms(text))
        
        return errors
    
    def _detect_misspelled_idioms(self, text: str) -> List[DetectedError]:
        errors = []
        
        for wrong, correct in self.common_misused.items():
            if wrong == correct:
                continue
            pattern = re.escape(wrong)
            for match in re.finditer(pattern, text):
                errors.append(DetectedError(
                    error_type="成语使用",
                    original_text=wrong,
                    corrected_text=correct,
                    explanation=f"成语「{wrong}」写法有误，正确应为「{correct}」",
                    position_start=match.start(),
                    position_end=match.end(),
                    severity="minor",
                    confidence=0.95
                ))
        
        return errors
    
    def _detect_misused_idioms(self, text: str) -> List[DetectedError]:
        errors = []
        
        for idiom, info in self.idiom_patterns.items():
            pattern = re.escape(idiom)
            for match in re.finditer(pattern, text):
                context = self._get_context(text, match.start(), match.end())
                
                for wrong_usage in info.get("wrong_usages", []):
                    if wrong_usage in context:
                        errors.append(DetectedError(
                            error_type="成语使用",
                            original_text=idiom,
                            explanation=f"成语「{idiom}」的正确含义是：{info['correct_meaning']}。此处语境可能存在误用。",
                            position_start=match.start(),
                            position_end=match.end(),
                            severity="minor",
                            confidence=info.get("confidence", 0.7)
                        ))
                        break
        
        return errors
    
    def _get_context(self, text: str, start: int, end: int, context_len: int = 50) -> str:
        context_start = max(0, start - context_len)
        context_end = min(len(text), end + context_len)
        return text[context_start:context_end]


class GrammarErrorDetector(BaseErrorDetector):
    
    def detect(self, text: str) -> List[DetectedError]:
        errors = []
        
        errors.extend(self._detect_sentence_structure_errors(text))
        errors.extend(self._detect_article_structure_errors(text))
        
        return errors
    
    def _detect_sentence_structure_errors(self, text: str) -> List[DetectedError]:
        errors = []
        
        sentences = re.split(r'[。！？\n]', text)
        
        for i, sentence in enumerate(sentences):
            sentence = sentence.strip()
            if not sentence:
                continue
            
            if len(sentence) > 150:
                errors.append(DetectedError(
                    error_type="语法结构",
                    original_text=sentence[:50] + "...",
                    explanation=f"句子过长（{len(sentence)}字），建议拆分为多个短句，使表达更清晰。",
                    position_start=text.find(sentence) if sentence in text else -1,
                    position_end=text.find(sentence) + len(sentence) if sentence in text else -1,
                    line_number=i + 1,
                    severity="minor",
                    confidence=0.6
                ))
            
            if len(sentence) < 5 and i < len(sentences) - 1:
                errors.append(DetectedError(
                    error_type="语法结构",
                    original_text=sentence,
                    explanation="句子过短，可能存在断句不当的情况。建议检查上下文。",
                    position_start=text.find(sentence) if sentence in text else -1,
                    position_end=text.find(sentence) + len(sentence) if sentence in text else -1,
                    line_number=i + 1,
                    severity="minor",
                    confidence=0.5
                ))
        
        return errors
    
    def _detect_article_structure_errors(self, text: str) -> List[DetectedError]:
        errors = []
        
        paragraph_count = text.count('\n\n') + 1
        if paragraph_count == 1 and len(text) > 500:
            errors.append(DetectedError(
                error_type="语法结构",
                original_text=text[:100] + "...",
                explanation="文章较长但未分段，建议根据内容分段，使结构更清晰。",
                position_start=0,
                position_end=-1,
                severity="minor",
                confidence=0.7
            ))
        
        return errors


class ErrorDetectionService:
    
    def __init__(self):
        self.detectors = [
            CharacterErrorDetector(),
            IdiomUsageDetector(),
            GrammarErrorDetector()
        ]
    
    def detect_all(self, text: str) -> List[DetectedError]:
        all_errors = []
        seen_positions = set()
        
        for detector in self.detectors:
            errors = detector.detect(text)
            for error in errors:
                pos_key = (error.position_start, error.position_end, error.error_type)
                if pos_key not in seen_positions:
                    seen_positions.add(pos_key)
                    all_errors.append(error)
        
        all_errors.sort(key=lambda e: e.position_start if e.position_start >= 0 else 999999)
        
        return all_errors
    
    def detect_by_type(self, text: str, error_type: str) -> List[DetectedError]:
        errors = self.detect_all(text)
        return [e for e in errors if e.error_type == error_type]


def error_to_dict(error: DetectedError) -> Dict[str, Any]:
    return {
        "error_type": error.error_type,
        "original_text": error.original_text,
        "corrected_text": error.corrected_text,
        "explanation": error.explanation,
        "position_start": error.position_start,
        "position_end": error.position_end,
        "line_number": error.line_number,
        "severity": error.severity,
        "confidence": error.confidence
    }


def get_error_detection_service() -> ErrorDetectionService:
    return ErrorDetectionService()
