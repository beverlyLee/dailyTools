import requests
from bs4 import BeautifulSoup
import time
from typing import List, Dict

GITHUB_TRENDING_URL = "https://github.com/trending"
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.5",
}

def get_trending_repos() -> List[Dict]:
    """
    抓取GitHub Trending页面的所有仓库项目
    返回: 包含仓库信息的列表
    """
    repos = []
    
    try:
        print(f"[爬虫] 正在访问: {GITHUB_TRENDING_URL}")
        start_time = time.time()
        
        session = requests.Session()
        session.headers.update(HEADERS)
        
        response = session.get(GITHUB_TRENDING_URL, timeout=30)
        response.raise_for_status()
        
        elapsed = round((time.time() - start_time) * 1000, 2)
        print(f"[爬虫] 页面加载完成，耗时: {elapsed}ms")
        
        soup = BeautifulSoup(response.text, 'html.parser')
        
        # 查找所有仓库项目article元素
        repo_elements = soup.find_all('article', class_='Box-row')
        print(f"[爬虫] 找到 {len(repo_elements)} 个仓库项目")
        
        for idx, repo_elem in enumerate(repo_elements):
            try:
                repo = parse_repo_element(repo_elem, idx + 1)
                if repo:
                    repos.append(repo)
            except Exception as e:
                print(f"[爬虫] 解析第 {idx + 1} 个项目时出错: {e}")
                continue
                
        print(f"[爬虫] 成功解析 {len(repos)} 个仓库项目")
        
    except requests.exceptions.Timeout:
        print(f"[爬虫] 请求超时")
    except requests.exceptions.RequestException as e:
        print(f"[爬虫] 请求失败: {e}")
    except Exception as e:
        print(f"[爬虫] 未知错误: {e}")
    
    return repos

def parse_repo_element(elem, idx: int = 0) -> Dict:
    """
    解析单个仓库元素
    elem: BeautifulSoup元素对象
    idx: 项目序号（用于日志）
    """
    repo = {}
    
    try:
        # ========== 1. 解析仓库名称和URL ==========
        h2_elem = elem.find('h2')
        if h2_elem:
            a_elem = h2_elem.find('a')
            if a_elem:
                repo_path = a_elem.get('href', '').strip('/')
                repo['name'] = repo_path
                repo['url'] = f"https://github.com/{repo_path}"
                
                # 从路径解析owner和repo_name
                if '/' in repo_path:
                    parts = repo_path.split('/')
                    repo['owner'] = parts[0]
                    repo['repo_name'] = parts[1]
                else:
                    repo['owner'] = ''
                    repo['repo_name'] = repo_path
                
                print(f"[爬虫] 项目 {idx}: {repo_path}")
            else:
                print(f"[爬虫] 项目 {idx}: 未找到仓库链接")
                return None
        else:
            print(f"[爬虫] 项目 {idx}: 未找到h2元素")
            return None
        
        # ========== 2. 解析仓库描述 ==========
        p_elem = elem.find('p', class_='col-9')
        if p_elem:
            description = p_elem.get_text(strip=True)
            repo['description'] = description
            print(f"[爬虫]   描述: {description[:60]}...")
        else:
            repo['description'] = ""
            print(f"[爬虫]   描述: 无")
        
        # ========== 3. 解析元数据（语言、星标、分支、今日星标） ==========
        meta_div = elem.find('div', class_='f6')
        if meta_div:
            # 解析编程语言
            lang_span = meta_div.find('span', itemprop='programmingLanguage')
            if lang_span:
                repo['language'] = lang_span.get_text(strip=True)
                print(f"[爬虫]   语言: {repo['language']}")
            else:
                repo['language'] = ""
            
            # 解析链接（star和forks）
            links = meta_div.find_all('a', class_='Link--muted')
            for link in links:
                href = link.get('href', '')
                text = link.get_text(strip=True).replace(',', '')
                
                if '/stargazers' in href:
                    try:
                        repo['stars'] = int(text)
                        print(f"[爬虫]   Star: {repo['stars']}")
                    except (ValueError, TypeError):
                        repo['stars'] = 0
                elif '/forks' in href:
                    try:
                        repo['forks'] = int(text)
                        print(f"[爬虫]   Fork: {repo['forks']}")
                    except (ValueError, TypeError):
                        repo['forks'] = 0
            
            # 解析今日星标
            all_spans = meta_div.find_all('span')
            today_stars = 0
            for span in all_spans:
                text = span.get_text(strip=True)
                if 'stars today' in text or 'star today' in text:
                    num_text = text.split()[0].replace(',', '')
                    try:
                        today_stars = int(num_text)
                        break
                    except (ValueError, TypeError):
                        pass
            
            repo['today_stars'] = today_stars
            if today_stars > 0:
                print(f"[爬虫]   今日星标: {today_stars}")
        else:
            repo['language'] = ""
            repo['stars'] = 0
            repo['forks'] = 0
            repo['today_stars'] = 0
        
        # 确保所有字段都存在
        for key in ['language', 'stars', 'forks', 'today_stars']:
            if key not in repo:
                repo[key] = 0 if key in ['stars', 'forks', 'today_stars'] else ""
        
        return repo
        
    except Exception as e:
        print(f"[爬虫] 解析项目 {idx} 时发生异常: {type(e).__name__}: {e}")
        import traceback
        print(f"[爬虫] 堆栈信息: {traceback.format_exc()[:200]}")
        return None
