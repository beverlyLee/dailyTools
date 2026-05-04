import sys
import re
from datetime import datetime
from typing import Optional, List

from PySide6.QtWidgets import (
    QApplication, QMainWindow, QWidget, QVBoxLayout, QHBoxLayout,
    QGridLayout, QLabel, QComboBox, QPushButton, QTextEdit, QLineEdit,
    QCheckBox, QGroupBox, QSplitter, QTabWidget, QTableWidget, QTableWidgetItem,
    QHeaderView, QMessageBox, QSpinBox, QStatusBar, QFrame
)
from PySide6.QtCore import Qt, Signal, QTimer
from PySide6.QtGui import QFont, QColor, QTextCursor

import matplotlib
matplotlib.use('Qt5Agg')
from matplotlib.backends.backend_qt5agg import FigureCanvasQTAgg as FigureCanvas
from matplotlib.figure import Figure
import matplotlib.pyplot as plt
import numpy as np

try:
    from core.serial_port import SerialManager, SerialConfig
    from core.database import Database
except ImportError:
    import os
    sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    from core.serial_port import SerialManager, SerialConfig
    from core.database import Database


class DataVisualizer(FigureCanvas):
    def __init__(self, parent=None):
        self.fig = Figure(figsize=(6, 4), dpi=100)
        self.axes = self.fig.add_subplot(111)
        super().__init__(self.fig)
        
        self.max_points = 100
        self.x_data = []
        self.y_data = []
        self.line, = self.axes.plot([], [], 'b-', linewidth=1)
        
        self.axes.set_xlabel('数据点')
        self.axes.set_ylabel('数值')
        self.axes.grid(True, alpha=0.3)
        self.axes.set_facecolor('#f8f9fa')
        self.fig.tight_layout()
        
        self.setMinimumHeight(200)

    def add_data_point(self, value: float):
        if len(self.x_data) >= self.max_points:
            self.x_data = self.x_data[1:]
            self.y_data = self.y_data[1:]
        
        self.x_data.append(len(self.x_data))
        self.y_data.append(value)
        
        self.line.set_data(self.x_data, self.y_data)
        self.axes.relim()
        self.axes.autoscale_view()
        self.draw()

    def clear_plot(self):
        self.x_data = []
        self.y_data = []
        self.line.set_data([], [])
        self.axes.relim()
        self.axes.autoscale_view()
        self.draw()


class MainWindow(QMainWindow):
    def __init__(self):
        super().__init__()
        self.serial_manager = SerialManager()
        self.database = Database()
        self.is_receiving = False
        self.receive_buffer_hex = []
        self.receive_buffer_ascii = []
        self.plot_data_buffer = []
        
        self._init_ui()
        self._connect_signals()
        self._init_timer()
        
        self.setWindowTitle("串口调试助手 v1.0")
        self.setMinimumSize(1200, 800)
        self.resize(1400, 900)

    def _init_ui(self):
        central_widget = QWidget()
        self.setCentralWidget(central_widget)
        main_layout = QVBoxLayout(central_widget)
        
        config_group = QGroupBox("串口配置")
        config_layout = QGridLayout(config_group)
        
        row = 0
        
        config_layout.addWidget(QLabel("串口:"), row, 0)
        self.combo_port = QComboBox()
        self.combo_port.setMinimumWidth(120)
        config_layout.addWidget(self.combo_port, row, 1)
        
        self.btn_refresh = QPushButton("刷新")
        config_layout.addWidget(self.btn_refresh, row, 2)
        
        config_layout.addWidget(QLabel("波特率:"), row, 3)
        self.combo_baud = QComboBox()
        self.combo_baud.addItems([str(br) for br in SerialConfig.BAUD_RATES])
        self.combo_baud.setCurrentText("115200")
        config_layout.addWidget(self.combo_baud, row, 4)
        
        row += 1
        
        config_layout.addWidget(QLabel("数据位:"), row, 0)
        self.combo_data_bits = QComboBox()
        self.combo_data_bits.addItems([str(db) for db in SerialConfig.DATA_BITS])
        self.combo_data_bits.setCurrentText("8")
        config_layout.addWidget(self.combo_data_bits, row, 1)
        
        config_layout.addWidget(QLabel("停止位:"), row, 2)
        self.combo_stop_bits = QComboBox()
        self.combo_stop_bits.addItems([str(sb) for sb in SerialConfig.STOP_BITS])
        self.combo_stop_bits.setCurrentText("1")
        config_layout.addWidget(self.combo_stop_bits, row, 3)
        
        config_layout.addWidget(QLabel("校验位:"), row, 4)
        self.combo_parity = QComboBox()
        for p in SerialConfig.PARITY:
            self.combo_parity.addItem(SerialConfig.PARITY_NAMES[p], p)
        config_layout.addWidget(self.combo_parity, row, 5)
        
        row += 1
        
        config_layout.addWidget(QLabel("流控:"), row, 0)
        self.combo_flow_control = QComboBox()
        self.combo_flow_control.addItems(SerialConfig.FLOW_CONTROL)
        config_layout.addWidget(self.combo_flow_control, row, 1)
        
        self.btn_connect = QPushButton("打开串口")
        self.btn_connect.setStyleSheet("background-color: #4CAF50; color: white; font-weight: bold;")
        self.btn_connect.setMinimumWidth(100)
        config_layout.addWidget(self.btn_connect, row, 3, 1, 2)
        
        self.btn_disconnect = QPushButton("关闭串口")
        self.btn_disconnect.setStyleSheet("background-color: #f44336; color: white; font-weight: bold;")
        self.btn_disconnect.setMinimumWidth(100)
        self.btn_disconnect.setEnabled(False)
        config_layout.addWidget(self.btn_disconnect, row, 5)
        
        config_layout.setColumnStretch(6, 1)
        main_layout.addWidget(config_group)
        
        main_splitter = QSplitter(Qt.Vertical)
        main_layout.addWidget(main_splitter)
        
        upper_splitter = QSplitter(Qt.Horizontal)
        main_splitter.addWidget(upper_splitter)
        
        receive_group = QGroupBox("接收区")
        receive_layout = QVBoxLayout(receive_group)
        
        receive_toolbar = QHBoxLayout()
        self.check_receive_hex = QCheckBox("十六进制显示")
        self.check_receive_hex.stateChanged.connect(self._update_receive_display)
        receive_toolbar.addWidget(self.check_receive_hex)
        
        self.check_timestamp = QCheckBox("显示时间戳")
        self.check_timestamp.setChecked(True)
        receive_toolbar.addWidget(self.check_timestamp)
        
        self.check_auto_wrap = QCheckBox("自动换行")
        self.check_auto_wrap.setChecked(True)
        receive_toolbar.addWidget(self.check_auto_wrap)
        
        self.btn_clear_receive = QPushButton("清空")
        receive_toolbar.addWidget(self.btn_clear_receive)
        
        self.btn_save_log = QPushButton("保存日志")
        receive_toolbar.addWidget(self.btn_save_log)
        
        receive_toolbar.addStretch()
        receive_layout.addLayout(receive_toolbar)
        
        self.text_receive = QTextEdit()
        self.text_receive.setReadOnly(True)
        self.text_receive.setFont(QFont("Consolas", 10))
        self.text_receive.setStyleSheet("background-color: #f5f5f5;")
        receive_layout.addWidget(self.text_receive)
        
        receive_stats = QHBoxLayout()
        self.label_rx_count = QLabel("接收: 0 字节")
        receive_stats.addWidget(self.label_rx_count)
        self.label_tx_count = QLabel("发送: 0 字节")
        receive_stats.addWidget(self.label_tx_count)
        receive_stats.addStretch()
        receive_layout.addLayout(receive_stats)
        
        upper_splitter.addWidget(receive_group)
        
        plot_group = QGroupBox("数据可视化")
        plot_layout = QVBoxLayout(plot_group)
        
        plot_toolbar = QHBoxLayout()
        self.check_enable_plot = QCheckBox("启用绘图")
        self.check_enable_plot.setChecked(True)
        plot_toolbar.addWidget(self.check_enable_plot)
        
        self.label_plot_label = QLabel("提取模式:")
        plot_toolbar.addWidget(self.label_plot_label)
        
        self.combo_plot_mode = QComboBox()
        self.combo_plot_mode.addItems(["最后一个数值", "第一个数值", "所有数值取平均"])
        plot_toolbar.addWidget(self.combo_plot_mode)
        
        plot_toolbar.addStretch()
        
        self.btn_clear_plot = QPushButton("清空图表")
        plot_toolbar.addWidget(self.btn_clear_plot)
        
        plot_layout.addLayout(plot_toolbar)
        
        self.visualizer = DataVisualizer()
        plot_layout.addWidget(self.visualizer)
        
        upper_splitter.addWidget(plot_group)
        upper_splitter.setSizes([600, 600])
        
        self.tab_widget = QTabWidget()
        
        send_tab = QWidget()
        send_layout = QVBoxLayout(send_tab)
        
        send_group = QGroupBox("发送区")
        send_group_layout = QVBoxLayout(send_group)
        
        send_toolbar = QHBoxLayout()
        self.check_send_hex = QCheckBox("十六进制发送")
        send_toolbar.addWidget(self.check_send_hex)
        
        self.check_add_newline = QCheckBox("自动添加换行符")
        self.check_add_newline.setChecked(True)
        send_toolbar.addWidget(self.check_add_newline)
        
        send_toolbar.addStretch()
        send_group_layout.addLayout(send_toolbar)
        
        self.text_send = QTextEdit()
        self.text_send.setFont(QFont("Consolas", 10))
        self.text_send.setPlaceholderText("在此输入要发送的数据...")
        send_group_layout.addWidget(self.text_send)
        
        send_buttons = QHBoxLayout()
        self.btn_send = QPushButton("发送")
        self.btn_send.setStyleSheet("background-color: #2196F3; color: white; font-weight: bold;")
        self.btn_send.setMinimumWidth(100)
        send_buttons.addWidget(self.btn_send)
        
        self.check_send_cycle = QCheckBox("循环发送")
        send_buttons.addWidget(self.check_send_cycle)
        
        self.label_cycle_interval = QLabel("间隔(ms):")
        send_buttons.addWidget(self.label_cycle_interval)
        
        self.spin_cycle_interval = QSpinBox()
        self.spin_cycle_interval.setRange(10, 60000)
        self.spin_cycle_interval.setValue(1000)
        send_buttons.addWidget(self.spin_cycle_interval)
        
        send_buttons.addStretch()
        
        self.btn_clear_send = QPushButton("清空")
        send_buttons.addWidget(self.btn_clear_send)
        
        send_group_layout.addLayout(send_buttons)
        send_layout.addWidget(send_group)
        
        self.tab_widget.addTab(send_tab, "发送")
        
        history_tab = QWidget()
        history_layout = QVBoxLayout(history_tab)
        
        search_group = QGroupBox("日志查询")
        search_layout = QHBoxLayout(search_group)
        
        search_layout.addWidget(QLabel("关键字:"))
        self.line_search_keyword = QLineEdit()
        self.line_search_keyword.setPlaceholderText("输入查询关键字...")
        search_layout.addWidget(self.line_search_keyword)
        
        search_layout.addWidget(QLabel("方向:"))
        self.combo_search_direction = QComboBox()
        self.combo_search_direction.addItems(["全部", "接收", "发送"])
        search_layout.addWidget(self.combo_search_direction)
        
        self.btn_search = QPushButton("查询")
        search_layout.addWidget(self.btn_search)
        
        self.btn_clear_history = QPushButton("清空日志")
        search_layout.addWidget(self.btn_clear_history)
        
        search_layout.addStretch()
        history_layout.addWidget(search_group)
        
        self.table_history = QTableWidget()
        self.table_history.setColumnCount(6)
        self.table_history.setHorizontalHeaderLabels([
            "时间", "方向", "类型", "原始数据", "解码数据", "串口"
        ])
        self.table_history.horizontalHeader().setSectionResizeMode(QHeaderView.Stretch)
        self.table_history.setAlternatingRowColors(True)
        self.table_history.setSelectionBehavior(QTableWidget.SelectRows)
        history_layout.addWidget(self.table_history)
        
        history_stats = QHBoxLayout()
        self.label_history_count = QLabel("日志总数: 0")
        history_stats.addWidget(self.label_history_count)
        history_stats.addStretch()
        history_layout.addLayout(history_stats)
        
        self.tab_widget.addTab(history_tab, "历史日志")
        main_splitter.addWidget(self.tab_widget)
        
        main_splitter.setSizes([500, 300])
        
        self.status_bar = QStatusBar()
        self.setStatusBar(self.status_bar)
        self.status_bar.showMessage("就绪")
        
        self._update_port_list()

    def _connect_signals(self):
        self.btn_refresh.clicked.connect(self._update_port_list)
        self.btn_connect.clicked.connect(self._connect_serial)
        self.btn_disconnect.clicked.connect(self._disconnect_serial)
        
        self.btn_send.clicked.connect(self._send_data)
        self.btn_clear_receive.clicked.connect(self._clear_receive)
        self.btn_clear_send.clicked.connect(self._clear_send)
        self.btn_save_log.clicked.connect(self._save_receive_log)
        
        self.btn_search.clicked.connect(self._search_history)
        self.btn_clear_history.clicked.connect(self._clear_history)
        self.btn_clear_plot.clicked.connect(self.visualizer.clear_plot)
        
        self.serial_manager.data_received.connect(self._on_data_received)
        self.serial_manager.data_sent.connect(self._on_data_sent)
        self.serial_manager.connected.connect(self._on_connected)
        self.serial_manager.disconnected.connect(self._on_disconnected)
        self.serial_manager.error.connect(self._on_serial_error)

    def _init_timer(self):
        self.cycle_timer = QTimer()
        self.cycle_timer.timeout.connect(self._cycle_send)
        self.check_send_cycle.stateChanged.connect(self._toggle_cycle_send)
        
        self.rx_count = 0
        self.tx_count = 0

    def _update_port_list(self):
        self.combo_port.clear()
        ports = SerialManager.get_port_names()
        if ports:
            self.combo_port.addItems(ports)
            self.status_bar.showMessage(f"发现 {len(ports)} 个串口")
        else:
            self.status_bar.showMessage("未发现可用串口")

    def _connect_serial(self):
        config = SerialConfig()
        config.port_name = self.combo_port.currentText()
        config.baud_rate = int(self.combo_baud.currentText())
        config.data_bits = int(self.combo_data_bits.currentText())
        config.stop_bits = float(self.combo_stop_bits.currentText())
        config.parity = self.combo_parity.currentData()
        config.flow_control = self.combo_flow_control.currentText()
        
        if self.serial_manager.connect(config):
            pass
        else:
            QMessageBox.warning(self, "错误", "无法打开串口")

    def _disconnect_serial(self):
        self.serial_manager.disconnect()

    def _on_connected(self):
        self.btn_connect.setEnabled(False)
        self.btn_disconnect.setEnabled(True)
        self.combo_port.setEnabled(False)
        self.combo_baud.setEnabled(False)
        self.combo_data_bits.setEnabled(False)
        self.combo_stop_bits.setEnabled(False)
        self.combo_parity.setEnabled(False)
        self.combo_flow_control.setEnabled(False)
        
        port = self.combo_port.currentText()
        baud = self.combo_baud.currentText()
        self.status_bar.showMessage(f"已连接: {port} @ {baud} bps")
        
        self._append_receive_text(f"[系统] 已连接到 {port}\n", "#2196F3")

    def _on_disconnected(self):
        self.btn_connect.setEnabled(True)
        self.btn_disconnect.setEnabled(False)
        self.combo_port.setEnabled(True)
        self.combo_baud.setEnabled(True)
        self.combo_data_bits.setEnabled(True)
        self.combo_stop_bits.setEnabled(True)
        self.combo_parity.setEnabled(True)
        self.combo_flow_control.setEnabled(True)
        
        self.status_bar.showMessage("已断开连接")
        self._append_receive_text("[系统] 已断开连接\n", "#f44336")
        
        self.check_send_cycle.setChecked(False)

    def _on_serial_error(self, error_msg: str):
        self.status_bar.showMessage(f"错误: {error_msg}")
        QMessageBox.warning(self, "串口错误", error_msg)

    def _send_data(self):
        data = self.text_send.toPlainText()
        if not data:
            return
        
        is_hex = self.check_send_hex.isChecked()
        
        if self.check_add_newline.isChecked() and not is_hex:
            if not data.endswith('\n'):
                data += '\n'
        
        if self.serial_manager.send_data(data, is_hex):
            self.tx_count += len(data)
            self.label_tx_count.setText(f"发送: {self.tx_count} 字节")
        else:
            QMessageBox.warning(self, "发送失败", "数据发送失败")

    def _cycle_send(self):
        if self.serial_manager.is_connected():
            self._send_data()

    def _toggle_cycle_send(self, state):
        if state == Qt.Checked:
            interval = self.spin_cycle_interval.value()
            self.cycle_timer.start(interval)
        else:
            self.cycle_timer.stop()

    def _on_data_received(self, timestamp: str, hex_data: str):
        self.rx_count += len(hex_data.replace(' ', '')) // 2
        self.label_rx_count.setText(f"接收: {self.rx_count} 字节")
        
        try:
            ascii_data = bytes.fromhex(hex_data.replace(' ', '')).decode('utf-8', errors='replace')
        except:
            ascii_data = '?'
        
        self.receive_buffer_hex.append((timestamp, hex_data))
        self.receive_buffer_ascii.append((timestamp, ascii_data))
        
        if self.check_timestamp.isChecked():
            prefix = f"[{timestamp}] "
        else:
            prefix = ""
        
        if self.check_receive_hex.isChecked():
            display_data = f"{prefix}{hex_data}\n"
        else:
            display_data = f"{prefix}{ascii_data}"
        
        self._append_receive_text(display_data, "#4CAF50")
        
        self._try_plot_data(hex_data)
        
        self.database.insert_log(
            direction="接收",
            data_type="HEX" if self.check_receive_hex.isChecked() else "ASCII",
            raw_data=hex_data,
            decoded_data=ascii_data,
            port_name=self.combo_port.currentText(),
            baud_rate=int(self.combo_baud.currentText())
        )
        
        self._update_history_count()

    def _on_data_sent(self, timestamp: str, data: str):
        if self.check_timestamp.isChecked():
            prefix = f"[{timestamp}] "
        else:
            prefix = ""
        
        display_data = f"{prefix}{data}\n"
        self._append_receive_text(display_data, "#FF9800")
        
        self.database.insert_log(
            direction="发送",
            data_type="HEX" if self.check_send_hex.isChecked() else "ASCII",
            raw_data=data,
            decoded_data=data,
            port_name=self.combo_port.currentText(),
            baud_rate=int(self.combo_baud.currentText())
        )
        
        self._update_history_count()

    def _append_receive_text(self, text: str, color: str = "#000000"):
        cursor = self.text_receive.textCursor()
        cursor.movePosition(QTextCursor.End)
        
        format_ = cursor.charFormat()
        format_.setForeground(QColor(color))
        cursor.setCharFormat(format_)
        cursor.insertText(text)
        
        if self.check_auto_wrap.isChecked():
            self.text_receive.ensureCursorVisible()

    def _update_receive_display(self):
        pass

    def _clear_receive(self):
        self.text_receive.clear()
        self.receive_buffer_hex.clear()
        self.receive_buffer_ascii.clear()
        self.rx_count = 0
        self.tx_count = 0
        self.label_rx_count.setText("接收: 0 字节")
        self.label_tx_count.setText("发送: 0 字节")

    def _clear_send(self):
        self.text_send.clear()

    def _save_receive_log(self):
        from PySide6.QtWidgets import QFileDialog
        filename, _ = QFileDialog.getSaveFileName(
            self, "保存日志", "", "文本文件 (*.txt);;所有文件 (*)"
        )
        if filename:
            try:
                with open(filename, 'w', encoding='utf-8') as f:
                    f.write(self.text_receive.toPlainText())
                self.status_bar.showMessage(f"日志已保存到: {filename}")
            except Exception as e:
                QMessageBox.warning(self, "保存失败", f"无法保存文件: {str(e)}")

    def _try_plot_data(self, hex_data: str):
        if not self.check_enable_plot.isChecked():
            return
        
        try:
            hex_str = hex_data.replace(' ', '')
            numbers = re.findall(r'-?\d+\.?\d*', hex_str)
            
            if not numbers:
                try:
                    bytes_data = bytes.fromhex(hex_str)
                    decoded = bytes_data.decode('utf-8', errors='ignore')
                    numbers = re.findall(r'-?\d+\.?\d*', decoded)
                except:
                    pass
            
            if numbers:
                float_numbers = [float(n) for n in numbers]
                
                mode = self.combo_plot_mode.currentText()
                if mode == "最后一个数值":
                    value = float_numbers[-1]
                elif mode == "第一个数值":
                    value = float_numbers[0]
                else:
                    value = sum(float_numbers) / len(float_numbers)
                
                self.visualizer.add_data_point(value)
                
        except Exception as e:
            pass

    def _search_history(self):
        keyword = self.line_search_keyword.text()
        direction = self.combo_search_direction.currentText()
        
        if direction == "全部":
            direction_filter = None
        elif direction == "接收":
            direction_filter = "接收"
        else:
            direction_filter = "发送"
        
        logs = self.database.query_logs(
            keyword=keyword,
            direction=direction_filter,
            limit=1000
        )
        
        self.table_history.setRowCount(0)
        
        for row_idx, log in enumerate(reversed(logs)):
            self.table_history.insertRow(row_idx)
            
            log_id, timestamp, direction, data_type, raw_data, decoded_data, port_name, baud_rate = log
            
            self.table_history.setItem(row_idx, 0, QTableWidgetItem(str(timestamp)))
            self.table_history.setItem(row_idx, 1, QTableWidgetItem(str(direction)))
            self.table_history.setItem(row_idx, 2, QTableWidgetItem(str(data_type)))
            self.table_history.setItem(row_idx, 3, QTableWidgetItem(str(raw_data)[:100]))
            self.table_history.setItem(row_idx, 4, QTableWidgetItem(str(decoded_data)[:100] if decoded_data else ""))
            self.table_history.setItem(row_idx, 5, QTableWidgetItem(f"{port_name} @ {baud_rate}"))

    def _clear_history(self):
        reply = QMessageBox.question(
            self, "确认", "确定要清空所有历史日志吗？",
            QMessageBox.Yes | QMessageBox.No, QMessageBox.No
        )
        
        if reply == QMessageBox.Yes:
            self.database.clear_logs()
            self.table_history.setRowCount(0)
            self._update_history_count()
            self.status_bar.showMessage("日志已清空")

    def _update_history_count(self):
        count = self.database.get_log_count()
        self.label_history_count.setText(f"日志总数: {count}")
