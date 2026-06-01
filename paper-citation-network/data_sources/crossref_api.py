import requests
import time
import networkx as nx
from typing import List, Dict, Optional, Tuple
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


class CrossRefAPI:
    """
    CrossRef API 客户端 - 开放获取学术元数据接口
    
    CrossRef 优势：
    - 完全免费，无需 API Key
    - 国内访问相对稳定
    - 支持 DOI 检索、关键词检索
    - 包含引用关系数据（reference）
    - 速率限制：匿名 50 请求/秒，带邮箱标识 100 请求/秒
    """
    
    BASE_URL = "https://api.crossref.org"
    USER_AGENT = "PaperCitationNetwork/1.0 (mailto:example@example.com)"
    
    def __init__(self, mailto: str = None, timeout: int = 10):
        self.mailto = mailto
        self.timeout = timeout
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': self.USER_AGENT,
            'Accept': 'application/json'
        })
    
    def _make_request(self, endpoint: str, params: Dict = None) -> Optional[Dict]:
        """发送 API 请求，带重试逻辑"""
        url = f"{self.BASE_URL}/{endpoint}"
        params = params or {}
        
        if self.mailto:
            params['mailto'] = self.mailto
        
        max_retries = 3
        for attempt in range(max_retries):
            try:
                response = self.session.get(url, params=params, timeout=self.timeout)
                response.raise_for_status()
                data = response.json()
                if data.get('status') == 'ok':
                    return data
            except requests.exceptions.Timeout:
                if attempt < max_retries - 1:
                    time.sleep(1)
                    continue
            except requests.exceptions.RequestException:
                if attempt < max_retries - 1:
                    time.sleep(1)
                    continue
            except Exception:
                pass
        
        return None
    
    def search_papers(self, keyword: str, max_results: int = 20) -> List[Dict]:
        """
        按关键词搜索论文
        
        Args:
            keyword: 搜索关键词
            max_results: 返回结果数量
            
        Returns:
            论文信息列表
        """
        params = {
            'query': keyword,
            'rows': min(max_results, 100),
            'sort': 'relevance',
            'select': 'DOI,title,author,issued,published-print,published-online,container-title,is-referenced-by-count,reference'
        }
        
        data = self._make_request('works', params)
        
        if not data:
            return []
        
        papers = []
        for item in data.get('message', {}).get('items', []):
            paper = self._parse_paper_item(item)
            if paper:
                papers.append(paper)
        
        return papers
    
    def _parse_paper_item(self, item: Dict) -> Optional[Dict]:
        """解析论文条目"""
        try:
            doi = item.get('DOI', '')
            title = item.get('title', [''])[0] if item.get('title') else ''
            
            authors = []
            for author in item.get('author', []):
                name_parts = []
                if author.get('given'):
                    name_parts.append(author.get('given'))
                if author.get('family'):
                    name_parts.append(author.get('family'))
                if name_parts:
                    authors.append(' '.join(name_parts))
            
            year = None
            for date_field in ['issued', 'published-print', 'published-online']:
                if item.get(date_field, {}).get('date-parts'):
                    date_parts = item[date_field]['date-parts']
                    if date_parts and date_parts[0]:
                        year = date_parts[0][0]
                        break
            
            citation_count = item.get('is-referenced-by-count', 0)
            
            references = []
            for ref in item.get('reference', []):
                if ref.get('DOI'):
                    references.append({
                        'doi': ref.get('DOI'),
                        'title': ref.get('article-title', ''),
                        'year': ref.get('year')
                    })
            
            return {
                'id': doi,
                'doi': doi,
                'title': title,
                'authors': authors,
                'year': year,
                'citation_count': citation_count,
                'references': references,
                'source': 'crossref'
            }
        except Exception as e:
            return None
    
    def get_paper_by_doi(self, doi: str) -> Optional[Dict]:
        """根据 DOI 获取论文详细信息"""
        params = {
            'select': 'DOI,title,author,issued,published-print,published-online,container-title,is-referenced-by-count,reference'
        }
        
        data = self._make_request(f'works/{doi}', params)
        
        if not data:
            return None
        
        return self._parse_paper_item(data.get('message', {}))
    
    def build_citation_network(self, keyword: str, max_papers: int = 10, 
                              expand_references: bool = True) -> nx.DiGraph:
        """
        构建引用关系网络
        
        Args:
            keyword: 搜索关键词
            max_papers: 初始论文数量
            expand_references: 是否扩展引用关系
            
        Returns:
            NetworkX 有向图
        """
        G = nx.DiGraph()
        
        papers = self.search_papers(keyword, max_results=max_papers)
        
        if not papers:
            return G
        
        paper_map = {p['id']: p for p in papers}
        
        for paper in papers:
            G.add_node(
                paper['id'],
                title=paper['title'],
                authors=paper['authors'],
                year=paper['year'],
                citation_count=paper['citation_count'],
                pagerank=0.0
            )
            
            if expand_references and paper.get('references'):
                for ref in paper['references']:
                    ref_id = ref['doi']
                    if ref_id not in G.nodes:
                        G.add_node(
                            ref_id,
                            title=ref.get('title', 'Reference'),
                            authors=[],
                            year=ref.get('year'),
                            citation_count=0,
                            pagerank=0.0
                        )
                    G.add_edge(paper['id'], ref_id, relation='cites')
        
        return G


def test_crossref_api():
    """测试 CrossRef API"""
    api = CrossRefAPI()
    
    print("Testing CrossRef API...")
    
    papers = api.search_papers("transformer attention", max_results=5)
    
    if papers:
        print(f"\nFound {len(papers)} papers:")
        for i, paper in enumerate(papers, 1):
            print(f"\n{i}. {paper['title'][:80]}...")
            print(f"   DOI: {paper['doi']}")
            print(f"   Authors: {', '.join(paper['authors'][:3])}")
            print(f"   Year: {paper['year']}")
            print(f"   Citations: {paper['citation_count']}")
            print(f"   References: {len(paper.get('references', []))}")
        return True
    else:
        print("Failed to retrieve papers from CrossRef API")
        return False


if __name__ == "__main__":
    test_crossref_api()
