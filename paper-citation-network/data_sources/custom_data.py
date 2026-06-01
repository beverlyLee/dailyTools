import networkx as nx
import json
import csv
from typing import List, Dict, Optional, Tuple
import io


class CustomDataImporter:
    """
    自定义论文数据导入器
    
    支持的格式：
    - JSON 格式
    - CSV 格式
    """
    
    @staticmethod
    def from_json(json_str: str) -> nx.DiGraph:
        """
        从 JSON 字符串导入引用网络
        
        JSON 格式示例：
        {
            "nodes": [
                {"id": "paper1", "title": "Paper 1", "authors": ["Author A"], "year": 2020, "citation_count": 100},
                {"id": "paper2", "title": "Paper 2", "authors": ["Author B"], "year": 2021, "citation_count": 50}
            ],
            "edges": [
                {"source": "paper2", "target": "paper1", "relation": "cites"}
            ]
        }
        """
        try:
            data = json.loads(json_str)
            G = nx.DiGraph()
            
            for node in data.get('nodes', []):
                node_id = str(node.get('id', ''))
                if not node_id:
                    continue
                    
                G.add_node(
                    node_id,
                    title=node.get('title', 'Unknown Title'),
                    authors=node.get('authors', []),
                    year=node.get('year'),
                    citation_count=node.get('citation_count', 0),
                    pagerank=0.0
                )
            
            for edge in data.get('edges', []):
                source = str(edge.get('source', ''))
                target = str(edge.get('target', ''))
                if source and target:
                    G.add_edge(source, target, relation=edge.get('relation', 'cites'))
            
            return G
        except json.JSONDecodeError:
            raise ValueError("无效的 JSON 格式")
        except Exception as e:
            raise ValueError(f"解析 JSON 数据失败: {str(e)}")
    
    @staticmethod
    def from_csv(csv_str: str, delimiter: str = ',') -> nx.DiGraph:
        """
        从 CSV 字符串导入引用网络
        
        CSV 格式有两种模式：
        
        模式1: 仅节点数据
        id,title,authors,year,citation_count
        paper1,Paper 1,"Author A,Author B",2020,100
        paper2,Paper 2,"Author C",2021,50
        
        模式2: 节点 + 引用关系
        source,target,relation
        paper2,paper1,cites
        """
        try:
            G = nx.DiGraph()
            
            lines = csv_str.strip().split('\n')
            if not lines:
                return G
            
            header = lines[0].lower()
            
            if 'source' in header and 'target' in header:
                reader = csv.DictReader(lines)
                for row in reader:
                    source = str(row.get('source', '')).strip()
                    target = str(row.get('target', '')).strip()
                    if source and target:
                        if source not in G:
                            G.add_node(source, title=source, authors=[], year=None, citation_count=0, pagerank=0.0)
                        if target not in G:
                            G.add_node(target, title=target, authors=[], year=None, citation_count=0, pagerank=0.0)
                        G.add_edge(source, target, relation=row.get('relation', 'cites'))
            else:
                reader = csv.DictReader(lines)
                for row in reader:
                    node_id = str(row.get('id', '')).strip()
                    if not node_id:
                        continue
                    
                    authors_str = row.get('authors', '')
                    authors = [a.strip() for a in authors_str.split(',')] if authors_str else []
                    
                    try:
                        year = int(row.get('year')) if row.get('year') else None
                    except (ValueError, TypeError):
                        year = None
                    
                    try:
                        citation_count = int(row.get('citation_count', 0))
                    except (ValueError, TypeError):
                        citation_count = 0
                    
                    G.add_node(
                        node_id,
                        title=row.get('title', 'Unknown Title'),
                        authors=authors,
                        year=year,
                        citation_count=citation_count,
                        pagerank=0.0
                    )
            
            return G
        except Exception as e:
            raise ValueError(f"解析 CSV 数据失败: {str(e)}")
    
    @staticmethod
    def from_file(file_path: str) -> nx.DiGraph:
        """
        从文件导入数据
        
        根据文件扩展名自动判断格式
        """
        if file_path.endswith('.json'):
            with open(file_path, 'r', encoding='utf-8') as f:
                return CustomDataImporter.from_json(f.read())
        elif file_path.endswith('.csv'):
            with open(file_path, 'r', encoding='utf-8') as f:
                return CustomDataImporter.from_csv(f.read())
        else:
            raise ValueError("不支持的文件格式，请使用 .json 或 .csv 文件")
    
    @staticmethod
    def get_json_template() -> str:
        """返回 JSON 格式模板"""
        template = {
            "nodes": [
                {
                    "id": "10.1234/paper1",
                    "title": "Attention Is All You Need",
                    "authors": ["Author One", "Author Two"],
                    "year": 2020,
                    "citation_count": 100
                },
                {
                    "id": "10.1234/paper2",
                    "title": "BERT: Pre-training of Deep Bidirectional Transformers",
                    "authors": ["Author Three"],
                    "year": 2021,
                    "citation_count": 50
                }
            ],
            "edges": [
                {
                    "source": "10.1234/paper2",
                    "target": "10.1234/paper1",
                    "relation": "cites"
                }
            ]
        }
        return json.dumps(template, indent=2, ensure_ascii=False)
    
    @staticmethod
    def get_csv_template() -> str:
        """返回 CSV 格式模板"""
        return """# 节点数据模板：
id,title,authors,year,citation_count
10.1234/paper1,Attention Is All You Need,"Author One,Author Two",2020,100
10.1234/paper2,BERT: Pre-training of Deep Bidirectional Transformers,Author Three,2021,50

# 引用关系模板（单独文件）：
source,target,relation
10.1234/paper2,10.1234/paper1,cites
"""
    
    @staticmethod
    def validate_graph(G: nx.DiGraph) -> Tuple[bool, List[str]]:
        """
        验证导入的网络数据
        
        Returns:
            (是否有效, 错误信息列表)
        """
        errors = []
        
        if G.number_of_nodes() == 0:
            errors.append("没有节点数据")
        
        for node_id in G.nodes:
            if not node_id:
                errors.append("存在空的节点 ID")
        
        for node_id, data in G.nodes(data=True):
            if 'title' not in data or not data['title']:
                errors.append(f"节点 {node_id} 缺少标题")
        
        if G.number_of_nodes() > 0 and G.number_of_edges() == 0:
            errors.append("警告: 没有引用边（仅节点可显示）")
        
        return (len(errors) == 0 or all(e.startswith('警告') for e in errors), errors)


def test_import():
    """测试导入功能"""
    json_test = '''
    {
        "nodes": [
            {"id": "paper1", "title": "Test Paper 1", "authors": ["A", "B"], "year": 2020, "citation_count": 10},
            {"id": "paper2", "title": "Test Paper 2", "authors": ["C"], "year": 2021, "citation_count": 5}
        ],
        "edges": [
            {"source": "paper2", "target": "paper1", "relation": "cites"}
        ]
    }
    '''
    
    print("Testing JSON import...")
    G = CustomDataImporter.from_json(json_test)
    print(f"  Nodes: {G.number_of_nodes()}")
    print(f"  Edges: {G.number_of_edges()}")
    for node, data in G.nodes(data=True):
        print(f"  {node}: {data['title']}")
    
    csv_test = """id,title,authors,year,citation_count\npaper1,CSV Test,Test Author,2020,10"""
    
    print("\nTesting CSV import...")
    G2 = CustomDataImporter.from_csv(csv_test)
    print(f"  Nodes: {G2.number_of_nodes()}")
    
    print("\nJSON Template:")
    print(CustomDataImporter.get_json_template())


if __name__ == "__main__":
    test_import()
