import sys
import os

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from core.system_monitor import SystemMonitor
from core.database import Database

def test_system_monitor():
    print("=" * 60)
    print("测试 SystemMonitor 模块")
    print("=" * 60)
    
    monitor = SystemMonitor()
    
    print("\n[1] CPU 信息:")
    cpu_info = monitor.get_cpu_info()
    print(f"  物理核心数: {cpu_info['physical_cores']}")
    print(f"  逻辑核心数: {cpu_info['logical_cores']}")
    print(f"  总使用率: {cpu_info['total_usage']}%")
    print(f"  各核心使用率: {cpu_info['per_core_usage']}")
    if cpu_info['current_freq']:
        print(f"  当前频率: {cpu_info['current_freq']:.1f} MHz")
    
    print("\n[2] 内存信息:")
    memory_info = monitor.get_memory_info()
    def format_bytes(b):
        for u in ['B', 'KB', 'MB', 'GB', 'TB']:
            if b < 1024:
                return f"{b:.2f} {u}"
            b /= 1024
        return f"{b:.2f} PB"
    print(f"  总内存: {format_bytes(memory_info['total'])}")
    print(f"  已用: {format_bytes(memory_info['used'])}")
    print(f"  可用: {format_bytes(memory_info['available'])}")
    print(f"  使用率: {memory_info['percent']}%")
    print(f"  交换内存使用率: {memory_info['swap_percent']}%")
    
    print("\n[3] 磁盘信息:")
    disk_info = monitor.get_disk_info()
    print(f"  分区数: {len(disk_info['partitions'])}")
    for p in disk_info['partitions'][:3]:
        print(f"    - {p['mountpoint']}: {format_bytes(p['used'])}/{format_bytes(p['total'])} ({p['percent']}%)")
    print(f"  读取速率: {format_bytes(disk_info['read_bytes_per_sec'])}/s")
    print(f"  写入速率: {format_bytes(disk_info['write_bytes_per_sec'])}/s")
    
    print("\n[4] 网络信息:")
    network_info = monitor.get_network_info()
    print(f"  上传速率: {format_bytes(network_info['bytes_sent_per_sec'])}/s")
    print(f"  下载速率: {format_bytes(network_info['bytes_recv_per_sec'])}/s")
    print(f"  总上传: {format_bytes(network_info['bytes_sent'])}")
    print(f"  总下载: {format_bytes(network_info['bytes_recv'])}")
    
    print("\n[5] GPU 信息:")
    gpu_info = monitor.get_gpu_info()
    if gpu_info['available']:
        print(f"  GPU: {gpu_info['name']}")
        print(f"  使用率: {gpu_info['usage']:.1f}%")
        print(f"  内存: {gpu_info['memory_used']:.0f} MB / {gpu_info['memory_total']:.0f} MB")
        print(f"  温度: {gpu_info['temperature']:.1f} °C")
    else:
        print(f"  未检测到可用 GPU (需要 NVIDIA GPU 并安装 GPUtil)")
    
    print("\n[6] 进程信息:")
    processes = monitor.get_process_list(sort_by='cpu_percent', ascending=False)
    print(f"  进程总数: {len(processes)}")
    print("  前 5 个 CPU 占用最高的进程:")
    for p in processes[:5]:
        print(f"    - PID {p['pid']}: {p['name']} (CPU: {p['cpu_percent']:.1f}%, 内存: {p['memory_percent']:.1f}%)")
    
    print("\n[7] 系统信息:")
    sys_info = monitor.get_system_info()
    for k, v in sys_info.items():
        print(f"  {k}: {v}")
    
    return monitor

def test_database():
    print("\n" + "=" * 60)
    print("测试 Database 模块")
    print("=" * 60)
    
    db = Database()
    
    print("\n[1] 插入测试数据:")
    db.insert_cpu_data(45.5, [40.0, 50.0, 42.0, 50.0])
    db.insert_memory_data(8 * 1024**3, 4 * 1024**3, 4 * 1024**3, 50.0)
    db.insert_disk_io_data(1000000, 500000, 100, 50)
    db.insert_network_io_data(2000000, 10000000, 1000, 5000)
    db.insert_gpu_data(30.0, 2048.0, 8192.0)
    print("  测试数据已插入")
    
    print("\n[2] 查询历史数据:")
    cpu_history = db.get_cpu_history(hours=1)
    print(f"  CPU 历史记录数: {len(cpu_history)}")
    
    memory_history = db.get_memory_history(hours=1)
    print(f"  内存历史记录数: {len(memory_history)}")
    
    disk_history = db.get_disk_io_history(hours=1)
    print(f"  磁盘 I/O 历史记录数: {len(disk_history)}")
    
    network_history = db.get_network_io_history(hours=1)
    print(f"  网络 I/O 历史记录数: {len(network_history)}")
    
    gpu_history = db.get_gpu_history(hours=1)
    print(f"  GPU 历史记录数: {len(gpu_history)}")
    
    print("\n[3] 清理旧数据测试:")
    db.cleanup_old_data(days=7)
    print("  旧数据清理完成 (超过 7 天的数据已删除)")
    
    return db

if __name__ == '__main__':
    print("\n系统资源监视器 - 核心模块测试")
    print("=" * 60)
    
    monitor = test_system_monitor()
    db = test_database()
    
    print("\n" + "=" * 60)
    print("所有测试完成!")
    print("=" * 60)
    print("\n项目结构摘要:")
    print("  main.py              - 程序入口")
    print("  core/")
    print("    system_monitor.py  - 系统监控核心功能")
    print("    database.py        - SQLite 数据存储")
    print("  ui/")
    print("    main_window.py     - PyQt5 图形界面")
    print("  data/")
    print("    monitor.db         - SQLite 数据库文件")
    print("  requirements.txt     - Python 依赖项")
    print("\n运行命令: python3 main.py")
