import requests
import networkx as nx
from typing import List, Dict, Optional
import time
import os
from dotenv import load_dotenv

load_dotenv()


class CitationNode:
    def __init__(self, paper_id: str, title: str, authors: List[str] = None, 
                 year: int = None, citation_count: int = 0):
        self.paper_id = paper_id
        self.title = title
        self.authors = authors or []
        self.year = year
        self.citation_count = citation_count
        self.pagerank = 0.0

    def __repr__(self) -> str:
        return f"CitationNode(title='{self.title[:40]}...', id='{self.paper_id}')"

    def to_dict(self) -> Dict:
        return {
            'paper_id': self.paper_id,
            'title': self.title,
            'authors': self.authors,
            'year': self.year,
            'citation_count': self.citation_count,
            'pagerank': self.pagerank
        }


class SemanticScholarAPI:
    BASE_URL = 'https://api.semanticscholar.org/graph/v1'
    
    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or os.getenv('SEMANTIC_SCHOLAR_API_KEY')
        self.headers = {}
        if self.api_key:
            self.headers['x-api-key'] = self.api_key
    
    def get_paper_by_arxiv_id(self, arxiv_id: str) -> Optional[Dict]:
        url = f"{self.BASE_URL}/paper/ARXIV:{arxiv_id}"
        params = {
            'fields': 'paperId,title,authors,year,citationCount,references,paperId'
        }
        
        try:
            response = requests.get(url, params=params, headers=self.headers, timeout=10)
            response.raise_for_status()
            time.sleep(0.1)
            return response.json()
        except Exception as e:
            print(f"Error fetching paper {arxiv_id}: {e}")
            return None
    
    def get_paper_by_title(self, title: str) -> Optional[Dict]:
        url = f"{self.BASE_URL}/paper/search/match"
        params = {
            'query': title,
            'fields': 'paperId,title,authors,year,citationCount'
        }
        
        try:
            response = requests.get(url, params=params, headers=self.headers, timeout=10)
            response.raise_for_status()
            data = response.json()
            time.sleep(0.1)
            if data.get('data'):
                return data['data'][0]
            return None
        except Exception as e:
            print(f"Error searching paper by title '{title}': {e}")
            return None
    
    def get_paper_citations(self, paper_id: str, limit: int = 50) -> List[Dict]:
        url = f"{self.BASE_URL}/paper/{paper_id}/citations"
        params = {
            'fields': 'paper.paperId,paper.title,paper.authors,paper.year,paper.citationCount',
            'limit': limit
        }
        
        try:
            response = requests.get(url, params=params, headers=self.headers, timeout=10)
            response.raise_for_status()
            data = response.json()
            time.sleep(0.1)
            return [item['paper'] for item in data.get('data', []) if item.get('paper')]
        except Exception as e:
            print(f"Error fetching citations for {paper_id}: {e}")
            return []
    
    def get_paper_references(self, paper_id: str, limit: int = 50) -> List[Dict]:
        url = f"{self.BASE_URL}/paper/{paper_id}/references"
        params = {
            'fields': 'paper.paperId,paper.title,paper.authors,paper.year,paper.citationCount',
            'limit': limit
        }
        
        try:
            response = requests.get(url, params=params, headers=self.headers, timeout=10)
            response.raise_for_status()
            data = response.json()
            time.sleep(0.1)
            return [item['paper'] for item in data.get('data', []) if item.get('paper')]
        except Exception as e:
            print(f"Error fetching references for {paper_id}: {e}")
            return []


def build_citation_network(papers: List, max_citations: int = 20, 
                          max_references: int = 20) -> nx.DiGraph:
    G = nx.DiGraph()
    
    api = SemanticScholarAPI()
    
    paper_ids = set()
    paper_info_map = {}
    
    print(f"Processing {len(papers)} initial papers...")
    
    for paper in papers:
        ss_data = api.get_paper_by_arxiv_id(paper.arxiv_id)
        
        if not ss_data:
            ss_data = api.get_paper_by_title(paper.title)
        
        if ss_data:
            paper_id = ss_data['paperId']
            paper_ids.add(paper_id)
            
            node_data = CitationNode(
                paper_id=paper_id,
                title=ss_data.get('title', paper.title),
                authors=[a.get('name', '') for a in ss_data.get('authors', [])],
                year=ss_data.get('year'),
                citation_count=ss_data.get('citationCount', 0)
            )
            
            paper_info_map[paper_id] = node_data
            G.add_node(paper_id, **node_data.to_dict())
            
            citations = api.get_paper_citations(paper_id, limit=max_citations)
            for citing_paper in citations[:max_citations]:
                if citing_paper and 'paperId' in citing_paper:
                    citing_id = citing_paper['paperId']
                    
                    if citing_id not in paper_info_map:
                        citing_node = CitationNode(
                            paper_id=citing_id,
                            title=citing_paper.get('title', ''),
                            authors=[a.get('name', '') for a in citing_paper.get('authors', [])],
                            year=citing_paper.get('year'),
                            citation_count=citing_paper.get('citationCount', 0)
                        )
                        paper_info_map[citing_id] = citing_node
                        G.add_node(citing_id, **citing_node.to_dict())
                    
                    G.add_edge(citing_id, paper_id, relation='cites')
            
            references = api.get_paper_references(paper_id, limit=max_references)
            for referenced_paper in references[:max_references]:
                if referenced_paper and 'paperId' in referenced_paper:
                    ref_id = referenced_paper['paperId']
                    
                    if ref_id not in paper_info_map:
                        ref_node = CitationNode(
                            paper_id=ref_id,
                            title=referenced_paper.get('title', ''),
                            authors=[a.get('name', '') for a in referenced_paper.get('authors', [])],
                            year=referenced_paper.get('year'),
                            citation_count=referenced_paper.get('citationCount', 0)
                        )
                        paper_info_map[ref_id] = ref_node
                        G.add_node(ref_id, **ref_node.to_dict())
                    
                    G.add_edge(paper_id, ref_id, relation='cites')
    
    print(f"Citation network built with {G.number_of_nodes()} nodes and {G.number_of_edges()} edges")
    return G
