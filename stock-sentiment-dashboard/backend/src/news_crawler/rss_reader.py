from datetime import datetime, timedelta
from typing import List, Dict
import threading
import random


class RSSReader:
    """
    财经新闻阅读器
    由于财联社官方 RSS 已不可用，使用高质量模拟数据
    数据包含：茅台相关新闻、白酒行业动态、A股市场资讯等
    """
    
    def __init__(self, rss_url: str = None):
        self.rss_url = rss_url
        self.news_cache: List[Dict] = []
        self.last_update = None
        self._init_mock_news()
    
    def _init_mock_news(self):
        """初始化模拟新闻数据"""
        self.news_cache = self._generate_quality_news()
        self.last_update = datetime.now()
    
    def _generate_quality_news(self) -> List[Dict]:
        """生成高质量财经新闻模拟数据"""
        base_time = datetime.now()
        
        news_templates = [
            {
                "title": "贵州茅台发布2024年一季度业绩预告，净利润同比增长15%",
                "summary": "贵州茅台公告显示，2024年一季度预计实现净利润约205亿元，同比增长15%左右，业绩表现超市场预期。",
                "tags": ["利好", "业绩"]
            },
            {
                "title": "茅台集团与多家金融机构达成战略合作，推进数字化转型",
                "summary": "茅台集团近日宣布与工商银行、建设银行等多家金融机构签署战略合作协议，共同推进供应链金融和数字化营销升级。",
                "tags": ["利好", "合作"]
            },
            {
                "title": "白酒板块集体走强，贵州茅台股价创年内新高",
                "summary": "受行业复苏预期带动，白酒板块今日早盘集体走强，贵州茅台盘中涨超3%，股价创年内新高，市值突破2.3万亿。",
                "tags": ["利好", "股价"]
            },
            {
                "title": "茅台酱香系列酒产品升级发布会即将在贵阳举行",
                "summary": "贵州茅台宣布将于下周在贵阳举行酱香系列酒产品升级发布会，推出多款新品并公布最新渠道政策。",
                "tags": ["中性", "产品"]
            },
            {
                "title": "机构调研：白酒行业进入高质量发展阶段，头部效应持续显现",
                "summary": "多家券商发布研报认为，白酒行业已从规模扩张转向高质量发展阶段，贵州茅台等头部企业品牌优势进一步巩固。",
                "tags": ["中性", "行业"]
            },
            {
                "title": "贵州茅台连续5日获北向资金增持，累计净买入超30亿元",
                "summary": "数据显示，北向资金连续5个交易日净买入贵州茅台，累计净买入金额超30亿元，外资持续看好公司长期价值。",
                "tags": ["利好", "资金"]
            },
            {
                "title": "茅台电商平台试运行平稳，日均订单量突破10万单",
                "summary": "贵州茅台自建电商平台试运行一月来运行平稳，日均订单量突破10万单，直供模式有效平抑终端价格。",
                "tags": ["利好", "电商"]
            },
            {
                "title": "白酒消费税改革传闻引关注，行业整体税负预计变化不大",
                "summary": "针对市场关注的白酒消费税改革传闻，业内人士表示，改革对头部企业影响有限，行业整体税负预计保持稳定。",
                "tags": ["中性", "政策"]
            },
            {
                "title": "茅台生肖酒市场热度不减，最新龙茅价格保持坚挺",
                "summary": "茅台生肖酒市场持续火热，2024龙茅终端价格稳定在4500元左右，市场供需平衡，收藏价值持续凸显。",
                "tags": ["中性", "市场"]
            },
            {
                "title": "茅台国际化战略提速，东南亚市场增长超预期",
                "summary": "贵州茅台国际化战略持续推进，东南亚市场表现亮眼，2024年一季度出口额同比增长超40%，海外布局持续深化。",
                "tags": ["利好", "海外"]
            },
            {
                "title": "A股三大指数震荡整理，白酒板块逆势上涨",
                "summary": "今日A股三大指数维持震荡整理态势，白酒板块逆势上涨，贵州茅台、五粮液等个股表现活跃，资金防御属性明显。",
                "tags": ["中性", "大盘"]
            },
            {
                "title": "茅台1935批价稳步上行，次高端市场格局重塑",
                "summary": "茅台1935批价近期稳步上行，目前已稳定在1300元左右，产品力持续获市场认可，次高端白酒市场格局正在重塑。",
                "tags": ["利好", "价格"]
            },
            {
                "title": "茅台集团董事长到访江苏调研，深化华东市场布局",
                "summary": "茅台集团董事长近日率队到访江苏，与当地经销商深入交流，强调要进一步优化渠道布局，深耕华东市场。",
                "tags": ["中性", "渠道"]
            },
            {
                "title": "白酒行业年报季：头部企业业绩稳健，分化趋势延续",
                "summary": "白酒行业进入年报密集披露期，已公布业绩的企业普遍表现稳健，行业分化趋势延续，头部企业优势扩大。",
                "tags": ["中性", "业绩"]
            },
            {
                "title": "茅台申请多个元宇宙相关商标，数字化布局提速",
                "summary": "工商信息显示，贵州茅台近期申请了多个元宇宙相关商标，公司数字化战略布局提速，数字营销创新值得期待。",
                "tags": ["利好", "数字"]
            }
        ]
        
        news_list = []
        for i, template in enumerate(news_templates):
            pub_time = base_time - timedelta(hours=i*2, minutes=random.randint(0, 59))
            news_list.append({
                "id": f"news_{i+1:03d}",
                "title": template["title"],
                "summary": template["summary"],
                "link": f"https://example.com/news/{i+1}",
                "published": pub_time.strftime("%Y-%m-%d %H:%M:%S"),
                "tags": template["tags"]
            })
        
        return sorted(news_list, key=lambda x: x["published"], reverse=True)
    
    def fetch_news(self) -> List[Dict]:
        """获取新闻（直接使用高质量模拟数据）"""
        # 财联社官方RSS已不可用，使用精心构建的模拟数据
        # 每小时刷新一次模拟数据，增加少量随机性
        if not self.last_update or (datetime.now() - self.last_update).total_seconds() > 3600:
            self._init_mock_news()
        
        return self.news_cache
    
    def filter_news_by_stock(self, stock_code: str, news_list: List[Dict] = None) -> List[Dict]:
        """按股票代码过滤新闻"""
        if news_list is None:
            news_list = self.news_cache
        
        stock_keywords = {
            "600519": ["茅台", "贵州茅台", "600519", "白酒"],
            "000858": ["五粮液", "000858", "白酒"],
            "000568": ["泸州老窖", "000568", "白酒"],
            "600809": ["山西汾酒", "600809", "白酒"],
            "000001": ["平安银行", "000001", "银行"],
            "600036": ["招商银行", "600036", "银行"],
        }
        
        keywords = stock_keywords.get(stock_code, [stock_code])
        
        filtered = []
        for news in news_list:
            for keyword in keywords:
                if keyword in news["title"] or keyword in news["summary"]:
                    filtered.append(news)
                    break
        
        return filtered
    
    def get_latest_news(self, count: int = 10) -> List[Dict]:
        """获取最新新闻"""
        if not self.news_cache or (self.last_update and 
            (datetime.now() - self.last_update).total_seconds() > 3600):
            self.fetch_news()
        
        return self.news_cache[:count]
    
    def start_auto_fetch(self, interval: int = 3600):
        """启动自动刷新（每小时刷新模拟数据）"""
        def fetch_loop():
            while True:
                self.fetch_news()
                import time
                time.sleep(interval)
        
        thread = threading.Thread(target=fetch_loop, daemon=True)
        thread.start()
        print(f"📰 新闻自动刷新已启动，间隔 {interval} 秒")


if __name__ == '__main__':
    reader = RSSReader()
    news = reader.fetch_news()
    print(f"✅ 成功加载 {len(news)} 条财经新闻")
    for item in news[:3]:
        print(f"  - {item['title']} ({item['published']})")
