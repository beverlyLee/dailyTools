import networkx as nx
import matplotlib.pyplot as plt
from matplotlib.backend_bases import MouseButton
import numpy as np
from typing import Optional, Dict


class CitationNetworkVisualizer:
    def __init__(self, G: nx.DiGraph):
        self.G = G
        self.fig = None
        self.ax = None
        self.pos = None
        self.node_sizes = None
        self.node_colors = None
        self.selected_node = None
        
    def _prepare_visualization_data(self, size_by: str = 'pagerank', 
                                    color_by: str = 'year'):
        if size_by == 'pagerank':
            scores = [self.G.nodes[node].get('pagerank', 0.001) for node in self.G.nodes()]
            max_score = max(scores) if scores else 1
            self.node_sizes = [3000 * (s / max_score) + 500 for s in scores]
        elif size_by == 'citation_count':
            citations = [self.G.nodes[node].get('citation_count', 1) for node in self.G.nodes()]
            max_cit = max(citations) if citations else 1
            self.node_sizes = [3000 * (c / max_cit) + 500 for c in citations]
        elif size_by == 'in_degree':
            in_degrees = [self.G.in_degree(node) + 1 for node in self.G.nodes()]
            max_deg = max(in_degrees) if in_degrees else 1
            self.node_sizes = [3000 * (d / max_deg) + 500 for d in in_degrees]
        else:
            self.node_sizes = [1000] * self.G.number_of_nodes()
        
        if color_by == 'year':
            years = [self.G.nodes[node].get('year', 2020) for node in self.G.nodes()]
            norm = plt.Normalize(min(years), max(years))
            cmap = plt.cm.viridis
            self.node_colors = [cmap(norm(year)) for year in years]
        elif color_by == 'pagerank':
            scores = [self.G.nodes[node].get('pagerank', 0) for node in self.G.nodes()]
            norm = plt.Normalize(min(scores), max(scores))
            cmap = plt.cm.plasma
            self.node_colors = [cmap(norm(score)) for score in scores]
        else:
            self.node_colors = ['#1f78b4'] * self.G.number_of_nodes()
    
    def _on_click(self, event):
        if event.button is MouseButton.LEFT and event.inaxes:
            for node, (x, y) in self.pos.items():
                dist = np.sqrt((x - event.xdata)**2 + (y - event.ydata)**2)
                node_size_idx = list(self.G.nodes()).index(node)
                threshold = np.sqrt(self.node_sizes[node_size_idx]) / 1000
                
                if dist < threshold:
                    self._show_node_details(node)
                    break
    
    def _show_node_details(self, node_id: str):
        node_data = self.G.nodes[node_id]
        title = node_data.get('title', 'Unknown')
        authors = node_data.get('authors', [])
        year = node_data.get('year', 'N/A')
        citations = node_data.get('citation_count', 0)
        pagerank = node_data.get('pagerank', 0)
        
        print("\n" + "=" * 80)
        print(f"SELECTED PAPER:")
        print("=" * 80)
        print(f"Title: {title}")
        print(f"Authors: {', '.join(authors[:3])}")
        if len(authors) > 3:
            print(f"         ... and {len(authors) - 3} more")
        print(f"Year: {year}")
        print(f"Citation Count: {citations}")
        print(f"PageRank Score: {pagerank:.6f}")
        print(f"Paper ID: {node_id}")
        
        in_edges = list(self.G.in_edges(node_id))
        out_edges = list(self.G.out_edges(node_id))
        print(f"\nCited by {len(in_edges)} papers in this network:")
        for i, (citer, _) in enumerate(in_edges[:5], 1):
            citer_title = self.G.nodes[citer].get('title', 'Unknown')
            print(f"  {i}. {citer_title[:60]}...")
        if len(in_edges) > 5:
            print(f"  ... and {len(in_edges) - 5} more")
        
        print(f"\nCites {len(out_edges)} papers in this network:")
        for i, (_, cited) in enumerate(out_edges[:5], 1):
            cited_title = self.G.nodes[cited].get('title', 'Unknown')
            print(f"  {i}. {cited_title[:60]}...")
        if len(out_edges) > 5:
            print(f"  ... and {len(out_edges) - 5} more")
        print("=" * 80 + "\n")
    
    def draw(self, layout: str = 'spring', size_by: str = 'pagerank', 
             color_by: str = 'year', show_labels: bool = True, 
             figsize: tuple = (14, 10), interactive: bool = True,
             node_label_length: int = 30):
        
        self.fig, self.ax = plt.subplots(figsize=figsize)
        
        if layout == 'spring':
            self.pos = nx.spring_layout(self.G, k=2/np.sqrt(self.G.number_of_nodes()), 
                                        iterations=50, seed=42)
        elif layout == 'kamada_kawai':
            self.pos = nx.kamada_kawai_layout(self.G)
        elif layout == 'circular':
            self.pos = nx.circular_layout(self.G)
        elif layout == 'spectral':
            self.pos = nx.spectral_layout(self.G)
        else:
            self.pos = nx.spring_layout(self.G, seed=42)
        
        self._prepare_visualization_data(size_by=size_by, color_by=color_by)
        
        nx.draw_networkx_edges(self.G, self.pos, alpha=0.3, 
                               edge_color='gray', arrows=True, 
                               arrowsize=10, width=0.8, ax=self.ax)
        
        nx.draw_networkx_nodes(self.G, self.pos, node_size=self.node_sizes,
                               node_color=self.node_colors, alpha=0.8,
                               edgecolors='black', linewidths=0.5, ax=self.ax)
        
        if show_labels:
            labels = {}
            for node in self.G.nodes():
                title = self.G.nodes[node].get('title', 'Unknown')
                if len(title) > node_label_length:
                    title = title[:node_label_length] + "..."
                labels[node] = title
            
            nx.draw_networkx_labels(self.G, self.pos, labels, 
                                    font_size=7, font_weight='bold', ax=self.ax)
        
        self.ax.set_title(f'Citation Network - {self.G.number_of_nodes()} Papers', 
                          fontsize=16, fontweight='bold')
        
        info_text = f"Edges: {self.G.number_of_edges()} | "
        if size_by == 'pagerank':
            info_text += "Node size: PageRank | "
        elif size_by == 'citation_count':
            info_text += "Node size: Citation Count | "
        if color_by == 'year':
            info_text += "Node color: Publication Year"
        elif color_by == 'pagerank':
            info_text += "Node color: PageRank"
        self.ax.text(0.02, 0.02, info_text, transform=self.ax.transAxes, 
                     fontsize=10, bbox=dict(facecolor='white', alpha=0.8))
        
        plt.axis('off')
        plt.tight_layout()
        
        if interactive:
            self.fig.canvas.mpl_connect('button_press_event', self._on_click)
            print("\n" + "=" * 80)
            print("INTERACTIVE VISUALIZATION")
            print("=" * 80)
            print("Click on any node to see detailed information about the paper.")
            print("Close the visualization window to exit.")
            print("=" * 80 + "\n")
        
        plt.show()
    
    def draw_subgraph(self, center_node: str, hops: int = 1, **kwargs):
        nodes_near = set([center_node])
        for _ in range(hops):
            for node in list(nodes_near):
                nodes_near.update([n for n, _ in self.G.in_edges(node)])
                nodes_near.update([n for _, n in self.G.out_edges(node)])
        
        subgraph = self.G.subgraph(nodes_near)
        
        sub_vis = CitationNetworkVisualizer(subgraph)
        sub_vis.draw(**kwargs)


def visualize_network(G: nx.DiGraph, **kwargs):
    vis = CitationNetworkVisualizer(G)
    vis.draw(**kwargs)
    return vis
