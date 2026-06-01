import json
import os
import sys
import threading
from http.server import HTTPServer, BaseHTTPRequestHandler
from typing import List, Dict
import pandas as pd

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
from utils.data_generator import get_or_create_dataset


class MockAPIHandler(BaseHTTPRequestHandler):
    @classmethod
    def load_data(cls):
        dataset = get_or_create_dataset(force_regenerate=True)
        cls.students = dataset.get('grades', pd.DataFrame()).to_dict('records') if not dataset.get('grades', pd.DataFrame()).empty else []
        cls.swipes = dataset.get('swipes', pd.DataFrame()).to_dict('records') if not dataset.get('swipes', pd.DataFrame()).empty else []
    
    students = []
    swipes = []
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
    
    def _set_headers(self, status_code=200):
        self.send_response(status_code)
        self.send_header('Content-type', 'application/json; charset=utf-8')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With')
        self.end_headers()
    
    def do_OPTIONS(self):
        self._set_headers(200)
    
    def do_GET(self):
        path = self.path.split('?')[0]
        
        if path == '/':
            self._set_headers(200)
            response = {
                'success': True,
                'message': 'Mock API Server - 图书馆GPA关联分析',
                'endpoints': {
                    'GET /': 'API信息',
                    'GET /api/health': '健康检查',
                    'GET /api/grades': '获取所有学生成绩',
                    'GET /api/grades/<student_id>': '获取单个学生成绩',
                    'GET /api/swipes': '获取所有刷卡记录',
                    'GET /api/swipes/<student_id>': '获取单个学生的刷卡记录',
                    'GET /api/stats': '获取统计摘要'
                },
                'note': '无需任何权限验证，直接访问即可！'
            }
            self.wfile.write(json.dumps(response, ensure_ascii=False, indent=2).encode('utf-8'))
        
        elif path == '/api/health':
            self._set_headers(200)
            response = {
                'success': True,
                'status': 'ok',
                'message': 'Mock API server is running',
                'students_count': len(self.students),
                'swipes_count': len(self.swipes)
            }
            self.wfile.write(json.dumps(response, ensure_ascii=False).encode('utf-8'))
        
        elif path == '/api/grades':
            self._set_headers(200)
            response = {
                'success': True,
                'message': '获取成功',
                'data': self.students,
                'total': len(self.students)
            }
            self.wfile.write(json.dumps(response, ensure_ascii=False).encode('utf-8'))
        
        elif path.startswith('/api/grades/'):
            student_id = path.replace('/api/grades/', '')
            student = next((s for s in self.students if s['student_id'] == student_id), None)
            if student:
                self._set_headers(200)
                response = {
                    'success': True,
                    'data': student
                }
            else:
                self._set_headers(404)
                response = {
                    'success': False,
                    'message': f'未找到学生 {student_id}'
                }
            self.wfile.write(json.dumps(response, ensure_ascii=False).encode('utf-8'))
        
        elif path == '/api/swipes':
            self._set_headers(200)
            response = {
                'success': True,
                'message': '获取成功',
                'data': self.swipes,
                'total': len(self.swipes)
            }
            self.wfile.write(json.dumps(response, ensure_ascii=False).encode('utf-8'))
        
        elif path.startswith('/api/swipes/'):
            student_id = path.replace('/api/swipes/', '')
            student_swipes = [s for s in self.swipes if s['student_id'] == student_id]
            self._set_headers(200)
            response = {
                'success': True,
                'data': student_swipes,
                'total': len(student_swipes)
            }
            self.wfile.write(json.dumps(response, ensure_ascii=False).encode('utf-8'))
        
        elif path == '/api/stats':
            majors = list(set(s['major'] for s in self.students))
            major_stats = {}
            for major in majors:
                major_students = [s for s in self.students if s['major'] == major]
                major_swipes = [s for s in self.swipes if s['student_id'] in [stu['student_id'] for stu in major_students]]
                major_stats[major] = {
                    'student_count': len(major_students),
                    'swipe_count': len(major_swipes),
                    'avg_gpa': round(sum(s['gpa'] for s in major_students) / len(major_students), 2)
                }
            
            self._set_headers(200)
            response = {
                'success': True,
                'data': {
                    'total_students': len(self.students),
                    'total_swipes': len(self.swipes),
                    'majors': major_stats
                }
            }
            self.wfile.write(json.dumps(response, ensure_ascii=False, indent=2).encode('utf-8'))
        
        else:
            self._set_headers(404)
            response = {
                'success': False,
                'message': 'Endpoint not found',
                'available_endpoints': {
                    'GET /': 'API信息',
                    'GET /api/health': '健康检查',
                    'GET /api/grades': '获取所有学生成绩',
                    'GET /api/swipes': '获取所有刷卡记录',
                    'GET /api/stats': '获取统计摘要'
                }
            }
            self.wfile.write(json.dumps(response, ensure_ascii=False).encode('utf-8'))
    
    def log_message(self, format, *args):
        pass


def run_server(port=8000):
    MockAPIHandler.load_data()
    server_address = ('0.0.0.0', port)
    httpd = HTTPServer(server_address, MockAPIHandler)
    print('=' * 70)
    print('  📚 Mock API Server - 图书馆GPA关联分析')
    print('=' * 70)
    print(f'  ✅ 服务器启动成功！')
    print(f'  🌐 地址: http://localhost:{port}')
    print(f'  🔓 权限: 无需任何token或权限验证！')
    print('=' * 70)
    print('  可用端点:')
    print(f'    GET http://localhost:{port}/')
    print(f'    GET http://localhost:{port}/api/health')
    print(f'    GET http://localhost:{port}/api/grades')
    print(f'    GET http://localhost:{port}/api/grades/<student_id>')
    print(f'    GET http://localhost:{port}/api/swipes')
    print(f'    GET http://localhost:{port}/api/swipes/<student_id>')
    print(f'    GET http://localhost:{port}/api/stats')
    print('=' * 70)
    print(f'  📊 数据统计:')
    print(f'    - 学生数量: {len(MockAPIHandler.students)} 人')
    print(f'    - 刷卡记录: {len(MockAPIHandler.swipes)} 条')
    print('=' * 70)
    httpd.serve_forever()


def start_server_in_background(port=8000):
    MockAPIHandler.load_data()
    server_thread = threading.Thread(target=run_server, args=(port,), daemon=True)
    server_thread.start()
    return server_thread


if __name__ == '__main__':
    run_server()
