import urllib.request
import urllib.parse
import xml.etree.ElementTree as ET
from typing import List, Dict
import time


class Paper:
    def __init__(self, arxiv_id: str, title: str, authors: List[str], abstract: str, 
                 published_date: str, arxiv_url: str):
        self.arxiv_id = arxiv_id
        self.title = title
        self.authors = authors
        self.abstract = abstract
        self.published_date = published_date
        self.arxiv_url = arxiv_url
        self.semantic_scholar_id = None

    def __repr__(self) -> str:
        return f"Paper(title='{self.title[:50]}...', id='{self.arxiv_id}')"

    def to_dict(self) -> Dict:
        return {
            'arxiv_id': self.arxiv_id,
            'title': self.title,
            'authors': self.authors,
            'abstract': self.abstract,
            'published_date': self.published_date,
            'arxiv_url': self.arxiv_url
        }


def search_arxiv_papers(keyword: str, max_results: int = 20) -> List[Paper]:
    base_url = 'http://export.arxiv.org/api/query?'
    
    search_query = f'all:{urllib.parse.quote(keyword)}'
    query_params = {
        'search_query': search_query,
        'start': 0,
        'max_results': max_results,
        'sortBy': 'relevance',
        'sortOrder': 'descending'
    }
    
    url = base_url + urllib.parse.urlencode(query_params)
    
    try:
        with urllib.request.urlopen(url) as response:
            xml_data = response.read()
        
        root = ET.fromstring(xml_data)
        namespaces = {'atom': 'http://www.w3.org/2005/Atom', 'arxiv': 'http://arxiv.org/schemas/atom'}
        
        papers = []
        for entry in root.findall('atom:entry', namespaces):
            arxiv_id = entry.find('atom:id', namespaces).text.split('/')[-1]
            title = entry.find('atom:title', namespaces).text.strip().replace('\n', ' ')
            
            authors = []
            for author in entry.findall('atom:author', namespaces):
                name = author.find('atom:name', namespaces).text
                authors.append(name)
            
            abstract = entry.find('atom:summary', namespaces).text.strip().replace('\n', ' ')
            published_date = entry.find('atom:published', namespaces).text
            arxiv_url = entry.find('atom:id', namespaces).text
            
            paper = Paper(arxiv_id, title, authors, abstract, published_date, arxiv_url)
            papers.append(paper)
        
        time.sleep(1)
        return papers
        
    except Exception as e:
        print(f"Error searching arXiv: {e}")
        return []


def get_paper_by_arxiv_id(arxiv_id: str) -> Paper:
    base_url = 'http://export.arxiv.org/api/query?'
    query_params = {
        'id_list': arxiv_id,
        'max_results': 1
    }
    
    url = base_url + urllib.parse.urlencode(query_params)
    
    try:
        with urllib.request.urlopen(url) as response:
            xml_data = response.read()
        
        root = ET.fromstring(xml_data)
        namespaces = {'atom': 'http://www.w3.org/2005/Atom'}
        
        entry = root.find('atom:entry', namespaces)
        if entry is None:
            return None
        
        title = entry.find('atom:title', namespaces).text.strip().replace('\n', ' ')
        
        authors = []
        for author in entry.findall('atom:author', namespaces):
            name = author.find('atom:name', namespaces).text
            authors.append(name)
        
        abstract = entry.find('atom:summary', namespaces).text.strip().replace('\n', ' ')
        published_date = entry.find('atom:published', namespaces).text
        arxiv_url = entry.find('atom:id', namespaces).text
        
        time.sleep(1)
        return Paper(arxiv_id, title, authors, abstract, published_date, arxiv_url)
        
    except Exception as e:
        print(f"Error fetching paper {arxiv_id}: {e}")
        return None
