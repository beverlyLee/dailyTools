import jieba
import jieba.analyse
from collections import Counter
from typing import List, Dict, Any


class TextProcessor:
    def __init__(self):
        self._init_tech_dictionary()
        self.stop_words = self._get_stop_words()

    def _init_tech_dictionary(self):
        tech_terms = [
            'Python', 'Java', 'JavaScript', 'C++', 'C#', 'Go', 'Golang', 'Rust',
            'PHP', 'Ruby', 'Swift', 'Kotlin', 'TypeScript', 'Scala', 'R语言',
            'Flask', 'Django', 'Spring', 'SpringBoot', 'Vue', 'Vue.js', 'React',
            'Angular', 'Node.js', 'Express', 'FastAPI', 'Tornado', 'Sanic',
            'MySQL', 'PostgreSQL', 'MongoDB', 'Redis', 'Oracle', 'SQLServer',
            'Elasticsearch', 'Kafka', 'RabbitMQ', 'RocketMQ',
            'Docker', 'Kubernetes', 'K8s', 'DevOps', 'CI/CD', 'Jenkins',
            'Git', 'Linux', 'Unix', 'Shell', 'Bash',
            '人工智能', '机器学习', '深度学习', 'AI', 'ML', 'NLP', '自然语言处理',
            '计算机视觉', 'CV', '图像识别', '语音识别', '神经网络', 'TensorFlow',
            'PyTorch', 'Keras', 'PaddlePaddle', '大模型', 'LLM', 'GPT',
            '算法', '数据结构', '设计模式', '微服务', '分布式', '高并发',
            '前端', '后端', '全栈', '移动端', 'Android', 'iOS',
            '测试', '自动化测试', '单元测试', '集成测试', '性能测试',
            '大数据', 'Hadoop', 'Spark', 'Flink', 'Hive', '数据仓库',
            '云计算', '云原生', 'AWS', '阿里云', '腾讯云', '华为云',
            '网络安全', '信息安全', '渗透测试', '漏洞挖掘',
            '区块链', 'Web3', '智能合约', 'Solidity',
            'Unity', 'Unreal', '游戏开发', 'AR', 'VR',
            '物联网', 'IoT', '嵌入式', '单片机', 'FPGA',
            '数据分析', '数据挖掘', '商业智能', 'BI', 'Tableau',
            '产品经理', '项目经理', 'UI设计', 'UX设计', '运营',
            '算法工程师', '开发工程师', '测试工程师', '前端工程师',
            '后端工程师', '全栈工程师', '数据工程师', '架构师'
        ]
        for term in tech_terms:
            jieba.add_word(term)

    def _get_stop_words(self) -> set:
        return {
            '的', '了', '和', '是', '在', '我', '有', '就', '都', '而',
            '及', '与', '或', '等', '可', '能', '会', '对', '于', '将',
            '中', '上', '下', '内', '外', '前', '后', '左', '右', '间',
            '公司', '工作', '职位', '招聘', '负责', '要求', '经验', '能力',
            '熟悉', '掌握', '了解', '优先', '具有', '具备', '良好', '优秀',
            '以上', '以下', '相关', '专业', '本科', '硕士', '博士', '学历',
            '年', '月', '日', '个', '名', '位', '名', '人', '员', '者'
        }

    def tokenize(self, text: str) -> List[str]:
        words = jieba.cut(text)
        words = [w for w in words if w not in self.stop_words and len(w.strip()) > 1]
        return words

    def extract_tech_terms(self, text: str, top_k: int = 50) -> List[tuple]:
        keywords = jieba.analyse.extract_tags(text, topK=top_k, withWeight=True)
        return keywords

    def extract_keywords_from_jobs(self, jobs: List[Dict[str, Any]], 
                                     field: str = 'description', 
                                     top_k: int = 100) -> Dict[str, int]:
        all_text = ''
        for job in jobs:
            all_text += job[field] + ' '
            all_text += job.get('requirements', '') + ' '
        
        words = self.tokenize(all_text)
        word_counts = Counter(words)
        return dict(word_counts.most_common(top_k))

    def get_tech_word_frequencies(self, jobs: List[Dict[str, Any]]) -> Dict[str, int]:
        tech_terms = [
            'Python', 'Java', 'JavaScript', 'C++', 'Go', 'Rust',
            'Flask', 'Django', 'SpringBoot', 'Vue', 'React', 'Node.js',
            'MySQL', 'MongoDB', 'Redis', 'PostgreSQL', 'Elasticsearch',
            'Docker', 'Kubernetes', 'K8s', 'DevOps',
            'Git', 'Linux', 'Shell',
            '人工智能', '机器学习', '深度学习', 'AI', 'NLP',
            '计算机视觉', 'CV', 'TensorFlow', 'PyTorch', '大模型',
            '算法', '微服务', '分布式', '大数据', 'Spark', 'Hadoop',
            '云计算', '网络安全', '区块链', '数据分析'
        ]
        
        word_freq = {term: 0 for term in tech_terms}
        
        for job in jobs:
            text = job['description'] + ' ' + job.get('requirements', '')
            text_lower = text.lower()
            
            for term in tech_terms:
                if term.lower() in text_lower:
                    word_freq[term] += 1
        
        return {k: v for k, v in word_freq.items() if v > 0}
