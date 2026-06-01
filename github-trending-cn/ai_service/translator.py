import os
import requests
import json
from dotenv import load_dotenv
import time

load_dotenv()

ARK_API_KEY = os.getenv("ARK_API_KEY") or os.getenv("VOLCENGINE_API_KEY")
ARK_BASE_URL = os.getenv("ARK_BASE_URL", "https://ark.cn-beijing.volces.com/api/v3")
ARK_MODEL = os.getenv("ARK_MODEL", "doubao-seed-2-0-code-preview-260215")

ENDPOINT_URL = f"{ARK_BASE_URL}/chat/completions"

print(f"[翻译模块] 初始化完成")
print(f"[翻译模块] API密钥已配置: {'是' if ARK_API_KEY else '否'}")
print(f"[翻译模块] Base URL: {ARK_BASE_URL}")
print(f"[翻译模块] Model: {ARK_MODEL}")

async def translate_and_summarize(description: str, repo_name: str) -> str:
    start_time = time.time()
    print(f"\n{'='*60}")
    print(f"[翻译请求] 项目: {repo_name}")
    print(f"[翻译请求] 原始描述长度: {len(description)} 字符")
    
    if not description:
        print(f"[翻译结果] 描述为空，返回默认值")
        print(f"{'='*60}\n")
        return "暂无项目描述"
    
    if not ARK_API_KEY:
        print(f"[翻译结果] API密钥未配置，返回原文")
        print(f"{'='*60}\n")
        return f"[未翻译] {description}"
    
    try:
        prompt = f"""请将以下GitHub项目的描述翻译成中文，并简要总结项目亮点，保持简洁，不超过100字。
项目名称：{repo_name}
项目描述：{description}

请直接输出翻译和总结的结果，不要输出其他内容。"""
        
        print(f"[翻译请求] 正在调用火山引擎API...")
        
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {ARK_API_KEY}"
        }
        
        data = {
            "model": ARK_MODEL,
            "messages": [
                {"role": "user", "content": prompt}
            ],
            "temperature": 0.3,
            "max_tokens": 300
        }
        
        api_start = time.time()
        response = requests.post(ENDPOINT_URL, headers=headers, json=data, timeout=30)
        api_time = round((time.time() - api_start) * 1000, 2)
        
        print(f"[翻译请求] API响应状态码: {response.status_code} (耗时: {api_time}ms)")
        
        if response.status_code != 200:
            print(f"[翻译错误] API返回错误: {response.text}")
            return f"[翻译失败] {description}"
        
        result = response.json()
        translated = result['choices'][0]['message']['content'].strip()
        
        total_time = round((time.time() - start_time) * 1000, 2)
        print(f"[翻译成功] 翻译结果长度: {len(translated)} 字符")
        print(f"[翻译成功] 总耗时: {total_time}ms")
        print(f"[翻译结果] {translated}")
        print(f"{'='*60}\n")
        
        return translated
        
    except requests.exceptions.Timeout as e:
        print(f"[翻译错误] 请求超时: {str(e)}")
        print(f"{'='*60}\n")
        return f"[翻译超时] {description}"
    except requests.exceptions.RequestException as e:
        print(f"[翻译错误] 请求异常: {str(e)}")
        print(f"{'='*60}\n")
        return f"[翻译失败] {description}"
    except Exception as e:
        print(f"[翻译错误] 未知错误: {type(e).__name__}: {str(e)}")
        import traceback
        print(f"[翻译错误] 堆栈:\n{traceback.format_exc()}")
        print(f"{'='*60}\n")
        return f"[翻译失败] {description}"
