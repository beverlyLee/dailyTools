import sys
import os

MIN_PYTHON = (3, 8)
MAX_PYTHON = (3, 13)
if sys.version_info < MIN_PYTHON or sys.version_info >= MAX_PYTHON:
    print(f"错误: Python 版本需要 >= {MIN_PYTHON[0]}.{MIN_PYTHON[1]} 且 < {MAX_PYTHON[0]}.{MAX_PYTHON[1]}")
    print(f"当前版本: {sys.version}")
    sys.exit(1)

try:
    import tempfile
    tempfile.gettempdir()
except FileNotFoundError:
    import platform
    if platform.system() == 'Windows':
        os.environ['TMP'] = os.environ.get('TMP', os.path.expanduser('~'))
        os.environ['TEMP'] = os.environ.get('TEMP', os.path.expanduser('~'))
    else:
        os.environ['TMPDIR'] = '/tmp'
        if not os.path.exists('/tmp'):
            os.makedirs('/tmp', exist_ok=True)

REQUIRED_PACKAGES = ['sanic', 'sklearn', 'numpy', 'dotenv']
for pkg in REQUIRED_PACKAGES:
    try:
        if pkg == 'sklearn':
            import sklearn
        elif pkg == 'dotenv':
            import dotenv
        else:
            __import__(pkg)
    except ImportError as e:
        print(f"错误: 缺少依赖包 {pkg}")
        print(f"请运行: pip install -r requirements.txt")
        sys.exit(1)

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from sanic import Sanic
from sanic.response import json, file
from urllib.parse import unquote

from data_acquisition.xianyu_crawler import XianyuCrawler
from analysis.hotspot_detector import HotspotDetector

app = Sanic("UsedBikeMarket")

@app.middleware('request')
async def decode_url_params(request):
    for key in request.args:
        if isinstance(request.args[key], list):
            request.args[key] = [unquote(val) for val in request.args[key]]
        else:
            request.args[key] = unquote(request.args[key])

app.static('/', os.path.join(os.path.dirname(os.path.dirname(__file__)), 'static'))

@app.route('/')
async def index(request):
    return await file(os.path.join(os.path.dirname(os.path.dirname(__file__)), 'static', 'index.html'))

@app.route('/api/data', methods=['GET', 'POST'])
async def get_data(request):
    crawler = XianyuCrawler()
    detector = HotspotDetector()
    
    if request.method == 'POST':
        item_type = request.json.get('type') if request.json else None
        keyword = request.json.get('keyword') if request.json else None
    else:
        item_type = request.args.get('type')
        keyword = request.args.get('keyword')
    
    items = crawler.search_items(keyword=keyword, category=item_type)
    
    if item_type and item_type != 'all':
        items = detector.filter_by_type(items, item_type)
    
    hotspots = detector.detect_hotspots(items)
    stats = detector.get_statistics(items)
    
    return json({
        "items": items,
        "hotspots": hotspots,
        **stats
    })

@app.route('/api/stats')
async def get_stats(request):
    crawler = XianyuCrawler()
    detector = HotspotDetector()
    
    items = crawler.get_all_items()
    stats = detector.get_statistics(items)
    
    return json(stats)

@app.route('/api/config')
async def get_config(request):
    gaode_api_key = os.environ.get('GAODE_JS_API_KEY', '')
    return json({
        "gaode_api_key": gaode_api_key
    })

@app.route('/api/hotspots')
async def get_hotspots(request):
    crawler = XianyuCrawler()
    detector = HotspotDetector()
    
    items = crawler.get_all_items()
    hotspots = detector.detect_hotspots(items)
    
    return json({
        "hotspots": hotspots
    })

if __name__ == "__main__":
    from dotenv import load_dotenv
    env_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), '.env')
    if os.path.exists(env_path):
        load_dotenv(env_path)
    
    gaode_key = os.environ.get('GAODE_JS_API_KEY', '')
    if not gaode_key:
        print("警告: 未配置 GAODE_JS_API_KEY，地图功能可能无法正常工作")
    
    print("启动二手自行车/电动车市场分析服务...")
    print(f"访问地址: http://localhost:8000")
    
    app.run(host="0.0.0.0", port=8000, debug=False, single_process=True)
