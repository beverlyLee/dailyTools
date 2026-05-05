#!/usr/bin/env python3
"""
网络抓包分析工具 UI 标签页
"""

import sys
from datetime import datetime
from typing import Dict, Any, List, Optional
from PyQt5.QtWidgets import (
    QWidget, QVBoxLayout, QHBoxLayout, QLabel, QComboBox,
    QPushButton, QLineEdit, QTextEdit, QTableWidget, QTableWidgetItem,
    QHeaderView, QSplitter, QGroupBox, QMessageBox, QTabWidget
)
from PyQt5.QtCore import Qt, QTimer, pyqtSignal, QObject
from PyQt5.QtGui import QFont

from core.sniffer.packet_sniffer import PacketSniffer
from core.sniffer.database import PacketDatabase


class PacketSignal(QObject):
    new_packet = pyqtSignal(dict)


class PacketSnifferTab(QWidget):
    def __init__(self, parent=None):
        super().__init__(parent)
        
        self.sniffer = None
        self.database = PacketDatabase()
        self.packet_signal = PacketSignal()
        self.packet_signal.new_packet.connect(self.on_new_packet)
        
        self.packet_list: List[Dict[str, Any]] = []
        self.current_display_mode = "live"
        
        self.init_ui()
        self.load_interfaces()
        
    def init_ui(self):
        main_layout = QVBoxLayout(self)
        main_layout.setSpacing(10)
        main_layout.setContentsMargins(10, 10, 10, 10)
        
        toolbar_layout = QHBoxLayout()
        
        interface_group = QGroupBox("网卡选择")
        interface_layout = QHBoxLayout(interface_group)
        self.interface_combo = QComboBox()
        self.interface_combo.setMinimumWidth(250)
        interface_layout.addWidget(QLabel("接口:"))
        interface_layout.addWidget(self.interface_combo)
        self.refresh_btn = QPushButton("刷新")
        self.refresh_btn.clicked.connect(self.load_interfaces)
        interface_layout.addWidget(self.refresh_btn)
        toolbar_layout.addWidget(interface_group)
        
        filter_group = QGroupBox("BPF 过滤器")
        filter_layout = QHBoxLayout(filter_group)
        self.filter_input = QLineEdit()
        self.filter_input.setPlaceholderText("例如: tcp port 80 或 udp 或 host 192.168.1.1")
        self.filter_input.setMinimumWidth(300)
        filter_layout.addWidget(QLabel("过滤表达式:"))
        filter_layout.addWidget(self.filter_input)
        
        self.filter_presets = QComboBox()
        self.filter_presets.addItem("预设过滤...", "")
        self.filter_presets.addItem("HTTP (TCP 80)", "tcp port 80")
        self.filter_presets.addItem("HTTPS (TCP 443)", "tcp port 443")
        self.filter_presets.addItem("DNS (UDP 53)", "udp port 53")
        self.filter_presets.addItem("TCP", "tcp")
        self.filter_presets.addItem("UDP", "udp")
        self.filter_presets.addItem("ICMP", "icmp")
        self.filter_presets.addItem("ARP", "arp")
        self.filter_presets.currentIndexChanged.connect(self.on_filter_preset_changed)
        filter_layout.addWidget(self.filter_presets)
        toolbar_layout.addWidget(filter_group)
        
        control_group = QGroupBox("控制")
        control_layout = QHBoxLayout(control_group)
        self.start_btn = QPushButton("开始抓包")
        self.start_btn.setStyleSheet("background-color: #4CAF50; color: white; font-weight: bold;")
        self.start_btn.clicked.connect(self.start_sniffing)
        control_layout.addWidget(self.start_btn)
        
        self.stop_btn = QPushButton("停止抓包")
        self.stop_btn.setStyleSheet("background-color: #f44336; color: white; font-weight: bold;")
        self.stop_btn.setEnabled(False)
        self.stop_btn.clicked.connect(self.stop_sniffing)
        control_layout.addWidget(self.stop_btn)
        
        self.clear_btn = QPushButton("清空")
        self.clear_btn.clicked.connect(self.clear_packets)
        control_layout.addWidget(self.clear_btn)
        
        self.save_btn = QPushButton("保存到数据库")
        self.save_btn.clicked.connect(self.save_to_database)
        control_layout.addWidget(self.save_btn)
        
        toolbar_layout.addWidget(control_group)
        
        main_layout.addLayout(toolbar_layout)
        
        search_layout = QHBoxLayout()
        search_layout.addWidget(QLabel("搜索:"))
        self.search_input = QLineEdit()
        self.search_input.setPlaceholderText("搜索 IP、协议、端口...")
        self.search_input.textChanged.connect(self.on_search_changed)
        search_layout.addWidget(self.search_input)
        self.search_btn = QPushButton("搜索")
        self.search_btn.clicked.connect(self.search_packets)
        search_layout.addWidget(self.search_btn)
        
        self.mode_combo = QComboBox()
        self.mode_combo.addItem("实时模式", "live")
        self.mode_combo.addItem("数据库模式", "database")
        self.mode_combo.currentIndexChanged.connect(self.on_mode_changed)
        search_layout.addWidget(QLabel("显示模式:"))
        search_layout.addWidget(self.mode_combo)
        
        search_layout.addStretch()
        main_layout.addLayout(search_layout)
        
        splitter = QSplitter(Qt.Vertical)
        
        upper_splitter = QSplitter(Qt.Horizontal)
        
        self.packet_table = QTableWidget()
        self.packet_table.setColumnCount(8)
        self.packet_table.setHorizontalHeaderLabels([
            "序号", "时间", "源 IP", "目的 IP", "协议",
            "源端口", "目的端口", "长度"
        ])
        self.packet_table.horizontalHeader().setSectionResizeMode(QHeaderView.Stretch)
        self.packet_table.horizontalHeader().setSectionResizeMode(0, QHeaderView.Fixed)
        self.packet_table.setColumnWidth(0, 60)
        self.packet_table.setSelectionBehavior(QTableWidget.SelectRows)
        self.packet_table.setSelectionMode(QTableWidget.SingleSelection)
        self.packet_table.itemClicked.connect(self.on_packet_selected)
        self.packet_table.setAlternatingRowColors(True)
        upper_splitter.addWidget(self.packet_table)
        
        details_tab = QTabWidget()
        
        self.basic_info_text = QTextEdit()
        self.basic_info_text.setReadOnly(True)
        self.basic_info_text.setFont(QFont("Courier New", 10))
        details_tab.addTab(self.basic_info_text, "基本信息")
        
        self.headers_text = QTextEdit()
        self.headers_text.setReadOnly(True)
        self.headers_text.setFont(QFont("Courier New", 10))
        details_tab.addTab(self.headers_text, "协议头/HTTP")
        
        self.dns_text = QTextEdit()
        self.dns_text.setReadOnly(True)
        self.dns_text.setFont(QFont("Courier New", 10))
        details_tab.addTab(self.dns_text, "DNS")
        
        self.raw_text = QTextEdit()
        self.raw_text.setReadOnly(True)
        self.raw_text.setFont(QFont("Courier New", 10))
        details_tab.addTab(self.raw_text, "原始数据")
        
        upper_splitter.addWidget(details_tab)
        
        upper_splitter.setSizes([800, 600])
        splitter.addWidget(upper_splitter)
        
        self.status_text = QTextEdit()
        self.status_text.setReadOnly(True)
        self.status_text.setMaximumHeight(150)
        self.status_text.setFont(QFont("Courier New", 10))
        splitter.addWidget(self.status_text)
        
        splitter.setSizes([700, 150])
        main_layout.addWidget(splitter)
        
        self.update_timer = QTimer()
        self.update_timer.timeout.connect(self.update_packet_table)
        self.update_timer.start(500)
        
    def load_interfaces(self):
        try:
            interfaces = PacketSniffer.get_interfaces()
            self.interface_combo.clear()
            for iface in interfaces:
                display_text = f"{iface['name']} - {iface['ip']}"
                self.interface_combo.addItem(display_text, iface['interface'])
            
            if interfaces:
                self.log_message(f"已发现 {len(interfaces)} 个网络接口")
            else:
                self.log_message("未发现网络接口")
        except Exception as e:
            QMessageBox.critical(self, "错误", f"获取网络接口失败: {e}")
            self.log_message(f"获取网络接口失败: {e}")
            
    def on_filter_preset_changed(self, index):
        if index > 0:
            filter_expr = self.filter_presets.currentData()
            self.filter_input.setText(filter_expr)
            
    def start_sniffing(self):
        if self.interface_combo.count() == 0:
            QMessageBox.warning(self, "警告", "没有可用的网络接口")
            return
            
        interface = self.interface_combo.currentData()
        bpf_filter = self.filter_input.text().strip()
        
        if not interface:
            QMessageBox.warning(self, "警告", "请选择一个网络接口")
            return
            
        try:
            self.sniffer = PacketSniffer(packet_callback=self.emit_packet_signal)
            self.sniffer.start_sniffing(interface, bpf_filter)
            
            self.start_btn.setEnabled(False)
            self.stop_btn.setEnabled(True)
            self.interface_combo.setEnabled(False)
            self.filter_input.setEnabled(False)
            self.filter_presets.setEnabled(False)
            
            filter_msg = f" (过滤器: {bpf_filter})" if bpf_filter else ""
            self.log_message(f"开始在 {self.interface_combo.currentText()} 上抓包{filter_msg}")
            
        except Exception as e:
            QMessageBox.critical(self, "错误", f"启动抓包失败: {e}\n\n提示: 在 macOS 上可能需要 root 权限")
            self.log_message(f"启动抓包失败: {e}")
            
    def stop_sniffing(self):
        try:
            if self.sniffer:
                self.sniffer.stop_sniffing()
            
            self.start_btn.setEnabled(True)
            self.stop_btn.setEnabled(False)
            self.interface_combo.setEnabled(True)
            self.filter_input.setEnabled(True)
            self.filter_presets.setEnabled(True)
            
            captured_count = len(self.sniffer.get_captured_packets()) if self.sniffer else 0
            self.log_message(f"抓包已停止，共捕获 {captured_count} 个数据包")
            
        except Exception as e:
            QMessageBox.critical(self, "错误", f"停止抓包失败: {e}")
            self.log_message(f"停止抓包失败: {e}")
            
    def emit_packet_signal(self, packet_info: Dict[str, Any]):
        self.packet_signal.new_packet.emit(packet_info)
        
    def on_new_packet(self, packet_info: Dict[str, Any]):
        if self.current_display_mode == "live":
            self.packet_list.append(packet_info)
            row = len(self.packet_list) - 1
            self.add_packet_to_table(row, packet_info)
            
    def update_packet_table(self):
        if self.sniffer and self.sniffer.is_sniffing:
            count = len(self.packet_list)
            if count > 0:
                pass
            
    def clear_packets(self):
        reply = QMessageBox.question(
            self, "确认清空",
            "确定要清空所有数据包吗？\n\n注意: 数据库中的数据不会被清空。",
            QMessageBox.Yes | QMessageBox.No
        )
        
        if reply == QMessageBox.Yes:
            self.packet_list = []
            self.packet_table.setRowCount(0)
            self.basic_info_text.clear()
            self.headers_text.clear()
            self.dns_text.clear()
            self.raw_text.clear()
            self.log_message("已清空实时数据包列表")
            
    def save_to_database(self):
        if not self.packet_list:
            QMessageBox.information(self, "提示", "没有数据包可保存")
            return
            
        try:
            count = self.database.insert_packets(self.packet_list)
            self.log_message(f"已保存 {count} 个数据包到数据库")
            QMessageBox.information(self, "成功", f"已保存 {count} 个数据包到数据库")
            
        except Exception as e:
            QMessageBox.critical(self, "错误", f"保存到数据库失败: {e}")
            self.log_message(f"保存到数据库失败: {e}")
            
    def on_mode_changed(self, index):
        mode = self.mode_combo.currentData()
        if mode != self.current_display_mode:
            self.current_display_mode = mode
            self.refresh_display()
            
    def refresh_display(self):
        self.packet_table.setRowCount(0)
        
        if self.current_display_mode == "database":
            try:
                packets = self.database.get_packets(limit=500)
                self.packet_list = packets
                
                for i, packet in enumerate(packets):
                    self.add_packet_to_table(i, packet)
                    
                self.log_message(f"从数据库加载了 {len(packets)} 个数据包")
            except Exception as e:
                self.log_message(f"从数据库加载数据失败: {e}")
        else:
            for i, packet in enumerate(self.packet_list):
                self.add_packet_to_table(i, packet)
                
    def on_search_changed(self, text):
        if text:
            self.search_packets()
        else:
            self.refresh_display()
            
    def search_packets(self):
        query = self.search_input.text().strip()
        if not query:
            self.refresh_display()
            return
            
        if self.current_display_mode == "database":
            try:
                results = self.database.search_packets(query, limit=500)
                self.packet_table.setRowCount(0)
                for i, packet in enumerate(results):
                    self.add_packet_to_table(i, packet)
                self.log_message(f"搜索完成，找到 {len(results)} 个匹配的数据包")
            except Exception as e:
                self.log_message(f"搜索失败: {e}")
        else:
            self.packet_table.setRowCount(0)
            results = []
            for packet in self.packet_list:
                if self.packet_matches_query(packet, query):
                    results.append(packet)
                    
            for i, packet in enumerate(results):
                self.add_packet_to_table(i, packet)
            self.log_message(f"搜索完成，找到 {len(results)} 个匹配的数据包")
            
    def packet_matches_query(self, packet: Dict[str, Any], query: str) -> bool:
        query_lower = query.lower()
        
        fields_to_check = [
            'source_ip', 'dest_ip', 'protocol', 'summary',
            'http_method', 'http_url', 'dns_query', 'dns_response'
        ]
        
        for field in fields_to_check:
            value = packet.get(field)
            if value and query_lower in str(value).lower():
                return True
                
        source_port = packet.get('source_port')
        dest_port = packet.get('dest_port')
        if source_port and query in str(source_port):
            return True
        if dest_port and query in str(dest_port):
            return True
            
        return False
        
    def add_packet_to_table(self, row: int, packet: Dict[str, Any]):
        if row >= self.packet_table.rowCount():
            self.packet_table.insertRow(row)
        
        self.packet_table.setItem(row, 0, QTableWidgetItem(str(row + 1)))
        
        timestamp = packet.get('timestamp')
        if timestamp:
            try:
                dt = datetime.fromtimestamp(float(timestamp))
                time_str = dt.strftime('%H:%M:%S.%f')[:-3]
            except:
                time_str = str(timestamp)
        else:
            time_str = ""
        self.packet_table.setItem(row, 1, QTableWidgetItem(time_str))
        
        self.packet_table.setItem(row, 2, QTableWidgetItem(str(packet.get('source_ip', ''))))
        self.packet_table.setItem(row, 3, QTableWidgetItem(str(packet.get('dest_ip', ''))))
        
        protocol_item = QTableWidgetItem(str(packet.get('protocol', 'UNKNOWN')))
        self.packet_table.setItem(row, 4, protocol_item)
        
        source_port = packet.get('source_port')
        self.packet_table.setItem(row, 5, QTableWidgetItem(str(source_port) if source_port else ""))
        
        dest_port = packet.get('dest_port')
        self.packet_table.setItem(row, 6, QTableWidgetItem(str(dest_port) if dest_port else ""))
        
        length = packet.get('length')
        self.packet_table.setItem(row, 7, QTableWidgetItem(str(length) if length else ""))
        
    def on_packet_selected(self, item):
        row = item.row()
        if row < len(self.packet_list):
            packet = self.packet_list[row]
            self.display_packet_details(packet)
            
    def display_packet_details(self, packet: Dict[str, Any]):
        basic_info = "=" * 60 + "\n"
        basic_info += "                    数据包基本信息\n"
        basic_info += "=" * 60 + "\n\n"
        
        timestamp = packet.get('timestamp')
        if timestamp:
            try:
                dt = datetime.fromtimestamp(float(timestamp))
                time_str = dt.strftime('%Y-%m-%d %H:%M:%S.%f')
            except:
                time_str = str(timestamp)
        else:
            time_str = "N/A"
            
        basic_info += f"时间戳: {time_str}\n"
        basic_info += f"协议: {packet.get('protocol', 'UNKNOWN')}\n"
        basic_info += f"长度: {packet.get('length', 'N/A')} 字节\n\n"
        
        basic_info += "--- 网络层 ---\n"
        basic_info += f"源 IP: {packet.get('source_ip', 'N/A')}\n"
        basic_info += f"目的 IP: {packet.get('dest_ip', 'N/A')}\n\n"
        
        basic_info += "--- 传输层 ---\n"
        basic_info += f"源端口: {packet.get('source_port', 'N/A')}\n"
        basic_info += f"目的端口: {packet.get('dest_port', 'N/A')}\n\n"
        
        basic_info += "--- 摘要 ---\n"
        basic_info += f"{packet.get('summary', 'N/A')}\n"
        
        self.basic_info_text.setText(basic_info)
        
        headers_info = ""
        http_method = packet.get('http_method')
        http_url = packet.get('http_url')
        http_headers = packet.get('http_headers')
        http_body = packet.get('http_body')
        
        if http_method or http_headers:
            headers_info += "=" * 60 + "\n"
            headers_info += "                    HTTP 协议信息\n"
            headers_info += "=" * 60 + "\n\n"
            
            if http_method and http_url:
                headers_info += f"请求行/响应行: {http_method} {http_url}\n\n"
                
            if http_headers:
                headers_info += "--- HTTP 头 ---\n"
                headers_info += http_headers + "\n\n"
                
            if http_body:
                headers_info += "--- HTTP 体 ---\n"
                headers_info += http_body + "\n"
                
        if not headers_info:
            headers_info += "=" * 60 + "\n"
            headers_info += "                    协议详细信息\n"
            headers_info += "=" * 60 + "\n\n"
            headers_info += packet.get('details', '无详细信息')
            
        self.headers_text.setText(headers_info)
        
        dns_info = "=" * 60 + "\n"
        dns_info += "                    DNS 协议信息\n"
        dns_info += "=" * 60 + "\n\n"
        
        dns_query = packet.get('dns_query')
        dns_response = packet.get('dns_response')
        
        if dns_query:
            dns_info += "--- DNS 查询 ---\n"
            dns_info += dns_query + "\n\n"
            
        if dns_response:
            dns_info += "--- DNS 响应 ---\n"
            dns_info += dns_response + "\n"
            
        if not dns_query and not dns_response:
            dns_info += "此数据包不是 DNS 协议\n"
            
        self.dns_text.setText(dns_info)
        
        raw_info = "=" * 60 + "\n"
        raw_info += "                    原始数据 (Hex Dump)\n"
        raw_info += "=" * 60 + "\n\n"
        raw_info += packet.get('raw_hex', '无原始数据')
        self.raw_text.setText(raw_info)
        
    def log_message(self, message: str):
        timestamp = datetime.now().strftime('%H:%M:%S')
        log_entry = f"[{timestamp}] {message}\n"
        self.status_text.append(log_entry)
        
        scrollbar = self.status_text.verticalScrollBar()
        scrollbar.setValue(scrollbar.maximum())
        
    def cleanup(self):
        if self.sniffer and self.sniffer.is_sniffing:
            self.sniffer.stop_sniffing()
        if self.database:
            self.database.close()
        if self.update_timer:
            self.update_timer.stop()
