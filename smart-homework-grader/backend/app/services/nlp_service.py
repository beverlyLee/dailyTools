import re
import jieba
from ..config import Config

class NLPService:
    def __init__(self):
        self.engine = Config.NLP_ENGINE
        self._init_idioms()
        self._init_common_typos()
    
    def _init_idioms(self):
        self.idioms = {
            '事半功倍': '指做事得法，因而费力小，收效大',
            '事倍功半': '指工作费力大，收效小',
            '画蛇添足': '比喻做了多余的事，非但无益，反而不合适',
            '画龙点睛': '比喻写文章或讲话时，在关键处用几句话点明实质，使内容生动有力',
            '坚持不懈': '坚持到底，一点不松懈',
            '半途而废': '指做事不能坚持到底，中途停顿，有始无终',
            '精益求精': '好了还求更好',
            '得过且过': '形容胸无大志，苟且偷安',
            '专心致志': '把心思全放在上面，形容一心一意，聚精会神',
            '三心二意': '又想这样又想那样，犹豫不定，常指不安心，不专一',
            '神采奕奕': '形容精神饱满，容光焕发',
            '垂头丧气': '形容因失败或不顺利而情绪低落、萎蘼不振的样子',
            '络绎不绝': '形容行人车马来来往往，接连不断',
            '门可罗雀': '形容十分冷落，宾客稀少',
            '雪中送炭': '在别人急需时给以物质上或精神上的帮助',
            '锦上添花': '在锦上再绣花，比喻好上加好，美上添美',
            '未雨绸缪': '比喻事先做好准备工作',
            '临渴掘井': '比喻事先没有准备，临时才想办法',
            '侃侃而谈': '理直气壮、从容不迫地说话',
            '夸夸其谈': '形容说话浮夸不切实际',
            '无微不至': '形容关怀、照顾得非常细心周到',
            '无所不至': '指没有不到的地方，也指什么坏事都做绝了',
        }
    
    def _init_common_typos(self):
        self.common_typos = {
            '在': ['再'],
            '再': ['在'],
            '的': ['地', '得'],
            '地': ['的', '得'],
            '得': ['的', '地'],
            '做': ['作'],
            '作': ['做'],
            '象': ['像'],
            '像': ['象'],
            '座': ['坐'],
            '坐': ['座'],
            '己': ['已', '巳'],
            '已': ['己', '巳'],
            '辨': ['辩', '辫'],
            '辩': ['辨', '辫'],
            '辫': ['辨', '辩'],
            '采': ['彩'],
            '彩': ['采'],
            '戴': ['带'],
            '带': ['戴'],
            '幅': ['副'],
            '副': ['幅'],
            '哄': ['轰', '烘'],
            '轰': ['哄', '烘'],
            '烘': ['哄', '轰'],
            '厉': ['历', '励'],
            '历': ['厉', '励'],
            '励': ['厉', '历'],
            '即': ['既'],
            '既': ['即'],
            '炼': ['练'],
            '练': ['炼'],
            '飘': ['漂'],
            '漂': ['飘'],
            '徒': ['徙'],
            '徙': ['徒'],
            '稍': ['梢'],
            '梢': ['稍'],
            '延': ['廷'],
            '廷': ['延'],
            '尊': ['遵'],
            '遵': ['尊'],
        }
        
        self.correct_pairs = {
            ('再', '见'): '再',
            ('在', '现'): '在',
            ('的', '时候'): '的',
            ('地', '说'): '地',
            ('得', '很'): '得',
        }
    
    def analyze_syntax(self, text):
        sentences = re.split(r'[。！？；.!?;]+', text)
        sentences = [s.strip() for s in sentences if s.strip()]
        
        sentence_lengths = [len(s) for s in sentences]
        avg_length = sum(sentence_lengths) / len(sentence_lengths) if sentence_lengths else 0
        
        word_count = len(list(jieba.cut(text)))
        
        sentence_patterns = {
            'declarative': 0,
            'interrogative': 0,
            'exclamatory': 0,
        }
        
        for s in sentences:
            if s.endswith('?') or '？' in s[-1:] or '什么' in s or '怎么' in s or '为什么' in s:
                sentence_patterns['interrogative'] += 1
            elif '！' in s[-1:] or '!' in s[-1:] or '真' in s[:5] or '多么' in s[:5]:
                sentence_patterns['exclamatory'] += 1
            else:
                sentence_patterns['declarative'] += 1
        
        long_sentences = sum(1 for l in sentence_lengths if l > 40)
        short_sentences = sum(1 for l in sentence_lengths if l < 5)
        
        return {
            'sentence_count': len(sentences),
            'word_count': word_count,
            'char_count': len(text),
            'avg_sentence_length': round(avg_length, 2),
            'min_sentence_length': min(sentence_lengths) if sentence_lengths else 0,
            'max_sentence_length': max(sentence_lengths) if sentence_lengths else 0,
            'sentence_patterns': sentence_patterns,
            'long_sentences': long_sentences,
            'short_sentences': short_sentences,
        }
    
    def detect_typos(self, text):
        typos = []
        
        for wrong_char, correct_chars in self.common_typos.items():
            for correct_char in correct_chars:
                if wrong_char in text:
                    positions = [m.start() for m in re.finditer(wrong_char, text)]
                    for pos in positions:
                        context = text[max(0, pos-5):min(len(text), pos+6)]
                        is_error = self._check_typo_context(text, pos, wrong_char, correct_char)
                        
                        if is_error:
                            typos.append({
                                'original': wrong_char,
                                'corrected': correct_char,
                                'position': pos,
                                'context': context,
                                'explanation': f'建议将"{wrong_char}"改为"{correct_char}"'
                            })
        
        return typos[:10]
    
    def _check_typo_context(self, text, pos, wrong_char, correct_char):
        context_before = text[max(0, pos-3):pos]
        context_after = text[pos+1:min(len(text), pos+4)]
        
        if (wrong_char, context_after) in self.correct_pairs:
            return False
        
        if (correct_char, context_after) in self.correct_pairs:
            return True
        
        if wrong_char in ['的', '地', '得'] and context_after:
            next_char = context_after[0] if context_after else ''
            if wrong_char == '地' and next_char in ['说', '看', '走', '跑', '跳', '笑', '哭', '想']:
                return False
            if wrong_char == '的' and next_char in ['时候', '人', '事', '物', '花', '草', '树']:
                return False
        
        return False
    
    def check_idiom_usage(self, text):
        issues = []
        
        for idiom, meaning in self.idioms.items():
            if idiom in text:
                positions = [m.start() for m in re.finditer(idiom, text)]
                for pos in positions:
                    context = text[max(0, pos-10):min(len(text), pos+len(idiom)+10)]
                    
                    misuse = self._check_idiom_misuse(text, pos, idiom)
                    
                    if misuse:
                        issues.append({
                            'idiom': idiom,
                            'meaning': meaning,
                            'position': pos,
                            'context': context,
                            'suggestion': misuse
                        })
        
        return issues
    
    def _check_idiom_misuse(self, text, pos, idiom):
        opposite_idioms = {
            '事半功倍': '事倍功半',
            '事倍功半': '事半功倍',
            '画蛇添足': '画龙点睛',
            '画龙点睛': '画蛇添足',
            '坚持不懈': '半途而废',
            '半途而废': '坚持不懈',
            '精益求精': '得过且过',
            '得过且过': '精益求精',
            '专心致志': '三心二意',
            '三心二意': '专心致志',
            '神采奕奕': '垂头丧气',
            '垂头丧气': '神采奕奕',
            '络绎不绝': '门可罗雀',
            '门可罗雀': '络绎不绝',
            '雪中送炭': '锦上添花',
            '锦上添花': '雪中送炭',
            '未雨绸缪': '临渴掘井',
            '临渴掘井': '未雨绸缪',
            '侃侃而谈': '夸夸其谈',
            '夸夸其谈': '侃侃而谈',
            '无微不至': '无所不至',
            '无所不至': '无微不至',
        }
        
        context = text[max(0, pos-50):min(len(text), pos+len(idiom)+50)]
        
        positive_words = ['成功', '优秀', '好', '棒', '精彩', '出色', '值得', '表扬']
        negative_words = ['失败', '糟糕', '差', '错', '不好', '批评', '问题']
        
        if idiom in ['事倍功半', '画蛇添足', '半途而废', '得过且过', '三心二意', '垂头丧气', '门可罗雀', '临渴掘井', '夸夸其谈', '无所不至']:
            if any(word in context for word in positive_words) and idiom != '雪中送炭':
                return f'"{idiom}"是贬义词，建议检查使用语境是否恰当，是否应该使用"{opposite_idioms.get(idiom, "其他成语")}"'
        
        if idiom in ['事半功倍', '画龙点睛', '坚持不懈', '精益求精', '专心致志', '神采奕奕', '络绎不绝', '雪中送炭', '未雨绸缪', '侃侃而谈', '无微不至', '锦上添花']:
            if any(word in context for word in negative_words):
                return f'"{idiom}"是褒义词，建议检查使用语境是否恰当，是否应该使用"{opposite_idioms.get(idiom, "其他成语")}"'
        
        return None
