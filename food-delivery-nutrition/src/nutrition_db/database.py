#!/usr/bin/env python3
import sqlite3
import os
from datetime import datetime

DB_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), 'data', 'food_nutrition.db')

def get_connection():
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_database():
    conn = get_connection()
    cursor = conn.cursor()
    
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS food_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            alias TEXT,
            category TEXT,
            calories REAL NOT NULL,
            protein REAL,
            fat REAL,
            carbs REAL,
            fiber REAL,
            unit TEXT DEFAULT '100g',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS orders (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            order_date DATE NOT NULL,
            platform TEXT,
            restaurant_name TEXT,
            total_price REAL,
            total_calories REAL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS order_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            order_id INTEGER,
            food_name TEXT NOT NULL,
            quantity REAL DEFAULT 1,
            unit_weight REAL DEFAULT 100,
            calories REAL,
            protein REAL,
            fat REAL,
            carbs REAL,
            FOREIGN KEY (order_id) REFERENCES orders (id)
        )
    ''')
    
    cursor.execute('SELECT COUNT(*) as count FROM food_items')
    count = cursor.fetchone()['count']
    
    if count == 0:
        _insert_default_foods(cursor)
    
    conn.commit()
    conn.close()

def _insert_default_foods(cursor):
    foods = [
        ("米饭", "白米饭,大米饭", "主食", 116, 2.6, 0.3, 25.9, 0.3, "100g"),
        ("馒头", "白面馒头,蒸馍", "主食", 223, 7.0, 1.1, 47.0, 1.3, "100g"),
        ("面条", "挂面,切面", "主食", 286, 8.3, 0.7, 61.9, 0.8, "100g"),
        ("面包", "吐司,全麦面包", "主食", 312, 8.3, 5.1, 58.6, 0.5, "100g"),
        ("饺子", "水饺,蒸饺", "主食", 253, 10.8, 15.6, 17.3, 0.9, "100g"),
        ("包子", "肉包,菜包", "主食", 227, 7.8, 13.0, 18.3, 1.1, "100g"),
        
        ("炸鸡", "炸鸡腿,炸鸡块,香酥鸡", "肉类", 292, 27.5, 18.5, 0.0, 0.0, "100g"),
        ("汉堡", "牛肉堡,鸡肉堡", "快餐", 250, 12.0, 12.0, 25.0, 1.5, "100g"),
        ("薯条", "炸薯条,土豆条", "快餐", 312, 3.4, 15.0, 41.7, 3.1, "100g"),
        ("披萨", "比萨,pizza", "快餐", 266, 11.2, 10.3, 33.3, 1.8, "100g"),
        ("可乐", "可口可乐,碳酸饮料", "饮料", 43, 0.0, 0.0, 10.6, 0.0, "100ml"),
        ("奶茶", "珍珠奶茶,丝袜奶茶", "饮料", 65, 0.8, 2.5, 10.2, 0.0, "100ml"),
        
        ("红烧肉", "红烧五花肉", "肉类", 403, 7.7, 39.1, 2.1, 0.0, "100g"),
        ("宫保鸡丁", "宫爆鸡丁", "肉类", 215, 19.0, 13.0, 8.0, 1.5, "100g"),
        ("鱼香肉丝", "鱼香肉", "肉类", 173, 12.0, 11.0, 5.0, 0.8, "100g"),
        ("麻婆豆腐", "麻辣豆腐", "豆制品", 107, 8.1, 6.1, 4.3, 0.9, "100g"),
        ("水煮鱼", "水煮肉片,沸腾鱼", "肉类", 158, 16.6, 9.0, 0.0, 0.0, "100g"),
        ("回锅肉", "回锅肉", "肉类", 428, 13.6, 40.3, 3.2, 0.2, "100g"),
        
        ("炒青菜", "炒时蔬,炒白菜", "蔬菜", 53, 2.3, 3.6, 3.2, 1.1, "100g"),
        ("番茄炒蛋", "西红柿炒鸡蛋", "蔬菜", 87, 4.5, 6.4, 3.2, 0.5, "100g"),
        ("酸辣土豆丝", "土豆丝", "蔬菜", 102, 2.5, 4.6, 13.2, 1.1, "100g"),
        ("地三鲜", "炒三鲜", "蔬菜", 126, 3.2, 8.5, 10.3, 1.2, "100g"),
        ("干煸豆角", "炒豆角", "蔬菜", 132, 3.9, 9.8, 7.2, 2.1, "100g"),
        
        ("蛋炒饭", "扬州炒饭,炒饭", "主食", 173, 5.8, 7.3, 21.8, 0.5, "100g"),
        ("牛肉拉面", "拉面,牛肉面", "主食", 120, 7.0, 3.0, 16.0, 0.8, "100g"),
        ("螺蛳粉", "螺丝粉", "主食", 150, 5.0, 6.0, 20.0, 1.2, "100g"),
        ("麻辣烫", "冒菜", "火锅", 130, 8.0, 7.0, 10.0, 1.5, "100g"),
        ("烧烤", "烤串,烤肉", "肉类", 230, 15.0, 18.0, 3.0, 0.0, "100g"),
        
        ("牛奶", "纯牛奶,鲜奶", "乳制品", 54, 3.0, 3.2, 3.4, 0.0, "100ml"),
        ("鸡蛋", "鸡蛋,蛋", "蛋类", 143, 12.7, 9.0, 1.5, 0.0, "100g"),
        ("豆腐", "嫩豆腐,老豆腐", "豆制品", 70, 8.1, 3.7, 1.6, 0.4, "100g"),
        ("豆浆", "黄豆浆", "豆制品", 16, 1.8, 0.7, 1.1, 0.0, "100ml"),
        
        ("苹果", "红富士,苹果", "水果", 52, 0.2, 0.2, 13.5, 1.2, "100g"),
        ("香蕉", "香蕉", "水果", 91, 1.1, 0.3, 22.0, 1.2, "100g"),
        ("橙子", "橙子,橘子", "水果", 47, 0.8, 0.2, 11.1, 0.6, "100g"),
        ("西瓜", "西瓜", "水果", 31, 0.5, 0.2, 7.0, 0.3, "100g"),
    ]
    
    for food in foods:
        cursor.execute('''
            INSERT INTO food_items (name, alias, category, calories, protein, fat, carbs, fiber, unit)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', food)

def save_order(order_date, platform, restaurant_name, total_price, items):
    conn = get_connection()
    cursor = conn.cursor()
    
    total_calories = sum(item.get('calories', 0) * item.get('quantity', 1) for item in items)
    
    cursor.execute('''
        INSERT INTO orders (order_date, platform, restaurant_name, total_price, total_calories)
        VALUES (?, ?, ?, ?, ?)
    ''', (order_date, platform, restaurant_name, total_price, total_calories))
    
    order_id = cursor.lastrowid
    
    for item in items:
        cursor.execute('''
            INSERT INTO order_items (order_id, food_name, quantity, unit_weight, calories, protein, fat, carbs)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ''', (order_id, item['food_name'], item.get('quantity', 1), 
              item.get('unit_weight', 100), item.get('calories', 0),
              item.get('protein', 0), item.get('fat', 0), item.get('carbs', 0)))
    
    conn.commit()
    conn.close()
    return order_id

def get_orders_by_date(date_str):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute('''
        SELECT o.*, GROUP_CONCAT(oi.food_name, ', ') as foods
        FROM orders o
        LEFT JOIN order_items oi ON o.id = oi.order_id
        WHERE o.order_date = ?
        GROUP BY o.id
        ORDER BY o.created_at DESC
    ''', (date_str,))
    orders = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return orders

def get_daily_calories(start_date, end_date):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute('''
        SELECT order_date, SUM(total_calories) as total_calories
        FROM orders
        WHERE order_date BETWEEN ? AND ?
        GROUP BY order_date
        ORDER BY order_date
    ''', (start_date, end_date))
    data = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return data

def get_all_foods():
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM food_items ORDER BY name')
    foods = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return foods

if __name__ == '__main__':
    init_database()
    print("数据库初始化完成！")
