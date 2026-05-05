import requests
from bs4 import BeautifulSoup
from urllib.parse import urljoin, urlparse
import re
from datetime import datetime
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from config import Config

class WebCrawler:
    def __init__(self, base_url, max_depth=2, user_agent=None, timeout=10):
        self.base_url = base_url
        self.max_depth = max_depth
        self.user_agent = user_agent or 'SecurityScanner/1.0'
        self.timeout = timeout
        self.visited_urls = set()
        self.found_links = []
        self.headers = {
            'User-Agent': self.user_agent,
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
        }
        
    def crawl(self):
        self._crawl_recursive(self.base_url, 0)
        return self.found_links
    
    def _crawl_recursive(self, url, depth):
        if depth > self.max_depth:
            return
        
        if url in self.visited_urls:
            return
        
        try:
            self.visited_urls.add(url)
            self.found_links.append(url)
            
            response = requests.get(url, headers=self.headers, timeout=self.timeout)
            response.raise_for_status()
            
            soup = BeautifulSoup(response.content, 'lxml')
            
            for link in soup.find_all('a', href=True):
                href = link.get('href')
                full_url = urljoin(url, href)
                
                if self._is_same_domain(full_url):
                    self._crawl_recursive(full_url, depth + 1)
            
            for form in soup.find_all('form'):
                form_action = form.get('action', '')
                full_form_url = urljoin(url, form_action)
                if self._is_same_domain(full_form_url) and full_form_url not in self.found_links:
                    self.found_links.append(full_form_url)
            
        except Exception as e:
            print(f"Error crawling {url}: {str(e)}")
    
    def _is_same_domain(self, url):
        base_domain = urlparse(self.base_url).netloc
        target_domain = urlparse(url).netloc
        return base_domain == target_domain
    
    def extract_forms(self, url):
        forms = []
        try:
            response = requests.get(url, headers=self.headers, timeout=self.timeout)
            soup = BeautifulSoup(response.content, 'lxml')
            
            for form in soup.find_all('form'):
                form_data = {
                    'action': form.get('action', ''),
                    'method': form.get('method', 'get').upper(),
                    'inputs': []
                }
                
                for input_tag in form.find_all(['input', 'textarea', 'select']):
                    input_info = {
                        'name': input_tag.get('name'),
                        'type': input_tag.get('type', 'text'),
                        'value': input_tag.get('value', ''),
                        'placeholder': input_tag.get('placeholder', '')
                    }
                    if input_info['name']:
                        form_data['inputs'].append(input_info)
                
                forms.append(form_data)
                
        except Exception as e:
            print(f"Error extracting forms from {url}: {str(e)}")
        
        return forms
    
    def extract_parameters(self, url):
        params = {}
        
        parsed_url = urlparse(url)
        if parsed_url.query:
            from urllib.parse import parse_qs
            query_params = parse_qs(parsed_url.query)
            for key, values in query_params.items():
                params[key] = values[0] if len(values) == 1 else values
        
        return params
    
    def get_all_urls(self):
        return list(self.found_links)
    
    def get_urls_with_params(self):
        urls_with_params = []
        for url in self.found_links:
            params = self.extract_parameters(url)
            if params:
                urls_with_params.append({
                    'url': url,
                    'params': params
                })
        return urls_with_params
