import sys
import os
from datetime import datetime
from PyQt6.QtCore import Qt, QTimer, pyqtSignal, QThread, QSize, QMimeData
from PyQt6.QtGui import QFont, QColor, QTextCursor, QImage, QPixmap, QDragEnterEvent, QDropEvent
from PyQt6.QtWidgets import (
    QWidget, QVBoxLayout, QHBoxLayout, QGridLayout,
    QLabel, QComboBox, QPushButton, QCheckBox, QSpinBox,
    QTextEdit, QLineEdit, QSplitter, QGroupBox, QTableWidget,
    QTableWidgetItem, QHeaderView, QTabWidget, QMessageBox,
    QTreeWidget, QTreeWidgetItem, QProgressBar, QFileDialog,
    QListWidget, QListWidgetItem, QSlider, QFrame, QScrollArea
)

import numpy as np

from media_tool.video_converter import VideoConverter

class MediaWidget(QWidget):
    def __init__(self, parent=None):
        super().__init__(parent)
        self.video_converter = VideoConverter()
        self.current_video_path = None
        self.current_task = None
        self.video_info = None
        
        self.setAcceptDrops(True)
        
        self.init_ui()
        self.connect_signals()
    
    def init_ui(self):
        layout = QVBoxLayout(self)
        
        self.tab_widget = QTabWidget()
        layout.addWidget(self.tab_widget)
        
        self.converter_tab = QWidget()
        self.batch_tab = QWidget()
        
        self.tab_widget.addTab(self.converter_tab, "视频转换")
        self.tab_widget.addTab(self.batch_tab, "批量转换")
        
        self._setup_converter_tab()
        self._setup_batch_tab()
    
    def _setup_converter_tab(self):
        layout = QVBoxLayout(self.converter_tab)
        
        select_group = QGroupBox("选择视频文件")
        select_layout = QHBoxLayout(select_group)
        
        self.video_path_edit = QLineEdit()
        self.video_path_edit.setPlaceholderText("拖拽视频文件到此处或点击浏览...")
        self.video_path_edit.setReadOnly(True)
        select_layout.addWidget(self.video_path_edit, stretch=1)
        
        self.browse_btn = QPushButton("浏览...")
        self.browse_btn.setMinimumWidth(80)
        select_layout.addWidget(self.browse_btn)
        
        layout.addWidget(select_group)
        
        splitter = QSplitter(Qt.Orientation.Horizontal)
        
        left_widget = QWidget()
        left_layout = QVBoxLayout(left_widget)
        
        info_group = QGroupBox("视频信息")
        info_layout = QGridLayout(info_group)
        
        row = 0
        info_layout.addWidget(QLabel("文件名:"), row, 0)
        self.filename_label = QLabel("-")
        info_layout.addWidget(self.filename_label, row, 1)
        
        row += 1
        info_layout.addWidget(QLabel("时长:"), row, 0)
        self.duration_label = QLabel("-")
        info_layout.addWidget(self.duration_label, row, 1)
        
        row += 1
        info_layout.addWidget(QLabel("分辨率:"), row, 0)
        self.resolution_label = QLabel("-")
        info_layout.addWidget(self.resolution_label, row, 1)
        
        row += 1
        info_layout.addWidget(QLabel("帧率:"), row, 0)
        self.fps_label = QLabel("-")
        info_layout.addWidget(self.fps_label, row, 1)
        
        row += 1
        info_layout.addWidget(QLabel("文件大小:"), row, 0)
        self.filesize_label = QLabel("-")
        info_layout.addWidget(self.filesize_label, row, 1)
        
        info_layout.setColumnStretch(1, 1)
        left_layout.addWidget(info_group)
        
        preview_group = QGroupBox("预览")
        preview_layout = QVBoxLayout(preview_group)
        
        self.preview_label = QLabel()
        self.preview_label.setMinimumSize(400, 300)
        self.preview_label.setAlignment(Qt.AlignmentFlag.AlignCenter)
        self.preview_label.setStyleSheet("QLabel { background-color: black; border: 1px solid #555; }")
        self.preview_label.setText("请先选择视频文件")
        self.preview_label.setStyleSheet("QLabel { background-color: #1a1a2e; color: #888; border: 1px solid #555; }")
        preview_layout.addWidget(self.preview_label)
        
        preview_control = QHBoxLayout()
        self.preview_btn = QPushButton("预览效果")
        self.preview_btn.setEnabled(False)
        preview_control.addWidget(self.preview_btn)
        
        self.stop_preview_btn = QPushButton("停止预览")
        self.stop_preview_btn.setEnabled(False)
        preview_control.addWidget(self.stop_preview_btn)
        preview_control.addStretch()
        preview_layout.addLayout(preview_control)
        
        left_layout.addWidget(preview_group, stretch=1)
        
        splitter.addWidget(left_widget)
        
        right_widget = QWidget()
        right_layout = QVBoxLayout(right_widget)
        
        params_group = QGroupBox("转换参数")
        params_layout = QGridLayout(params_group)
        
        row = 0
        params_layout.addWidget(QLabel("输出格式:"), row, 0)
        self.format_combo = QComboBox()
        self.format_combo.addItems(['GIF', 'WebM', 'MP4'])
        params_layout.addWidget(self.format_combo, row, 1)
        
        row += 1
        params_layout.addWidget(QLabel("起始时间 (秒):"), row, 0)
        self.start_time_spin = QSpinBox()
        self.start_time_spin.setRange(0, 3600)
        self.start_time_spin.setValue(0)
        self.start_time_spin.setSuffix(" s")
        params_layout.addWidget(self.start_time_spin, row, 1)
        
        row += 1
        params_layout.addWidget(QLabel("结束时间 (秒):"), row, 0)
        self.end_time_spin = QSpinBox()
        self.end_time_spin.setRange(1, 3600)
        self.end_time_spin.setValue(10)
        self.end_time_spin.setSuffix(" s")
        params_layout.addWidget(self.end_time_spin, row, 1)
        
        row += 1
        params_layout.addWidget(QLabel("分辨率:"), row, 0)
        resolution_layout = QHBoxLayout()
        self.width_spin = QSpinBox()
        self.width_spin.setRange(64, 3840)
        self.width_spin.setValue(640)
        self.width_spin.setSpecialValueText("原尺寸")
        resolution_layout.addWidget(self.width_spin)
        resolution_layout.addWidget(QLabel("x"))
        self.height_spin = QSpinBox()
        self.height_spin.setRange(64, 2160)
        self.height_spin.setValue(480)
        self.height_spin.setSpecialValueText("原尺寸")
        resolution_layout.addWidget(self.height_spin)
        params_layout.addLayout(resolution_layout, row, 1)
        
        row += 1
        params_layout.addWidget(QLabel("帧率 (FPS):"), row, 0)
        self.fps_spin = QSpinBox()
        self.fps_spin.setRange(1, 60)
        self.fps_spin.setValue(10)
        self.fps_spin.setSuffix(" fps")
        params_layout.addWidget(self.fps_spin, row, 1)
        
        row += 1
        params_layout.addWidget(QLabel("循环次数:"), row, 0)
        self.loop_spin = QSpinBox()
        self.loop_spin.setRange(-1, 100)
        self.loop_spin.setValue(0)
        self.loop_spin.setSpecialValueText("无限循环")
        params_layout.addWidget(self.loop_spin, row, 1)
        
        row += 1
        params_layout.addWidget(QLabel("颜色数:"), row, 0)
        self.colors_combo = QComboBox()
        self.colors_combo.addItems(['256', '128', '64', '32', '16'])
        self.colors_combo.setCurrentText('256')
        params_layout.addWidget(self.colors_combo, row, 1)
        
        row += 1
        self.optimize_check = QCheckBox("优化 GIF 大小")
        self.optimize_check.setChecked(True)
        params_layout.addWidget(self.optimize_check, row, 0, 1, 2)
        
        params_layout.setColumnStretch(1, 1)
        right_layout.addWidget(params_group)
        
        output_group = QGroupBox("输出设置")
        output_layout = QHBoxLayout(output_group)
        
        output_layout.addWidget(QLabel("输出目录:"))
        self.output_dir_edit = QLineEdit()
        self.output_dir_edit.setPlaceholderText("默认为视频所在目录")
        output_layout.addWidget(self.output_dir_edit, stretch=1)
        
        self.output_browse_btn = QPushButton("浏览...")
        output_layout.addWidget(self.output_browse_btn)
        
        right_layout.addWidget(output_group)
        
        progress_group = QGroupBox("转换进度")
        progress_layout = QVBoxLayout(progress_group)
        
        self.progress_bar = QProgressBar()
        self.progress_bar.setValue(0)
        progress_layout.addWidget(self.progress_bar)
        
        self.status_label = QLabel("就绪")
        progress_layout.addWidget(self.status_label)
        
        button_layout = QHBoxLayout()
        self.convert_btn = QPushButton("开始转换")
        self.convert_btn.setEnabled(False)
        self.convert_btn.setMinimumHeight(35)
        button_layout.addWidget(self.convert_btn)
        
        self.cancel_btn = QPushButton("取消")
        self.cancel_btn.setEnabled(False)
        self.cancel_btn.setMinimumHeight(35)
        button_layout.addWidget(self.cancel_btn)
        
        progress_layout.addLayout(button_layout)
        right_layout.addWidget(progress_group)
        
        right_layout.addStretch()
        
        splitter.addWidget(right_widget)
        
        splitter.setSizes([500, 400])
        layout.addWidget(splitter, stretch=1)
    
    def _setup_batch_tab(self):
        layout = QVBoxLayout(self.batch_tab)
        
        drop_group = QGroupBox("拖拽文件到此处")
        drop_layout = QVBoxLayout(drop_group)
        
        self.drop_label = QLabel("拖拽视频文件到此处")
        self.drop_label.setMinimumHeight(80)
        self.drop_label.setAlignment(Qt.AlignmentFlag.AlignCenter)
        self.drop_label.setStyleSheet("""
            QLabel { 
                background-color: #f0f0f0; 
                color: #666; 
                border: 2px dashed #aaa;
                border-radius: 8px;
                font-size: 14px;
            }
        """)
        drop_layout.addWidget(self.drop_label)
        
        layout.addWidget(drop_group)
        
        list_group = QGroupBox("待转换文件列表")
        list_layout = QVBoxLayout(list_group)
        
        button_layout = QHBoxLayout()
        self.add_files_btn = QPushButton("添加文件")
        button_layout.addWidget(self.add_files_btn)
        self.remove_file_btn = QPushButton("移除选中")
        button_layout.addWidget(self.remove_file_btn)
        self.clear_list_btn = QPushButton("清空列表")
        button_layout.addWidget(self.clear_list_btn)
        button_layout.addStretch()
        list_layout.addLayout(button_layout)
        
        self.file_list = QListWidget()
        self.file_list.setSelectionMode(QListWidget.SelectionMode.ExtendedSelection)
        list_layout.addWidget(self.file_list)
        
        layout.addWidget(list_group)
        
        params_group = QGroupBox("批量转换参数")
        params_layout = QGridLayout(params_group)
        
        row = 0
        params_layout.addWidget(QLabel("输出格式:"), row, 0)
        self.batch_format_combo = QComboBox()
        self.batch_format_combo.addItems(['GIF', 'WebM', 'MP4'])
        params_layout.addWidget(self.batch_format_combo, row, 1)
        
        row += 1
        params_layout.addWidget(QLabel("帧率 (FPS):"), row, 0)
        self.batch_fps_spin = QSpinBox()
        self.batch_fps_spin.setRange(1, 60)
        self.batch_fps_spin.setValue(10)
        params_layout.addWidget(self.batch_fps_spin, row, 1)
        
        row += 1
        params_layout.addWidget(QLabel("颜色数:"), row, 0)
        self.batch_colors_combo = QComboBox()
        self.batch_colors_combo.addItems(['256', '128', '64', '32', '16'])
        self.batch_colors_combo.setCurrentText('256')
        params_layout.addWidget(self.batch_colors_combo, row, 1)
        
        row += 1
        self.batch_optimize_check = QCheckBox("优化大小")
        self.batch_optimize_check.setChecked(True)
        params_layout.addWidget(self.batch_optimize_check, row, 0, 1, 2)
        
        params_layout.setColumnStretch(1, 1)
        layout.addWidget(params_group)
        
        output_group = QGroupBox("输出设置")
        output_layout = QHBoxLayout(output_group)
        
        output_layout.addWidget(QLabel("输出目录:"))
        self.batch_output_edit = QLineEdit()
        self.batch_output_edit.setPlaceholderText("默认为视频所在目录")
        output_layout.addWidget(self.batch_output_edit, stretch=1)
        
        self.batch_output_browse_btn = QPushButton("浏览...")
        output_layout.addWidget(self.batch_output_browse_btn)
        
        layout.addWidget(output_group)
        
        progress_group = QGroupBox("批量转换进度")
        progress_layout = QVBoxLayout(progress_group)
        
        self.batch_progress_bar = QProgressBar()
        self.batch_progress_bar.setValue(0)
        progress_layout.addWidget(self.batch_progress_bar)
        
        self.batch_status_label = QLabel("就绪")
        progress_layout.addWidget(self.batch_status_label)
        
        batch_button_layout = QHBoxLayout()
        self.batch_convert_btn = QPushButton("开始批量转换")
        self.batch_convert_btn.setMinimumHeight(40)
        batch_button_layout.addWidget(self.batch_convert_btn)
        progress_layout.addLayout(batch_button_layout)
        
        layout.addWidget(progress_group)
    
    def connect_signals(self):
        self.browse_btn.clicked.connect(self._browse_video)
        self.output_browse_btn.clicked.connect(self._browse_output_dir)
        
        self.video_converter.progress_updated.connect(self._on_progress)
        self.video_converter.conversion_finished.connect(self._on_conversion_finished)
        self.video_converter.preview_frame_ready.connect(self._on_preview_frame)
        
        self.convert_btn.clicked.connect(self._start_conversion)
        self.cancel_btn.clicked.connect(self._cancel_conversion)
        self.preview_btn.clicked.connect(self._start_preview)
        self.stop_preview_btn.clicked.connect(self._stop_preview)
        
        self.add_files_btn.clicked.connect(self._add_batch_files)
        self.remove_file_btn.clicked.connect(self._remove_selected_files)
        self.clear_list_btn.clicked.connect(self._clear_file_list)
        self.batch_output_browse_btn.clicked.connect(self._browse_batch_output)
        self.batch_convert_btn.clicked.connect(self._start_batch_conversion)
        
        self.format_combo.currentTextChanged.connect(self._on_format_changed)
    
    def dragEnterEvent(self, event: QDragEnterEvent):
        if event.mimeData().hasUrls():
            event.acceptProposedAction()
    
    def dropEvent(self, event: QDropEvent):
        urls = event.mimeData().urls()
        video_extensions = ('.mp4', '.avi', '.mkv', '.mov', '.wmv', '.flv', '.webm', '.m4v')
        
        for url in urls:
            file_path = url.toLocalFile()
            if file_path.lower().endswith(video_extensions):
                if self.tab_widget.currentIndex() == 0:
                    self._load_video(file_path)
                else:
                    self._add_to_batch_list(file_path)
    
    def _browse_video(self):
        file_path, _ = QFileDialog.getOpenFileName(
            self,
            "选择视频文件",
            "",
            "视频文件 (*.mp4 *.avi *.mkv *.mov *.wmv *.flv *.webm *.m4v);;所有文件 (*)"
        )
        if file_path:
            self._load_video(file_path)
    
    def _load_video(self, file_path):
        self.current_video_path = file_path
        self.video_path_edit.setText(file_path)
        
        self.video_info = self.video_converter.get_video_info(file_path)
        
        if self.video_info:
            self.filename_label.setText(self.video_info['filename'])
            minutes = int(self.video_info['duration'] // 60)
            seconds = int(self.video_info['duration'] % 60)
            self.duration_label.setText(f"{minutes}:{seconds:02d}")
            self.resolution_label.setText(f"{self.video_info['width']} x {self.video_info['height']}")
            self.fps_label.setText(f"{self.video_info['fps']:.2f} fps")
            
            size_mb = self.video_info['filesize'] / (1024 * 1024)
            self.filesize_label.setText(f"{size_mb:.2f} MB")
            
            self.end_time_spin.setMaximum(int(self.video_info['duration']))
            self.end_time_spin.setValue(min(10, int(self.video_info['duration'])))
            
            self.width_spin.setValue(self.video_info['width'])
            self.height_spin.setValue(self.video_info['height'])
            
            self.convert_btn.setEnabled(True)
            self.preview_btn.setEnabled(True)
        else:
            QMessageBox.warning(self, "警告", f"无法读取视频文件: {file_path}")
    
    def _browse_output_dir(self):
        dir_path = QFileDialog.getExistingDirectory(self, "选择输出目录")
        if dir_path:
            self.output_dir_edit.setText(dir_path)
    
    def _get_conversion_params(self):
        return {
            'format': self.format_combo.currentText().lower(),
            'start_time': self.start_time_spin.value(),
            'end_time': self.end_time_spin.value(),
            'width': self.width_spin.value(),
            'height': self.height_spin.value(),
            'fps': self.fps_spin.value(),
            'loop': self.loop_spin.value(),
            'colors': int(self.colors_combo.currentText()),
            'optimize': self.optimize_check.isChecked(),
            'use_ffmpeg': True,
            'fuzz': 2
        }
    
    def _start_conversion(self):
        if not self.current_video_path:
            QMessageBox.warning(self, "警告", "请先选择视频文件")
            return
        
        output_dir = self.output_dir_edit.text().strip()
        if not output_dir:
            output_dir = os.path.dirname(self.current_video_path)
        
        params = self._get_conversion_params()
        
        self.current_task = self.video_converter.create_task(
            self.current_video_path,
            output_dir,
            params
        )
        
        self.convert_btn.setEnabled(False)
        self.cancel_btn.setEnabled(True)
        self.status_label.setText("正在转换...")
        self.progress_bar.setValue(0)
        
        self.video_converter.start_conversion(self.current_task)
    
    def _cancel_conversion(self):
        self.video_converter.cancel_conversion()
        self.status_label.setText("已取消")
        self.convert_btn.setEnabled(True)
        self.cancel_btn.setEnabled(False)
    
    def _start_preview(self):
        if not self.current_video_path:
            return
        
        params = self._get_conversion_params()
        self.video_converter.start_preview(self.current_video_path, params)
        self.preview_btn.setEnabled(False)
        self.stop_preview_btn.setEnabled(True)
    
    def _stop_preview(self):
        self.video_converter.stop_preview()
        self.preview_btn.setEnabled(True)
        self.stop_preview_btn.setEnabled(False)
    
    def _on_progress(self, progress, filename):
        self.progress_bar.setValue(int(progress))
        self.status_label.setText(f"正在处理: {filename} ({progress:.1f}%)")
    
    def _on_conversion_finished(self, success, message):
        if success:
            self.status_label.setText("转换完成!")
            QMessageBox.information(self, "完成", f"转换完成!\n输出文件: {message}")
        else:
            self.status_label.setText(f"转换失败: {message}")
            QMessageBox.critical(self, "错误", f"转换失败: {message}")
        
        self.convert_btn.setEnabled(True)
        self.cancel_btn.setEnabled(False)
        self.progress_bar.setValue(100 if success else 0)
    
    def _on_preview_frame(self, frame):
        if frame is not None:
            h, w, ch = frame.shape
            bytes_per_line = ch * w
            q_image = QImage(frame.data, w, h, bytes_per_line, QImage.Format.Format_RGB888)
            pixmap = QPixmap.fromImage(q_image)
            scaled_pixmap = pixmap.scaled(
                self.preview_label.size(),
                Qt.AspectRatioMode.KeepAspectRatio,
                Qt.TransformationMode.SmoothTransformation
            )
            self.preview_label.setPixmap(scaled_pixmap)
    
    def _on_format_changed(self, format_text):
        is_gif = format_text == 'GIF'
        self.loop_spin.setEnabled(is_gif)
        self.colors_combo.setEnabled(is_gif)
        self.optimize_check.setEnabled(is_gif)
    
    def _add_batch_files(self):
        files, _ = QFileDialog.getOpenFileNames(
            self,
            "选择视频文件",
            "",
            "视频文件 (*.mp4 *.avi *.mkv *.mov *.wmv *.flv *.webm *.m4v);;所有文件 (*)"
        )
        for file_path in files:
            self._add_to_batch_list(file_path)
    
    def _add_to_batch_list(self, file_path):
        item = QListWidgetItem(file_path)
        item.setData(Qt.ItemDataRole.UserRole, file_path)
        self.file_list.addItem(item)
    
    def _remove_selected_files(self):
        for item in self.file_list.selectedItems():
            self.file_list.takeItem(self.file_list.row(item))
    
    def _clear_file_list(self):
        self.file_list.clear()
    
    def _browse_batch_output(self):
        dir_path = QFileDialog.getExistingDirectory(self, "选择输出目录")
        if dir_path:
            self.batch_output_edit.setText(dir_path)
    
    def _start_batch_conversion(self):
        if self.file_list.count() == 0:
            QMessageBox.warning(self, "警告", "请先添加视频文件")
            return
        
        output_dir = self.batch_output_edit.text().strip()
        
        params = {
            'format': self.batch_format_combo.currentText().lower(),
            'fps': self.batch_fps_spin.value(),
            'colors': int(self.batch_colors_combo.currentText()),
            'optimize': self.batch_optimize_check.isChecked(),
            'use_ffmpeg': True,
            'fuzz': 2
        }
        
        total = self.file_list.count()
        success_count = 0
        
        for i in range(total):
            item = self.file_list.item(i)
            file_path = item.data(Qt.ItemDataRole.UserRole)
            
            self.batch_status_label.setText(f"正在处理: {os.path.basename(file_path)} ({i+1}/{total})")
            self.batch_progress_bar.setValue(int((i / total) * 100))
            
            task_output_dir = output_dir if output_dir else os.path.dirname(file_path)
            task = self.video_converter.create_task(file_path, task_output_dir, params)
            
            self.video_converter.start_conversion(task)
            
            while self.video_converter.current_worker and self.video_converter.current_worker.isRunning():
                from PyQt6.QtCore import QCoreApplication
                QCoreApplication.processEvents()
                self.video_converter.current_worker.wait(100)
            
            if task.status == 'completed':
                success_count += 1
        
        self.batch_progress_bar.setValue(100)
        self.batch_status_label.setText(f"批量转换完成! 成功: {success_count}/{total}")
        QMessageBox.information(self, "完成", f"批量转换完成!\n成功: {success_count}/{total}")
