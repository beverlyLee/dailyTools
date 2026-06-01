#!/usr/bin/env python3
import argparse
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from retrieval.arxiv_search import search_arxiv_papers
from network.citation_builder import build_citation_network
from analysis.centrality import compute_pagerank, find_central_papers, print_analysis_report
from visualization import visualize_network


def main():
    parser = argparse.ArgumentParser(
        description='Paper Citation Network Analyzer - Analyze citation networks of academic papers',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python main.py -k "Large Language Model" -n 10
  python main.py -k "Transformer" -n 15 --max-citations 30
  python main.py -k "Attention Is All You Need" -n 5 --layout kamada_kawai
        """
    )
    
    parser.add_argument('-k', '--keyword', type=str, required=True,
                        help='Keyword to search for papers')
    parser.add_argument('-n', '--num-papers', type=int, default=10,
                        help='Number of initial papers to retrieve from arXiv')
    parser.add_argument('--max-citations', type=int, default=20,
                        help='Maximum number of citations to retrieve per paper')
    parser.add_argument('--max-references', type=int, default=20,
                        help='Maximum number of references to retrieve per paper')
    parser.add_argument('--layout', type=str, default='spring',
                        choices=['spring', 'kamada_kawai', 'circular', 'spectral'],
                        help='Graph layout algorithm')
    parser.add_argument('--size-by', type=str, default='pagerank',
                        choices=['pagerank', 'citation_count', 'in_degree'],
                        help='Node size based on this metric')
    parser.add_argument('--color-by', type=str, default='year',
                        choices=['year', 'pagerank'],
                        help='Node color based on this metric')
    parser.add_argument('--no-visualize', action='store_true',
                        help='Skip visualization, only print analysis')
    parser.add_argument('--no-labels', action='store_true',
                        help='Hide node labels in visualization')
    
    args = parser.parse_args()
    
    print("=" * 80)
    print("PAPER CITATION NETWORK ANALYZER")
    print("=" * 80)
    print(f"\nSearching arXiv for papers related to: '{args.keyword}'")
    print(f"Number of papers to retrieve: {args.num_papers}")
    
    papers = search_arxiv_papers(args.keyword, max_results=args.num_papers)
    
    if not papers:
        print("\nError: No papers found. Please try a different keyword.")
        return 1
    
    print(f"\nFound {len(papers)} papers:")
    for i, paper in enumerate(papers, 1):
        short_title = paper.title[:60] + "..." if len(paper.title) > 60 else paper.title
        print(f"  {i:2d}. {short_title}")
        print(f"      ID: {paper.arxiv_id} | Year: {paper.published_date[:4]}")
    
    print("\n" + "-" * 80)
    print("Building citation network using Semantic Scholar API...")
    print("This may take a few minutes depending on the number of papers...")
    
    G = build_citation_network(
        papers,
        max_citations=args.max_citations,
        max_references=args.max_references
    )
    
    if G.number_of_nodes() == 0:
        print("\nError: Failed to build citation network.")
        return 1
    
    print("\n" + "-" * 80)
    print("Computing PageRank and analyzing network...")
    
    compute_pagerank(G)
    
    print_analysis_report(G)
    
    if not args.no_visualize:
        print("\nOpening interactive visualization...")
        print("Note: In the visualization, larger nodes represent more influential papers")
        print("      (higher PageRank or more citations)")
        
        visualize_network(
            G,
            layout=args.layout,
            size_by=args.size_by,
            color_by=args.color_by,
            show_labels=not args.no_labels
        )
    
    return 0


if __name__ == '__main__':
    sys.exit(main())
