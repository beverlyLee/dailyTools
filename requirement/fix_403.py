#!/usr/bin/env python3
import os
import requests
from dotenv import load_dotenv

load_dotenv()

APP_ID = os.getenv("FEISHU_APP_ID")
APP_SECRET = os.getenv("FEISHU_APP_SECRET")

if not APP_ID or not APP_SECRET:
    print("❌ 请在 .env 中配置 FEISHU_APP_ID / FEISHU_APP_SECRET")
    exit(1)

BASE = "https://open.feishu.cn/open-apis"
DOCX = f"{BASE}/docx/v1"

def get_token():
    url = f"{BASE}/auth/v3/tenant_access_token/internal"
    payload = {"app_id": APP_ID, "app_secret": APP_SECRET}
    r = requests.post(url, json=payload)
    r.raise_for_status()
    return r.json()["tenant_access_token"]

def resolve_doc_id(raw_input):
    import re
    match = re.search(r"/docx/([A-Za-z0-9]+)", raw_input)
    if match:
        return match.group(1)
    return raw_input

def main():
    print("=" * 60)
    print("飞书文档 403 权限问题诊断与修复")
    print("=" * 60)
    
    doc_url = input("请输入文档 URL 或 ID: ").strip()
    doc_id = resolve_doc_id(doc_url)
    print(f"\n📄 文档 ID: {doc_id}")
    
    token = get_token()
    headers = {"Authorization": f"Bearer {token}"}
    
    print("\n" + "=" * 60)
    print("🔍 权限状态分析")
    print("=" * 60)
    
    # 检查元数据读取
    url = f"{DOCX}/documents/{doc_id}"
    r = requests.get(url, headers=headers)
    if r.status_code == 200:
        print("✅ 文档读取权限: 正常 (已有只读权限)")
        data = r.json()
        title = data.get("data", {}).get("document", {}).get("title", "")
        print(f"   文档标题: {title}")
    else:
        print("❌ 文档读取权限: 失败")
        return
    
    print("\n" + "=" * 60)
    print("💡 问题原因")
    print("=" * 60)
    print("你遇到的是飞书文档的典型权限问题：")
    print("")
    print("✅ 应用有【读取】权限")
    print("❌ 应用没有【编辑】权限")
    print("")
    print("⚠️  注意：飞书文档的应用权限添加方式和普通协作者不同！")
    
    print("\n" + "=" * 60)
    print("🔧 解决方案（按顺序尝试）")
    print("=" * 60)
    
    print("\n📌 方案 1：通过「添加文档应用」入口")
    print("   1. 打开文档:", doc_url)
    print("   2. 点击右上角 「...」 (三个点) 按钮")
    print("   3. 选择 「更多」 → 「添加文档应用」")
    print("   4. 搜索你的应用名称并添加，选择「可编辑」权限")
    
    print("\n📌 方案 2：检查应用权限设置")
    print("   1. 登录飞书开放平台: https://open.feishu.cn")
    print("   2. 进入你的应用 → 「权限管理」")
    print("   3. 确保已申请并开通以下权限：")
    print("      ✅ 云文档 - 查看、评论、下载和分享文档")
    print("      ✅ 云文档 - 编辑和管理文档")
    print("      ✅ 新版文档 - 获取文档内容")
    print("      ✅ 新版文档 - 编辑文档内容")
    print("   4. 如果没申请，点击「申请权限」并提交审批")
    
    print("\n📌 方案 3：通过云空间添加")
    print("   1. 打开文档所在的云空间文件夹")
    print("   2. 点击文件夹右上角「...」→「权限设置」")
    print("   3. 添加应用到协作者，设置为「可编辑」")
    
    print("\n📌 方案 4：检查应用状态")
    print("   1. 应用必须是「已发布」状态（不是测试状态）")
    print("   2. 应用版本必须是最新发布的版本")
    print("   3. 如果刚发布，等待 5-10 分钟让权限生效")
    
    print("\n" + "=" * 60)
    print("🎯 操作完成后验证")
    print("=" * 60)
    print("添加权限后，再次运行:")
    print(f"   python check_permission.py")
    print("")
    print("或者直接测试写入:")
    print(f'   python feishu_doc.py write --file "{doc_url}" --insert --content "测试写入"')
    
    print("\n" + "=" * 60)
    print("❓ 如果还是找不到应用")
    print("=" * 60)
    print("1. 确认应用名称（在飞书开放平台查看）")
    print("2. 确认应用已发布到企业可用")
    print("3. 尝试直接搜索应用 ID（不一定支持）")
    print("4. 联系飞书技术支持: https://applink.feishu.cn/TLJpeNdW")

if __name__ == "__main__":
    main()
