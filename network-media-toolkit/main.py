#!/usr/bin/env python3
"""
网络分析与媒体转换工具
功能：
1. 网络抓包分析工具 - 网卡选择、实时抓包、协议解析、BPF过滤、数据存储
2. 视频转GIF/WebM转换器 - 视频截取、参数调整、实时预览、批量转换
"""

import sys
from PyQt5.QtWidgets import (
    QApplication, QMainWindow, QWidget, QVBoxLayout, QTabWidget,
    QStatusBar, QMessageBox
)
from PyQt5.QtCore import Qt
from PyQt5.QtGui import QFont

# 导入模块
from ui.packet_sniffer_tab import PacketSnifferTab
from ui.video_converter_tab import VideoConverterTab


class MainWindow(QMainWindow):
    def __init__(self):
        super().__init__()
        self.setWindowTitle("网络分析与媒体转换工具")
        self.setGeometry(100, 100, 1600, 1000)
        
        self.init_ui()
        
    def init_ui(self):
        central_widget = QWidget()
        self.setCentralWidget(central_widget)
        
        main_layout = QVBoxLayout(central_widget)
        main_layout.setSpacing(10)
        main_layout.setContentsMargins(10, 10, 10, 10)
        
        # 创建标签页
        self.tab_widget = QTabWidget()
        self.tab_widget.setFont(QFont("Microsoft YaHei", 11))
        
        # 添加网络抓包标签页
        self.packet_sniffer_tab = PacketSnifferTab()
        self.tab_widget.addTab(self.packet_sniffer_tab, "网络抓包分析")
        
        # 添加视频转换标签页
        self.video_converter_tab = VideoConverterTab()
        self.tab_widget.addTab(self.video_converter_tab, "视频转GIF/WebM")
        
        main_layout.addWidget(self.tab_widget)
        
        # 状态栏
        self.status_bar = QStatusBar()
        self.setStatusBar(self.status_bar)
        self.status_bar.showMessage("就绪")
        
    def closeEvent(self, event):
        reply = QMessageBox.question(
            self, "确认退出",
            "确定要退出应用程序吗？\n\n正在进行的操作将被取消。",
            QMessageBox.Yes | QMessageBox.No
        )
        
        if reply == QMessageBox.Yes:
            # 清理资源
            try:
                self.packet_sniffer_tab.cleanup()
            except:
                pass
            try:
                self.video_converter_tab.cleanup()
            except:
                pass
            event.accept()
        else:
            event.ignore()


def main():
    app = QApplication(sys.argv)
    app.setStyle('Fusion')
    
    # 设置应用程序字体
    font = QFont("Microsoft YaHei", 10)
    app.setFont(font)
    
    window = MainWindow()
    window.show()
    
    sys.exit(app.exec_())


if __name__ == "__main__":
    main()
