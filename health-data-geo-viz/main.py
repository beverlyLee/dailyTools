#!/usr/bin/env python3
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from fetcher import NHCCrawler
from geo import GeoCoder
from charts import FluHeatmap


def generate_sample_data():
    sample_data = [
        {'province': '北京', 'percentage': 5.2, 'cases': 12500},
        {'province': '天津', 'percentage': 4.1, 'cases': 8200},
        {'province': '河北', 'percentage': 3.8, 'cases': 15200},
        {'province': '山西', 'percentage': 3.2, 'cases': 9600},
        {'province': '内蒙古', 'percentage': 2.9, 'cases': 5800},
        {'province': '辽宁', 'percentage': 4.5, 'cases': 13500},
        {'province': '吉林', 'percentage': 3.9, 'cases': 9750},
        {'province': '黑龙江', 'percentage': 4.2, 'cases': 12600},
        {'province': '上海', 'percentage': 6.8, 'cases': 17000},
        {'province': '江苏', 'percentage': 5.5, 'cases': 22000},
        {'province': '浙江', 'percentage': 6.1, 'cases': 18300},
        {'province': '安徽', 'percentage': 4.8, 'cases': 14400},
        {'province': '福建', 'percentage': 5.3, 'cases': 13250},
        {'province': '江西', 'percentage': 4.4, 'cases': 11000},
        {'province': '山东', 'percentage': 5.7, 'cases': 25650},
        {'province': '河南', 'percentage': 5.1, 'cases': 22950},
        {'province': '湖北', 'percentage': 5.9, 'cases': 17700},
        {'province': '湖南', 'percentage': 5.4, 'cases': 16200},
        {'province': '广东', 'percentage': 7.2, 'cases': 28800},
        {'province': '广西', 'percentage': 4.7, 'cases': 11750},
        {'province': '海南', 'percentage': 3.5, 'cases': 3500},
        {'province': '重庆', 'percentage': 6.3, 'cases': 15750},
        {'province': '四川', 'percentage': 5.6, 'cases': 22400},
        {'province': '贵州', 'percentage': 4.3, 'cases': 10750},
        {'province': '云南', 'percentage': 4.6, 'cases': 13800},
        {'province': '西藏', 'percentage': 1.8, 'cases': 900},
        {'province': '陕西', 'percentage': 4.9, 'cases': 14700},
        {'province': '甘肃', 'percentage': 3.6, 'cases': 7200},
        {'province': '青海', 'percentage': 2.5, 'cases': 2500},
        {'province': '宁夏', 'percentage': 3.3, 'cases': 3300},
        {'province': '新疆', 'percentage': 3.1, 'cases': 7750},
    ]
    return sample_data


def main():
    print("=" * 60)
    print("疫情时空分析系统 - 国家卫健委数据可视化")
    print("=" * 60)
    
    base_dir = os.path.dirname(os.path.abspath(__file__))
    output_dir = os.path.join(base_dir, 'output')
    data_file = os.path.join(base_dir, 'data', 'latest_data.json')
    
    crawler = NHCCrawler()
    geo_coder = GeoCoder()
    heatmap = FluHeatmap(output_dir)
    
    print("\n[1] 从国家卫健委官网获取流感数据...")
    raw_data = crawler.fetch_flu_data()
    
    os.makedirs(os.path.dirname(data_file), exist_ok=True)
    crawler.save_to_json(raw_data, data_file)
    print(f"  数据已缓存到: {data_file}")
    
    print(f"\n[2] 地理编码处理 {len(raw_data)} 个省份数据...")
    geo_data = geo_coder.batch_geo_code(raw_data)
    
    print("\n[3] 生成热力图...")
    heatmap_path = heatmap.create_province_heatmap(
        geo_data,
        title="中国各省份流感样病例百分比",
        subtitle="数据来源：国家卫生健康委员会",
        output_file="flu_heatmap.html"
    )
    
    print("\n[4] 生成地理散点图...")
    scatter_path = heatmap.create_geo_scatter(
        geo_data,
        title="中国各省份流感病例分布",
        output_file="flu_scatter.html"
    )
    
    print("\n" + "=" * 60)
    print("可视化生成完成！")
    print("=" * 60)
    print(f"\n热力图文件: {heatmap_path}")
    print(f"散点图文件: {scatter_path}")
    print(f"\n输出目录: {output_dir}")
    print("\n提示:")
    print("  1. 运行 './run_web.sh' 启动 Web 服务查看完整可视化界面")
    print("  2. 或直接用浏览器打开 HTML 文件查看图表")
    print("  3. 鼠标悬停在省份上可查看详细数据")


if __name__ == "__main__":
    main()
