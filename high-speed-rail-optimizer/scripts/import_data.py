#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
12306数据导入脚本
从12306公开接口获取车站和时刻表数据
"""

import requests
import json
import re
from datetime import datetime, timedelta
import os
import time
import urllib3

urllib3.disable_warnings()

DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'data')

HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Referer': 'https://www.12306.cn/',
    'Accept': '*/*',
    'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8'
}

# 真实铁路线路配置 - 京沪高铁
RAILWAY_LINES = {
    'beijing_shanghai': {
        'name': '京沪高铁',
        'stations': [
            {'code': 'BJP', 'name': '北京南', 'arrival': None, 'departure': '07:00', 'stay': 0},
            {'code': 'TJP', 'name': '天津南', 'arrival': '07:31', 'departure': '07:33', 'stay': 2},
            {'code': 'JID', 'name': '济南西', 'arrival': '09:02', 'departure': '09:04', 'stay': 2},
            {'code': 'XAG', 'name': '徐州东', 'arrival': '10:15', 'departure': '10:17', 'stay': 2},
            {'code': 'NJH', 'name': '南京南', 'arrival': '11:30', 'departure': '11:32', 'stay': 2},
            {'code': 'SHH', 'name': '上海虹桥', 'arrival': '12:28', 'departure': None, 'stay': 0}
        ]
    }
}

# 车次配置
TRAIN_CONFIGS = [
    {'code': 'G1', 'type': 'G', 'name': '京沪高铁标杆', 'start_time': '07:00', 'end_time': '11:29', 'duration': 269},
    {'code': 'G3', 'type': 'G', 'name': '京沪高铁', 'start_time': '08:00', 'end_time': '12:32', 'duration': 272},
    {'code': 'G5', 'type': 'G', 'name': '京沪高铁', 'start_time': '09:00', 'end_time': '13:38', 'duration': 278},
    {'code': 'G7', 'type': 'G', 'name': '京沪高铁', 'start_time': '10:00', 'end_time': '14:35', 'duration': 275},
    {'code': 'G11', 'type': 'G', 'name': '京沪高铁标杆', 'start_time': '11:00', 'end_time': '15:28', 'duration': 268},
    {'code': 'G13', 'type': 'G', 'name': '京沪高铁', 'start_time': '12:00', 'end_time': '16:41', 'duration': 281},
    {'code': 'G17', 'type': 'G', 'name': '京沪高铁标杆', 'start_time': '15:00', 'end_time': '19:28', 'duration': 268},
    {'code': 'G19', 'type': 'G', 'name': '京沪高铁', 'start_time': '16:00', 'end_time': '20:44', 'duration': 284},
    {'code': 'D31', 'type': 'D', 'name': '京沪动车', 'start_time': '07:20', 'end_time': '13:45', 'duration': 385},
    {'code': 'D33', 'type': 'D', 'name': '京沪动车', 'start_time': '09:10', 'end_time': '15:30', 'duration': 380}
]


def validate_time_format(time_str):
    """验证时间格式 HH:MM"""
    if time_str is None:
        return True
    try:
        datetime.strptime(time_str, '%H:%M')
        return True
    except ValueError:
        return False


def adjust_time(base_time, minutes_delta):
    """调整时间"""
    if base_time is None:
        return None
    try:
        base_dt = datetime.strptime(base_time, '%H:%M')
        new_dt = base_dt + timedelta(minutes=minutes_delta)
        return new_dt.strftime('%H:%M')
    except:
        return None


def generate_stops_for_train(start_time, duration_minutes, stops_template):
    """根据发车时间生成经停站时间"""
    stops = []
    total_stops = len(stops_template)
    
    for i, stop in enumerate(stops_template):
        arrival_time = None
        departure_time = None
        
        if i == 0:
            # 始发站
            departure_time = start_time
        elif i == total_stops - 1:
            # 终点站
            start_dt = datetime.strptime(start_time, '%H:%M')
            arrival_dt = start_dt + timedelta(minutes=duration_minutes)
            arrival_time = arrival_dt.strftime('%H:%M')
        else:
            # 中间站 - 按比例分配时间
            progress = i / (total_stops - 1)
            stop_minutes = int(duration_minutes * progress)
            start_dt = datetime.strptime(start_time, '%H:%M')
            stop_dt = start_dt + timedelta(minutes=stop_minutes)
            arrival_time = stop_dt.strftime('%H:%M')
            departure_time = (stop_dt + timedelta(minutes=stop.get('stay', 2))).strftime('%H:%M')
        
        # 时间格式校验
        if not validate_time_format(arrival_time) and arrival_time is not None:
            print(f"警告: 无效的到站时间 {arrival_time}，已修正")
            arrival_time = None
        if not validate_time_format(departure_time) and departure_time is not None:
            print(f"警告: 无效的发车时间 {departure_time}，已修正")
            departure_time = None
        
        stops.append({
            'station_code': stop['code'],
            'station_name': stop['name'],
            'arrival_time': arrival_time,
            'departure_time': departure_time,
            'stay_minutes': stop.get('stay', 0),
            'sequence': i + 1
        })
    
    return stops


def fetch_stations():
    """获取车站数据"""
    print("正在获取车站数据...")
    url = "https://kyfw.12306.cn/otn/resources/js/framework/station_name.js?version=1.0"
    
    try:
        response = requests.get(url, headers=HEADERS, verify=False, timeout=10)
        response.encoding = 'utf-8'
        
        pattern = r'@(\w+)\|([^|]+)\|([^|]+)\|([^|]+)'
        matches = re.findall(pattern, response.text)
        
        stations = {}
        for match in matches:
            code = match[2]
            name = match[1]
            stations[code] = name
        
        output_path = os.path.join(DATA_DIR, 'stations.json')
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(stations, f, ensure_ascii=False, indent=2)
        
        print(f"成功获取 {len(stations)} 个车站数据")
        return stations
    except Exception as e:
        print(f"获取车站数据失败: {e}")
        print("使用本地车站数据...")
        return load_local_stations()


def load_local_stations():
    """加载本地车站数据"""
    stations = {
        'BJP': '北京南',
        'SHH': '上海虹桥',
        'TJP': '天津南',
        'JID': '济南西',
        'XAG': '徐州东',
        'NJH': '南京南',
        'CQW': '重庆北',
        'WHN': '武汉',
        'XAY': '西安北',
        'GZH': '广州南',
        'SZZ': '深圳北',
        'CDW': '成都东',
        'HHC': '杭州东'
    }
    
    output_path = os.path.join(DATA_DIR, 'stations.json')
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(stations, f, ensure_ascii=False, indent=2)
    
    return stations


def fetch_real_timetable(from_station, to_station, date_str):
    """从12306获取真实余票数据"""
    print(f"正在获取 {date_str} {from_station}->{to_station} 的真实数据...")
    
    url = "https://kyfw.12306.cn/otn/leftTicket/query"
    params = {
        'leftTicketDTO.train_date': date_str,
        'leftTicketDTO.from_station': from_station,
        'leftTicketDTO.to_station': to_station,
        'purpose_codes': 'ADULT'
    }
    
    try:
        response = requests.get(url, headers=HEADERS, params=params, verify=False, timeout=15)
        result = response.json()
        
        if result.get('httpstatus') == 200 and result.get('data'):
            trains = []
            for item in result['data']['result']:
                try:
                    train_info = parse_train_result(item, date_str)
                    if train_info:
                        trains.append(train_info)
                except Exception as e:
                    continue
            
            print(f"成功获取 {len(trains)} 个真实车次")
            return trains
        else:
            print("12306接口返回数据格式异常")
            return []
    except Exception as e:
        print(f"获取真实数据失败: {e}")
        return []


def parse_train_result(item_str, date_str):
    """解析12306返回的车次数据"""
    parts = item_str.split('|')
    
    if len(parts) < 30:
        return None
    
    train_no = parts[3] if len(parts) > 3 else ''
    from_station_code = parts[6] if len(parts) > 6 else ''
    to_station_code = parts[7] if len(parts) > 7 else ''
    departure_time = parts[8] if len(parts) > 8 else ''
    arrival_time = parts[9] if len(parts) > 9 else ''
    duration = parts[10] if len(parts) > 10 else ''
    
    # 解析历时
    try:
        if ':' in duration:
            h, m = duration.split(':')
            duration_minutes = int(h) * 60 + int(m)
        else:
            duration_minutes = 0
    except:
        duration_minutes = 0
    
    # 票价信息
    prices = []
    seat_mapping = [
        ('business', '商务座', 32),
        ('first', '一等座', 31),
        ('second', '二等座', 30),
        ('soft', '软卧', 23),
        ('hard', '硬卧', 28)
    ]
    
    base_price = 553
    for seat_type, seat_name, idx in seat_mapping:
        if len(parts) > idx and parts[idx]:
            price_multiplier = {'business': 3.0, 'first': 1.6, 'second': 1.0, 'soft': 1.2, 'hard': 0.8}
            price = int(base_price * price_multiplier.get(seat_type, 1.0))
            prices.append({
                'seat_type': seat_type,
                'seat_name': seat_name,
                'price': price
            })
    
    # 生成经停站
    line_stations = RAILWAY_LINES['beijing_shanghai']['stations']
    stops = generate_stops_for_train(departure_time, duration_minutes, line_stations)
    
    train_type = 'G' if train_no.startswith('G') else ('D' if train_no.startswith('D') else 'K')
    
    return {
        'train_no': train_no,
        'train_code': train_no,
        'from_station': from_station_code,
        'to_station': to_station_code,
        'from_station_name': '',
        'to_station_name': '',
        'departure_time': departure_time,
        'arrival_time': arrival_time,
        'duration_minutes': duration_minutes,
        'duration_display': duration,
        'train_type': train_type,
        'date': date_str,
        'prices': prices,
        'stops': stops
    }


def generate_mock_timetable():
    """生成模拟时刻表数据"""
    print("正在生成模拟时刻表数据...")
    
    trains = []
    line = RAILWAY_LINES['beijing_shanghai']
    stations = load_local_stations()
    
    # 生成未来7天的数据
    today = datetime.now()
    for day_offset in range(7):
        date = today + timedelta(days=day_offset)
        date_str = date.strftime('%Y-%m-%d')
        
        for config in TRAIN_CONFIGS:
            # 生成经停站
            stops = generate_stops_for_train(config['start_time'], config['duration'], line['stations'])
            
            # 根据车次类型计算价格
            base_price = 553
            if config['type'] == 'G':
                price_multiplier = 1.0
            else:
                price_multiplier = 0.75
            
            second_price = int(base_price * price_multiplier)
            first_price = int(second_price * 1.6)
            business_price = int(second_price * 3.0)
            
            trains.append({
                'train_no': config['code'],
                'train_code': config['code'],
                'from_station': 'BJP',
                'to_station': 'SHH',
                'from_station_name': '北京南',
                'to_station_name': '上海虹桥',
                'departure_time': config['start_time'],
                'arrival_time': config['end_time'],
                'duration_minutes': config['duration'],
                'duration_display': f"{config['duration'] // 60}小时{config['duration'] % 60}分",
                'train_type': config['type'],
                'date': date_str,
                'prices': [
                    {'seat_type': 'second', 'seat_name': '二等座', 'price': second_price},
                    {'seat_type': 'first', 'seat_name': '一等座', 'price': first_price},
                    {'seat_type': 'business', 'seat_name': '商务座', 'price': business_price}
                ],
                'stops': stops
            })
    
    output_path = os.path.join(DATA_DIR, 'timetable_mock.json')
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(trains, f, ensure_ascii=False, indent=2)
    
    print(f"成功生成 {len(trains)} 个模拟车次")
    return trains


def main():
    """主函数"""
    print("=" * 60)
    print("  12306数据导入工具")
    print("=" * 60)
    print()
    
    os.makedirs(DATA_DIR, exist_ok=True)
    
    # 1. 获取车站数据
    stations = fetch_stations()
    
    # 2. 生成模拟数据
    mock_trains = generate_mock_timetable()
    
    # 3. 尝试获取真实数据
    today_str = datetime.now().strftime('%Y-%m-%d')
    real_trains = fetch_real_timetable('BJP', 'SHH', today_str)
    
    # 保存时刻表（优先使用真实数据，回退到模拟数据）
    timetable = real_trains if real_trains else mock_trains
    output_path = os.path.join(DATA_DIR, 'timetable.json')
    
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(timetable, f, ensure_ascii=False, indent=2)
    
    print()
    print("=" * 60)
    print(f"数据导入完成！")
    print(f"  - 车站数量: {len(stations)}")
    print(f"  - 车次数量: {len(timetable)}")
    print(f"  - 数据来源: {'12306真实数据' if real_trains else '模拟数据'}")
    print(f"  - 数据目录: {DATA_DIR}")
    print("=" * 60)


if __name__ == '__main__':
    main()
