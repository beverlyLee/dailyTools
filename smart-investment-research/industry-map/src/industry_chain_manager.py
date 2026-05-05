from .config import config
import logging
from collections import defaultdict

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class IndustryChainManager:
    def __init__(self):
        self.industry_data = config.INDUSTRY_DATA
        self.industry_relations = config.INDUSTRY_RELATIONS
    
    def get_industry_list(self):
        """
        获取所有行业列表
        """
        return list(self.industry_data.keys())
    
    def get_industry_chain(self, industry):
        """
        获取指定行业的产业链结构
        """
        if industry not in self.industry_data:
            return None
        
        chain_data = self.industry_data[industry]
        
        return {
            'industry': industry,
            'upstream': chain_data.get('upstream', []),
            'midstream': chain_data.get('midstream', []),
            'downstream': chain_data.get('downstream', []),
            'summary': self._calculate_chain_summary(chain_data)
        }
    
    def _calculate_chain_summary(self, chain_data):
        """
        计算产业链摘要统计
        """
        total_companies = 0
        total_market_cap = 0
        
        for segment in ['upstream', 'midstream', 'downstream']:
            for item in chain_data.get(segment, []):
                total_companies += item.get('companies', 0)
                total_market_cap += item.get('market_cap', 0)
        
        return {
            'total_companies': total_companies,
            'total_market_cap': total_market_cap,
            'segments': {
                'upstream': {
                    'companies': sum(item.get('companies', 0) for item in chain_data.get('upstream', [])),
                    'market_cap': sum(item.get('market_cap', 0) for item in chain_data.get('upstream', []))
                },
                'midstream': {
                    'companies': sum(item.get('companies', 0) for item in chain_data.get('midstream', [])),
                    'market_cap': sum(item.get('market_cap', 0) for item in chain_data.get('midstream', []))
                },
                'downstream': {
                    'companies': sum(item.get('companies', 0) for item in chain_data.get('downstream', [])),
                    'market_cap': sum(item.get('market_cap', 0) for item in chain_data.get('downstream', []))
                }
            }
        }
    
    def get_segment_companies(self, industry, segment):
        """
        获取指定行业指定环节的公司列表
        """
        chain = self.get_industry_chain(industry)
        if not chain or segment not in chain:
            return []
        
        return chain[segment]
    
    def get_industry_graph(self, industry):
        """
        获取行业图谱数据（用于ECharts关系图）
        """
        if industry not in self.industry_relations:
            return self._generate_default_graph(industry)
        
        return self.industry_relations[industry]
    
    def _generate_default_graph(self, industry):
        """
        生成默认的行业图谱
        """
        chain = self.get_industry_chain(industry)
        if not chain:
            return None
        
        nodes = []
        links = []
        categories = [
            {'name': '上游'},
            {'name': '中游'},
            {'name': '下游'}
        ]
        
        node_id_counter = 0
        for segment in ['upstream', 'midstream', 'downstream']:
            segment_name = '上游' if segment == 'upstream' else '中游' if segment == 'midstream' else '下游'
            for item in chain.get(segment, []):
                node_id = f'node_{node_id_counter}'
                nodes.append({
                    'id': node_id,
                    'name': item.get('name'),
                    'category': segment_name,
                    'symbolSize': min(40 + item.get('market_cap', 0) / 100, 80)
                })
                node_id_counter += 1
        
        upstream_nodes = [n for n in nodes if n['category'] == '上游']
        midstream_nodes = [n for n in nodes if n['category'] == '中游']
        downstream_nodes = [n for n in nodes if n['category'] == '下游']
        
        for upstream in upstream_nodes:
            for midstream in midstream_nodes:
                links.append({'source': upstream['id'], 'target': midstream['id']})
        
        for midstream in midstream_nodes:
            for downstream in downstream_nodes:
                links.append({'source': midstream['id'], 'target': downstream['id']})
        
        return {
            'nodes': nodes,
            'links': links,
            'categories': categories
        }
    
    def find_relation_path(self, industry, start_node, end_node):
        """
        查找两个节点之间的关系路径
        """
        graph = self.get_industry_graph(industry)
        if not graph:
            return None
        
        adjacency = defaultdict(list)
        for link in graph['links']:
            adjacency[link['source']].append(link['target'])
            adjacency[link['target']].append(link['source'])
        
        node_names = {n['id']: n['name'] for n in graph['nodes']}
        name_to_id = {n['name']: n['id'] for n in graph['nodes']}
        
        start_id = name_to_id.get(start_node) or start_node
        end_id = name_to_id.get(end_node) or end_node
        
        visited = set()
        queue = [[start_id]]
        
        while queue:
            path = queue.pop(0)
            node = path[-1]
            
            if node == end_id:
                return [node_names.get(n, n) for n in path]
            
            if node not in visited:
                visited.add(node)
                
                for neighbor in adjacency.get(node, []):
                    if neighbor not in visited:
                        new_path = list(path)
                        new_path.append(neighbor)
                        queue.append(new_path)
        
        return None
    
    def get_related_segments(self, industry, segment_name):
        """
        获取与指定环节相关的上下游环节
        """
        chain = self.get_industry_chain(industry)
        if not chain:
            return None
        
        segment_map = {}
        for seg in ['upstream', 'midstream', 'downstream']:
            for item in chain.get(seg, []):
                segment_map[item.get('name')] = seg
        
        if segment_name not in segment_map:
            return None
        
        current_segment = segment_map[segment_name]
        
        related = {
            'current': segment_name,
            'upstream_segments': [],
            'downstream_segments': []
        }
        
        if current_segment == 'upstream':
            related['downstream_segments'] = [item.get('name') for item in chain.get('midstream', [])]
        elif current_segment == 'midstream':
            related['upstream_segments'] = [item.get('name') for item in chain.get('upstream', [])]
            related['downstream_segments'] = [item.get('name') for item in chain.get('downstream', [])]
        elif current_segment == 'downstream':
            related['upstream_segments'] = [item.get('name') for item in chain.get('midstream', [])]
        
        return related
    
    def compare_industries(self, industry1, industry2):
        """
        比较两个行业的产业链结构
        """
        chain1 = self.get_industry_chain(industry1)
        chain2 = self.get_industry_chain(industry2)
        
        if not chain1 or not chain2:
            return None
        
        return {
            'industry1': industry1,
            'industry2': industry2,
            'comparison': {
                'upstream': {
                    'companies1': chain1['summary']['segments']['upstream']['companies'],
                    'companies2': chain2['summary']['segments']['upstream']['companies'],
                    'market_cap1': chain1['summary']['segments']['upstream']['market_cap'],
                    'market_cap2': chain2['summary']['segments']['upstream']['market_cap']
                },
                'midstream': {
                    'companies1': chain1['summary']['segments']['midstream']['companies'],
                    'companies2': chain2['summary']['segments']['midstream']['companies'],
                    'market_cap1': chain1['summary']['segments']['midstream']['market_cap'],
                    'market_cap2': chain2['summary']['segments']['midstream']['market_cap']
                },
                'downstream': {
                    'companies1': chain1['summary']['segments']['downstream']['companies'],
                    'companies2': chain2['summary']['segments']['downstream']['companies'],
                    'market_cap1': chain1['summary']['segments']['downstream']['market_cap'],
                    'market_cap2': chain2['summary']['segments']['downstream']['market_cap']
                },
                'total': {
                    'companies1': chain1['summary']['total_companies'],
                    'companies2': chain2['summary']['total_companies'],
                    'market_cap1': chain1['summary']['total_market_cap'],
                    'market_cap2': chain2['summary']['total_market_cap']
                }
            }
        }

industry_chain_manager = IndustryChainManager()
