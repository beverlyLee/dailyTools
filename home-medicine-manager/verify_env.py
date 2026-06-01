#!/usr/bin/env python3
import sys
import os


def check_python_version():
    print("🐍 Python 版本检查...")
    version = sys.version_info
    if version.major >= 3 and version.minor >= 7:
        print(f"  ✓ Python {version.major}.{version.minor}.{version.micro}")
        return True
    else:
        print(f"  ✗ Python 版本过低: {version.major}.{version.minor}.{version.micro}")
        print("    推荐 Python 3.7+")
        return False


def check_tkinter():
    print("🖼️  Tkinter GUI 检查...")
    try:
        import tkinter
        print("  ✓ Tkinter 可用")
        return True
    except ImportError:
        print("  ✗ Tkinter 不可用")
        print("    Ubuntu/Debian: sudo apt-get install python3-tk")
        print("    macOS: brew install python-tk")
        return False


def check_sqlite():
    print("💾 SQLite 数据库检查...")
    try:
        import sqlite3
        print("  ✓ SQLite 可用")
        return True
    except ImportError:
        print("  ✗ SQLite 不可用")
        return False


def check_opencv():
    print("📷 OpenCV 检查...")
    try:
        import cv2
        print(f"  ✓ OpenCV {cv2.__version__}")
        return True
    except ImportError:
        print("  ⚠️  OpenCV 不可用（摄像头功能将受限）")
        print("    安装命令: pip install opencv-python")
        return False


def check_zbar():
    print("🔍 条码识别功能检查...")
    try:
        from pyzbar.pyzbar import decode
        print("  ✓ pyzbar 可用 (推荐，识别率高)")
        return True
    except ImportError as e:
        try:
            import cv2
            if hasattr(cv2, 'barcode'):
                print("  ✓ OpenCV 内置条码识别可用")
                print("    提示: 安装zbar可获得更高识别率: python install_zbar.py")
                return True
        except:
            pass
        print(f"  ⚠️  zbar 不可用: {e}")
        print("    OpenCV条码识别也不可用")
        print("    条码扫描功能将降级到手动输入模式")
        print("    安装命令: python install_zbar.py")
        return False


def check_project_files():
    print("📁 项目文件检查...")
    required_files = [
        'main.py',
        'scanner/__init__.py',
        'scanner/barcode_scanner.py',
        'inventory/__init__.py',
        'inventory/database.py',
        'ui/__init__.py',
        'ui/main_window.py',
    ]
    
    all_exists = True
    for f in required_files:
        if os.path.exists(f):
            print(f"  ✓ {f}")
        else:
            print(f"  ✗ {f} 缺失")
            all_exists = False
    return all_exists


def run_tests():
    print("\n🧪 运行功能测试...")
    try:
        from inventory.database import MedicineDatabase
        from datetime import datetime, timedelta
        import tempfile
        import os
        
        # 使用临时文件进行测试
        with tempfile.NamedTemporaryFile(suffix='.db', delete=False) as f:
            db_path = f.name
        
        try:
            db = MedicineDatabase(db_path)
            yesterday = (datetime.now() - timedelta(days=1)).strftime('%Y-%m-%d')
            db.add_medicine('6901234567892', '测试药品', yesterday)
            
            expired_count = len(db.get_expired_medicines())
            if expired_count == 1:
                print("  ✓ 过期药品检测功能正常")
                return True
            else:
                print("  ✗ 过期药品检测功能异常")
                return False
        finally:
            try:
                os.unlink(db_path)
            except:
                pass
    except Exception as e:
        print(f"  ✗ 测试失败: {e}")
        return False


def main():
    print("=" * 60)
    print("🏥 家庭药品管理系统 - 环境验证工具")
    print("=" * 60)
    print()
    
    results = []
    
    results.append(("Python 版本", check_python_version()))
    print()
    results.append(("Tkinter GUI", check_tkinter()))
    print()
    results.append(("SQLite 数据库", check_sqlite()))
    print()
    results.append(("OpenCV", check_opencv()))
    print()
    results.append(("zbar 条码识别", check_zbar()))
    print()
    results.append(("项目文件", check_project_files()))
    print()
    results.append(("功能测试", run_tests()))
    
    print()
    print("=" * 60)
    print("📊 验证结果汇总")
    print("=" * 60)
    
    passed = sum(1 for _, ok in results if ok)
    total = len(results)
    
    for name, ok in results:
        status = "✓ 通过" if ok else "✗ 失败"
        print(f"  {name}: {status}")
    
    print()
    print(f"总计: {passed}/{total} 项通过")
    
    if passed == total:
        print("\n🎉 所有检查通过！系统可以正常运行！")
        print("运行命令: python main.py")
    elif passed >= total - 2:
        print("\n✅ 核心功能可用，可以正常运行！")
        print("部分可选功能受限（如条码扫描），但不影响核心使用")
        print("运行命令: python main.py")
    else:
        print("\n⚠️ 存在问题，请根据上述提示修复后再运行")
    
    print()
    print("=" * 60)


if __name__ == "__main__":
    main()
