import networkx as nx
from typing import List, Dict


def get_llm_test_papers() -> List[Dict]:
    papers = [
        {
            'arxiv_id': '1706.03762',
            'title': 'Attention Is All You Need',
            'authors': ['Ashish Vaswani', 'Noam Shazeer', 'Niki Parmar', 'Jakob Uszkoreit', 
                       'Llion Jones', 'Aidan N. Gomez', 'Łukasz Kaiser', 'Illia Polosukhin'],
            'year': 2017,
            'citation_count': 150000
        },
        {
            'arxiv_id': '1810.04805',
            'title': 'BERT: Pre-training of Deep Bidirectional Transformers for Language Understanding',
            'authors': ['Jacob Devlin', 'Ming-Wei Chang', 'Kenton Lee', 'Kristina Toutanova'],
            'year': 2018,
            'citation_count': 80000
        },
        {
            'arxiv_id': '1907.11692',
            'title': 'RoBERTa: A Robustly Optimized BERT Pretraining Approach',
            'authors': ['Yinhan Liu', 'Myle Ott', 'Naman Goyal', 'Jingfei Du', 
                       'Mandar Joshi', 'Danqi Chen', 'Omer Levy', 'Mike Lewis', 
                       'Luke Zettlemoyer', 'Veselin Stoyanov'],
            'year': 2019,
            'citation_count': 15000
        },
        {
            'arxiv_id': '2005.14165',
            'title': 'Language Models are Few-Shot Learners',
            'authors': ['Tom B. Brown', 'Benjamin Mann', 'Nick Ryder', 'Melanie Subbiah', 
                       'Jared Kaplan', 'Prafulla Dhariwal', 'Arvind Neelakantan', 'Pranav Shyam'],
            'year': 2020,
            'citation_count': 25000
        },
        {
            'arxiv_id': '1910.01108',
            'title': 'DistilBERT, a distilled version of BERT: smaller, faster, cheaper and lighter',
            'authors': ['Victor Sanh', 'Lysandre Debut', 'Julien Chaumond', 'Thomas Wolf'],
            'year': 2019,
            'citation_count': 8000
        },
        {
            'arxiv_id': '1801.10198',
            'title': 'Improving Language Understanding by Generative Pre-Training',
            'authors': ['Alec Radford', 'Karthik Narasimhan', 'Tim Salimans', 'Ilya Sutskever'],
            'year': 2018,
            'citation_count': 20000
        },
        {
            'arxiv_id': '1909.11942',
            'title': 'ALBERT: A Lite BERT for Self-supervised Learning of Language Representations',
            'authors': ['Zhenzhong Lan', 'Mingda Chen', 'Sebastian Goodman', 'Kevin Gimpel'],
            'year': 2019,
            'citation_count': 5000
        },
        {
            'arxiv_id': '2001.08361',
            'title': 'Scaling Laws for Neural Language Models',
            'authors': ['Jared Kaplan', 'Sam McCandlish', 'Tom Henighan', 'Tom B. Brown'],
            'year': 2020,
            'citation_count': 6000
        },
        {
            'arxiv_id': '1906.08237',
            'title': 'XLNet: Generalized Autoregressive Pretraining for Language Understanding',
            'authors': ['Zhilin Yang', 'Zihang Dai', 'Yiming Yang', 'Jaime Carbonell'],
            'year': 2019,
            'citation_count': 7000
        },
        {
            'arxiv_id': '2108.07732',
            'title': 'PaLM: Scaling Language Modeling with Pathways',
            'authors': ['Aakanksha Chowdhery', 'Sharan Narang', 'Jacob Devlin'],
            'year': 2021,
            'citation_count': 3000
        },
        {
            'arxiv_id': '2302.13971',
            'title': 'LLaMA: Open and Efficient Foundation Language Models',
            'authors': ['Hugo Touvron', 'Thibaut Lavril', 'Gautier Izacard'],
            'year': 2023,
            'citation_count': 2000
        },
        {
            'arxiv_id': '2310.06825',
            'title': 'Mistral 7B',
            'authors': ['Albert Q. Jiang', 'Alexandre Sablayrolles', 'Arthur Mensch'],
            'year': 2023,
            'citation_count': 500
        }
    ]
    return papers


def get_test_citation_network() -> nx.DiGraph:
    G = nx.DiGraph()
    
    papers = get_llm_test_papers()
    
    for paper in papers:
        G.add_node(
            paper['arxiv_id'],
            title=paper['title'],
            authors=paper['authors'],
            year=paper['year'],
            citation_count=paper['citation_count']
        )
    
    citations = [
        ('1810.04805', '1706.03762'),
        ('1907.11692', '1706.03762'),
        ('1907.11692', '1810.04805'),
        ('2005.14165', '1706.03762'),
        ('2005.14165', '1810.04805'),
        ('2005.14165', '1801.10198'),
        ('1910.01108', '1706.03762'),
        ('1910.01108', '1810.04805'),
        ('1801.10198', '1706.03762'),
        ('1909.11942', '1706.03762'),
        ('1909.11942', '1810.04805'),
        ('2001.08361', '1706.03762'),
        ('2001.08361', '2005.14165'),
        ('1906.08237', '1706.03762'),
        ('1906.08237', '1810.04805'),
        ('2108.07732', '1706.03762'),
        ('2108.07732', '2005.14165'),
        ('2108.07732', '1810.04805'),
        ('2302.13971', '1706.03762'),
        ('2302.13971', '2005.14165'),
        ('2302.13971', '2108.07732'),
        ('2310.06825', '1706.03762'),
        ('2310.06825', '2302.13971'),
        ('2310.06825', '2005.14165')
    ]
    
    for citer, cited in citations:
        G.add_edge(citer, cited, relation='cites')
    
    return G
