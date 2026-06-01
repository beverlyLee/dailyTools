#!/usr/bin/env python3
import sys
import os
import tempfile

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from src.database import Database


def test_database_creation():
    """测试数据库创建"""
    with tempfile.NamedTemporaryFile(delete=False, suffix='.db') as tmp:
        db_path = tmp.name
    
    try:
        db = Database(db_path)
        assert os.path.exists(db_path)
        print("✅ test_database_creation passed")
    finally:
        if os.path.exists(db_path):
            os.unlink(db_path)


def test_product_operations():
    """测试产品操作"""
    with tempfile.NamedTemporaryFile(delete=False, suffix='.db') as tmp:
        db_path = tmp.name
    
    try:
        db = Database(db_path)
        
        product_id = db.get_or_create_product('京东', '测试产品', 'http://test.com', 'TEST001')
        assert product_id > 0
        
        products = db.get_all_products()
        assert len(products) >= 1
        assert products[0]['platform'] == '京东'
        assert products[0]['name'] == '测试产品'
        
        print("✅ test_product_operations passed")
    finally:
        if os.path.exists(db_path):
            os.unlink(db_path)


def test_price_history():
    """测试价格历史"""
    with tempfile.NamedTemporaryFile(delete=False, suffix='.db') as tmp:
        db_path = tmp.name
    
    try:
        db = Database(db_path)
        product_id = db.get_or_create_product('京东', '测试产品')
        
        db.save_price(product_id, 2680.0, source_type='mock')
        db.save_price(product_id, 2580.0, source_type='real')
        
        history = db.get_price_history(product_id)
        assert len(history) == 2
        
        latest = db.get_latest_price(product_id)
        assert latest['price'] == 2580.0
        
        print("✅ test_price_history passed")
    finally:
        if os.path.exists(db_path):
            os.unlink(db_path)


def test_comment_operations():
    """测试评论操作"""
    with tempfile.NamedTemporaryFile(delete=False, suffix='.db') as tmp:
        db_path = tmp.name
    
    try:
        db = Database(db_path)
        product_id = db.get_or_create_product('京东', '测试产品')
        
        sentiment_data = {
            'sentiment_score': 0.85,
            'taste_score': 0.9,
            'packaging_score': 0.8,
            'logistics_score': 0.95,
            'has_counterfeit_mention': False
        }
        
        db.save_comment(product_id, '测试评论', sentiment_data, source_type='mock')
        
        stats = db.get_sentiment_stats(product_id)
        assert stats['avg_sentiment'] == 0.85
        assert stats['total_comments'] == 1
        
        print("✅ test_comment_operations passed")
    finally:
        if os.path.exists(db_path):
            os.unlink(db_path)


def test_source_type_filter():
    """测试数据来源过滤"""
    with tempfile.NamedTemporaryFile(delete=False, suffix='.db') as tmp:
        db_path = tmp.name
    
    try:
        db = Database(db_path)
        product_id = db.get_or_create_product('京东', '测试产品')
        
        db.save_price(product_id, 2680.0, source_type='mock')
        db.save_price(product_id, 2580.0, source_type='real')
        
        mock_history = db.get_price_history(product_id, source_type='mock')
        real_history = db.get_price_history(product_id, source_type='real')
        
        assert len(mock_history) == 1
        assert len(real_history) == 1
        
        print("✅ test_source_type_filter passed")
    finally:
        if os.path.exists(db_path):
            os.unlink(db_path)


if __name__ == '__main__':
    print("🗄️  开始运行数据库模块测试...\n")
    test_database_creation()
    test_product_operations()
    test_price_history()
    test_comment_operations()
    test_source_type_filter()
    print("\n🎉 所有测试通过！")
