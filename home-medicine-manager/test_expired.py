#!/usr/bin/env python3
from datetime import datetime, timedelta
from inventory.database import MedicineDatabase


def test_expired_medicine():
    db = MedicineDatabase('test_medicine.db')
    
    yesterday = (datetime.now() - timedelta(days=1)).strftime('%Y-%m-%d')
    db.add_medicine(
        barcode='6901234567892',
        name='测试过期药品',
        expiry_date=yesterday,
        manufacturer='测试药厂',
        quantity=1
    )
    
    expired_count, soon_count = db.get_expiry_count()
    print(f"已过期药品数量: {expired_count}")
    print(f"即将过期药品数量: {soon_count}")
    
    if expired_count >= 1:
        print("✓ 测试通过：成功检测到过期药品！")
        print(f"  启动软件时将提示：\"发现 {expired_count} 个过期物品\"")
    else:
        print("✗ 测试失败：未检测到过期药品")
    
    import os
    os.remove('test_medicine.db')


if __name__ == "__main__":
    test_expired_medicine()
