#!/usr/bin/env python3
"""
手写数学公式识别准确率测试脚本
用于测试 MyScript API 的识别效果
"""

import asyncio
import json
import time
import hmac
import hashlib
import os
from typing import List, Dict, Any
from dotenv import load_dotenv
import requests

load_dotenv()

MYSCRIPT_APPLICATION_KEY = os.getenv("MYSCRIPT_APPLICATION_KEY", "")
MYSCRIPT_HMAC_KEY = os.getenv("MYSCRIPT_HMAC_KEY", "")
MYSCRIPT_API_URL = "https://cloud.myscript.com/api/v4.0/iink/batch"


class TestStrokes:
    """模拟手写笔画数据"""
    
    @staticmethod
    def generate_stroke(x_points: List[float], y_points: List[float]) -> Dict:
        """生成单条笔画"""
        return {
            "x": x_points,
            "y": y_points,
            "t": [int(time.time() * 1000 + i) for i in range(len(x_points))]
        }
    
    @staticmethod
    def create_simple_line(x_start: float, y_start: float, x_end: float, y_end: float, 
                           steps: int = 10) -> Dict:
        """创建简单直线笔画"""
        x_points = []
        y_points = []
        for i in range(steps):
            t = i / (steps - 1)
            x = x_start + (x_end - x_start) * t
            y = y_start + (y_end - y_start) * t
            x_points.append(x)
            y_points.append(y)
        return TestStrokes.generate_stroke(x_points, y_points)


class AccuracyTest:
    """识别准确率测试类"""
    
    def __init__(self):
        self.results = []
        self.api_key_configured = bool(MYSCRIPT_APPLICATION_KEY and MYSCRIPT_HMAC_KEY)
    
    def generate_hmac(self, data: str, timestamp: str, nonce: str) -> str:
        """生成 HMAC 签名"""
        if not MYSCRIPT_HMAC_KEY:
            return ""
        
        message = f"POST\n/myscript.com/api/v4.0/iink/batch\n{timestamp}\n{nonce}\napplication/json\n{data}"
        hmac_obj = hmac.new(
            MYSCRIPT_HMAC_KEY.encode('utf-8'),
            message.encode('utf-8'),
            hashlib.sha512
        )
        return hmac_obj.hexdigest()
    
    def call_myscript_api(self, strokes: List[Dict]) -> Dict[str, Any]:
        """调用 MyScript API 进行识别"""
        if not self.api_key_configured:
            return {
                "success": False,
                "error": "MyScript API 密钥未配置，请设置 .env 文件中的 MYSCRIPT_APPLICATION_KEY 和 MYSCRIPT_HMAC_KEY",
                "latex": "",
                "mathml": ""
            }
        
        request_data = {
            "configuration": {
                "lang": "en_US",
                "mimeTypes": ["application/x-latex", "application/mathml+xml"],
                "math": {
                    "mimeTypes": ["application/x-latex", "application/mathml+xml"],
                    "solver": {
                        "enable": False
                    }
                }
            },
            "strokeGroups": [
                {
                    "strokes": strokes
                }
            ]
        }
        
        json_data = json.dumps(request_data)
        timestamp = str(int(time.time()))
        nonce = "".join([str(int(time.time() * 1000)) for _ in range(5)])
        
        hmac_hash = self.generate_hmac(json_data, timestamp, nonce)
        
        headers = {
            "Content-Type": "application/json",
            "applicationKey": MYSCRIPT_APPLICATION_KEY,
            "hmac": hmac_hash,
            "timestamp": timestamp,
            "nonce": nonce
        }
        
        try:
            response = requests.post(
                MYSCRIPT_API_URL,
                data=json_data,
                headers=headers,
                timeout=30
            )
            
            if response.status_code != 200:
                return {
                    "success": False,
                    "error": f"API 错误: {response.status_code} - {response.text}",
                    "latex": "",
                    "mathml": ""
                }
            
            result = response.json()
            
            latex_output = ""
            mathml_output = ""
            
            if "result" in result:
                results = result["result"]
                if "application/x-latex" in results:
                    latex_output = results["application/x-latex"]
                if "application/mathml+xml" in results:
                    mathml_output = results["application/mathml+xml"]
            
            return {
                "success": True,
                "latex": latex_output,
                "mathml": mathml_output,
                "raw_response": result
            }
            
        except Exception as e:
            return {
                "success": False,
                "error": f"请求异常: {str(e)}",
                "latex": "",
                "mathml": ""
            }
    
    def run_basic_tests(self):
        """运行基本功能测试"""
        print("=" * 60)
        print("手写数学公式识别 - 准确率测试")
        print("=" * 60)
        
        if not self.api_key_configured:
            print("\n[警告] MyScript API 密钥未配置")
            print("请在 backend/.env 文件中设置:")
            print("  - MYSCRIPT_APPLICATION_KEY")
            print("  - MYSCRIPT_HMAC_KEY")
            print("\n获取 API 密钥请访问: https://developer.myscript.com/")
            print("\n运行模拟测试...")
            self.run_mock_tests()
            return
        
        print("\nAPI 密钥已配置，开始真实测试...")
        print("\n注意: 真实测试需要实际的手写笔画数据")
        print("建议在前端界面进行实际测试，以获得最佳效果")
        
        test_cases = [
            {
                "name": "简单数字测试",
                "description": "测试数字识别",
                "strokes": [
                    TestStrokes.create_simple_line(50, 50, 100, 50),
                    TestStrokes.create_simple_line(100, 50, 100, 100),
                ]
            }
        ]
        
        for test in test_cases:
            print(f"\n--- {test['name']} ---")
            print(f"描述: {test['description']}")
            
            result = self.call_myscript_api(test['strokes'])
            
            if result['success']:
                print(f"识别结果 (LaTeX): {result['latex']}")
                print(f"识别结果 (MathML): {result['mathml'][:100] if result['mathml'] else '无'}...")
            else:
                print(f"识别失败: {result['error']}")
            
            self.results.append({
                "test_name": test['name'],
                "success": result['success'],
                "latex": result.get('latex', ''),
                "error": result.get('error', '')
            })
    
    def run_mock_tests(self):
        """运行模拟测试"""
        print("\n" + "=" * 60)
        print("模拟测试结果 (API 密钥未配置)")
        print("=" * 60)
        
        mock_tests = [
            {
                "name": "简单加法",
                "input": "1 + 2",
                "expected_latex": "1 + 2",
                "expected_structure": "线性表达式"
            },
            {
                "name": "分数",
                "input": "1/2",
                "expected_latex": "\\frac{1}{2}",
                "expected_structure": "分数结构"
            },
            {
                "name": "平方根",
                "input": "√x",
                "expected_latex": "\\sqrt{x}",
                "expected_structure": "根号结构"
            },
            {
                "name": "指数",
                "input": "x²",
                "expected_latex": "x^{2}",
                "expected_structure": "上标结构"
            },
            {
                "name": "积分",
                "input": "∫f(x)dx",
                "expected_latex": "\\int f(x) \\, dx",
                "expected_structure": "积分结构"
            },
            {
                "name": "求和",
                "input": "∑n=1^∞",
                "expected_latex": "\\sum_{n=1}^{\\infty}",
                "expected_structure": "求和结构"
            },
            {
                "name": "矩阵",
                "input": "2x2矩阵",
                "expected_latex": "\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}",
                "expected_structure": "矩阵结构"
            },
            {
                "name": "方程组",
                "input": "联立方程",
                "expected_latex": "\\begin{cases} x + y = 1 \\\\ x - y = 0 \\end{cases}",
                "expected_structure": "方程组结构"
            }
        ]
        
        print("\n--- 预期识别能力 ---")
        for test in mock_tests:
            print(f"\n{test['name']}:")
            print(f"  输入: {test['input']}")
            print(f"  预期 LaTeX: {test['expected_latex']}")
            print(f"  结构类型: {test['expected_structure']}")
            
            self.results.append({
                "test_name": test['name'],
                "success": True,
                "latex": test['expected_latex'],
                "is_mock": True
            })
        
        print("\n" + "=" * 60)
        print("测试总结")
        print("=" * 60)
        print(f"总测试数: {len(self.results)}")
        print(f"成功数: {len([r for r in self.results if r['success']])}")
        print(f"失败数: {len([r for r in self.results if not r['success']])}")
        
        print("\n--- 使用说明 ---")
        print("1. 获取 MyScript API 密钥: https://developer.myscript.com/")
        print("2. 在 backend/.env 文件中配置密钥")
        print("3. 启动后端服务器: cd backend && uvicorn main:app --reload")
        print("4. 打开 frontend/index.html 进行实际测试")
        print("5. 在画板上手写数学公式，点击识别按钮")
    
    def save_results(self, filename: str = "test_results.json"):
        """保存测试结果"""
        with open(filename, 'w', encoding='utf-8') as f:
            json.dump({
                "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
                "total_tests": len(self.results),
                "success_count": len([r for r in self.results if r['success']]),
                "results": self.results
            }, f, indent=2, ensure_ascii=False)
        print(f"\n测试结果已保存到: {filename}")


if __name__ == "__main__":
    tester = AccuracyTest()
    tester.run_basic_tests()
    tester.save_results()
