#!/usr/bin/env python3
"""
视频转 GIF/WebM 转换器 UI 标签页
"""

import os
import threading
from datetime import datetime
from typing import Dict, Any, List, Optional
from PyQt5.QtWidgets import (
    QWidget, QVBoxLayout, QHBoxLayout, QLabel, QComboBox,
    QPushButton, QLineEdit, QTextEdit, QTableWidget, QTableWidgetItem,
    QHeaderView, QSplitter, QGroupBox, QMessageBox, QFileDialog,
    QSpinBox, QSlider, QCheckBox, QProgressBar, QTabWidget, QScrollArea,
    QFrame, QGridLayout
)
from PyQt5.QtCore import Qt, QTimer, pyqtSignal, QObject, QUrl, QSize
from PyQt5.QtGui import QFont, QPixmap, QImage, QDragEnterEvent, QDropEvent
from PyQt5.QtMultimedia import QMediaPlayer, QMediaContent
from PyQt5.QtMultimediaWidgets import QVideoWidget

from core.converter.video_converter import VideoConverter


class ConversionSignal(QObject):
    progress = pyqtSignal(int, int, float, str)
    file_progress = pyqtSignal(float, str)
    finished = pyqtSignal(list)


class FileListWidget(QWidget):
    def __init__(self, parent=None):
        super().__init__(parent)
        self.setAcceptDrops(True)
        self.video_files: List[str] = []
        self.init_ui()
        
    def init_ui(self):
        layout = QVBoxLayout(self)
        layout.setContentsMargins(0, 0, 0, 0)
        
        self.drop_label = QLabel("拖拽视频文件到这里\n或点击下方按钮添加")
        self.drop_label.setAlignment(Qt.AlignCenter)
        self.drop_label.setStyleSheet("""
            QLabel {
                border: 2px dashed #aaa;
                border-radius: 5px;
                padding: 20px;
                color: #666;
            }
        """)
        self.drop_label.setFont(QFont("Microsoft YaHei", 12))
        
        layout.addWidget(self.drop_label)
        
        self.file_table = QTableWidget()
        self.file_table.setColumnCount(4)
        self.file_table.setHorizontalHeaderLabels(["文件名", "时长", "分辨率", "大小"])
        self.file_table.horizontalHeader().setSectionResizeMode(QHeaderView.Stretch)
        self.file_table.setSelectionBehavior(QTableWidget.SelectRows)
        self.file_table.setSelectionMode(QTableWidget.MultiSelection)
        self.file_table.setAlternatingRowColors(True)
        self.file_table.hide()
        
        layout.addWidget(self.file_table)
        
    def dragEnterEvent(self, event: QDragEnterEvent):
        if event.mimeData().hasUrls():
            event.acceptProposedAction()
            
    def dropEvent(self, event: QDropEvent):
        files = []
        for url in event.mimeData().urls():
            file_path = url.toLocalFile()
            if os.path.isfile(file_path):
                ext = os.path.splitext(file_path)[1].lower()
                if ext in ['.mp4', '.avi', '.mkv', '.mov', '.wmv', '.flv', '.webm', '.m4v']:
                    files.append(file_path)
                    
        if files:
            self.add_files(files)
            event.acceptProposedAction()
            
    def add_files(self, files: List[str]):
        for file_path in files:
            if file_path not in self.video_files:
                self.video_files.append(file_path)
                self.update_file_table()
                
    def update_file_table(self):
        if not self.video_files:
            self.drop_label.show()
            self.file_table.hide()
            return
            
        self.drop_label.hide()
        self.file_table.show()
        
        self.file_table.setRowCount(len(self.video_files))
        
        converter = VideoConverter()
        for i, file_path in enumerate(self.video_files):
            filename = os.path.basename(file_path)
            self.file_table.setItem(i, 0, QTableWidgetItem(filename))
            
            info = converter.get_video_info(file_path)
            if info:
                duration_str = converter.format_time(info['duration'])
                self.file_table.setItem(i, 1, QTableWidgetItem(duration_str))
                resolution_str = f"{info['width']}x{info['height']}"
                self.file_table.setItem(i, 2, QTableWidgetItem(resolution_str))
                size_mb = info['filesize'] / (1024 * 1024)
                self.file_table.setItem(i, 3, QTableWidgetItem(f"{size_mb:.2f} MB"))
            else:
                self.file_table.setItem(i, 1, QTableWidgetItem("N/A"))
                self.file_table.setItem(i, 2, QTableWidgetItem("N/A"))
                self.file_table.setItem(i, 3, QTableWidgetItem("N/A"))
                
    def get_selected_files(self) -> List[str]:
        selected_rows = set()
        for item in self.file_table.selectedItems():
            selected_rows.add(item.row())
            
        if selected_rows:
            return [self.video_files[row] for row in sorted(selected_rows)]
        return self.video_files.copy()
        
    def remove_selected(self):
        selected_rows = set()
        for item in self.file_table.selectedItems():
            selected_rows.add(item.row())
            
        for row in sorted(selected_rows, reverse=True):
            if row < len(self.video_files):
                del self.video_files[row]
                
        self.update_file_table()
        
    def clear_all(self):
        self.video_files = []
        self.update_file_table()


class VideoConverterTab(QWidget):
    def __init__(self, parent=None):
        super().__init__(parent)
        
        self.converter = VideoConverter()
        self.conversion_signal = ConversionSignal()
        self.conversion_signal.progress.connect(self.on_conversion_progress)
        self.conversion_signal.file_progress.connect(self.on_file_progress)
        self.conversion_signal.finished.connect(self.on_conversion_finished)
        
        self.current_video: Optional[str] = None
        self.current_video_info: Optional[Dict[str, Any]] = None
        self.is_converting = False
        
        self.init_ui()
        self.check_dependencies()
        
    def init_ui(self):
        main_layout = QVBoxLayout(self)
        main_layout.setSpacing(10)
        main_layout.setContentsMargins(10, 10, 10, 10)
        
        splitter = QSplitter(Qt.Horizontal)
        
        left_panel = QWidget()
        left_layout = QVBoxLayout(left_panel)
        left_layout.setContentsMargins(0, 0, 0, 0)
        
        files_group = QGroupBox("视频文件列表")
        files_layout = QVBoxLayout(files_group)
        
        self.file_list = FileListWidget()
        files_layout.addWidget(self.file_list)
        
        files_buttons_layout = QHBoxLayout()
        self.add_files_btn = QPushButton("添加文件")
        self.add_files_btn.clicked.connect(self.add_files)
        files_buttons_layout.addWidget(self.add_files_btn)
        
        self.remove_selected_btn = QPushButton("移除选中")
        self.remove_selected_btn.clicked.connect(self.remove_selected)
        files_buttons_layout.addWidget(self.remove_selected_btn)
        
        self.clear_all_btn = QPushButton("清空")
        self.clear_all_btn.clicked.connect(self.clear_all)
        files_buttons_layout.addWidget(self.clear_all_btn)
        
        files_layout.addLayout(files_buttons_layout)
        left_layout.addWidget(files_group)
        
        preview_group = QGroupBox("视频预览")
        preview_layout = QVBoxLayout(preview_group)
        
        self.video_widget = QVideoWidget()
        self.video_widget.setMinimumSize(400, 300)
        self.video_widget.setStyleSheet("background-color: #000;")
        
        self.media_player = QMediaPlayer(None, QMediaPlayer.VideoSurface)
        self.media_player.setVideoOutput(self.video_widget)
        
        preview_layout.addWidget(self.video_widget)
        
        preview_controls = QHBoxLayout()
        self.play_btn = QPushButton("播放")
        self.play_btn.clicked.connect(self.toggle_play)
        preview_controls.addWidget(self.play_btn)
        
        self.stop_btn = QPushButton("停止")
        self.stop_btn.clicked.connect(self.stop_video)
        preview_controls.addWidget(self.stop_btn)
        
        self.position_slider = QSlider(Qt.Horizontal)
        self.position_slider.setEnabled(False)
        preview_controls.addWidget(self.position_slider)
        
        self.time_label = QLabel("00:00:00 / 00:00:00")
        preview_controls.addWidget(self.time_label)
        
        preview_layout.addLayout(preview_controls)
        left_layout.addWidget(preview_group)
        
        left_layout.setStretch(0, 1)
        left_layout.setStretch(1, 1)
        splitter.addWidget(left_panel)
        
        right_panel = QWidget()
        right_layout = QVBoxLayout(right_panel)
        right_layout.setContentsMargins(0, 0, 0, 0)
        
        settings_group = QGroupBox("转换设置")
        settings_layout = QGridLayout(settings_group)
        
        row = 0
        
        settings_layout.addWidget(QLabel("输出格式:"), row, 0)
        self.format_combo = QComboBox()
        self.format_combo.addItem("GIF", "gif")
        self.format_combo.addItem("WebM", "webm")
        self.format_combo.currentIndexChanged.connect(self.on_format_changed)
        settings_layout.addWidget(self.format_combo, row, 1)
        row += 1
        
        settings_layout.addWidget(QLabel("开始时间:"), row, 0)
        self.start_time_edit = QLineEdit("00:00:00.000")
        self.start_time_edit.setPlaceholderText("HH:MM:SS.mmm")
        settings_layout.addWidget(self.start_time_edit, row, 1)
        row += 1
        
        settings_layout.addWidget(QLabel("结束时间:"), row, 0)
        self.end_time_edit = QLineEdit("00:00:00.000")
        self.end_time_edit.setPlaceholderText("HH:MM:SS.mmm")
        settings_layout.addWidget(self.end_time_edit, row, 1)
        row += 1
        
        settings_layout.addWidget(QLabel("帧率 (FPS):"), row, 0)
        self.fps_spin = QSpinBox()
        self.fps_spin.setRange(1, 60)
        self.fps_spin.setValue(10)
        settings_layout.addWidget(self.fps_spin, row, 1)
        row += 1
        
        settings_layout.addWidget(QLabel("分辨率:"), row, 0)
        self.resolution_combo = QComboBox()
        self.resolution_combo.addItem("原始", (None, None))
        self.resolution_combo.addItem("1920x1080", (1920, 1080))
        self.resolution_combo.addItem("1280x720", (1280, 720))
        self.resolution_combo.addItem("854x480", (854, 480))
        self.resolution_combo.addItem("640x360", (640, 360))
        self.resolution_combo.addItem("480x270", (480, 270))
        self.resolution_combo.addItem("320x180", (320, 180))
        settings_layout.addWidget(self.resolution_combo, row, 1)
        row += 1
        
        settings_layout.addWidget(QLabel("循环次数:"), row, 0)
        self.loop_spin = QSpinBox()
        self.loop_spin.setRange(0, 1000)
        self.loop_spin.setValue(0)
        self.loop_spin.setSpecialValueText("无限循环")
        settings_layout.addWidget(self.loop_spin, row, 1)
        row += 1
        
        settings_layout.addWidget(QLabel("颜色数:"), row, 0)
        self.colors_combo = QComboBox()
        self.colors_combo.addItem("256 (标准)", 256)
        self.colors_combo.addItem("128", 128)
        self.colors_combo.addItem("64", 64)
        self.colors_combo.addItem("32", 32)
        self.colors_combo.addItem("16", 16)
        settings_layout.addWidget(self.colors_combo, row, 1)
        row += 1
        
        settings_layout.addWidget(QLabel("WebM 比特率:"), row, 0)
        self.bitrate_combo = QComboBox()
        self.bitrate_combo.addItem("低 (512k)", "512k")
        self.bitrate_combo.addItem("中 (1M)", "1M")
        self.bitrate_combo.addItem("高 (2M)", "2M")
        self.bitrate_combo.addItem("很高 (4M)", "4M")
        settings_layout.addWidget(self.bitrate_combo, row, 1)
        row += 1
        
        settings_layout.addWidget(QLabel("输出目录:"), row, 0)
        output_dir_layout = QHBoxLayout()
        self.output_dir_edit = QLineEdit()
        self.output_dir_edit.setPlaceholderText("选择输出目录...")
        output_dir_layout.addWidget(self.output_dir_edit)
        self.browse_output_btn = QPushButton("浏览...")
        self.browse_output_btn.clicked.connect(self.browse_output_dir)
        output_dir_layout.addWidget(self.browse_output_btn)
        settings_layout.addLayout(output_dir_layout, row, 1)
        row += 1
        
        right_layout.addWidget(settings_group)
        
        convert_group = QGroupBox("转换控制")
        convert_layout = QVBoxLayout(convert_group)
        
        convert_buttons = QHBoxLayout()
        self.convert_btn = QPushButton("开始转换")
        self.convert_btn.setStyleSheet("background-color: #4CAF50; color: white; font-weight: bold;")
        self.convert_btn.clicked.connect(self.start_conversion)
        convert_buttons.addWidget(self.convert_btn)
        
        self.stop_convert_btn = QPushButton("停止")
        self.stop_convert_btn.setStyleSheet("background-color: #f44336; color: white; font-weight: bold;")
        self.stop_convert_btn.setEnabled(False)
        self.stop_convert_btn.clicked.connect(self.stop_conversion)
        convert_buttons.addWidget(self.stop_convert_btn)
        
        convert_layout.addLayout(convert_buttons)
        
        self.progress_bar = QProgressBar()
        self.progress_bar.setMinimum(0)
        self.progress_bar.setMaximum(100)
        self.progress_bar.setValue(0)
        convert_layout.addWidget(self.progress_bar)
        
        self.progress_label = QLabel("就绪")
        self.progress_label.setAlignment(Qt.AlignCenter)
        convert_layout.addWidget(self.progress_label)
        
        right_layout.addWidget(convert_group)
        
        log_group = QGroupBox("转换日志")
        log_layout = QVBoxLayout(log_group)
        
        self.log_text = QTextEdit()
        self.log_text.setReadOnly(True)
        self.log_text.setFont(QFont("Courier New", 10))
        log_layout.addWidget(self.log_text)
        
        right_layout.addWidget(log_group)
        
        right_layout.setStretch(0, 3)
        right_layout.setStretch(1, 1)
        right_layout.setStretch(2, 2)
        splitter.addWidget(right_panel)
        
        splitter.setSizes([600, 500])
        main_layout.addWidget(splitter)
        
        self.file_list.file_table.itemSelectionChanged.connect(self.on_file_selection_changed)
        
        self.media_player.positionChanged.connect(self.on_position_changed)
        self.media_player.durationChanged.connect(self.on_duration_changed)
        
    def check_dependencies(self):
        deps = self.converter.check_dependencies()
        
        if not deps['moviepy']:
            self.log_message("警告: MoviePy 未安装，视频转换功能将不可用")
            self.convert_btn.setEnabled(False)
            
        if not deps['pillow']:
            self.log_message("警告: Pillow 未安装，预览功能可能受限")
            
    def add_files(self):
        files, _ = QFileDialog.getOpenFileNames(
            self,
            "选择视频文件",
            "",
            "视频文件 (*.mp4 *.avi *.mkv *.mov *.wmv *.flv *.webm *.m4v);;所有文件 (*.*)"
        )
        
        if files:
            self.file_list.add_files(files)
            self.log_message(f"已添加 {len(files)} 个视频文件")
            
    def remove_selected(self):
        count = len(self.file_list.get_selected_files())
        if count > 0:
            self.file_list.remove_selected()
            self.log_message(f"已移除 {count} 个文件")
            
    def clear_all(self):
        reply = QMessageBox.question(
            self, "确认清空",
            "确定要清空所有视频文件吗？",
            QMessageBox.Yes | QMessageBox.No
        )
        
        if reply == QMessageBox.Yes:
            self.file_list.clear_all()
            self.log_message("已清空所有文件")
            
    def on_file_selection_changed(self):
        selected_files = self.file_list.get_selected_files()
        if len(selected_files) == 1:
            self.load_video(selected_files[0])
        else:
            self.stop_video()
            
    def load_video(self, video_path: str):
        self.current_video = video_path
        self.current_video_info = self.converter.get_video_info(video_path)
        
        if self.current_video_info:
            duration = self.current_video_info['duration']
            self.end_time_edit.setText(self.converter.format_time(duration))
            self.start_time_edit.setText("00:00:00.000")
            
            if not self.output_dir_edit.text():
                self.output_dir_edit.setText(os.path.dirname(video_path))
                
        media_content = QMediaContent(QUrl.fromLocalFile(video_path))
        self.media_player.setMedia(media_content)
        self.position_slider.setEnabled(True)
        
        self.log_message(f"已加载视频: {os.path.basename(video_path)}")
        
    def toggle_play(self):
        if self.media_player.state() == QMediaPlayer.PlayingState:
            self.media_player.pause()
            self.play_btn.setText("播放")
        else:
            self.media_player.play()
            self.play_btn.setText("暂停")
            
    def stop_video(self):
        self.media_player.stop()
        self.play_btn.setText("播放")
        self.position_slider.setEnabled(False)
        
    def on_position_changed(self, position):
        self.position_slider.setValue(position)
        self.update_time_label()
        
    def on_duration_changed(self, duration):
        self.position_slider.setRange(0, duration)
        self.update_time_label()
        
    def update_time_label(self):
        position = self.media_player.position()
        duration = self.media_player.duration()
        
        pos_str = self.converter.format_time(position / 1000)
        dur_str = self.converter.format_time(duration / 1000)
        
        self.time_label.setText(f"{pos_str} / {dur_str}")
        
    def on_format_changed(self, index):
        format_type = self.format_combo.currentData()
        if format_type == "gif":
            self.loop_spin.setEnabled(True)
            self.colors_combo.setEnabled(True)
            self.bitrate_combo.setEnabled(False)
        else:
            self.loop_spin.setEnabled(False)
            self.colors_combo.setEnabled(False)
            self.bitrate_combo.setEnabled(True)
            
    def browse_output_dir(self):
        dir_path = QFileDialog.getExistingDirectory(self, "选择输出目录")
        if dir_path:
            self.output_dir_edit.setText(dir_path)
            
    def get_conversion_settings(self) -> Dict[str, Any]:
        settings = {}
        
        settings['format'] = self.format_combo.currentData()
        settings['start_time'] = self.converter.parse_time(self.start_time_edit.text())
        settings['end_time'] = self.converter.parse_time(self.end_time_edit.text())
        settings['fps'] = self.fps_spin.value()
        
        resolution = self.resolution_combo.currentData()
        if resolution[0] is None:
            settings['resolution'] = None
        else:
            settings['resolution'] = resolution
            
        settings['loop'] = self.loop_spin.value()
        settings['colors'] = self.colors_combo.currentData()
        settings['bitrate'] = self.bitrate_combo.currentData()
        settings['output_dir'] = self.output_dir_edit.text()
        
        return settings
        
    def start_conversion(self):
        files = self.file_list.get_selected_files()
        if not files:
            files = self.file_list.video_files
            
        if not files:
            QMessageBox.warning(self, "警告", "没有选择视频文件")
            return
            
        settings = self.get_conversion_settings()
        
        if not settings['output_dir']:
            QMessageBox.warning(self, "警告", "请选择输出目录")
            return
            
        if not os.path.exists(settings['output_dir']):
            try:
                os.makedirs(settings['output_dir'])
            except Exception as e:
                QMessageBox.critical(self, "错误", f"无法创建输出目录: {e}")
                return
                
        self.is_converting = True
        self.convert_btn.setEnabled(False)
        self.stop_convert_btn.setEnabled(True)
        self.progress_bar.setValue(0)
        
        def conversion_thread():
            try:
                results = self.converter.convert_batch(
                    video_files=files,
                    output_dir=settings['output_dir'],
                    output_format=settings['format'],
                    start_time=settings['start_time'],
                    end_time=settings['end_time'],
                    fps=settings['fps'],
                    resolution=settings['resolution'],
                    loop=settings['loop'],
                    colors=settings['colors'],
                    bitrate=settings['bitrate'],
                    progress_callback=lambda current, total, progress, message: self.conversion_signal.progress.emit(current, total, progress, message),
                    file_progress_callback=lambda progress, message: self.conversion_signal.file_progress.emit(progress, message)
                )
                self.conversion_signal.finished.emit(results)
            except Exception as e:
                self.log_message(f"转换线程错误: {e}")
                
        thread = threading.Thread(target=conversion_thread, daemon=True)
        thread.start()
        
        self.log_message("开始转换...")
        
    def stop_conversion(self):
        self.converter.stop_conversion()
        self.is_converting = False
        self.convert_btn.setEnabled(True)
        self.stop_convert_btn.setEnabled(False)
        self.log_message("转换已停止")
        
    def on_conversion_progress(self, current: int, total: int, progress: float, message: str):
        self.progress_bar.setValue(int(progress * 100))
        self.progress_label.setText(message)
        self.log_message(message)
        
    def on_file_progress(self, progress: float, message: str):
        pass
        
    def on_conversion_finished(self, results: List[Dict[str, Any]]):
        self.is_converting = False
        self.convert_btn.setEnabled(True)
        self.stop_convert_btn.setEnabled(False)
        self.progress_bar.setValue(100)
        
        success_count = sum(1 for r in results if r['success'])
        fail_count = len(results) - success_count
        
        self.log_message(f"转换完成: 成功 {success_count} 个, 失败 {fail_count} 个")
        
        QMessageBox.information(
            self, "转换完成",
            f"转换完成!\n成功: {success_count} 个\n失败: {fail_count} 个"
        )
        
    def log_message(self, message: str):
        timestamp = datetime.now().strftime('%H:%M:%S')
        log_entry = f"[{timestamp}] {message}\n"
        self.log_text.append(log_entry)
        
        scrollbar = self.log_text.verticalScrollBar()
        scrollbar.setValue(scrollbar.maximum())
        
    def cleanup(self):
        if self.media_player:
            self.media_player.stop()
        if self.is_converting:
            self.converter.stop_conversion()
