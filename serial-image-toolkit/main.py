#!/usr/bin/env python3
import sys
import os
from PySide6.QtWidgets import (
    QApplication, QMainWindow, QWidget, QVBoxLayout, QHBoxLayout,
    QPushButton, QLabel, QFrame, QMessageBox
)
from PySide6.QtCore import Qt
from PySide6.QtGui import QFont, QPixmap

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))


class LauncherWindow(QMainWindow):
    def __init__(self):
        super().__init__()
        self.setWindowTitle("串口工具与图像处理助手")
        self.setMinimumSize(800, 600)
        self._init_ui()
    
    def _init_ui(self):
        central_widget = QWidget()
        self.setCentralWidget(central_widget)
        main_layout = QVBoxLayout(central_widget)
        main_layout.setContentsMargins(40, 40, 40, 40)
        
        title_label = QLabel("串口工具与图像处理助手")
        title_label.setFont(QFont("Microsoft YaHei", 24, QFont.Bold))
        title_label.setAlignment(Qt.AlignCenter)
        title_label.setStyleSheet("color: #1976D2; margin-bottom: 20px;")
        main_layout.addWidget(title_label)
        
        subtitle_label = QLabel("Serial Port Toolkit & Image Processor")
        subtitle_label.setFont(QFont("Arial", 14))
        subtitle_label.setAlignment(Qt.AlignCenter)
        subtitle_label.setStyleSheet("color: #666; margin-bottom: 40px;")
        main_layout.addWidget(subtitle_label)
        
        cards_layout = QHBoxLayout()
        cards_layout.setSpacing(30)
        
        serial_card = self._create_card(
            "串口调试助手",
            "Serial Port Monitor",
            "支持串口配置、ASCII/Hex 收发、\n数据可视化、日志存储与查询",
            "#1976D2",
            self._launch_serial_tool
        )
        cards_layout.addWidget(serial_card)
        
        image_card = self._create_card(
            "图片批量处理",
            "Batch Image Processor",
            "支持重命名、尺寸调整、裁剪旋转、\n格式转换、水印添加、效果预览",
            "#388E3C",
            self._launch_image_tool
        )
        cards_layout.addWidget(image_card)
        
        main_layout.addLayout(cards_layout)
        main_layout.addStretch()
        
        footer_label = QLabel("基于 Python + PySide6 构建")
        footer_label.setFont(QFont("Arial", 10))
        footer_label.setAlignment(Qt.AlignCenter)
        footer_label.setStyleSheet("color: #999;")
        main_layout.addWidget(footer_label)
    
    def _create_card(self, title, subtitle, description, color, callback):
        card = QFrame()
        card.setFrameStyle(QFrame.StyledPanel)
        card.setStyleSheet(f"""
            QFrame {{
                background-color: white;
                border: 2px solid {color};
                border-radius: 15px;
                padding: 30px;
            }}
            QFrame:hover {{
                background-color: #f8f9fa;
            }}
        """)
        
        layout = QVBoxLayout(card)
        layout.setSpacing(15)
        
        title_label = QLabel(title)
        title_label.setFont(QFont("Microsoft YaHei", 18, QFont.Bold))
        title_label.setStyleSheet(f"color: {color};")
        layout.addWidget(title_label)
        
        subtitle_label = QLabel(subtitle)
        subtitle_label.setFont(QFont("Arial", 12))
        subtitle_label.setStyleSheet("color: #888;")
        layout.addWidget(subtitle_label)
        
        line = QFrame()
        line.setFrameShape(QFrame.HLine)
        line.setStyleSheet(f"background-color: {color};")
        line.setFixedHeight(2)
        layout.addWidget(line)
        
        desc_label = QLabel(description)
        desc_label.setFont(QFont("Microsoft YaHei", 12))
        desc_label.setStyleSheet("color: #555;")
        desc_label.setWordWrap(True)
        layout.addWidget(desc_label)
        
        layout.addStretch()
        
        btn_launch = QPushButton("启动工具")
        btn_launch.setFont(QFont("Microsoft YaHei", 14, QFont.Bold))
        btn_launch.setMinimumHeight(50)
        btn_launch.setStyleSheet(f"""
            QPushButton {{
                background-color: {color};
                color: white;
                border: none;
                border-radius: 8px;
                padding: 10px 30px;
            }}
            QPushButton:hover {{
                background-color: {self._darken_color(color)};
            }}
        """)
        btn_launch.clicked.connect(callback)
        layout.addWidget(btn_launch)
        
        card.setMinimumWidth(300)
        card.setMinimumHeight(350)
        
        return card
    
    def _darken_color(self, color):
        if color.startswith("#"):
            r = int(color[1:3], 16)
            g = int(color[3:5], 16)
            b = int(color[5:7], 16)
            r = max(0, r - 40)
            g = max(0, g - 40)
            b = max(0, b - 40)
            return f"#{r:02x}{g:02x}{b:02x}"
        return color
    
    def _launch_serial_tool(self):
        try:
            from serial_port_monitor.ui.main_window import SerialMainWindow
            self.serial_window = SerialMainWindow()
            self.serial_window.show()
        except Exception as e:
            QMessageBox.warning(self, "启动失败", f"无法启动串口调试助手:\n{str(e)}")
    
    def _launch_image_tool(self):
        try:
            from batch_image_processor.ui.main_window import ImageMainWindow
            self.image_window = ImageMainWindow()
            self.image_window.show()
        except Exception as e:
            QMessageBox.warning(self, "启动失败", f"无法启动图片批量处理工具:\n{str(e)}")


def main():
    app = QApplication(sys.argv)
    app.setStyle("Fusion")
    font = QFont("Microsoft YaHei", 10)
    app.setFont(font)
    
    window = LauncherWindow()
    window.show()
    
    sys.exit(app.exec())


if __name__ == "__main__":
    main()
