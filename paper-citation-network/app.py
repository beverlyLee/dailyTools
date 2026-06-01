#!/usr/bin/env python3
from flask import Flask, render_template, request, jsonify, send_from_directory
from flask_cors import CORS
import networkx as nx
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from retrieval.arxiv_search import search_arxiv_papers
from network.citation_builder import build_citation_network
from analysis.centrality import compute_pagerank, find_central_papers, analyze_network
from test_data import get_test_citation_network
from data_sources.crossref_api import CrossRefAPI
from data_sources.custom_data import CustomDataImporter

app = Flask(__name__, template_folder='templates', static_folder='static')
CORS(app)

# 数据源信息配置
DATA_SOURCES = {
    'crossref': {
        'name': 'CrossRef API',
        'description': '国际开放获取学术元数据接口，国内访问相对稳定，无需 API Key',
        'features': ['关键词检索', 'DOI查询', '引用关系数据'],
        'limitations': ['引用关系可能不完整', '速率限制: 50请求/秒'],
        'rate_limit': '50 requests/second'
    },
    'test': {
        'name': '内置测试数据',
        'description': '大语言模型领域核心论文引用关系，用于演示功能',
        'features': ['包含12篇核心论文', '引用关系完整', 'PageRank已计算'],
        'limitations': ['数据固定，不支持自定义搜索'],
        'rate_limit': '无限制'
    },
    'custom': {
        'name': '用户自定义数据',
        'description': '支持上传 JSON/CSV 格式的自定义论文引用数据',
        'features': ['JSON格式', 'CSV格式', '完全自定义'],
        'limitations': ['需要用户自行准备数据'],
        'rate_limit': '无限制'
    },
    'test (fallback)': {
        'name': '内置测试数据（降级模式）',
        'description': 'API 不可用时自动切换到内置数据',
        'features': ['与 test 数据源相同'],
        'limitations': ['API 不可用时启用'],
        'rate_limit': '无限制'
    }
}


def graph_to_json(G: nx.DiGraph) -> dict:
    compute_pagerank(G)
    
    nodes = []
    for node_id in G.nodes():
        node_data = G.nodes[node_id]
        nodes.append({
            'id': node_id,
            'title': node_data.get('title', 'Unknown'),
            'authors': node_data.get('authors', []),
            'year': node_data.get('year', 2020),
            'citation_count': node_data.get('citation_count', 0),
            'pagerank': node_data.get('pagerank', 0)
        })
    
    edges = []
    for source, target in G.edges():
        edges.append({
            'source': source,
            'target': target,
            'relation': 'cites'
        })
    
    return {
        'nodes': nodes,
        'edges': edges,
        'num_nodes': G.number_of_nodes(),
        'num_edges': G.number_of_edges()
    }


@app.route('/')
def index():
    return render_template('index.html')


@app.route('/api/search', methods=['GET'])
def search_papers():
    keyword = request.args.get('keyword', 'Large Language Model')
    max_results = int(request.args.get('max_results', 10))
    
    papers = search_arxiv_papers(keyword, max_results=max_results)
    
    result = []
    for paper in papers:
        result.append({
            'arxiv_id': paper.arxiv_id,
            'title': paper.title,
            'authors': paper.authors,
            'abstract': paper.abstract,
            'published_date': paper.published_date,
            'arxiv_url': paper.arxiv_url
        })
    
    return jsonify({
        'success': True,
        'keyword': keyword,
        'count': len(result),
        'papers': result
    })


def build_standard_response(G: nx.DiGraph, keyword: str, data_source: str, message: str = None) -> dict:
    graph_data = graph_to_json(G)
    analysis = analyze_network(G)
    top_papers = find_central_papers(G, top_n=10, method='pagerank')
    
    return {
        'success': True,
        'keyword': keyword,
        'data_source': data_source,
        'message': message,
        'network': graph_data,
        'analysis': analysis,
        'top_papers': [
            {
                'id': pid,
                'title': title,
                'pagerank': score
            }
            for pid, title, score in top_papers
        ]
    }


@app.route('/api/citation-network', methods=['GET'])
def get_citation_network():
    keyword = request.args.get('keyword', 'Large Language Model')
    max_papers = int(request.args.get('max_papers', 10))
    use_test_data = request.args.get('use_test_data', 'false').lower() == 'true'
    
    if use_test_data:
        G = get_test_citation_network()
        return jsonify(build_standard_response(G, keyword, 'test'))
    
    papers = search_arxiv_papers(keyword, max_results=max_papers)
    
    if not papers:
        G = get_test_citation_network()
        return jsonify(build_standard_response(
            G, keyword, 'test (fallback)', 'API unavailable, using test data'
        ))
    
    G = build_citation_network(papers, max_citations=10, max_references=10)
    
    if G.number_of_nodes() < 5:
        G = get_test_citation_network()
        return jsonify(build_standard_response(
            G, keyword, 'test (fallback)', 'API data insufficient, using test data'
        ))
    
    return jsonify(build_standard_response(G, keyword, 'api'))


@app.route('/api/paper/<paper_id>', methods=['GET'])
def get_paper_details(paper_id):
    G = get_test_citation_network()
    
    if paper_id not in G.nodes():
        return jsonify({
            'success': False,
            'error': 'Paper not found'
        }), 404
    
    node_data = G.nodes[paper_id]
    
    in_edges = list(G.in_edges(paper_id))
    out_edges = list(G.out_edges(paper_id))
    
    cited_by = []
    for citer, _ in in_edges:
        citer_data = G.nodes[citer]
        cited_by.append({
            'id': citer,
            'title': citer_data.get('title', 'Unknown')
        })
    
    cites = []
    for _, cited in out_edges:
        cited_data = G.nodes[cited]
        cites.append({
            'id': cited,
            'title': cited_data.get('title', 'Unknown')
        })
    
    return jsonify({
        'success': True,
        'paper': {
            'id': paper_id,
            'title': node_data.get('title', 'Unknown'),
            'authors': node_data.get('authors', []),
            'year': node_data.get('year', 2020),
            'citation_count': node_data.get('citation_count', 0),
            'pagerank': node_data.get('pagerank', 0)
        },
        'cited_by': cited_by,
        'cites': cites
    })


@app.route('/api/test-network', methods=['GET'])
def get_test_network():
    keyword = request.args.get('keyword', 'Large Language Model')
    G = get_test_citation_network()
    return jsonify(build_standard_response(G, keyword, 'test'))


@app.route('/api/crossref-network', methods=['GET'])
def get_crossref_network():
    """使用 CrossRef API 获取引用网络"""
    keyword = request.args.get('keyword', 'Large Language Model')
    max_papers = int(request.args.get('max_papers', 10))
    use_test_fallback = request.args.get('fallback', 'true').lower() == 'true'
    
    try:
        api = CrossRefAPI()
        G = api.build_citation_network(keyword, max_papers=max_papers)
        
        if G.number_of_nodes() < 3 and use_test_fallback:
            G = get_test_citation_network()
            return jsonify(build_standard_response(
                G, keyword, 'test (fallback)', 
                'CrossRef API 返回数据不足，使用测试数据演示'
            ))
        
        return jsonify(build_standard_response(G, keyword, 'crossref'))
    except Exception as e:
        if use_test_fallback:
            G = get_test_citation_network()
            return jsonify(build_standard_response(
                G, keyword, 'test (fallback)', 
                f'CrossRef API 错误: {str(e)}，使用测试数据演示'
            ))
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/api/upload-custom', methods=['POST'])
def upload_custom_data():
    """上传自定义数据"""
    try:
        if 'file' in request.files:
            file = request.files['file']
            filename = file.filename
            
            if filename.endswith('.json'):
                content = file.read().decode('utf-8')
                G = CustomDataImporter.from_json(content)
            elif filename.endswith('.csv'):
                content = file.read().decode('utf-8')
                G = CustomDataImporter.from_csv(content)
            else:
                return jsonify({
                    'success': False,
                    'error': '不支持的文件格式，请上传 .json 或 .csv 文件'
                }), 400
        else:
            data = request.get_json()
            if not data:
                return jsonify({
                    'success': False,
                    'error': '缺少数据'
                }), 400
            
            if 'json_data' in data:
                G = CustomDataImporter.from_json(data['json_data'])
            elif 'csv_data' in data:
                G = CustomDataImporter.from_csv(data['csv_data'])
            else:
                return jsonify({
                    'success': False,
                    'error': '缺少数据字段，请提供 json_data 或 csv_data'
                }), 400
        
        is_valid, errors = CustomDataImporter.validate_graph(G)
        if not is_valid:
            return jsonify({
                'success': False,
                'error': '数据验证失败',
                'details': errors
            }), 400
        
        result = build_standard_response(G, 'Custom Data', 'custom')
        result['warnings'] = errors if errors else []
        
        return jsonify(result)
        
    except ValueError as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 400
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'处理失败: {str(e)}'
        }), 500


@app.route('/api/template/<format_type>', methods=['GET'])
def get_template(format_type):
    """获取数据格式模板"""
    if format_type == 'json':
        return jsonify({
            'success': True,
            'format': 'json',
            'template': CustomDataImporter.get_json_template()
        })
    elif format_type == 'csv':
        return jsonify({
            'success': True,
            'format': 'csv',
            'template': CustomDataImporter.get_csv_template()
        })
    else:
        return jsonify({
            'success': False,
            'error': '不支持的格式类型，请使用 json 或 csv'
        }), 400


@app.route('/api/data-sources', methods=['GET'])
def get_data_sources():
    """获取所有数据源信息"""
    return jsonify({
        'success': True,
        'data_sources': DATA_SOURCES
    })


@app.route('/static/<path:filename>')
def serve_static(filename):
    return send_from_directory('static', filename)


if __name__ == '__main__':
    print("=" * 80)
    print("Paper Citation Network Analyzer - Web Application")
    print("=" * 80)
    print("\nStarting Flask server...")
    import os
    port = int(os.environ.get('PORT', 9999))
    print(f"Open http://localhost:{port} in your browser to use the application")
    print("\nPress Ctrl+C to stop the server")
    print("=" * 80 + "\n")
    
    app.run(debug=True, host='0.0.0.0', port=port)
