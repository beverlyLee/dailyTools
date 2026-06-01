from flask import Flask, render_template, jsonify
import sys
import os

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from src.data_processing.station_list import StationListProcessor
from src.nlp.name_classifier import NameClassifier

app = Flask(__name__)

processor = StationListProcessor()
classifier = NameClassifier()

@app.route('/')
def index():
    cities = processor.get_all_cities()
    return render_template('index.html', cities=cities)

@app.route('/api/cities')
def get_cities():
    cities = processor.get_all_cities()
    return jsonify(cities)

@app.route('/api/analyze/<city>')
def analyze_city(city):
    try:
        df = processor.process_city(city)
        result = classifier.analyze_city(df, city)
        return jsonify({
            'success': True,
            'city': city,
            'total_stations': len(df),
            'data': result
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        })

@app.route('/api/stations/<city>')
def get_stations(city):
    try:
        df = processor.process_city(city)
        stations = []
        for _, row in df.iterrows():
            classification = classifier.classify_station(
                row['station_name'], 
                row['keywords'],
                city
            )
            stations.append({
                'name': row['station_name'],
                'cleaned_name': row['cleaned_name'],
                'keywords': row['keywords'],
                'classification': classification
            })
        return jsonify({
            'success': True,
            'city': city,
            'stations': stations
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        })

@app.route('/api/word_network/<city>')
def get_word_network(city):
    try:
        df = processor.process_city(city)
        
        regional_associations = {
            '西安': [
                ('大雁塔', '曲江'), ('大雁塔', '曲江池'), ('大雁塔', '芙蓉园'),
                ('曲江', '芙蓉'), ('曲江', '大唐'), ('曲江', '不夜城'),
                ('钟楼', '鼓楼'), ('钟楼', '永宁门'), ('钟楼', '南大街'),
                ('大明宫', '未央'), ('大明宫', '太华'), ('未央', '凤城'),
                ('浐灞', '灞桥'), ('浐灞', '世博园'), ('沣东', '沣西'),
                ('高新', '科技路'), ('高新', '丈八'), ('高新', '唐延路'),
                ('航天', '韦曲'), ('航天', '东长安街'), ('经开', '凤城')
            ],
            '北京': [
                ('天安门', '前门'), ('天安门', '王府井'), ('天安门', '东单'),
                ('故宫', '景山'), ('故宫', '北海'), ('故宫', '王府井'),
                ('颐和园', '圆明园'), ('颐和园', '西苑'), ('颐和园', '北宫门'),
                ('中关村', '海淀'), ('中关村', '北大'), ('中关村', '清华'),
                ('国贸', 'CBD'), ('国贸', '大望路'), ('国贸', '双井'),
                ('三里屯', '工体'), ('三里屯', '东直门'), ('国贸', '永安里')
            ],
            '上海': [
                ('陆家嘴', '外滩'), ('陆家嘴', '浦东'), ('陆家嘴', '金融中心'),
                ('人民广场', '南京路'), ('人民广场', '外滩'), ('人民广场', '淮海路'),
                ('静安寺', '南京西路'), ('静安寺', '常熟路'), ('徐家汇', '衡山路'),
                ('张江', '金桥'), ('张江', '高科'), ('张江', '科技'),
                ('虹桥', '机场'), ('虹桥', '火车站'), ('浦东', '机场')
            ],
            '深圳': [
                ('福田', '华强北'), ('福田', '市民中心'), ('福田', '会展中心'),
                ('南山', '科技园'), ('南山', '高新园'), ('南山', '后海'),
                ('前海', '蛇口'), ('前海', '后海'), ('前海', '深圳湾'),
                ('罗湖', '东门'), ('罗湖', '国贸'), ('罗湖', '老街'),
                ('龙华', '深圳北'), ('龙华', '民治'), ('宝安', '机场')
            ],
            '广州': [
                ('天河', '珠江新城'), ('天河', '体育西'), ('天河', '岗顶'),
                ('珠江新城', '花城广场'), ('珠江新城', '广州塔'), ('珠江新城', '猎德'),
                ('越秀', '公园前'), ('越秀', '纪念堂'), ('越秀', '北京路'),
                ('荔湾', '陈家祠'), ('荔湾', '黄沙'), ('荔湾', '西关'),
                ('海珠', '客村'), ('海珠', '赤岗'), ('海珠', '琶洲')
            ],
            '成都': [
                ('春熙路', '太古里'), ('春熙路', 'IFS'), ('春熙路', '盐市口'),
                ('天府广场', '春熙路'), ('天府广场', '骡马市'), ('天府广场', '人民公园'),
                ('武侯祠', '锦里'), ('武侯祠', '高升桥'), ('武侯祠', '洗面桥'),
                ('宽窄巷子', '人民公园'), ('宽窄巷子', '通惠门'), ('宽窄巷子', '中医大'),
                ('高新', '金融城'), ('高新', '世纪城'), ('高新', '孵化园')
            ]
        }
        
        nodes = []
        edges = []
        node_set = set()
        station_keywords_map = {}
        
        for idx, row in df.iterrows():
            keywords = row['keywords']
            station_name = row['station_name']
            station_keywords_map[station_name] = keywords
            
            for keyword in keywords:
                if len(keyword) >= 2:
                    if keyword not in node_set:
                        category = classifier.classify_word(keyword, station_name, city)
                        nodes.append({
                            'id': keyword,
                            'name': keyword,
                            'category': category,
                            'count': 1,
                            'stations': [station_name]
                        })
                        node_set.add(keyword)
                    else:
                        for node in nodes:
                            if node['id'] == keyword:
                                node['count'] += 1
                                if station_name not in node['stations']:
                                    node['stations'].append(station_name)
                                break
        
        for idx, row in df.iterrows():
            keywords = row['keywords']
            valid_keywords = [k for k in keywords if len(k) >= 2 and k in node_set]
            
            for i in range(len(valid_keywords)):
                for j in range(i + 1, len(valid_keywords)):
                    kw1 = valid_keywords[i]
                    kw2 = valid_keywords[j]
                    
                    edge_id = f"{kw1}-{kw2}" if kw1 < kw2 else f"{kw2}-{kw1}"
                    existing_edge = next((e for e in edges if e['id'] == edge_id), None)
                    
                    if existing_edge:
                        existing_edge['value'] += 1
                    else:
                        edges.append({
                            'id': edge_id,
                            'source': kw1,
                            'target': kw2,
                            'value': 1,
                            'type': 'co-occurrence'
                        })
        
        for idx, row in df.iterrows():
            keywords = row['keywords']
            valid_keywords = [k for k in keywords if len(k) >= 2 and k in node_set]
            
            for kw1 in valid_keywords:
                for kw2 in valid_keywords:
                    if kw1 != kw2 and (kw1 in kw2 or kw2 in kw1):
                        source, target = (kw1, kw2) if len(kw1) < len(kw2) else (kw2, kw1)
                        edge_id = f"sub-{source}-{target}"
                        existing_edge = next((e for e in edges if e['id'] == edge_id), None)
                        
                        if not existing_edge:
                            edges.append({
                                'id': edge_id,
                                'source': source,
                                'target': target,
                                'value': 2,
                                'type': 'substring'
                            })
        
        if city in regional_associations:
            for kw1, kw2 in regional_associations[city]:
                if kw1 in node_set and kw2 in node_set:
                    edge_id = f"region-{kw1}-{kw2}" if kw1 < kw2 else f"region-{kw2}-{kw1}"
                    existing_edge = next((e for e in edges if e['id'] == edge_id), None)
                    
                    if not existing_edge:
                        edges.append({
                            'id': edge_id,
                            'source': kw1,
                            'target': kw2,
                            'value': 3,
                            'type': 'regional'
                        })
        
        max_count = max(node['count'] for node in nodes) if nodes else 1
        for node in nodes:
            node['size'] = 5 + (node['count'] / max_count) * 25
        
        top_nodes = sorted(nodes, key=lambda x: x['count'], reverse=True)[:60]
        top_node_ids = set(node['id'] for node in top_nodes)
        top_edges = [e for e in edges if e['source'] in top_node_ids and e['target'] in top_node_ids]
        top_edges = sorted(top_edges, key=lambda x: x['value'], reverse=True)[:120]
        
        for node in top_nodes:
            node['stations'] = node['stations'][:5]
        
        return jsonify({
            'success': True,
            'city': city,
            'nodes': top_nodes,
            'edges': top_edges
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        })

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5001)
