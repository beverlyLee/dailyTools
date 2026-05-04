import sys
import os
from datetime import datetime
from typing import List, Dict, Any

from PyQt5.QtWidgets import (
    QApplication, QMainWindow, QWidget, QVBoxLayout, QHBoxLayout,
    QTabWidget, QLabel, QProgressBar, QTableWidget, QTableWidgetItem,
    QHeaderView, QPushButton, QGroupBox, QSplitter, QFrame, QScrollArea,
    QMessageBox, QComboBox, QSpinBox, QCheckBox, QStatusBar
)
from PyQt5.QtCore import Qt, QTimer, pyqtSignal, QThread
from PyQt5.QtGui import QFont, QColor

# 添加项目根目录到路径
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from core.system_monitor import SystemMonitor
from core.database import Database


def format_bytes(bytes_val: int) -> str:
    for unit in ['B', 'KB', 'MB', 'GB', 'TB']:
        if bytes_val < 1024:
            return f"{bytes_val:.2f} {unit}"
        bytes_val /= 1024
    return f"{bytes_val:.2f} PB"


def format_bytes_per_sec(bytes_per_sec: float) -> str:
    for unit in ['B/s', 'KB/s', 'MB/s', 'GB/s']:
        if bytes_per_sec < 1024:
            return f"{bytes_per_sec:.2f} {unit}"
        bytes_per_sec /= 1024
    return f"{bytes_per_sec:.2f} TB/s"


class MonitoringWorker(QThread):
    data_ready = pyqtSignal(dict)
    
    def __init__(self, monitor: SystemMonitor, db: Database):
        super().__init__()
        self.monitor = monitor
        self.db = db
        self.running = True
        self.interval = 1000
    
    def run(self):
        while self.running:
            try:
                cpu_info = self.monitor.get_cpu_info()
                memory_info = self.monitor.get_memory_info()
                disk_info = self.monitor.get_disk_info()
                network_info = self.monitor.get_network_info()
                gpu_info = self.monitor.get_gpu_info()
                
                self.db.insert_cpu_data(cpu_info['total_usage'], cpu_info['per_core_usage'])
                self.db.insert_memory_data(
                    memory_info['total'],
                    memory_info['available'],
                    memory_info['used'],
                    memory_info['percent']
                )
                self.db.insert_disk_io_data(
                    disk_info['total_read_bytes'],
                    disk_info['total_write_bytes'],
                    disk_info['total_read_count'],
                    disk_info['total_write_count']
                )
                self.db.insert_network_io_data(
                    network_info['bytes_sent'],
                    network_info['bytes_recv'],
                    network_info['packets_sent'],
                    network_info['packets_recv']
                )
                if gpu_info['available']:
                    self.db.insert_gpu_data(
                        gpu_info['usage'],
                        gpu_info['memory_used'],
                        gpu_info['memory_total']
                    )
                
                data = {
                    'cpu': cpu_info,
                    'memory': memory_info,
                    'disk': disk_info,
                    'network': network_info,
                    'gpu': gpu_info
                }
                
                self.data_ready.emit(data)
            except Exception as e:
                print(f"Monitoring error: {e}")
            
            self.msleep(self.interval)
    
    def stop(self):
        self.running = False
        self.wait()


class CPUWidget(QWidget):
    def __init__(self):
        super().__init__()
        self.init_ui()
    
    def init_ui(self):
        layout = QVBoxLayout(self)
        
        group = QGroupBox("CPU 监控")
        group_layout = QVBoxLayout(group)
        
        info_layout = QHBoxLayout()
        
        self.cores_label = QLabel("核心数: -")
        self.cores_label.setFont(QFont("Arial", 10))
        info_layout.addWidget(self.cores_label)
        
        self.freq_label = QLabel("频率: -")
        self.freq_label.setFont(QFont("Arial", 10))
        info_layout.addWidget(self.freq_label)
        
        info_layout.addStretch()
        group_layout.addLayout(info_layout)
        
        total_layout = QHBoxLayout()
        total_layout.addWidget(QLabel("总使用率:"))
        self.total_progress = QProgressBar()
        self.total_progress.setRange(0, 100)
        self.total_progress.setValue(0)
        self.total_progress.setMinimumHeight(25)
        total_layout.addWidget(self.total_progress)
        
        self.total_label = QLabel("0%")
        self.total_label.setFont(QFont("Arial", 10, QFont.Bold))
        total_layout.addWidget(self.total_label)
        
        group_layout.addLayout(total_layout)
        
        cores_group = QGroupBox("各核心使用率")
        cores_layout = QVBoxLayout(cores_group)
        
        scroll = QScrollArea()
        scroll.setWidgetResizable(True)
        scroll_content = QWidget()
        self.cores_layout = QVBoxLayout(scroll_content)
        scroll.setWidget(scroll_content)
        
        cores_layout.addWidget(scroll)
        group_layout.addWidget(cores_group)
        
        layout.addWidget(group)
        self.core_progress_bars = []
    
    def update_data(self, cpu_info: Dict[str, Any]):
        physical = cpu_info.get('physical_cores', '-')
        logical = cpu_info.get('logical_cores', '-')
        self.cores_label.setText(f"核心数: {physical} 物理 / {logical} 逻辑")
        
        freq = cpu_info.get('current_freq', 0)
        if freq:
            self.freq_label.setText(f"频率: {freq:.1f} MHz")
        else:
            self.freq_label.setText("频率: N/A")
        
        total = cpu_info.get('total_usage', 0)
        self.total_progress.setValue(int(total))
        self.total_label.setText(f"{total:.1f}%")
        
        self._update_progress_bar_color(self.total_progress, total)
        
        per_core = cpu_info.get('per_core_usage', [])
        
        while len(self.core_progress_bars) < len(per_core):
            core_layout = QHBoxLayout()
            core_label = QLabel(f"核心 {len(self.core_progress_bars)}:")
            progress = QProgressBar()
            progress.setRange(0, 100)
            progress.setValue(0)
            percent_label = QLabel("0%")
            
            core_layout.addWidget(core_label)
            core_layout.addWidget(progress)
            core_layout.addWidget(percent_label)
            
            self.cores_layout.addLayout(core_layout)
            self.core_progress_bars.append((progress, percent_label))
        
        for i, usage in enumerate(per_core):
            if i < len(self.core_progress_bars):
                progress, label = self.core_progress_bars[i]
                progress.setValue(int(usage))
                label.setText(f"{usage:.1f}%")
                self._update_progress_bar_color(progress, usage)
    
    def _update_progress_bar_color(self, progress_bar: QProgressBar, value: float):
        if value < 50:
            color = QColor(0, 255, 0)
        elif value < 75:
            color = QColor(255, 255, 0)
        else:
            color = QColor(255, 0, 0)
        
        progress_bar.setStyleSheet(f"""
            QProgressBar {{
                border: 1px solid #ccc;
                border-radius: 3px;
                text-align: center;
                background-color: #f0f0f0;
            }}
            QProgressBar::chunk {{
                background-color: {color.name()};
                border-radius: 2px;
            }}
        """)


class MemoryWidget(QWidget):
    def __init__(self):
        super().__init__()
        self.init_ui()
    
    def init_ui(self):
        layout = QVBoxLayout(self)
        
        group = QGroupBox("内存监控")
        group_layout = QVBoxLayout(group)
        
        ram_group = QGroupBox("物理内存")
        ram_layout = QVBoxLayout(ram_group)
        
        self.ram_info_label = QLabel("总内存: - / 已用: - / 可用: -")
        ram_layout.addWidget(self.ram_info_label)
        
        ram_progress_layout = QHBoxLayout()
        ram_progress_layout.addWidget(QLabel("使用率:"))
        self.ram_progress = QProgressBar()
        self.ram_progress.setRange(0, 100)
        self.ram_progress.setValue(0)
        self.ram_progress.setMinimumHeight(25)
        ram_progress_layout.addWidget(self.ram_progress)
        
        self.ram_percent_label = QLabel("0%")
        self.ram_percent_label.setFont(QFont("Arial", 10, QFont.Bold))
        ram_progress_layout.addWidget(self.ram_percent_label)
        
        ram_layout.addLayout(ram_progress_layout)
        group_layout.addWidget(ram_group)
        
        swap_group = QGroupBox("交换内存")
        swap_layout = QVBoxLayout(swap_group)
        
        self.swap_info_label = QLabel("总交换: - / 已用: - / 可用: -")
        swap_layout.addWidget(self.swap_info_label)
        
        swap_progress_layout = QHBoxLayout()
        swap_progress_layout.addWidget(QLabel("使用率:"))
        self.swap_progress = QProgressBar()
        self.swap_progress.setRange(0, 100)
        self.swap_progress.setValue(0)
        self.swap_progress.setMinimumHeight(25)
        swap_progress_layout.addWidget(self.swap_progress)
        
        self.swap_percent_label = QLabel("0%")
        self.swap_percent_label.setFont(QFont("Arial", 10, QFont.Bold))
        swap_progress_layout.addWidget(self.swap_percent_label)
        
        swap_layout.addLayout(swap_progress_layout)
        group_layout.addWidget(swap_group)
        
        layout.addWidget(group)
    
    def update_data(self, memory_info: Dict[str, Any]):
        total = memory_info.get('total', 0)
        used = memory_info.get('used', 0)
        available = memory_info.get('available', 0)
        percent = memory_info.get('percent', 0)
        
        self.ram_info_label.setText(
            f"总内存: {format_bytes(total)} / 已用: {format_bytes(used)} / 可用: {format_bytes(available)}"
        )
        self.ram_progress.setValue(int(percent))
        self.ram_percent_label.setText(f"{percent:.1f}%")
        self._update_progress_bar_color(self.ram_progress, percent)
        
        swap_total = memory_info.get('swap_total', 0)
        swap_used = memory_info.get('swap_used', 0)
        swap_free = memory_info.get('swap_free', 0)
        swap_percent = memory_info.get('swap_percent', 0)
        
        if swap_total > 0:
            self.swap_info_label.setText(
                f"总交换: {format_bytes(swap_total)} / 已用: {format_bytes(swap_used)} / 可用: {format_bytes(swap_free)}"
            )
            self.swap_progress.setValue(int(swap_percent))
            self.swap_percent_label.setText(f"{swap_percent:.1f}%")
            self._update_progress_bar_color(self.swap_progress, swap_percent)
        else:
            self.swap_info_label.setText("交换内存: 不可用")
            self.swap_progress.setValue(0)
            self.swap_percent_label.setText("N/A")
    
    def _update_progress_bar_color(self, progress_bar: QProgressBar, value: float):
        if value < 50:
            color = QColor(0, 255, 0)
        elif value < 75:
            color = QColor(255, 255, 0)
        else:
            color = QColor(255, 0, 0)
        
        progress_bar.setStyleSheet(f"""
            QProgressBar {{
                border: 1px solid #ccc;
                border-radius: 3px;
                text-align: center;
                background-color: #f0f0f0;
            }}
            QProgressBar::chunk {{
                background-color: {color.name()};
                border-radius: 2px;
            }}
        """)


class DiskWidget(QWidget):
    def __init__(self):
        super().__init__()
        self.init_ui()
    
    def init_ui(self):
        layout = QVBoxLayout(self)
        
        group = QGroupBox("磁盘监控")
        group_layout = QVBoxLayout(group)
        
        io_group = QGroupBox("磁盘 I/O 速率")
        io_layout = QVBoxLayout(io_group)
        
        read_layout = QHBoxLayout()
        read_layout.addWidget(QLabel("读取速率:"))
        self.read_rate_label = QLabel("0 B/s")
        self.read_rate_label.setFont(QFont("Arial", 10, QFont.Bold))
        read_layout.addWidget(self.read_rate_label)
        read_layout.addStretch()
        io_layout.addLayout(read_layout)
        
        write_layout = QHBoxLayout()
        write_layout.addWidget(QLabel("写入速率:"))
        self.write_rate_label = QLabel("0 B/s")
        self.write_rate_label.setFont(QFont("Arial", 10, QFont.Bold))
        write_layout.addWidget(self.write_rate_label)
        write_layout.addStretch()
        io_layout.addLayout(write_layout)
        
        total_io_layout = QHBoxLayout()
        total_io_layout.addWidget(QLabel("总读取:"))
        self.total_read_label = QLabel("0 B")
        total_io_layout.addWidget(self.total_read_label)
        total_io_layout.addWidget(QLabel("总写入:"))
        self.total_write_label = QLabel("0 B")
        total_io_layout.addWidget(self.total_write_label)
        total_io_layout.addStretch()
        io_layout.addLayout(total_io_layout)
        
        group_layout.addWidget(io_group)
        
        partitions_group = QGroupBox("分区使用情况")
        partitions_layout = QVBoxLayout(partitions_group)
        
        self.partitions_table = QTableWidget()
        self.partitions_table.setColumnCount(6)
        self.partitions_table.setHorizontalHeaderLabels([
            '设备', '挂载点', '文件系统', '总容量', '已用', '使用率'
        ])
        self.partitions_table.horizontalHeader().setSectionResizeMode(QHeaderView.Stretch)
        self.partitions_table.setSelectionBehavior(QTableWidget.SelectRows)
        self.partitions_table.setEditTriggers(QTableWidget.NoEditTriggers)
        
        partitions_layout.addWidget(self.partitions_table)
        group_layout.addWidget(partitions_group)
        
        layout.addWidget(group)
    
    def update_data(self, disk_info: Dict[str, Any]):
        read_rate = disk_info.get('read_bytes_per_sec', 0)
        write_rate = disk_info.get('write_bytes_per_sec', 0)
        
        self.read_rate_label.setText(format_bytes_per_sec(read_rate))
        self.write_rate_label.setText(format_bytes_per_sec(write_rate))
        
        total_read = disk_info.get('total_read_bytes', 0)
        total_write = disk_info.get('total_write_bytes', 0)
        
        self.total_read_label.setText(format_bytes(total_read))
        self.total_write_label.setText(format_bytes(total_write))
        
        partitions = disk_info.get('partitions', [])
        self.partitions_table.setRowCount(len(partitions))
        
        for i, partition in enumerate(partitions):
            self.partitions_table.setItem(i, 0, QTableWidgetItem(partition.get('device', '-')))
            self.partitions_table.setItem(i, 1, QTableWidgetItem(partition.get('mountpoint', '-')))
            self.partitions_table.setItem(i, 2, QTableWidgetItem(partition.get('fstype', '-')))
            self.partitions_table.setItem(i, 3, QTableWidgetItem(format_bytes(partition.get('total', 0))))
            self.partitions_table.setItem(i, 4, QTableWidgetItem(format_bytes(partition.get('used', 0))))
            
            percent = partition.get('percent', 0)
            percent_item = QTableWidgetItem(f"{percent:.1f}%")
            if percent >= 90:
                percent_item.setForeground(QColor(255, 0, 0))
            elif percent >= 75:
                percent_item.setForeground(QColor(255, 165, 0))
            self.partitions_table.setItem(i, 5, percent_item)


class NetworkWidget(QWidget):
    def __init__(self):
        super().__init__()
        self.init_ui()
    
    def init_ui(self):
        layout = QVBoxLayout(self)
        
        group = QGroupBox("网络监控")
        group_layout = QVBoxLayout(group)
        
        rate_group = QGroupBox("网络速率")
        rate_layout = QVBoxLayout(rate_group)
        
        send_layout = QHBoxLayout()
        send_layout.addWidget(QLabel("上传速率:"))
        self.send_rate_label = QLabel("0 B/s")
        self.send_rate_label.setFont(QFont("Arial", 10, QFont.Bold))
        self.send_rate_label.setStyleSheet("color: blue;")
        send_layout.addWidget(self.send_rate_label)
        send_layout.addStretch()
        rate_layout.addLayout(send_layout)
        
        recv_layout = QHBoxLayout()
        recv_layout.addWidget(QLabel("下载速率:"))
        self.recv_rate_label = QLabel("0 B/s")
        self.recv_rate_label.setFont(QFont("Arial", 10, QFont.Bold))
        self.recv_rate_label.setStyleSheet("color: green;")
        recv_layout.addWidget(self.recv_rate_label)
        recv_layout.addStretch()
        rate_layout.addLayout(recv_layout)
        
        group_layout.addWidget(rate_group)
        
        total_group = QGroupBox("总流量统计")
        total_layout = QVBoxLayout(total_group)
        
        bytes_layout = QHBoxLayout()
        bytes_layout.addWidget(QLabel("总上传:"))
        self.total_send_label = QLabel("0 B")
        bytes_layout.addWidget(self.total_send_label)
        bytes_layout.addWidget(QLabel("总下载:"))
        self.total_recv_label = QLabel("0 B")
        bytes_layout.addWidget(self.total_recv_label)
        bytes_layout.addStretch()
        total_layout.addLayout(bytes_layout)
        
        packets_layout = QHBoxLayout()
        packets_layout.addWidget(QLabel("上传包数:"))
        self.packets_send_label = QLabel("0")
        packets_layout.addWidget(self.packets_send_label)
        packets_layout.addWidget(QLabel("下载包数:"))
        self.packets_recv_label = QLabel("0")
        packets_layout.addWidget(self.packets_recv_label)
        packets_layout.addStretch()
        total_layout.addLayout(packets_layout)
        
        group_layout.addWidget(total_group)
        
        layout.addWidget(group)
    
    def update_data(self, network_info: Dict[str, Any]):
        send_rate = network_info.get('bytes_sent_per_sec', 0)
        recv_rate = network_info.get('bytes_recv_per_sec', 0)
        
        self.send_rate_label.setText(format_bytes_per_sec(send_rate))
        self.recv_rate_label.setText(format_bytes_per_sec(recv_rate))
        
        total_send = network_info.get('bytes_sent', 0)
        total_recv = network_info.get('bytes_recv', 0)
        packets_send = network_info.get('packets_sent', 0)
        packets_recv = network_info.get('packets_recv', 0)
        
        self.total_send_label.setText(format_bytes(total_send))
        self.total_recv_label.setText(format_bytes(total_recv))
        self.packets_send_label.setText(f"{packets_send:,}")
        self.packets_recv_label.setText(f"{packets_recv:,}")


class GPUWidget(QWidget):
    def __init__(self):
        super().__init__()
        self.init_ui()
    
    def init_ui(self):
        layout = QVBoxLayout(self)
        
        group = QGroupBox("GPU 监控")
        group_layout = QVBoxLayout(group)
        
        self.gpu_name_label = QLabel("GPU: 检测中...")
        self.gpu_name_label.setFont(QFont("Arial", 11, QFont.Bold))
        group_layout.addWidget(self.gpu_name_label)
        
        gpu_layout = QHBoxLayout()
        gpu_layout.addWidget(QLabel("GPU 使用率:"))
        self.gpu_progress = QProgressBar()
        self.gpu_progress.setRange(0, 100)
        self.gpu_progress.setValue(0)
        self.gpu_progress.setMinimumHeight(25)
        gpu_layout.addWidget(self.gpu_progress)
        
        self.gpu_percent_label = QLabel("0%")
        self.gpu_percent_label.setFont(QFont("Arial", 10, QFont.Bold))
        gpu_layout.addWidget(self.gpu_percent_label)
        
        group_layout.addLayout(gpu_layout)
        
        memory_group = QGroupBox("GPU 内存")
        memory_layout = QVBoxLayout(memory_group)
        
        self.memory_info_label = QLabel("已用: - / 总容量: -")
        memory_layout.addWidget(self.memory_info_label)
        
        mem_progress_layout = QHBoxLayout()
        mem_progress_layout.addWidget(QLabel("使用率:"))
        self.memory_progress = QProgressBar()
        self.memory_progress.setRange(0, 100)
        self.memory_progress.setValue(0)
        self.memory_progress.setMinimumHeight(25)
        mem_progress_layout.addWidget(self.memory_progress)
        
        self.memory_percent_label = QLabel("0%")
        self.memory_percent_label.setFont(QFont("Arial", 10, QFont.Bold))
        mem_progress_layout.addWidget(self.memory_percent_label)
        
        memory_layout.addLayout(mem_progress_layout)
        group_layout.addWidget(memory_group)
        
        temp_layout = QHBoxLayout()
        temp_layout.addWidget(QLabel("温度:"))
        self.temp_label = QLabel("- °C")
        self.temp_label.setFont(QFont("Arial", 10))
        temp_layout.addWidget(self.temp_label)
        temp_layout.addStretch()
        group_layout.addLayout(temp_layout)
        
        layout.addWidget(group)
    
    def update_data(self, gpu_info: Dict[str, Any]):
        available = gpu_info.get('available', False)
        
        if available:
            name = gpu_info.get('name', 'Unknown')
            self.gpu_name_label.setText(f"GPU: {name}")
            
            usage = gpu_info.get('usage', 0)
            self.gpu_progress.setValue(int(usage))
            self.gpu_percent_label.setText(f"{usage:.1f}%")
            self._update_progress_bar_color(self.gpu_progress, usage)
            
            mem_used = gpu_info.get('memory_used', 0)
            mem_total = gpu_info.get('memory_total', 0)
            mem_percent = gpu_info.get('memory_percent', 0)
            
            if mem_total > 0:
                self.memory_info_label.setText(f"已用: {mem_used:.0f} MB / 总容量: {mem_total:.0f} MB")
                self.memory_progress.setValue(int(mem_percent))
                self.memory_percent_label.setText(f"{mem_percent:.1f}%")
                self._update_progress_bar_color(self.memory_progress, mem_percent)
            else:
                self.memory_info_label.setText("内存信息: 不可用")
            
            temp = gpu_info.get('temperature', 0)
            if temp > 0:
                self.temp_label.setText(f"{temp:.1f} °C")
                if temp >= 80:
                    self.temp_label.setStyleSheet("color: red; font-weight: bold;")
                elif temp >= 70:
                    self.temp_label.setStyleSheet("color: orange;")
                else:
                    self.temp_label.setStyleSheet("color: black;")
            else:
                self.temp_label.setText("N/A")
        else:
            self.gpu_name_label.setText("GPU: 未检测到可用 GPU (未安装 GPUtil 或无 NVIDIA GPU)")
            self.gpu_progress.setValue(0)
            self.gpu_percent_label.setText("N/A")
            self.memory_info_label.setText("内存信息: 不可用")
            self.memory_progress.setValue(0)
            self.memory_percent_label.setText("N/A")
            self.temp_label.setText("N/A")
    
    def _update_progress_bar_color(self, progress_bar: QProgressBar, value: float):
        if value < 50:
            color = QColor(0, 255, 0)
        elif value < 75:
            color = QColor(255, 255, 0)
        else:
            color = QColor(255, 0, 0)
        
        progress_bar.setStyleSheet(f"""
            QProgressBar {{
                border: 1px solid #ccc;
                border-radius: 3px;
                text-align: center;
                background-color: #f0f0f0;
            }}
            QProgressBar::chunk {{
                background-color: {color.name()};
                border-radius: 2px;
            }}
        """)


class RealTimeMonitorTab(QWidget):
    def __init__(self):
        super().__init__()
        self.init_ui()
    
    def init_ui(self):
        layout = QVBoxLayout(self)
        
        splitter = QSplitter(Qt.Vertical)
        
        top_splitter = QSplitter(Qt.Horizontal)
        
        self.cpu_widget = CPUWidget()
        self.memory_widget = MemoryWidget()
        
        top_splitter.addWidget(self.cpu_widget)
        top_splitter.addWidget(self.memory_widget)
        top_splitter.setSizes([400, 400])
        
        bottom_splitter = QSplitter(Qt.Horizontal)
        
        self.disk_widget = DiskWidget()
        self.network_widget = NetworkWidget()
        self.gpu_widget = GPUWidget()
        
        bottom_splitter.addWidget(self.disk_widget)
        bottom_splitter.addWidget(self.network_widget)
        bottom_splitter.addWidget(self.gpu_widget)
        bottom_splitter.setSizes([300, 300, 300])
        
        splitter.addWidget(top_splitter)
        splitter.addWidget(bottom_splitter)
        splitter.setSizes([400, 400])
        
        layout.addWidget(splitter)
    
    def update_data(self, data: Dict[str, Any]):
        if 'cpu' in data:
            self.cpu_widget.update_data(data['cpu'])
        if 'memory' in data:
            self.memory_widget.update_data(data['memory'])
        if 'disk' in data:
            self.disk_widget.update_data(data['disk'])
        if 'network' in data:
            self.network_widget.update_data(data['network'])
        if 'gpu' in data:
            self.gpu_widget.update_data(data['gpu'])


class ProcessManagerTab(QWidget):
    process_updated = pyqtSignal(list)
    
    def __init__(self, monitor: SystemMonitor):
        super().__init__()
        self.monitor = monitor
        self.sort_column = 2
        self.sort_ascending = False
        self.init_ui()
        
        self.update_timer = QTimer()
        self.update_timer.timeout.connect(self.update_process_list)
        self.update_timer.start(2000)
    
    def init_ui(self):
        layout = QVBoxLayout(self)
        
        control_layout = QHBoxLayout()
        
        control_layout.addWidget(QLabel("排序依据:"))
        self.sort_combo = QComboBox()
        self.sort_combo.addItems(['CPU 使用率', '内存使用率', '进程名', 'PID'])
        self.sort_combo.setCurrentIndex(0)
        self.sort_combo.currentIndexChanged.connect(self.on_sort_changed)
        control_layout.addWidget(self.sort_combo)
        
        self.ascending_check = QCheckBox("升序")
        self.ascending_check.stateChanged.connect(self.on_sort_changed)
        control_layout.addWidget(self.ascending_check)
        
        control_layout.addStretch()
        
        self.kill_button = QPushButton("结束进程")
        self.kill_button.clicked.connect(self.kill_selected_process)
        self.kill_button.setStyleSheet("background-color: #ff4444; color: white; font-weight: bold;")
        control_layout.addWidget(self.kill_button)
        
        self.refresh_button = QPushButton("刷新")
        self.refresh_button.clicked.connect(self.update_process_list)
        control_layout.addWidget(self.refresh_button)
        
        layout.addLayout(control_layout)
        
        self.process_table = QTableWidget()
        self.process_table.setColumnCount(5)
        self.process_table.setHorizontalHeaderLabels([
            'PID', '进程名', 'CPU 使用率 (%)', '内存使用率 (%)', '状态'
        ])
        self.process_table.horizontalHeader().setSectionResizeMode(QHeaderView.Stretch)
        self.process_table.setSelectionBehavior(QTableWidget.SelectRows)
        self.process_table.setEditTriggers(QTableWidget.NoEditTriggers)
        self.process_table.horizontalHeader().sectionClicked.connect(self.on_header_clicked)
        
        layout.addWidget(self.process_table)
        
        self.process_count_label = QLabel("进程数: 0")
        layout.addWidget(self.process_count_label)
    
    def update_process_list(self):
        sort_map = {
            0: 'cpu_percent',
            1: 'memory_percent',
            2: 'name',
            3: 'pid'
        }
        sort_by = sort_map.get(self.sort_combo.currentIndex(), 'cpu_percent')
        
        processes = self.monitor.get_process_list(
            sort_by=sort_by,
            ascending=self.ascending_check.isChecked()
        )
        
        self.process_table.setRowCount(len(processes))
        self.process_count_label.setText(f"进程数: {len(processes)}")
        
        for i, proc in enumerate(processes):
            pid_item = QTableWidgetItem(str(proc.get('pid', '-')))
            pid_item.setTextAlignment(Qt.AlignCenter)
            self.process_table.setItem(i, 0, pid_item)
            
            name_item = QTableWidgetItem(proc.get('name', '-'))
            self.process_table.setItem(i, 1, name_item)
            
            cpu = proc.get('cpu_percent', 0)
            cpu_item = QTableWidgetItem(f"{cpu:.1f}")
            cpu_item.setTextAlignment(Qt.AlignRight | Qt.AlignVCenter)
            if cpu > 50:
                cpu_item.setForeground(QColor(255, 0, 0))
            self.process_table.setItem(i, 2, cpu_item)
            
            memory = proc.get('memory_percent', 0)
            memory_item = QTableWidgetItem(f"{memory:.1f}")
            memory_item.setTextAlignment(Qt.AlignRight | Qt.AlignVCenter)
            if memory > 50:
                memory_item.setForeground(QColor(255, 0, 0))
            self.process_table.setItem(i, 3, memory_item)
            
            status_item = QTableWidgetItem(proc.get('status', '-'))
            self.process_table.setItem(i, 4, status_item)
    
    def on_sort_changed(self):
        self.update_process_list()
    
    def on_header_clicked(self, column):
        if column == self.sort_column:
            self.sort_ascending = not self.sort_ascending
        else:
            self.sort_column = column
            self.sort_ascending = False
        
        sort_map = {
            0: 'pid',
            1: 'name',
            2: 'cpu_percent',
            3: 'memory_percent',
            4: 'status'
        }
        
        combo_map = {v: k for k, v in sort_map.items()}
        if column in sort_map:
            sort_by = sort_map[column]
            if sort_by in combo_map:
                self.sort_combo.setCurrentIndex(combo_map[sort_by])
        
        self.ascending_check.setChecked(self.sort_ascending)
        self.update_process_list()
    
    def kill_selected_process(self):
        selected_rows = self.process_table.selectedItems()
        if not selected_rows:
            QMessageBox.warning(self, "警告", "请先选择要结束的进程")
            return
        
        row = selected_rows[0].row()
        pid_item = self.process_table.item(row, 0)
        if not pid_item:
            return
        
        try:
            pid = int(pid_item.text())
            process_name = self.process_table.item(row, 1).text() if self.process_table.item(row, 1) else "未知"
            
            reply = QMessageBox.question(
                self,
                "确认结束进程",
                f"确定要结束进程 {process_name} (PID: {pid}) 吗？",
                QMessageBox.Yes | QMessageBox.No,
                QMessageBox.No
            )
            
            if reply == QMessageBox.Yes:
                if self.monitor.kill_process(pid):
                    QMessageBox.information(self, "成功", f"进程 {process_name} 已结束")
                    self.update_process_list()
                else:
                    QMessageBox.warning(self, "失败", f"无法结束进程 {process_name}，可能需要管理员权限")
        except ValueError:
            QMessageBox.warning(self, "错误", "无效的 PID")


class HistoryChartTab(QWidget):
    def __init__(self, db: Database):
        super().__init__()
        self.db = db
        self.init_ui()
    
    def init_ui(self):
        layout = QVBoxLayout(self)
        
        control_layout = QHBoxLayout()
        
        control_layout.addWidget(QLabel("显示时长:"))
        self.duration_combo = QComboBox()
        self.duration_combo.addItems(['1 小时', '6 小时', '24 小时', '7 天'])
        self.duration_combo.setCurrentIndex(0)
        control_layout.addWidget(self.duration_combo)
        
        self.refresh_button = QPushButton("刷新图表")
        self.refresh_button.clicked.connect(self.refresh_charts)
        control_layout.addWidget(self.refresh_button)
        
        control_layout.addStretch()
        
        layout.addLayout(control_layout)
        
        self.info_label = QLabel("历史数据图表 - 数据每 5 分钟自动刷新")
        self.info_label.setStyleSheet("color: #666; font-style: italic;")
        layout.addWidget(self.info_label)
        
        from matplotlib.backends.backend_qt5agg import FigureCanvasQTAgg as FigureCanvas
        from matplotlib.figure import Figure
        import matplotlib.dates as mdates
        
        self.fig = Figure(figsize=(12, 8), dpi=100)
        self.canvas = FigureCanvas(self.fig)
        
        self.ax_cpu = self.fig.add_subplot(2, 2, 1)
        self.ax_memory = self.fig.add_subplot(2, 2, 2)
        self.ax_disk = self.fig.add_subplot(2, 2, 3)
        self.ax_network = self.fig.add_subplot(2, 2, 4)
        
        self.fig.tight_layout(pad=4.0)
        
        layout.addWidget(self.canvas)
        
        self.refresh_timer = QTimer()
        self.refresh_timer.timeout.connect(self.refresh_charts)
        self.refresh_timer.start(300000)
        
        self.refresh_charts()
    
    def refresh_charts(self):
        duration_map = {
            0: 1,
            1: 6,
            2: 24,
            3: 24 * 7
        }
        hours = duration_map.get(self.duration_combo.currentIndex(), 1)
        
        self.ax_cpu.clear()
        self.ax_memory.clear()
        self.ax_disk.clear()
        self.ax_network.clear()
        
        cpu_history = self.db.get_cpu_history(hours=hours)
        if cpu_history:
            import matplotlib.dates as mdates
            from datetime import datetime
            
            timestamps = [datetime.fromisoformat(h['timestamp']) for h in cpu_history]
            total_usage = [h['total_usage'] for h in cpu_history]
            
            self.ax_cpu.plot(timestamps, total_usage, 'b-', label='CPU 总使用率')
            
            per_core_data = cpu_history[0].get('per_core_usage', [])
            if len(per_core_data) <= 4:
                colors = ['r', 'g', 'c', 'm']
                for i in range(len(per_core_data)):
                    core_usage = [h['per_core_usage'][i] if i < len(h['per_core_usage']) else 0 for h in cpu_history]
                    self.ax_cpu.plot(timestamps, core_usage, f'{colors[i % len(colors)]}--', alpha=0.5, label=f'核心 {i}')
            
            self.ax_cpu.set_title('CPU 使用率')
            self.ax_cpu.set_ylabel('使用率 (%)')
            self.ax_cpu.set_ylim(0, 100)
            self.ax_cpu.legend(loc='upper right')
            self.ax_cpu.grid(True, alpha=0.3)
            self.ax_cpu.xaxis.set_major_formatter(mdates.DateFormatter('%H:%M'))
        
        memory_history = self.db.get_memory_history(hours=hours)
        if memory_history:
            import matplotlib.dates as mdates
            from datetime import datetime
            
            timestamps = [datetime.fromisoformat(h['timestamp']) for h in memory_history]
            percent = [h['percent'] for h in memory_history]
            
            self.ax_memory.plot(timestamps, percent, 'g-', label='内存使用率')
            self.ax_memory.set_title('内存使用率')
            self.ax_memory.set_ylabel('使用率 (%)')
            self.ax_memory.set_ylim(0, 100)
            self.ax_memory.legend(loc='upper right')
            self.ax_memory.grid(True, alpha=0.3)
            self.ax_memory.xaxis.set_major_formatter(mdates.DateFormatter('%H:%M'))
        
        disk_history = self.db.get_disk_io_history(hours=hours)
        if len(disk_history) >= 2:
            import matplotlib.dates as mdates
            from datetime import datetime
            
            timestamps = [datetime.fromisoformat(h['timestamp']) for h in disk_history]
            
            read_rates = []
            write_rates = []
            
            for i in range(1, len(disk_history)):
                time_diff = (timestamps[i] - timestamps[i-1]).total_seconds()
                if time_diff > 0:
                    read_rate = (disk_history[i]['read_bytes'] - disk_history[i-1]['read_bytes']) / time_diff
                    write_rate = (disk_history[i]['write_bytes'] - disk_history[i-1]['write_bytes']) / time_diff
                    read_rates.append(read_rate / 1024 / 1024)
                    write_rates.append(write_rate / 1024 / 1024)
            
            if read_rates:
                self.ax_disk.plot(timestamps[1:], read_rates, 'b-', label='读取速率')
                self.ax_disk.plot(timestamps[1:], write_rates, 'r-', label='写入速率')
                self.ax_disk.set_title('磁盘 I/O 速率')
                self.ax_disk.set_ylabel('速率 (MB/s)')
                self.ax_disk.legend(loc='upper right')
                self.ax_disk.grid(True, alpha=0.3)
                self.ax_disk.xaxis.set_major_formatter(mdates.DateFormatter('%H:%M'))
        
        network_history = self.db.get_network_io_history(hours=hours)
        if len(network_history) >= 2:
            import matplotlib.dates as mdates
            from datetime import datetime
            
            timestamps = [datetime.fromisoformat(h['timestamp']) for h in network_history]
            
            send_rates = []
            recv_rates = []
            
            for i in range(1, len(network_history)):
                time_diff = (timestamps[i] - timestamps[i-1]).total_seconds()
                if time_diff > 0:
                    send_rate = (network_history[i]['bytes_sent'] - network_history[i-1]['bytes_sent']) / time_diff
                    recv_rate = (network_history[i]['bytes_recv'] - network_history[i-1]['bytes_recv']) / time_diff
                    send_rates.append(send_rate / 1024 / 1024)
                    recv_rates.append(recv_rate / 1024 / 1024)
            
            if send_rates:
                self.ax_network.plot(timestamps[1:], send_rates, 'b-', label='上传速率')
                self.ax_network.plot(timestamps[1:], recv_rates, 'g-', label='下载速率')
                self.ax_network.set_title('网络 I/O 速率')
                self.ax_network.set_ylabel('速率 (MB/s)')
                self.ax_network.legend(loc='upper right')
                self.ax_network.grid(True, alpha=0.3)
                self.ax_network.xaxis.set_major_formatter(mdates.DateFormatter('%H:%M'))
        
        self.fig.tight_layout(pad=4.0)
        self.canvas.draw()


class MainWindow(QMainWindow):
    def __init__(self):
        super().__init__()
        
        self.monitor = SystemMonitor()
        self.db = Database()
        
        self.init_ui()
        self.init_monitoring()
        
        self.setWindowTitle("系统资源监视器")
        self.setGeometry(100, 100, 1400, 900)
        self.setMinimumSize(1200, 800)
    
    def init_ui(self):
        central_widget = QWidget()
        self.setCentralWidget(central_widget)
        
        layout = QVBoxLayout(central_widget)
        
        self.tabs = QTabWidget()
        
        self.real_time_tab = RealTimeMonitorTab()
        self.tabs.addTab(self.real_time_tab, "实时监控")
        
        self.process_tab = ProcessManagerTab(self.monitor)
        self.tabs.addTab(self.process_tab, "进程管理")
        
        self.history_tab = HistoryChartTab(self.db)
        self.tabs.addTab(self.history_tab, "历史曲线")
        
        layout.addWidget(self.tabs)
        
        self.status_bar = QStatusBar()
        self.setStatusBar(self.status_bar)
        self.status_bar.showMessage("系统资源监视器已启动 | 更新间隔: 1秒")
    
    def init_monitoring(self):
        self.monitoring_worker = MonitoringWorker(self.monitor, self.db)
        self.monitoring_worker.data_ready.connect(self.on_monitoring_data)
        self.monitoring_worker.start()
    
    def on_monitoring_data(self, data: Dict[str, Any]):
        self.real_time_tab.update_data(data)
        
        current_time = datetime.now().strftime("%H:%M:%S")
        self.status_bar.showMessage(f"最后更新: {current_time} | 更新间隔: 1秒")
    
    def closeEvent(self, event):
        if hasattr(self, 'monitoring_worker'):
            self.monitoring_worker.stop()
        
        if hasattr(self, 'process_tab'):
            self.process_tab.update_timer.stop()
        
        if hasattr(self, 'history_tab'):
            self.history_tab.refresh_timer.stop()
        
        event.accept()


def main():
    app = QApplication(sys.argv)
    app.setStyle('Fusion')
    
    window = MainWindow()
    window.show()
    
    sys.exit(app.exec_())


if __name__ == '__main__':
    main()
