import sys
from datetime import datetime
from PyQt6.QtCore import Qt, QTimer, pyqtSignal, QThread
from PyQt6.QtGui import QFont, QColor, QTextCursor
from PyQt6.QtWidgets import (
    QWidget, QVBoxLayout, QHBoxLayout, QGridLayout,
    QLabel, QComboBox, QPushButton, QCheckBox, QSpinBox,
    QTextEdit, QLineEdit, QSplitter, QGroupBox, QTableWidget,
    QTableWidgetItem, QHeaderView, QTabWidget, QMessageBox,
    QTreeWidget, QTreeWidgetItem, QProgressBar
)

from network_tool.packet_capture import PacketCapture
from network_tool.database import NetworkDatabase
from utils.helpers import bytes_to_hex

class NetworkWidget(QWidget):
    def __init__(self, parent=None):
        super().__init__(parent)
        self.packet_capture = PacketCapture()
        self.network_db = NetworkDatabase()
        self.current_session_id = None
        self.packet_count = 0
        
        self.init_ui()
        self.connect_signals()
        self.refresh_interfaces()
    
    def init_ui(self):
        layout = QVBoxLayout(self)
        
        self.tab_widget = QTabWidget()
        layout.addWidget(self.tab_widget)
        
        self.capture_tab = QWidget()
        self.history_tab = QWidget()
        
        self.tab_widget.addTab(self.capture_tab, "实时抓包")
        self.tab_widget.addTab(self.history_tab, "历史记录")
        
        self._setup_capture_tab()
        self._setup_history_tab()
    
    def _setup_capture_tab(self):
        layout = QVBoxLayout(self.capture_tab)
        
        config_group = QGroupBox("抓包配置")
        config_layout = QGridLayout(config_group)
        
        row = 0
        config_layout.addWidget(QLabel("网络接口:"), row, 0)
        self.interface_combo = QComboBox()
        self.interface_combo.setMinimumWidth(200)
        config_layout.addWidget(self.interface_combo, row, 1)
        
        config_layout.addWidget(QLabel("BPF 过滤:"), row, 2)
        self.filter_edit = QLineEdit()
        self.filter_edit.setPlaceholderText("例如: tcp port 80 或 udp port 53")
        config_layout.addWidget(self.filter_edit, row, 3)
        
        row += 1
        self.start_btn = QPushButton("开始抓包")
        self.start_btn.setMinimumHeight(30)
        config_layout.addWidget(self.start_btn, row, 0, 1, 2)
        
        self.stop_btn = QPushButton("停止抓包")
        self.stop_btn.setEnabled(False)
        self.stop_btn.setMinimumHeight(30)
        config_layout.addWidget(self.stop_btn, row, 2)
        
        self.refresh_btn = QPushButton("刷新接口")
        self.refresh_btn.setMinimumHeight(30)
        config_layout.addWidget(self.refresh_btn, row, 3)
        
        row += 1
        self.packet_count_label = QLabel("已捕获: 0 个数据包")
        config_layout.addWidget(self.packet_count_label, row, 0)
        
        self.save_to_db_check = QCheckBox("保存到数据库")
        self.save_to_db_check.setChecked(True)
        config_layout.addWidget(self.save_to_db_check, row, 1)
        
        config_layout.addStretch()
        layout.addWidget(config_group)
        
        splitter = QSplitter(Qt.Orientation.Vertical)
        
        list_group = QGroupBox("数据包列表")
        list_layout = QVBoxLayout(list_group)
        
        self.packet_table = QTableWidget()
        self.packet_table.setColumnCount(7)
        self.packet_table.setHorizontalHeaderLabels([
            '序号', '时间', '源IP', '源端口', '目的IP', '目的端口', '协议'
        ])
        self.packet_table.horizontalHeader().setSectionResizeMode(0, QHeaderView.ResizeMode.ResizeToContents)
        self.packet_table.horizontalHeader().setSectionResizeMode(1, QHeaderView.ResizeMode.ResizeToContents)
        self.packet_table.horizontalHeader().setSectionResizeMode(2, QHeaderView.ResizeMode.Stretch)
        self.packet_table.horizontalHeader().setSectionResizeMode(3, QHeaderView.ResizeMode.ResizeToContents)
        self.packet_table.horizontalHeader().setSectionResizeMode(4, QHeaderView.ResizeMode.Stretch)
        self.packet_table.horizontalHeader().setSectionResizeMode(5, QHeaderView.ResizeMode.ResizeToContents)
        self.packet_table.horizontalHeader().setSectionResizeMode(6, QHeaderView.ResizeMode.ResizeToContents)
        self.packet_table.setAlternatingRowColors(True)
        self.packet_table.setSelectionBehavior(QTableWidget.SelectionBehavior.SelectRows)
        self.packet_table.setSelectionMode(QTableWidget.SelectionMode.SingleSelection)
        self.packet_table.itemSelectionChanged.connect(self._on_packet_selected)
        list_layout.addWidget(self.packet_table)
        
        splitter.addWidget(list_group)
        
        detail_group = QGroupBox("数据包详情")
        detail_layout = QVBoxLayout(detail_group)
        
        self.packet_tree = QTreeWidget()
        self.packet_tree.setHeaderLabels(['字段', '值'])
        self.packet_tree.setColumnWidth(0, 200)
        detail_layout.addWidget(self.packet_tree)
        
        splitter.addWidget(detail_group)
        
        splitter.setSizes([300, 200])
        layout.addWidget(splitter, stretch=1)
        
        hex_group = QGroupBox("原始数据 (Hex)")
        hex_layout = QVBoxLayout(hex_group)
        
        self.hex_text = QTextEdit()
        self.hex_text.setReadOnly(True)
        self.hex_text.setFont(QFont("Monospace", 9))
        self.hex_text.setMaximumHeight(150)
        hex_layout.addWidget(self.hex_text)
        
        layout.addWidget(hex_group)
    
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
        search_layout.addWidget(QLabel("协议:"), row, 0)
        self.protocol_combo = QComboBox()
        self.protocol_combo.addItems(['全部', 'TCP', 'UDP', 'ICMP', 'HTTP', 'DNS'])
        search_layout.addWidget(self.protocol_combo, row, 1)
        
        search_layout.addWidget(QLabel("源IP:"), row, 2)
        self.src_ip_edit = QLineEdit()
        self.src_ip_edit.setPlaceholderText("例如: 192.168.1.1")
        search_layout.addWidget(self.src_ip_edit, row, 3)
        
        row += 1
        self.search_btn = QPushButton("搜索")
        search_layout.addWidget(self.search_btn, row, 0)
        
        self.clear_search_btn = QPushButton("清空")
        search_layout.addWidget(self.clear_search_btn, row, 1)
        
        self.load_sessions_btn = QPushButton("刷新会话列表")
        search_layout.addWidget(self.load_sessions_btn, row, 2)
        
        self.delete_session_btn = QPushButton("删除当前会话")
        search_layout.addWidget(self.delete_session_btn, row, 3)
        
        search_layout.setColumnStretch(1, 1)
        search_layout.setColumnStretch(3, 1)
        layout.addWidget(search_group)
        
        self.history_table = QTableWidget()
        self.history_table.setColumnCount(8)
        self.history_table.setHorizontalHeaderLabels([
            'ID', '时间', '源IP', '源端口', '目的IP', '目的端口', '协议', '摘要'
        ])
        self.history_table.horizontalHeader().setSectionResizeMode(0, QHeaderView.ResizeMode.ResizeToContents)
        self.history_table.horizontalHeader().setSectionResizeMode(1, QHeaderView.ResizeMode.ResizeToContents)
        self.history_table.horizontalHeader().setSectionResizeMode(2, QHeaderView.ResizeMode.Stretch)
        self.history_table.horizontalHeader().setSectionResizeMode(3, QHeaderView.ResizeMode.ResizeToContents)
        self.history_table.horizontalHeader().setSectionResizeMode(4, QHeaderView.ResizeMode.Stretch)
        self.history_table.horizontalHeader().setSectionResizeMode(5, QHeaderView.ResizeMode.ResizeToContents)
        self.history_table.horizontalHeader().setSectionResizeMode(6, QHeaderView.ResizeMode.ResizeToContents)
        self.history_table.horizontalHeader().setSectionResizeMode(7, QHeaderView.ResizeMode.Stretch)
        self.history_table.setAlternatingRowColors(True)
        self.history_table.setMinimumHeight(300)
        layout.addWidget(self.history_table, stretch=1)
        
        self._load_sessions()
    
    def connect_signals(self):
        self.packet_capture.packet_received.connect(self._on_packet_received)
        self.packet_capture.started.connect(self._on_capture_started)
        self.packet_capture.stopped.connect(self._on_capture_stopped)
        self.packet_capture.error.connect(self._on_error)
        
        self.start_btn.clicked.connect(self._start_capture)
        self.stop_btn.clicked.connect(self._stop_capture)
        self.refresh_btn.clicked.connect(self.refresh_interfaces)
        
        self.search_btn.clicked.connect(self._search_history)
        self.clear_search_btn.clicked.connect(self._clear_search)
        self.load_sessions_btn.clicked.connect(self._load_sessions)
        self.delete_session_btn.clicked.connect(self._delete_session)
    
    def refresh_interfaces(self):
        interfaces = self.packet_capture.get_interfaces()
        self.interface_combo.clear()
        
        for iface in interfaces:
            display_text = f"{iface['name']} ({iface['ip']})"
            self.interface_combo.addItem(display_text, iface['name'])
        
        if not interfaces:
            self.interface_combo.addItem("未检测到网络接口", None)
    
    def _start_capture(self):
        interface = self.interface_combo.currentData()
        if not interface:
            QMessageBox.warning(self, "警告", "请选择网络接口")
            return
        
        bpf_filter = self.filter_edit.text().strip()
        
        if self.save_to_db_check.isChecked():
            self.current_session_id = self.network_db.create_session(
                interface, bpf_filter
            )
        else:
            self.current_session_id = None
        
        self.packet_count = 0
        self.packet_table.setRowCount(0)
        
        success = self.packet_capture.start_capture(interface, bpf_filter)
        if not success:
            QMessageBox.critical(self, "错误", "无法启动抓包")
    
    def _stop_capture(self):
        self.packet_capture.stop_capture()
        
        if self.current_session_id:
            self.network_db.close_session(self.current_session_id, self.packet_count)
            self._load_sessions()
    
    def _on_capture_started(self):
        self.start_btn.setEnabled(False)
        self.stop_btn.setEnabled(True)
        self.interface_combo.setEnabled(False)
        self.filter_edit.setEnabled(False)
    
    def _on_capture_stopped(self):
        self.start_btn.setEnabled(True)
        self.stop_btn.setEnabled(False)
        self.interface_combo.setEnabled(True)
        self.filter_edit.setEnabled(True)
    
    def _on_error(self, error_msg):
        QMessageBox.critical(self, "错误", error_msg)
    
    def _on_packet_received(self, packet_info):
        self.packet_count += 1
        self.packet_count_label.setText(f"已捕获: {self.packet_count} 个数据包")
        
        row = self.packet_table.rowCount()
        self.packet_table.insertRow(row)
        
        timestamp = packet_info.get('timestamp', datetime.now())
        timestamp_str = timestamp.strftime('%H:%M:%S.%f')[:-3]
        
        self.packet_table.setItem(row, 0, QTableWidgetItem(str(self.packet_count)))
        self.packet_table.setItem(row, 1, QTableWidgetItem(timestamp_str))
        self.packet_table.setItem(row, 2, QTableWidgetItem(str(packet_info.get('src_ip', '-'))))
        self.packet_table.setItem(row, 3, QTableWidgetItem(str(packet_info.get('src_port', '-'))))
        self.packet_table.setItem(row, 4, QTableWidgetItem(str(packet_info.get('dst_ip', '-'))))
        self.packet_table.setItem(row, 5, QTableWidgetItem(str(packet_info.get('dst_port', '-'))))
        
        layers = packet_info.get('layers', [])
        protocol = ' / '.join(layers) if layers else 'Unknown'
        self.packet_table.setItem(row, 6, QTableWidgetItem(protocol))
        
        if self.current_session_id:
            self.network_db.save_packet(self.current_session_id, packet_info)
    
    def _on_packet_selected(self):
        selected_rows = self.packet_table.selectedItems()
        if not selected_rows:
            return
        
        row = selected_rows[0].row()
        packets = self.packet_capture.get_packets()
        
        if row < len(packets):
            packet_info = packets[row]
            self._display_packet_detail(packet_info)
    
    def _display_packet_detail(self, packet_info):
        self.packet_tree.clear()
        
        eth_item = QTreeWidgetItem(self.packet_tree, ['Ethernet II', ''])
        QTreeWidgetItem(eth_item, ['源MAC', str(packet_info.get('src_mac', '-'))])
        QTreeWidgetItem(eth_item, ['目的MAC', str(packet_info.get('dst_mac', '-'))])
        QTreeWidgetItem(eth_item, ['类型', str(packet_info.get('eth_type', '-'))])
        
        if packet_info.get('src_ip') or packet_info.get('dst_ip'):
            ip_item = QTreeWidgetItem(self.packet_tree, ['IP', ''])
            QTreeWidgetItem(ip_item, ['源IP', str(packet_info.get('src_ip', '-'))])
            QTreeWidgetItem(ip_item, ['目的IP', str(packet_info.get('dst_ip', '-'))])
            QTreeWidgetItem(ip_item, ['协议', str(packet_info.get('protocol', '-'))])
            QTreeWidgetItem(ip_item, ['TTL', str(packet_info.get('ttl', '-'))])
            QTreeWidgetItem(ip_item, ['长度', str(packet_info.get('ip_len', '-'))])
        
        if packet_info.get('src_port') or packet_info.get('dst_port'):
            if 'TCP' in packet_info.get('layers', []):
                tcp_item = QTreeWidgetItem(self.packet_tree, ['TCP', ''])
                QTreeWidgetItem(tcp_item, ['源端口', str(packet_info.get('src_port', '-'))])
                QTreeWidgetItem(tcp_item, ['目的端口', str(packet_info.get('dst_port', '-'))])
                QTreeWidgetItem(tcp_item, ['序列号', str(packet_info.get('seq', '-'))])
                QTreeWidgetItem(tcp_item, ['确认号', str(packet_info.get('ack', '-'))])
                QTreeWidgetItem(tcp_item, ['标志', str(packet_info.get('flags', '-'))])
                QTreeWidgetItem(tcp_item, ['窗口', str(packet_info.get('window', '-'))])
            elif 'UDP' in packet_info.get('layers', []):
                udp_item = QTreeWidgetItem(self.packet_tree, ['UDP', ''])
                QTreeWidgetItem(udp_item, ['源端口', str(packet_info.get('src_port', '-'))])
                QTreeWidgetItem(udp_item, ['目的端口', str(packet_info.get('dst_port', '-'))])
                QTreeWidgetItem(udp_item, ['长度', str(packet_info.get('udp_len', '-'))])
        
        if packet_info.get('http_type'):
            http_item = QTreeWidgetItem(self.packet_tree, ['HTTP', packet_info.get('http_type', '')])
            if packet_info.get('http_method'):
                QTreeWidgetItem(http_item, ['方法', packet_info.get('http_method', '')])
            if packet_info.get('http_path'):
                QTreeWidgetItem(http_item, ['路径', packet_info.get('http_path', '')])
            if packet_info.get('http_status'):
                QTreeWidgetItem(http_item, ['状态码', str(packet_info.get('http_status', ''))])
            if packet_info.get('http_headers'):
                headers_item = QTreeWidgetItem(http_item, ['头部', ''])
                for key, value in packet_info.get('http_headers', {}).items():
                    QTreeWidgetItem(headers_item, [key, value])
        
        if packet_info.get('dns_type'):
            dns_item = QTreeWidgetItem(self.packet_tree, ['DNS', packet_info.get('dns_type', '')])
            questions = packet_info.get('dns_questions', [])
            if questions:
                q_item = QTreeWidgetItem(dns_item, ['查询', ''])
                for q in questions:
                    QTreeWidgetItem(q_item, [q.get('name', ''), f"Type: {q.get('type', '')}"])
            
            answers = packet_info.get('dns_answers', [])
            if answers:
                a_item = QTreeWidgetItem(dns_item, ['回答', ''])
                for a in answers:
                    QTreeWidgetItem(a_item, [a.get('name', ''), a.get('rdata', '')])
        
        self.packet_tree.expandAll()
        
        raw_packet = packet_info.get('raw_packet', b'')
        if raw_packet:
            hex_display = self._format_hex_dump(raw_packet)
            self.hex_text.setText(hex_display)
        else:
            self.hex_text.clear()
    
    def _format_hex_dump(self, data, bytes_per_line=16):
        lines = []
        for i in range(0, len(data), bytes_per_line):
            chunk = data[i:i+bytes_per_line]
            
            hex_part = ' '.join(f'{b:02X}' for b in chunk)
            hex_part = hex_part.ljust(bytes_per_line * 3 - 1)
            
            ascii_part = ''.join(chr(b) if 32 <= b <= 126 else '.' for b in chunk)
            
            lines.append(f'{i:04X}:  {hex_part}  {ascii_part}')
        
        return '\n'.join(lines)
    
    def _load_sessions(self):
        sessions = self.network_db.get_sessions(limit=100)
        self.session_combo.clear()
        self.session_combo.addItem("全部会话", None)
        for sess in sessions:
            display_text = f"{sess['id']} - {sess['interface']} ({sess['start_time']})"
            self.session_combo.addItem(display_text, sess['id'])
    
    def _search_history(self):
        keyword = self.search_keyword.text().strip()
        session_id = self.session_combo.currentData()
        src_ip = self.src_ip_edit.text().strip()
        
        protocol_map = {
            '全部': None, 'TCP': 6, 'UDP': 17, 'ICMP': 1,
            'HTTP': None, 'DNS': None
        }
        protocol = None
        proto_text = self.protocol_combo.currentText()
        if proto_text in protocol_map:
            protocol = protocol_map[proto_text]
        
        packets = self.network_db.search_packets(
            keyword=keyword if keyword else None,
            session_id=session_id,
            protocol=protocol,
            src_ip=src_ip if src_ip else None,
            limit=500
        )
        
        self.history_table.setRowCount(len(packets))
        for row, pkt in enumerate(packets):
            self.history_table.setItem(row, 0, QTableWidgetItem(str(pkt.get('id', ''))))
            self.history_table.setItem(row, 1, QTableWidgetItem(str(pkt.get('timestamp', ''))))
            self.history_table.setItem(row, 2, QTableWidgetItem(str(pkt.get('src_ip', '-'))))
            self.history_table.setItem(row, 3, QTableWidgetItem(str(pkt.get('src_port', '-'))))
            self.history_table.setItem(row, 4, QTableWidgetItem(str(pkt.get('dst_ip', '-'))))
            self.history_table.setItem(row, 5, QTableWidgetItem(str(pkt.get('dst_port', '-'))))
            
            layers = pkt.get('layers', [])
            protocol_str = ' / '.join(layers) if isinstance(layers, list) else str(layers)
            self.history_table.setItem(row, 6, QTableWidgetItem(protocol_str))
            self.history_table.setItem(row, 7, QTableWidgetItem(str(pkt.get('summary', ''))))
    
    def _clear_search(self):
        self.search_keyword.clear()
        self.src_ip_edit.clear()
        self.protocol_combo.setCurrentIndex(0)
        self.history_table.setRowCount(0)
    
    def _delete_session(self):
        session_id = self.session_combo.currentData()
        if session_id is None:
            QMessageBox.warning(self, "警告", "请选择要删除的会话")
            return
        
        reply = QMessageBox.question(
            self, "确认删除",
            f"确定要删除会话 {session_id} 及其所有数据包吗?",
            QMessageBox.StandardButton.Yes | QMessageBox.StandardButton.No
        )
        
        if reply == QMessageBox.StandardButton.Yes:
            self.network_db.delete_session(session_id)
            self._load_sessions()
            self._clear_search()
