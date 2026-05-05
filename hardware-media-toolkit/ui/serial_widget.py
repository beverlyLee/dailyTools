import sys
from datetime import datetime
from PyQt6.QtCore import Qt, QTimer, pyqtSignal
from PyQt6.QtGui import QFont, QColor, QTextCursor
from PyQt6.QtWidgets import (
    QWidget, QVBoxLayout, QHBoxLayout, QGridLayout,
    QLabel, QComboBox, QPushButton, QCheckBox, QSpinBox,
    QTextEdit, QLineEdit, QSplitter, QGroupBox, QTableWidget,
    QTableWidgetItem, QHeaderView, QTabWidget, QMessageBox
)

from serial_tool.serial_terminal import SerialTerminal
from serial_tool.data_visualization import VisualizationWidget
from serial_tool.database import SerialDatabase
from utils.helpers import timestamp_to_str, bytes_to_hex

class SerialWidget(QWidget):
    def __init__(self, parent=None):
        super().__init__(parent)
        self.serial_terminal = SerialTerminal()
        self.serial_db = SerialDatabase()
        self.current_session_id = None
        
        self.init_ui()
        self.connect_signals()
        self.refresh_ports()
    
    def init_ui(self):
        layout = QVBoxLayout(self)
        
        self.tab_widget = QTabWidget()
        layout.addWidget(self.tab_widget)
        
        self.terminal_tab = QWidget()
        self.visualization_tab = VisualizationWidget()
        self.history_tab = QWidget()
        
        self.tab_widget.addTab(self.terminal_tab, "终端")
        self.tab_widget.addTab(self.visualization_tab, "数据可视化")
        self.tab_widget.addTab(self.history_tab, "历史记录")
        
        self._setup_terminal_tab()
        self._setup_history_tab()
    
    def _setup_terminal_tab(self):
        layout = QVBoxLayout(self.terminal_tab)
        
        config_group = QGroupBox("串口配置")
        config_layout = QGridLayout(config_group)
        
        row = 0
        config_layout.addWidget(QLabel("串口:"), row, 0)
        self.port_combo = QComboBox()
        self.port_combo.setMinimumWidth(100)
        config_layout.addWidget(self.port_combo, row, 1)
        
        config_layout.addWidget(QLabel("波特率:"), row, 2)
        self.baudrate_combo = QComboBox()
        self.baudrate_combo.addItems(['9600', '19200', '38400', '57600', '115200', '230400', '460800', '921600'])
        self.baudrate_combo.setCurrentText('115200')
        self.baudrate_combo.setEditable(True)
        config_layout.addWidget(self.baudrate_combo, row, 3)
        
        row += 1
        config_layout.addWidget(QLabel("数据位:"), row, 0)
        self.bytesize_combo = QComboBox()
        self.bytesize_combo.addItems(['5', '6', '7', '8'])
        self.bytesize_combo.setCurrentText('8')
        config_layout.addWidget(self.bytesize_combo, row, 1)
        
        config_layout.addWidget(QLabel("停止位:"), row, 2)
        self.stopbits_combo = QComboBox()
        self.stopbits_combo.addItems(['1', '1.5', '2'])
        self.stopbits_combo.setCurrentText('1')
        config_layout.addWidget(self.stopbits_combo, row, 3)
        
        row += 1
        config_layout.addWidget(QLabel("校验位:"), row, 0)
        self.parity_combo = QComboBox()
        self.parity_combo.addItems(['无(N)', '奇(O)', '偶(E)'])
        self.parity_combo.setCurrentText('无(N)')
        config_layout.addWidget(self.parity_combo, row, 1)
        
        config_layout.addWidget(QLabel("流控:"), row, 2)
        flow_layout = QHBoxLayout()
        self.xonxoff_check = QCheckBox("XON/XOFF")
        self.rtscts_check = QCheckBox("RTS/CTS")
        self.dsrdtr_check = QCheckBox("DSR/DTR")
        flow_layout.addWidget(self.xonxoff_check)
        flow_layout.addWidget(self.rtscts_check)
        flow_layout.addWidget(self.dsrdtr_check)
        flow_layout.addStretch()
        config_layout.addLayout(flow_layout, row, 3)
        
        row += 1
        self.connect_btn = QPushButton("打开串口")
        self.connect_btn.setMinimumHeight(30)
        config_layout.addWidget(self.connect_btn, row, 0, 1, 2)
        
        self.refresh_btn = QPushButton("刷新端口")
        self.refresh_btn.setMinimumHeight(30)
        config_layout.addWidget(self.refresh_btn, row, 2)
        
        self.clear_btn = QPushButton("清空显示")
        self.clear_btn.setMinimumHeight(30)
        config_layout.addWidget(self.clear_btn, row, 3)
        
        layout.addWidget(config_group)
        
        display_group = QGroupBox("数据显示")
        display_layout = QVBoxLayout(display_group)
        
        control_layout = QHBoxLayout()
        control_layout.addWidget(QLabel("显示格式:"))
        self.display_mode_combo = QComboBox()
        self.display_mode_combo.addItems(['ASCII', 'HEX', 'HEX + ASCII'])
        self.display_mode_combo.setCurrentText('ASCII')
        control_layout.addWidget(self.display_mode_combo)
        
        self.timestamp_check = QCheckBox("显示时间戳")
        self.timestamp_check.setChecked(True)
        control_layout.addWidget(self.timestamp_check)
        
        self.auto_scroll_check = QCheckBox("自动滚动")
        self.auto_scroll_check.setChecked(True)
        control_layout.addWidget(self.auto_scroll_check)
        
        self.log_to_db_check = QCheckBox("记录到数据库")
        self.log_to_db_check.setChecked(True)
        control_layout.addWidget(self.log_to_db_check)
        
        control_layout.addStretch()
        display_layout.addLayout(control_layout)
        
        self.receive_text = QTextEdit()
        self.receive_text.setReadOnly(True)
        self.receive_text.setFont(QFont("Monospace", 10))
        self.receive_text.setMinimumHeight(200)
        display_layout.addWidget(self.receive_text)
        
        layout.addWidget(display_group, stretch=1)
        
        send_group = QGroupBox("数据发送")
        send_layout = QVBoxLayout(send_group)
        
        send_control = QHBoxLayout()
        send_control.addWidget(QLabel("发送格式:"))
        self.send_mode_combo = QComboBox()
        self.send_mode_combo.addItems(['ASCII', 'HEX'])
        self.send_mode_combo.setCurrentText('ASCII')
        send_control.addWidget(self.send_mode_combo)
        
        self.add_newline_check = QCheckBox("追加换行")
        self.add_newline_check.setChecked(True)
        send_control.addWidget(self.add_newline_check)
        
        send_control.addStretch()
        send_layout.addLayout(send_control)
        
        input_layout = QHBoxLayout()
        self.send_input = QLineEdit()
        self.send_input.setPlaceholderText("输入要发送的数据...")
        self.send_input.returnPressed.connect(self._send_data)
        input_layout.addWidget(self.send_input, stretch=1)
        
        self.send_btn = QPushButton("发送")
        self.send_btn.setMinimumWidth(80)
        self.send_btn.clicked.connect(self._send_data)
        input_layout.addWidget(self.send_btn)
        
        send_layout.addLayout(input_layout)
        
        layout.addWidget(send_group)
    
    def _setup_history_tab(self):
        layout = QVBoxLayout(self.history_tab)
        
        search_group = QGroupBox("搜索条件")
        search_layout = QGridLayout(search_group)
        
        row = 0
        search_layout.addWidget(QLabel("关键字:"), row, 0)
        self.search_keyword = QLineEdit()
        self.search_keyword.setPlaceholderText("输入搜索关键字...")
        search_layout.addWidget(self.search_keyword, row, 1)
        
        search_layout.addWidget(QLabel("会话:"), row, 2)
        self.session_combo = QComboBox()
        self.session_combo.addItem("全部会话")
        search_layout.addWidget(self.session_combo, row, 3)
        
        row += 1
        search_layout.addWidget(QLabel("方向:"), row, 0)
        self.direction_combo = QComboBox()
        self.direction_combo.addItems(['全部', '接收(RX)', '发送(TX)'])
        search_layout.addWidget(self.direction_combo, row, 1)
        
        self.search_btn = QPushButton("搜索")
        search_layout.addWidget(self.search_btn, row, 2)
        
        self.clear_search_btn = QPushButton("清空")
        search_layout.addWidget(self.clear_search_btn, row, 3)
        
        search_layout.setColumnStretch(1, 1)
        search_layout.setColumnStretch(3, 1)
        layout.addWidget(search_group)
        
        self.history_table = QTableWidget()
        self.history_table.setColumnCount(5)
        self.history_table.setHorizontalHeaderLabels(['时间', '方向', '格式', '数据', 'ID'])
        self.history_table.horizontalHeader().setSectionResizeMode(0, QHeaderView.ResizeMode.ResizeToContents)
        self.history_table.horizontalHeader().setSectionResizeMode(1, QHeaderView.ResizeMode.ResizeToContents)
        self.history_table.horizontalHeader().setSectionResizeMode(2, QHeaderView.ResizeMode.ResizeToContents)
        self.history_table.horizontalHeader().setSectionResizeMode(3, QHeaderView.ResizeMode.Stretch)
        self.history_table.horizontalHeader().setSectionResizeMode(4, QHeaderView.ResizeMode.ResizeToContents)
        self.history_table.setAlternatingRowColors(True)
        self.history_table.setMinimumHeight(300)
        layout.addWidget(self.history_table, stretch=1)
        
        button_layout = QHBoxLayout()
        self.load_sessions_btn = QPushButton("刷新会话列表")
        button_layout.addWidget(self.load_sessions_btn)
        self.delete_session_btn = QPushButton("删除当前会话")
        button_layout.addWidget(self.delete_session_btn)
        self.clear_all_btn = QPushButton("清空所有记录")
        button_layout.addWidget(self.clear_all_btn)
        button_layout.addStretch()
        layout.addLayout(button_layout)
        
        self._load_sessions()
    
    def connect_signals(self):
        self.serial_terminal.data_received.connect(self._on_data_received)
        self.serial_terminal.data_sent.connect(self._on_data_sent)
        self.serial_terminal.connected.connect(self._on_connected)
        self.serial_terminal.disconnected.connect(self._on_disconnected)
        self.serial_terminal.error.connect(self._on_error)
        
        self.connect_btn.clicked.connect(self._toggle_connection)
        self.refresh_btn.clicked.connect(self.refresh_ports)
        self.clear_btn.clicked.connect(self._clear_display)
        
        self.search_btn.clicked.connect(self._search_history)
        self.clear_search_btn.clicked.connect(self._clear_search)
        self.load_sessions_btn.clicked.connect(self._load_sessions)
        self.delete_session_btn.clicked.connect(self._delete_session)
        self.clear_all_btn.clicked.connect(self._clear_all_history)
    
    def refresh_ports(self):
        ports = self.serial_terminal.get_available_ports()
        self.port_combo.clear()
        self.port_combo.addItems(ports)
        if ports:
            self.port_combo.setCurrentIndex(0)
    
    def _toggle_connection(self):
        if self.serial_terminal.is_connected():
            self.serial_terminal.disconnect()
        else:
            self._connect()
    
    def _connect(self):
        port = self.port_combo.currentText()
        if not port:
            QMessageBox.warning(self, "警告", "请选择串口")
            return
        
        try:
            baudrate = int(self.baudrate_combo.currentText())
            bytesize = int(self.bytesize_combo.currentText())
            stopbits = float(self.stopbits_combo.currentText())
            
            parity_map = {'无(N)': 'N', '奇(O)': 'O', '偶(E)': 'E'}
            parity = parity_map.get(self.parity_combo.currentText(), 'N')
            
            xonxoff = self.xonxoff_check.isChecked()
            rtscts = self.rtscts_check.isChecked()
            dsrdtr = self.dsrdtr_check.isChecked()
            
            success = self.serial_terminal.connect(
                port, baudrate, bytesize, parity, stopbits,
                xonxoff, rtscts, dsrdtr
            )
            
            if success and self.log_to_db_check.isChecked():
                self.current_session_id = self.serial_db.create_session(
                    port, baudrate, f"串口会话 - {port} @ {baudrate}"
                )
            
        except ValueError as e:
            QMessageBox.warning(self, "错误", f"参数错误: {e}")
    
    def _on_connected(self):
        self.connect_btn.setText("关闭串口")
        self._append_info("串口已连接")
    
    def _on_disconnected(self):
        self.connect_btn.setText("打开串口")
        if self.current_session_id:
            self.serial_db.close_session(self.current_session_id)
            self.current_session_id = None
        self._append_info("串口已断开")
    
    def _on_error(self, error_msg):
        QMessageBox.critical(self, "错误", error_msg)
    
    def _on_data_received(self, data, timestamp, display_str):
        display_mode = self.display_mode_combo.currentText()
        show_timestamp = self.timestamp_check.isChecked()
        
        timestamp_str = timestamp_to_str(timestamp)
        
        if display_mode == 'HEX':
            display_str = bytes_to_hex(data)
        elif display_mode == 'HEX + ASCII':
            hex_str = bytes_to_hex(data)
            try:
                ascii_str = data.decode('utf-8', errors='replace')
            except:
                ascii_str = str(data)
            display_str = f"{hex_str} | {ascii_str}"
        
        prefix = f"[{timestamp_str}] [RX] " if show_timestamp else "[RX] "
        colored_text = f"<span style='color: green;'>{prefix}{display_str}</span>"
        self._append_html(colored_text)
        
        if self.current_session_id and self.log_to_db_check.isChecked():
            self.serial_db.log_received(
                self.current_session_id,
                display_mode,
                bytes(data),
                display_str
            )
        
        self.visualization_tab.add_data(bytes(data), timestamp)
    
    def _on_data_sent(self, data, timestamp, display_str):
        show_timestamp = self.timestamp_check.isChecked()
        timestamp_str = timestamp_to_str(timestamp)
        
        prefix = f"[{timestamp_str}] [TX] " if show_timestamp else "[TX] "
        colored_text = f"<span style='color: blue;'>{prefix}{display_str}</span>"
        self._append_html(colored_text)
        
        if self.current_session_id and self.log_to_db_check.isChecked():
            self.serial_db.log_sent(
                self.current_session_id,
                self.send_mode_combo.currentText(),
                bytes(data),
                display_str
            )
    
    def _send_data(self):
        if not self.serial_terminal.is_connected():
            QMessageBox.warning(self, "警告", "串口未连接")
            return
        
        data = self.send_input.text()
        if not data:
            return
        
        send_mode = self.send_mode_combo.currentText()
        
        if self.add_newline_check.isChecked():
            if send_mode == 'HEX':
                data += ' 0D 0A'
            else:
                data += '\r\n'
        
        success = self.serial_terminal.send_data(data, send_mode)
        if success:
            self.send_input.clear()
    
    def _append_html(self, html):
        cursor = self.receive_text.textCursor()
        cursor.movePosition(QTextCursor.MoveOperation.End)
        cursor.insertHtml(html + '<br>')
        
        if self.auto_scroll_check.isChecked():
            scrollbar = self.receive_text.verticalScrollBar()
            scrollbar.setValue(scrollbar.maximum())
    
    def _append_info(self, message):
        timestamp = timestamp_to_str()
        colored_text = f"<span style='color: gray;'>[{timestamp}] [INFO] {message}</span>"
        self._append_html(colored_text)
    
    def _clear_display(self):
        self.receive_text.clear()
    
    def _load_sessions(self):
        sessions = self.serial_db.get_sessions(limit=100)
        self.session_combo.clear()
        self.session_combo.addItem("全部会话", None)
        for sess in sessions:
            display_text = f"{sess['id']} - {sess['port_name']} @ {sess['baudrate']} ({sess['start_time']})"
            self.session_combo.addItem(display_text, sess['id'])
    
    def _search_history(self):
        keyword = self.search_keyword.text().strip()
        session_id = self.session_combo.currentData()
        
        direction_map = {'全部': None, '接收(RX)': 'RX', '发送(TX)': 'TX'}
        direction = direction_map.get(self.direction_combo.currentText())
        
        logs = self.serial_db.search_logs(
            keyword=keyword if keyword else None,
            session_id=session_id,
            direction=direction,
            limit=500
        )
        
        self.history_table.setRowCount(len(logs))
        for row, log in enumerate(logs):
            self.history_table.setItem(row, 0, QTableWidgetItem(str(log.get('timestamp', ''))))
            
            direction_item = QTableWidgetItem(log.get('direction', ''))
            if log.get('direction') == 'RX':
                direction_item.setForeground(QColor('green'))
            elif log.get('direction') == 'TX':
                direction_item.setForeground(QColor('blue'))
            self.history_table.setItem(row, 1, direction_item)
            
            self.history_table.setItem(row, 2, QTableWidgetItem(log.get('data_type', '')))
            self.history_table.setItem(row, 3, QTableWidgetItem(log.get('display_text', '')))
            self.history_table.setItem(row, 4, QTableWidgetItem(str(log.get('id', ''))))
    
    def _clear_search(self):
        self.search_keyword.clear()
        self.direction_combo.setCurrentIndex(0)
        self.history_table.setRowCount(0)
    
    def _delete_session(self):
        session_id = self.session_combo.currentData()
        if session_id is None:
            QMessageBox.warning(self, "警告", "请选择要删除的会话")
            return
        
        reply = QMessageBox.question(
            self, "确认删除",
            f"确定要删除会话 {session_id} 及其所有记录吗?",
            QMessageBox.StandardButton.Yes | QMessageBox.StandardButton.No
        )
        
        if reply == QMessageBox.StandardButton.Yes:
            self.serial_db.delete_session(session_id)
            self._load_sessions()
            self._clear_search()
    
    def _clear_all_history(self):
        reply = QMessageBox.question(
            self, "确认清空",
            "确定要清空所有历史记录吗? 此操作不可恢复。",
            QMessageBox.StandardButton.Yes | QMessageBox.StandardButton.No
        )
        
        if reply == QMessageBox.StandardButton.Yes:
            self.serial_db.clear_all_logs()
            self._load_sessions()
            self._clear_search()
