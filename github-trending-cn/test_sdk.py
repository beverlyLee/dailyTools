import os
from dotenv import load_dotenv

load_dotenv()

print("=== 测试火山引擎SDK方式")
print("环境变量:")
for key in ['ARK_API_KEY', 'VOLCENGINE_API_KEY', 'VOLC_ACCESS_KEY', 'VOLC_SECRET_KEY']:
    val = os.getenv(key)
    print(f"  {key}: {'已配置' if val else '未配置'}")

# 尝试安装SDK
try:
    from volcengine.maas import MaasService, MaasException
    print("\n✓ volcengine SDK已安装")
    
    access_key = os.getenv('ARK_API_KEY') or os.getenv('VOLCENGINE_API_KEY')
    secret_key = ""  # 尝试看看是否只需要一个密钥
    
    print(f"\n尝试使用API密钥作为Access Key...")
    
    try:
        maas = MaasService('maas-api.volcengineapi.com', 'cn-beijing')
        maas.set_ak(access_key)
        maas.set_sk("")  # 空密钥试试
        
        req = {
            "model": {
                "name": "doubao-pro-32k",
            },
            "messages": [
                {
                    "role": "user",
                    "content": "你好，请回复'测试成功'"
                }
            ]
        }
        
        print("发送请求...")
        resp = maas.chat(req)
        print(f"响应: {resp.choices[0].message.content}")
        
    except Exception as e:
        print(f"SDK调用失败: {e}")
        
except ImportError:
    print("\nvolcengine SDK未安装，尝试安装...")
    os.system("pip install volcengine")
