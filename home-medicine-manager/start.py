#!/usr/bin/env python3
"""家庭药品管理系统启动脚本
自动检测并配置zbar库路径，解决Apple Silicon等平台的库查找问题
"""
import os
import sys


def setup_zbar_environment():
    """设置zbar库查找路径"""
    lib_paths = []
    
    if sys.platform == 'darwin':
        lib_paths.extend([
            '/opt/homebrew/lib',
            '/usr/local/lib',
        ])
    elif sys.platform.startswith('linux'):
        lib_paths.extend([
            '/usr/lib',
            '/usr/lib/x86_64-linux-gnu',
            '/usr/lib/aarch64-linux-gnu',
            '/usr/local/lib',
        ])
    
    current_ld_path = os.environ.get('DYLD_LIBRARY_PATH', '')
    new_paths = [p for p in lib_paths if os.path.exists(p)]
    
    if new_paths:
        new_ld_path = ':'.join(new_paths)
        if current_ld_path:
            new_ld_path = new_ld_path + ':' + current_ld_path
        os.environ['DYLD_LIBRARY_PATH'] = new_ld_path
        os.environ['LD_LIBRARY_PATH'] = new_ld_path
        return True
    return False


def test_zbar():
    """测试zbar是否可用"""
    try:
        from pyzbar.pyzbar import decode
        return True, None
    except ImportError as e:
        return False, str(e)


def main():
    print("🏥 家庭药品管理系统 - 启动中...")
    print()
    
    setup_zbar_environment()
    
    zbar_ok, zbar_error = test_zbar()
    if zbar_ok:
        print("✓ 条码扫描功能已就绪")
    else:
        print("⚠️  条码扫描功能受限")
        print(f"   原因: {zbar_error}")
        print("   将降级到手动输入模式")
    
    print()
    print("=" * 50)
    print()
    
    from ui.main_window import main as ui_main
    ui_main()


if __name__ == '__main__':
    main()
