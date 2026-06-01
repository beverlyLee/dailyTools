#!/usr/bin/env python3
import platform
import subprocess
import sys
import os


def detect_os():
    system = platform.system()
    if system == 'Darwin':
        return 'macos'
    elif system == 'Linux':
        return detect_linux_distro()
    elif system == 'Windows':
        return 'windows'
    else:
        return 'unknown'


def detect_linux_distro():
    try:
        with open('/etc/os-release', 'r') as f:
            content = f.read()
        if 'ubuntu' in content.lower() or 'debian' in content.lower():
            return 'debian'
        elif 'fedora' in content.lower() or 'centos' in content.lower() or 'rhel' in content.lower():
            return 'redhat'
        elif 'arch' in content.lower():
            return 'arch'
    except:
        pass
    return 'linux'


def install_zbar_macos():
    print("🍎 检测到 macOS 系统")
    print("\n安装命令:")
    print("  brew install zbar")
    print("\n如果未安装 Homebrew，请先访问 https://brew.sh/ 安装")
    
    try:
        result = input("\n是否自动执行安装命令？(y/n): ").lower().strip()
        if result == 'y':
            subprocess.run(['brew', 'install', 'zbar'], check=True)
            print("\n✓ zbar 安装完成！请重新运行程序")
            return True
    except Exception as e:
        print(f"\n✗ 安装失败: {e}")
    return False


def install_zbar_debian():
    print("🐧 检测到 Debian/Ubuntu 系统")
    print("\n安装命令:")
    print("  sudo apt-get update")
    print("  sudo apt-get install -y libzbar0")
    
    try:
        result = input("\n是否自动执行安装命令？(y/n): ").lower().strip()
        if result == 'y':
            subprocess.run(['sudo', 'apt-get', 'update'], check=True)
            subprocess.run(['sudo', 'apt-get', 'install', '-y', 'libzbar0'], check=True)
            print("\n✓ zbar 安装完成！请重新运行程序")
            return True
    except Exception as e:
        print(f"\n✗ 安装失败: {e}")
    return False


def install_zbar_redhat():
    print("🎩 检测到 Fedora/CentOS/RHEL 系统")
    print("\n安装命令:")
    print("  sudo dnf install -y zbar-devel")
    
    try:
        result = input("\n是否自动执行安装命令？(y/n): ").lower().strip()
        if result == 'y':
            subprocess.run(['sudo', 'dnf', 'install', '-y', 'zbar-devel'], check=True)
            print("\n✓ zbar 安装完成！请重新运行程序")
            return True
    except Exception as e:
        print(f"\n✗ 安装失败: {e}")
    return False


def install_zbar_arch():
    print("📐 检测到 Arch Linux 系统")
    print("\n安装命令:")
    print("  sudo pacman -S zbar")
    
    try:
        result = input("\n是否自动执行安装命令？(y/n): ").lower().strip()
        if result == 'y':
            subprocess.run(['sudo', 'pacman', '-S', '--noconfirm', 'zbar'], check=True)
            print("\n✓ zbar 安装完成！请重新运行程序")
            return True
    except Exception as e:
        print(f"\n✗ 安装失败: {e}")
    return False


def install_zbar_windows():
    print("🪟 检测到 Windows 系统")
    print("\nWindows 系统安装步骤:")
    print("1. 下载并安装 Visual C++ Redistributable:")
    print("   https://aka.ms/vs/17/release/vc_redist.x64.exe")
    print("\n2. 或者使用 pip 安装预编译版本:")
    print("   pip install pyzbar")
    print("\n3. 如果仍然报错，尝试从以下地址下载 zbar DLL:")
    print("   https://github.com/NaturalHistoryMuseum/pyzbar/issues")
    return False


def install_pyzbar():
    print("\n📦 安装 Python pyzbar 包...")
    try:
        subprocess.run([sys.executable, '-m', 'pip', 'install', 'pyzbar'], check=True)
        print("✓ pyzbar Python 包安装成功！")
        return True
    except Exception as e:
        print(f"✗ pyzbar 安装失败: {e}")
        return False


def test_zbar():
    print("\n🧪 测试 zbar 依赖...")
    try:
        from pyzbar.pyzbar import decode
        print("✓ zbar 依赖检测成功！条码扫描功能可用")
        return True
    except ImportError as e:
        print(f"✗ zbar 依赖仍然缺失: {e}")
        print("\n提示: 安装 zbar 共享库后需要重新运行程序")
        return False


def main():
    print("=" * 50)
    print("📦 zbar 依赖安装助手")
    print("=" * 50)
    
    os_name = detect_os()
    
    installers = {
        'macos': install_zbar_macos,
        'debian': install_zbar_debian,
        'redhat': install_zbar_redhat,
        'arch': install_zbar_arch,
        'linux': install_zbar_debian,
        'windows': install_zbar_windows,
    }
    
    installer = installers.get(os_name)
    if installer:
        installer()
    else:
        print(f"❓ 未识别的操作系统: {os_name}")
        print("请参考 https://github.com/NaturalHistoryMuseum/pyzbar#installation")
    
    print("\n" + "=" * 50)
    print("Python pyzbar 包安装")
    print("=" * 50)
    
    install_pyzbar()
    
    test_zbar()
    
    print("\n" + "=" * 50)
    print("💡 备选方案:")
    print("如果无法安装 zbar，可以使用以下方式:")
    print("1. 直接在软件中手动输入条码号")
    print("2. 使用手机扫描条码后手动输入")
    print("=" * 50)


if __name__ == "__main__":
    main()
