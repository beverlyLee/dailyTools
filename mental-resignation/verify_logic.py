#!/usr/bin/env python3
"""验证业务逻辑是否符合需求"""

import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from src.nlp.sentiment_miner import SentimentMiner
from src.index.resignation_index import ResignationIndexBuilder
from src.data.mock_data import (
    generate_posts,
    generate_time_heat_data,
)

def verify_business_logic():
    print("=" * 80)
    print("📊 业务逻辑验证")
    print("=" * 80)
    
    posts = generate_posts(count=500)
    miner = SentimentMiner()
    builder = ResignationIndexBuilder()
    kw_freq = miner.extract_keyword_freq(posts)
    
    issues = []
    
    # 验证1: IT行业和广告行业的精神离职指数应最高
    print("\n1. 验证: IT行业和广告行业的精神离职指数应最高")
    industry_idx = builder.build_industry_index(posts, kw_freq)
    print(f"\n行业离职指数排名:")
    for i, item in enumerate(industry_idx[:5], 1):
        print(f"   {i}. {item['industry']}: {item['resignation_index']}")
    
    top_industries = [item['industry'] for item in industry_idx[:2]]
    if "IT互联网" in top_industries and "广告营销" in top_industries:
        print("   ✅ PASS: IT互联网和广告营销行业排名前两位")
    else:
        print(f"   ❌ FAIL: 前两位是 {top_industries}，预期应包含 IT互联网 和 广告营销")
        issues.append(f"行业指数排名错误: 前两位是 {top_industries}，预期IT互联网和广告营销应最高")
    
    # 验证2: 周五下午3点后的讨论热度应达到峰值
    print("\n2. 验证: 周五下午3点后的讨论热度应达到峰值")
    time_heat = generate_time_heat_data()
    friday_data = time_heat.get("周五", [])
    
    slots = [
        "09:00-10:00", "10:00-11:00", "11:00-12:00",
        "12:00-13:00", "13:00-14:00", "14:00-15:00",
        "15:00-16:00", "16:00-17:00", "17:00-18:00",
        "18:00-19:00", "19:00-20:00", "20:00-21:00",
    ]
    
    print(f"\n周五各时段热度:")
    for slot, val in zip(slots, friday_data):
        peak_marker = " 🔥" if val >= max(friday_data) else ""
        print(f"   {slot}: {val:.1f}{peak_marker}")
    
    max_val = max(friday_data)
    max_idx = friday_data.index(max_val)
    max_slot = slots[max_idx]
    
    # 15:00-16:00, 16:00-17:00 对应索引 6, 7
    if max_idx in [6, 7]:
        print(f"\n   ✅ PASS: 周五峰值在 {max_slot} (热度: {max_val:.1f})，符合下午3点后峰值预期")
    else:
        print(f"\n   ❌ FAIL: 周五峰值在 {max_slot} (热度: {max_val:.1f})，预期应在15:00-17:00之间")
        issues.append(f"周五热度峰值时段错误: 峰值在 {max_slot}，预期应在下午3点后(15:00-17:00)")
    
    # 验证3: 检查整体数据结构
    print("\n3. 验证: 数据结构完整性")
    overall = builder.compute_overall_index(industry_idx, builder.build_city_index(posts))
    print(f"   整体精神离职指数: {overall.get('overall_resignation_index', 'N/A')}")
    print(f"   市场状态: {overall.get('market_status', 'N/A')}")
    
    required_keys = ['overall_resignation_index', 'market_status', 'recommendation']
    missing_keys = [k for k in required_keys if k not in overall]
    if not missing_keys:
        print("   ✅ PASS: 整体指数数据结构完整")
    else:
        print(f"   ❌ FAIL: 缺少字段: {missing_keys}")
        issues.append(f"整体指数数据结构不完整，缺少字段: {missing_keys}")
    
    # 验证4: 摸鱼关键词挖掘
    print("\n4. 验证: 关键词挖掘功能")
    top_keywords = list(kw_freq.items())[:10]
    print(f"   前10高频关键词:")
    for kw, freq in top_keywords:
        print(f"     - {kw}: {freq}")
    
    required_keywords = ["摸鱼", "不想上班", "精神离职"]
    found_keywords = [kw for kw in required_keywords if kw in kw_freq]
    if len(found_keywords) == len(required_keywords):
        print(f"\n   ✅ PASS: 所有核心关键词({', '.join(required_keywords)})均被挖掘到")
    else:
        missing = set(required_keywords) - set(found_keywords)
        print(f"\n   ❌ FAIL: 缺少核心关键词: {missing}")
        issues.append(f"关键词挖掘不完整，缺少: {missing}")
    
    # 验证5: 瀑布图数据格式
    print("\n5. 验证: 瀑布图数据格式")
    for day in ["周一", "周五"]:
        data = time_heat.get(day, [])
        if len(data) == 12:
            print(f"   ✅ {day} 数据正常: {len(data)} 个时段")
        else:
            print(f"   ❌ {day} 数据异常: {len(data)} 个时段，预期12个")
            issues.append(f"{day}瀑布图数据长度错误: {len(data)}个时段，预期12个")
    
    print("\n" + "=" * 80)
    if issues:
        print(f"❌ 发现 {len(issues)} 个问题:")
        for i, issue in enumerate(issues, 1):
            print(f"   {i}. {issue}")
    else:
        print("✅ 所有业务逻辑验证通过!")
    print("=" * 80)
    
    return issues

if __name__ == "__main__":
    issues = verify_business_logic()
    with open("/Users/liboyang/trae/dailyTools/mental-resignation/logic_verification.txt", "w", encoding="utf-8") as f:
        f.write("业务逻辑验证结果\n")
        f.write("=" * 80 + "\n")
        if issues:
            f.write(f"发现 {len(issues)} 个问题:\n")
            for i, issue in enumerate(issues, 1):
                f.write(f"{i}. {issue}\n")
        else:
            f.write("所有业务逻辑验证通过!\n")
