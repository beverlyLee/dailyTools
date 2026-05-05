import sys
from PyQt6.QtCore import Qt, QSize
from PyQt6.QtGui import QIcon, QFont, QAction, QKeySequence
from PyQt6.QtWidgets import (
    QMainWindow, QWidget, QVBoxLayout, QHBoxLayout,
    QTabWidget, QMenuBar, QMenu, QStatusBar, QToolBar,
    QMessageBox, QSplitter, QLabel
)

from ui.serial_widget import SerialWidget
from ui.network_widget import NetworkWidget
from ui.media_widget import MediaWidget

class MainWindow(QMainWindow):
    def __init__(self):
        super().__init__()
        
        self.setWindowTitle("硬件与媒体处理工具集")
        self.setMinimumSize(1400, 900)
        
        self._create_menu_bar()
        self._create_tool_bar()
        self._create_status_bar()
        self._create_central_widget()
        
        self._apply_style()
    
    def _create_menu_bar(self):
        menubar = self.menuBar()
        
        file_menu = menubar.addMenu("文件(&F)")
        
        exit_action = QAction("退出(&X)", self)
        exit_action.setShortcut(QKeySequence.StandardKey.Quit)
        exit_action.triggered.connect(self.close)
        file_menu.addAction(exit_action)
        
        tool_menu = menubar.addMenu("工具(&T)")
        
        serial_action = QAction("串口调试助手(&S)", self)
        serial_action.setShortcut("Ctrl+1")
        serial_action.triggered.connect(lambda: self._switch_tab(0))
        tool_menu.addAction(serial_action)
        
        network_action = QAction("网络抓包分析(&N)", self)
        network_action.setShortcut("Ctrl+2")
        network_action.triggered.connect(lambda: self._switch_tab(1))
        tool_menu.addAction(network_action)
        
        media_action = QAction("视频转换器(&M)", self)
        media_action.setShortcut("Ctrl+3")
        media_action.triggered.connect(lambda: self._switch_tab(2))
        tool_menu.addAction(media_action)
        
        help_menu = menubar.addMenu("帮助(&H)")
        
        about_action = QAction("关于(&A)", self)
        about_action.triggered.connect(self._show_about)
        help_menu.addAction(about_action)
    
    def _create_tool_bar(self):
        toolbar = self.addToolBar("主工具栏")
        toolbar.setMovable(False)
        toolbar.setIconSize(QSize(24, 24))
        
        serial_label = QLabel("  串口调试")
        serial_label.setStyleSheet("font-weight: bold;")
        toolbar.addWidget(serial_label)
        
        toolbar.addSeparator()
        
        network_label = QLabel("  网络抓包")
        network_label.setStyleSheet("font-weight: bold;")
        toolbar.addWidget(network_label)
        
        toolbar.addSeparator()
        
        media_label = QLabel("  视频转换")
        media_label.setStyleSheet("font-weight: bold;")
        toolbar.addWidget(media_label)
        
        toolbar.addSeparator()
        
        toolbar.addWidget(QLabel("  版本: 1.0.0"))
    
    def _create_status_bar(self):
        self.statusbar = QStatusBar()
        self.setStatusBar(self.statusbar)
        self.statusbar.showMessage("就绪", 5000)
    
    def _create_central_widget(self):
        central_widget = QWidget()
        self.setCentralWidget(central_widget)
        
        layout = QVBoxLayout(central_widget)
        layout.setContentsMargins(5, 5, 5, 5)
        
        self.tab_widget = QTabWidget()
        self.tab_widget.setTabPosition(QTabWidget.TabPosition.North)
        self.tab_widget.setDocumentMode(True)
        self.tab_widget.setMovable(False)
        
        self.serial_widget = SerialWidget()
        self.network_widget = NetworkWidget()
        self.media_widget = MediaWidget()
        
        self.tab_widget.addTab(self.serial_widget, "  串口调试助手  ")
        self.tab_widget.addTab(self.network_widget, "  网络抓包分析  ")
        self.tab_widget.addTab(self.media_widget, "  视频转换器  ")
        
        self.tab_widget.setTabToolTip(0, "串口配置、数据收发、数据可视化、日志存储")
        self.tab_widget.setTabToolTip(1, "网络抓包、协议解析、BPF过滤、数据存储")
        self.tab_widget.setTabToolTip(2, "视频转GIF/WebM/MP4、批量转换、实时预览")
        
        layout.addWidget(self.tab_widget)
    
    def _apply_style(self):
        self.setStyleSheet("""
            QMainWindow {
                background-color: #f5f5f5;
            }
            
            QTabWidget::pane {
                border: 1px solid #d0d0d0;
                background-color: white;
                border-radius: 4px;
            }
            
            QTabBar::tab {
                background-color: #e8e8e8;
                border: 1px solid #d0d0d0;
                border-bottom: none;
                border-top-left-radius: 4px;
                border-top-right-radius: 4px;
                min-width: 150px;
                padding: 8px 16px;
                margin-right: 2px;
                font-size: 13px;
            }
            
            QTabBar::tab:selected {
                background-color: white;
                border-bottom: 1px solid white;
                color: #2196F3;
                font-weight: bold;
            }
            
            QTabBar::tab:hover:!selected {
                background-color: #f0f0f0;
            }
            
            QGroupBox {
                border: 1px solid #d0d0d0;
                border-radius: 4px;
                margin-top: 12px;
                padding-top: 12px;
                font-weight: bold;
                background-color: white;
            }
            
            QGroupBox::title {
                subcontrol-origin: margin;
                left: 10px;
                padding: 0 8px;
                color: #333;
            }
            
            QPushButton {
                background-color: #2196F3;
                color: white;
                border: none;
                padding: 8px 16px;
                border-radius: 4px;
                font-size: 12px;
                font-weight: bold;
                min-width: 80px;
            }
            
            QPushButton:hover {
                background-color: #1976D2;
            }
            
            QPushButton:pressed {
                background-color: #1565C0;
            }
            
            QPushButton:disabled {
                background-color: #bdbdbd;
                color: #757575;
            }
            
            QComboBox {
                border: 1px solid #d0d0d0;
                border-radius: 4px;
                padding: 6px 12px;
                background-color: white;
                min-width: 80px;
            }
            
            QComboBox:hover {
                border-color: #2196F3;
            }
            
            QComboBox::drop-down {
                border: none;
                width: 20px;
            }
            
            QSpinBox {
                border: 1px solid #d0d0d0;
                border-radius: 4px;
                padding: 6px 8px;
                background-color: white;
            }
            
            QSpinBox:hover {
                border-color: #2196F3;
            }
            
            QLineEdit {
                border: 1px solid #d0d0d0;
                border-radius: 4px;
                padding: 6px 8px;
                background-color: white;
            }
            
            QLineEdit:focus {
                border-color: #2196F3;
            }
            
            QTextEdit {
                border: 1px solid #d0d0d0;
                border-radius: 4px;
                background-color: white;
                font-family: 'Monaco', 'Consolas', monospace;
                font-size: 12px;
            }
            
            QTableWidget {
                border: 1px solid #d0d0d0;
                border-radius: 4px;
                background-color: white;
                gridline-color: #e0e0e0;
            }
            
            QTableWidget::item {
                padding: 4px;
            }
            
            QTableWidget::item:selected {
                background-color: #2196F3;
                color: white;
            }
            
            QHeaderView::section {
                background-color: #f5f5f5;
                border: none;
                border-bottom: 2px solid #d0d0d0;
                padding: 8px;
                font-weight: bold;
            }
            
            QProgressBar {
                border: 1px solid #d0d0d0;
                border-radius: 4px;
                text-align: center;
                background-color: #f5f5f5;
            }
            
            QProgressBar::chunk {
                background-color: #2196F3;
                border-radius: 3px;
            }
            
            QCheckBox {
                spacing: 8px;
            }
            
            QCheckBox::indicator {
                width: 18px;
                height: 18px;
                border: 1px solid #d0d0d0;
                border-radius: 3px;
                background-color: white;
            }
            
            QCheckBox::indicator:checked {
                background-color: #2196F3;
                border-color: #2196F3;
            }
            
            QMenuBar {
                background-color: white;
                border-bottom: 1px solid #d0d0d0;
            }
            
            QMenuBar::item {
                padding: 6px 12px;
                background-color: transparent;
            }
            
            QMenuBar::item:selected {
                background-color: #e0e0e0;
            }
            
            QMenu {
                background-color: white;
                border: 1px solid #d0d0d0;
            }
            
            QMenu::item {
                padding: 6px 32px;
            }
            
            QMenu::item:selected {
                background-color: #2196F3;
                color: white;
            }
            
            QToolBar {
                background-color: white;
                border-bottom: 1px solid #d0d0d0;
                padding: 4px;
            }
            
            QStatusBar {
                background-color: white;
                border-top: 1px solid #d0d0d0;
                color: #666;
            }
            
            QSplitter::handle {
                background-color: #d0d0d0;
            }
            
            QListWidget {
                border: 1px solid #d0d0d0;
                border-radius: 4px;
                background-color: white;
            }
            
            QListWidget::item {
                padding: 6px;
            }
            
            QListWidget::item:selected {
                background-color: #2196F3;
                color: white;
            }
            
            QTreeWidget {
                border: 1px solid #d0d0d0;
                border-radius: 4px;
                background-color: white;
            }
            
            QTreeWidget::item {
                padding: 4px;
            }
            
            QTreeWidget::item:selected {
                background-color: #2196F3;
                color: white;
            }
        """)
    
    def _switch_tab(self, index):
        self.tab_widget.setCurrentIndex(index)
        
        tab_names = ["串口调试助手", "网络抓包分析", "视频转换器"]
        self.statusbar.showMessage(f"已切换到: {tab_names[index]}", 3000)
    
    def _show_about(self):
        QMessageBox.about(
            self,
            "关于",
            """<h2>硬件与媒体处理工具集</h2>
            <p><b>版本:</b> 1.0.0</p>
            <p><b>功能模块:</b></p>
            <ul>
                <li><b>串口调试助手</b>: 串口配置、ASCII/Hex收发、数据可视化、日志存储</li>
                <li><b>网络抓包分析</b>: 实时抓包、协议解析、BPF过滤、数据存储</li>
                <li><b>视频转换器</b>: 视频转GIF/WebM/MP4、批量转换、实时预览</li>
            </ul>
            <p><b>技术栈:</b> Python + PyQt6 + scapy + moviepy</p>
            <p><b>开发时间:</b> 2026</p>"""
        )
    
    def closeEvent(self, event):
        reply = QMessageBox.question(
            self,
            "确认退出",
            "确定要退出程序吗?",
            QMessageBox.StandardButton.Yes | QMessageBox.StandardButton.No,
            QMessageBox.StandardButton.No
        )
        
        if reply == QMessageBox.StandardButton.Yes:
            self.serial_widget.serial_terminal.disconnect()
            self.network_widget.packet_capture.stop_capture()
            self.media_widget.video_converter.stop_preview()
            self.media_widget.video_converter.cancel_conversion()
            
            event.accept()
        else:
            event.ignore()
