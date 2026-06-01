import os
import requests
from dotenv import load_dotenv

load_dotenv()

print("=== 测试环境配置")
ark_key = os.getenv("ARK_API_KEY")
volc_key = os.getenv("VOLCENGINE_API_KEY")

print(f"ARK_API_KEY: {'已配置' if ark_key else '未配置'}")
print(f"VOLCENGINE_API_KEY: {'已配置' if volc_key else '未配置'}")

if ark_key:
    print("\n=== 测试API密钥前5个字符:", ark_key[:5])
    
    ENDPOINT_URL = "https://ark.cn-beijing.volces.com/api/v3/chat/completions"
    MODEL_NAME = "doubao-seed-2-0-code-preview-260215"
    
    print(f"\n=== 测试API调用")
    print(f"Endpoint: {ENDPOINT_URL}")
    print(f"Model: {MODEL_NAME}")
    
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {ark_key}"
    }
    
    data = {
        "model": MODEL_NAME,
        "messages": [
            {"role": "user", "content": "你好，请回复'测试成功'"}
        ],
        "temperature": 0.3,
        "max_tokens": 100
    }
    
    try:
        print("\n=== 发送请求...")
        response = requests.post(ENDPOINT_URL, headers=headers, json=data, timeout=30)
        print(f"状态码:", response.status_code)
        print("\n响应头:", dict(response.headers))
        print("\n响应内容:", response.text)
        
        if response.status_code == 200:
            result = response.json()
            print("\n解析后的内容:", result['choices'][0]['message']['content'])
    except Exception as e:
        print(f"\n请求异常: {type(e).__name__}: {e}")
