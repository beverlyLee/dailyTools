import networkx as nx
from typing import Dict, List, Tuple
import numpy as np


def compute_pagerank(G: nx.DiGraph, alpha: float = 0.85, 
                     personalization: Dict = None) -> Dict[str, float]:
    if G.number_of_nodes() == 0:
        return {}
    
    pagerank_scores = nx.pagerank(G, alpha=alpha, personalization=personalization)
    
    for node_id, score in pagerank_scores.items():
        if node_id in G.nodes:
            G.nodes[node_id]['pagerank'] = score
    
    return pagerank_scores


def compute_degree_centrality(G: nx.DiGraph) -> Tuple[Dict[str, float], Dict[str, float], Dict[str, float]]:
    in_degree = nx.in_degree_centrality(G)
    out_degree = nx.out_degree_centrality(G)
    degree = nx.degree_centrality(G)
    
    return in_degree, out_degree, degree


def compute_betweenness_centrality(G: nx.DiGraph) -> Dict[str, float]:
    return nx.betweenness_centrality(G)


def compute_closeness_centrality(G: nx.DiGraph) -> Dict[str, float]:
    return nx.closeness_centrality(G)


def find_central_papers(G: nx.DiGraph, top_n: int = 10, 
                        method: str = 'pagerank') -> List[Tuple[str, str, float]]:
    if method == 'pagerank':
        if 'pagerank' not in next(iter(G.nodes(data=True)))[1]:
            compute_pagerank(G)
        scores = {node: G.nodes[node].get('pagerank', 0) for node in G.nodes()}
    elif method == 'citation_count':
        scores = {node: G.nodes[node].get('citation_count', 0) for node in G.nodes()}
    elif method == 'in_degree':
        scores = dict(G.in_degree())
    else:
        raise ValueError(f"Unknown method: {method}")
    
    sorted_papers = sorted(scores.items(), key=lambda x: x[1], reverse=True)
    
    result = []
    for paper_id, score in sorted_papers[:top_n]:
        title = G.nodes[paper_id].get('title', 'Unknown')
        result.append((paper_id, title, score))
    
    return result


def analyze_network(G: nx.DiGraph) -> Dict:
    analysis = {}
    
    analysis['num_nodes'] = G.number_of_nodes()
    analysis['num_edges'] = G.number_of_edges()
    
    if analysis['num_nodes'] > 0:
        analysis['density'] = nx.density(G)
        
        if nx.is_strongly_connected(G):
            analysis['is_strongly_connected'] = True
            analysis['diameter'] = nx.diameter(G)
        else:
            analysis['is_strongly_connected'] = False
            largest_component = max(nx.strongly_connected_components(G), key=len)
            analysis['largest_component_size'] = len(largest_component)
            
            subgraph = G.subgraph(largest_component)
            analysis['largest_component_diameter'] = nx.diameter(subgraph)
        
        pagerank_scores = compute_pagerank(G)
        max_pr = max(pagerank_scores.values()) if pagerank_scores else 0
        analysis['max_pagerank'] = max_pr
        analysis['avg_pagerank'] = np.mean(list(pagerank_scores.values())) if pagerank_scores else 0
        
        in_degrees = dict(G.in_degree())
        out_degrees = dict(G.out_degree())
        analysis['max_in_degree'] = max(in_degrees.values()) if in_degrees else 0
        analysis['max_out_degree'] = max(out_degrees.values()) if out_degrees else 0
        analysis['avg_in_degree'] = np.mean(list(in_degrees.values())) if in_degrees else 0
        analysis['avg_out_degree'] = np.mean(list(out_degrees.values())) if out_degrees else 0
        
        num_isolated = len(list(nx.isolates(G)))
        analysis['num_isolated_nodes'] = num_isolated
        
        cycles = list(nx.simple_cycles(G))
        analysis['num_cycles'] = len(cycles)
    
    return analysis


def print_analysis_report(G: nx.DiGraph) -> None:
    analysis = analyze_network(G)
    
    print("=" * 60)
    print("CITATION NETWORK ANALYSIS REPORT")
    print("=" * 60)
    print(f"\nBasic Statistics:")
    print(f"  Number of papers (nodes): {analysis['num_nodes']}")
    print(f"  Number of citations (edges): {analysis['num_edges']}")
    print(f"  Network density: {analysis['density']:.4f}")
    
    print(f"\nConnectivity:")
    print(f"  Strongly connected: {analysis['is_strongly_connected']}")
    if not analysis['is_strongly_connected']:
        print(f"  Largest component size: {analysis['largest_component_size']}")
    
    print(f"\nCentrality Measures:")
    print(f"  Max PageRank: {analysis['max_pagerank']:.6f}")
    print(f"  Average PageRank: {analysis['avg_pagerank']:.6f}")
    print(f"  Max in-degree: {analysis['max_in_degree']}")
    print(f"  Average in-degree: {analysis['avg_in_degree']:.2f}")
    
    print(f"\nTop 10 Papers by PageRank:")
    top_papers = find_central_papers(G, top_n=10, method='pagerank')
    for i, (paper_id, title, score) in enumerate(top_papers, 1):
        short_title = title[:50] + "..." if len(title) > 50 else title
        print(f"  {i:2d}. {short_title}")
        print(f"      PageRank: {score:.6f}")
    
    print(f"\nTop 10 Papers by Citation Count:")
    top_cited = find_central_papers(G, top_n=10, method='citation_count')
    for i, (paper_id, title, citations) in enumerate(top_cited, 1):
        short_title = title[:50] + "..." if len(title) > 50 else title
        print(f"  {i:2d}. {short_title}")
        print(f"      Citations: {citations}")
    
    print("\n" + "=" * 60)
