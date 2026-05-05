import sys
import os
import shutil
from typing import List, Optional, Dict, Any
from pathlib import Path

from PySide6.QtWidgets import (
    QApplication, QMainWindow, QWidget, QVBoxLayout, QHBoxLayout,
    QGridLayout, QLabel, QPushButton, QComboBox, QCheckBox, 
    QSpinBox, QDoubleSpinBox, QSlider, QGroupBox, QTabWidget,
    QListWidget, QListWidgetItem, QFileDialog, QMessageBox,
    QProgressBar, QScrollArea, QFrame, QStatusBar, QSplitter,
    QLineEdit, QRadioButton, QButtonGroup, QColorDialog, QTableWidget,
    QTableWidgetItem, QHeaderView, QInputDialog
)
from PySide6.QtCore import Qt, Signal, QObject, QThread
from PySide6.QtGui import QFont, QPixmap, QImage, QColor

import cv2
import numpy as np

try:
    from batch_image_processor.core.image_processor import ImageProcessor
    from batch_image_processor.core.watermark_service import WatermarkService
    from batch_image_processor.core.rule_engine import RuleEngine, RenameRule
    from batch_image_processor.core.database import ImageDatabase
except ImportError:
    sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
    from batch_image_processor.core.image_processor import ImageProcessor
    from batch_image_processor.core.watermark_service import WatermarkService
    from batch_image_processor.core.rule_engine import RuleEngine, RenameRule
    from batch_image_processor.core.database import ImageDatabase


class ProcessingWorker(QThread):
    progress = Signal(int, int, str)
    finished = Signal(int, int)
    error = Signal(str)
    
    def __init__(self, images: List[str], output_dir: str, settings: Dict[str, Any]):
        super().__init__()
        self.images = images
        self.output_dir = output_dir
        self.settings = settings
        self._is_cancelled = False
        
        self.image_processor = ImageProcessor()
        self.watermark_service = WatermarkService()
        self.database = ImageDatabase()
    
    def run(self):
        total = len(self.images)
        success_count = 0
        error_count = 0
        
        os.makedirs(self.output_dir, exist_ok=True)
        
        for idx, image_path in enumerate(self.images):
            if self._is_cancelled:
                break
            
            self.progress.emit(idx + 1, total, f"处理中: {os.path.basename(image_path)}")
            
            try:
                result = self._process_single_image(image_path)
                if result:
                    success_count += 1
                else:
                    error_count += 1
            except Exception as e:
                error_count += 1
                self.error.emit(f"处理 {os.path.basename(image_path)} 时出错: {str(e)}")
        
        self.finished.emit(success_count, error_count)
    
    def cancel(self):
        self._is_cancelled = True
    
    def _process_single_image(self, image_path: str) -> bool:
        img = self.image_processor.load_image(image_path)
        if img is None:
            return False
        
        original_name = os.path.basename(image_path)
        
        if self.settings.get('rename_enabled', False):
            rule = self.settings.get('rename_rule')
            if rule:
                rule_engine = RuleEngine(rule)
                index = self.settings.get('current_index', 1)
                new_name = rule_engine.generate_filename(image_path, index, len(self.images))
                self.settings['current_index'] = index + 1
            else:
                new_name = original_name
        else:
            new_name = original_name
        
        if self.settings.get('resize_enabled', False):
            width = self.settings.get('resize_width', 1024)
            height = self.settings.get('resize_height', 768)
            keep_aspect = self.settings.get('resize_keep_aspect', True)
            img = self.image_processor.resize(img, width, height, keep_aspect=keep_aspect)
        
        if self.settings.get('crop_enabled', False):
            x = self.settings.get('crop_x', 0)
            y = self.settings.get('crop_y', 0)
            width = self.settings.get('crop_width', 100)
            height = self.settings.get('crop_height', 100)
            img = self.image_processor.crop(img, x, y, width, height)
        
        if self.settings.get('rotate_enabled', False):
            angle = self.settings.get('rotate_angle', 0.0)
            if angle != 0:
                img = self.image_processor.rotate(img, angle)
        
        if self.settings.get('watermark_enabled', False):
            watermark_type = self.settings.get('watermark_type', 'text')
            
            if watermark_type == 'text':
                text = self.settings.get('watermark_text', 'Watermark')
                position = self.settings.get('watermark_position', 'bottom_right')
                opacity = self.settings.get('watermark_opacity', 0.5)
                font_size = self.settings.get('watermark_size', 32)
                color = self.settings.get('watermark_color', (255, 255, 255))
                
                img = self.watermark_service.add_text_watermark(
                    img, text, position, opacity,
                    font_size=font_size, color=color
                )
            elif watermark_type == 'image':
                watermark_path = self.settings.get('watermark_image_path', '')
                if watermark_path and os.path.exists(watermark_path):
                    watermark_img = self.image_processor.load_image(watermark_path, flags=cv2.IMREAD_UNCHANGED)
                    if watermark_img is not None:
                        position = self.settings.get('watermark_position', 'bottom_right')
                        opacity = self.settings.get('watermark_opacity', 0.5)
                        size = self.settings.get('watermark_size', 100)
                        
                        img = self.watermark_service.add_image_watermark(
                            img, watermark_img, position, opacity, size
                        )
        
        output_format = self.settings.get('output_format', 'original')
        output_quality = self.settings.get('output_quality', 90)
        
        if output_format == 'original':
            ext = Path(image_path).suffix.lower().lstrip('.')
        else:
            ext = output_format.lower()
        
        base_name = Path(new_name).stem
        output_name = f"{base_name}.{ext}"
        output_path = os.path.join(self.output_dir, output_name)
        
        success = self.image_processor.save_image(img, output_path, output_quality)
        
        if success:
            self.database.log_processing(
                original_filename=original_name,
                new_filename=output_name,
                original_path=image_path,
                output_path=output_path,
                resize_width=self.settings.get('resize_width'),
                resize_height=self.settings.get('resize_height'),
                resize_keep_aspect=self.settings.get('resize_keep_aspect', True),
                rotation_angle=self.settings.get('rotate_angle', 0.0),
                output_format=output_format,
                output_quality=output_quality,
                watermark_type=self.settings.get('watermark_type'),
                watermark_text=self.settings.get('watermark_text'),
                watermark_position=self.settings.get('watermark_position'),
                watermark_opacity=self.settings.get('watermark_opacity', 0.5),
                watermark_size=self.settings.get('watermark_size'),
                status='success'
            )
        
        return success


class ImageMainWindow(QMainWindow):
    def __init__(self):
        super().__init__()
        
        self.image_processor = ImageProcessor()
        self.watermark_service = WatermarkService()
        self.database = ImageDatabase()
        
        self.selected_images: List[str] = []
        self.preview_image_path: Optional[str] = None
        self.current_rule: Optional[RenameRule] = None
        self.worker: Optional[ProcessingWorker] = None
        
        self._init_ui()
        
        self.setWindowTitle("图片批量重命名与处理工具 v1.0")
        self.setMinimumSize(1400, 900)
        self.resize(1600, 1000)

    def _init_ui(self):
        central_widget = QWidget()
        self.setCentralWidget(central_widget)
        main_layout = QHBoxLayout(central_widget)
        
        left_panel = QWidget()
        left_layout = QVBoxLayout(left_panel)
        left_panel.setMinimumWidth(300)
        left_panel.setMaximumWidth(400)
        
        file_group = QGroupBox("文件选择")
        file_layout = QVBoxLayout(file_group)
        
        file_buttons = QHBoxLayout()
        self.btn_add_files = QPushButton("添加文件")
        self.btn_add_folder = QPushButton("添加文件夹")
        self.btn_clear_files = QPushButton("清空")
        file_buttons.addWidget(self.btn_add_files)
        file_buttons.addWidget(self.btn_add_folder)
        file_buttons.addWidget(self.btn_clear_files)
        file_layout.addLayout(file_buttons)
        
        self.file_list = QListWidget()
        self.file_list.setMinimumHeight(200)
        file_layout.addWidget(self.file_list)
        
        self.label_file_count = QLabel("已选择: 0 个文件")
        file_layout.addWidget(self.label_file_count)
        
        left_layout.addWidget(file_group)
        
        self.tab_widget = QTabWidget()
        
        rename_tab = self._create_rename_tab()
        self.tab_widget.addTab(rename_tab, "重命名规则")
        
        process_tab = self._create_process_tab()
        self.tab_widget.addTab(process_tab, "图片处理")
        
        watermark_tab = self._create_watermark_tab()
        self.tab_widget.addTab(watermark_tab, "水印设置")
        
        output_tab = self._create_output_tab()
        self.tab_widget.addTab(output_tab, "输出设置")
        
        left_layout.addWidget(self.tab_widget)
        
        process_buttons = QHBoxLayout()
        self.btn_preview = QPushButton("预览效果")
        self.btn_preview.setMinimumHeight(40)
        self.btn_preview.setStyleSheet("background-color: #2196F3; color: white; font-weight: bold;")
        
        self.btn_start = QPushButton("开始处理")
        self.btn_start.setMinimumHeight(40)
        self.btn_start.setStyleSheet("background-color: #4CAF50; color: white; font-weight: bold;")
        
        self.btn_cancel = QPushButton("取消")
        self.btn_cancel.setMinimumHeight(40)
        self.btn_cancel.setEnabled(False)
        
        process_buttons.addWidget(self.btn_preview)
        process_buttons.addWidget(self.btn_start)
        process_buttons.addWidget(self.btn_cancel)
        
        left_layout.addLayout(process_buttons)
        
        self.progress_bar = QProgressBar()
        self.progress_bar.setVisible(False)
        left_layout.addWidget(self.progress_bar)
        
        main_layout.addWidget(left_panel)
        
        right_panel = QWidget()
        right_layout = QVBoxLayout(right_panel)
        
        preview_group = QGroupBox("预览区")
        preview_layout = QVBoxLayout(preview_group)
        
        preview_controls = QHBoxLayout()
        self.combo_preview_mode = QComboBox()
        self.combo_preview_mode.addItems(["原始图片", "处理后效果", "对比显示"])
        preview_controls.addWidget(QLabel("预览模式:"))
        preview_controls.addWidget(self.combo_preview_mode)
        preview_controls.addStretch()
        preview_layout.addLayout(preview_controls)
        
        self.preview_label = QLabel("请选择图片文件并点击预览")
        self.preview_label.setAlignment(Qt.AlignCenter)
        self.preview_label.setMinimumSize(400, 300)
        self.preview_label.setStyleSheet("""
            QLabel {
                background-color: #f5f5f5;
                border: 2px dashed #ccc;
                color: #888;
            }
        """)
        preview_layout.addWidget(self.preview_label, 1)
        
        self.preview_info = QLabel("")
        self.preview_info.setStyleSheet("color: #666;")
        preview_layout.addWidget(self.preview_info)
        
        right_layout.addWidget(preview_group)
        
        history_group = QGroupBox("处理历史")
        history_layout = QVBoxLayout(history_group)
        
        self.history_table = QTableWidget()
        self.history_table.setColumnCount(5)
        self.history_table.setHorizontalHeaderLabels(["原文件名", "新文件名", "处理时间", "状态", "输出路径"])
        self.history_table.horizontalHeader().setSectionResizeMode(QHeaderView.Stretch)
        self.history_table.setAlternatingRowColors(True)
        self.history_table.setMaximumHeight(200)
        history_layout.addWidget(self.history_table)
        
        right_layout.addWidget(history_group)
        
        main_layout.addWidget(right_panel, 1)
        
        self.status_bar = QStatusBar()
        self.setStatusBar(self.status_bar)
        self.status_bar.showMessage("就绪")
        
        self._connect_signals()
        self._load_saved_rules()
        self._load_history()

    def _create_rename_tab(self) -> QWidget:
        widget = QWidget()
        layout = QVBoxLayout(widget)
        
        rule_group = QGroupBox("规则管理")
        rule_layout = QHBoxLayout(rule_group)
        
        self.combo_rules = QComboBox()
        self.combo_rules.setMinimumWidth(200)
        rule_layout.addWidget(QLabel("选择规则:"))
        rule_layout.addWidget(self.combo_rules)
        
        self.btn_save_rule = QPushButton("保存规则")
        self.btn_delete_rule = QPushButton("删除规则")
        rule_layout.addWidget(self.btn_save_rule)
        rule_layout.addWidget(self.btn_delete_rule)
        rule_layout.addStretch()
        
        layout.addWidget(rule_group)
        
        self.check_rename_enabled = QCheckBox("启用重命名功能")
        self.check_rename_enabled.setChecked(True)
        layout.addWidget(self.check_rename_enabled)
        
        components_group = QGroupBox("命名组件")
        components_layout = QVBoxLayout(components_group)
        
        self.check_use_sequence = QCheckBox("使用序号")
        self.check_use_sequence.setChecked(True)
        components_layout.addWidget(self.check_use_sequence)
        
        sequence_layout = QGridLayout()
        sequence_layout.addWidget(QLabel("起始值:"), 0, 0)
        self.spin_sequence_start = QSpinBox()
        self.spin_sequence_start.setRange(0, 99999)
        self.spin_sequence_start.setValue(1)
        sequence_layout.addWidget(self.spin_sequence_start, 0, 1)
        
        sequence_layout.addWidget(QLabel("填充位数:"), 0, 2)
        self.spin_sequence_padding = QSpinBox()
        self.spin_sequence_padding.setRange(1, 10)
        self.spin_sequence_padding.setValue(4)
        sequence_layout.addWidget(self.spin_sequence_padding, 0, 3)
        
        sequence_layout.addWidget(QLabel("前缀:"), 1, 0)
        self.edit_sequence_prefix = QLineEdit()
        self.edit_sequence_prefix.setPlaceholderText("可选")
        sequence_layout.addWidget(self.edit_sequence_prefix, 1, 1)
        
        sequence_layout.addWidget(QLabel("后缀:"), 1, 2)
        self.edit_sequence_suffix = QLineEdit()
        self.edit_sequence_suffix.setPlaceholderText("可选")
        sequence_layout.addWidget(self.edit_sequence_suffix, 1, 3)
        
        components_layout.addLayout(sequence_layout)
        
        self.check_use_date = QCheckBox("使用日期")
        components_layout.addWidget(self.check_use_date)
        
        date_layout = QGridLayout()
        date_layout.addWidget(QLabel("日期格式:"), 0, 0)
        self.combo_date_format = QComboBox()
        self.combo_date_format.addItems([
            "%Y%m%d", "%Y-%m-%d", "%d%m%Y", "%d-%m-%Y",
            "%Y%m%d_%H%M%S", "%Y%m%d-%H%M%S"
        ])
        date_layout.addWidget(self.combo_date_format, 0, 1)
        
        date_layout.addWidget(QLabel("日期来源:"), 0, 2)
        self.combo_date_source = QComboBox()
        self.combo_date_source.addItems([
            "文件修改时间", "文件创建时间", 
            "EXIF 拍摄时间", "EXIF 原始时间"
        ])
        date_layout.addWidget(self.combo_date_source, 0, 3)
        
        components_layout.addLayout(date_layout)
        
        self.check_use_exif = QCheckBox("使用 EXIF 信息")
        components_layout.addWidget(self.check_use_exif)
        
        exif_layout = QHBoxLayout()
        exif_layout.addWidget(QLabel("EXIF 字段:"))
        self.combo_exif_fields = QComboBox()
        self.combo_exif_fields.addItems([
            "相机品牌 (MAKE)", "相机型号 (MODEL)", "镜头型号 (LENS)",
            "ISO 值 (ISO)", "光圈 (APERTURE)", "快门 (SHUTTER)",
            "焦距 (FOCAL)", "拍摄日期 (DATETIME)"
        ])
        self.combo_exif_fields.setEditable(True)
        exif_layout.addWidget(self.combo_exif_fields)
        exif_layout.addStretch()
        components_layout.addLayout(exif_layout)
        
        self.check_use_custom_text = QCheckBox("使用自定义文本")
        components_layout.addWidget(self.check_use_custom_text)
        
        custom_layout = QGridLayout()
        custom_layout.addWidget(QLabel("自定义文本:"), 0, 0)
        self.edit_custom_text = QLineEdit()
        self.edit_custom_text.setPlaceholderText("输入自定义文本")
        custom_layout.addWidget(self.edit_custom_text, 0, 1, 1, 2)
        
        custom_layout.addWidget(QLabel("位置:"), 0, 3)
        self.combo_custom_position = QComboBox()
        self.combo_custom_position.addItems(["前缀", "后缀"])
        custom_layout.addWidget(self.combo_custom_position, 0, 4)
        
        custom_layout.addWidget(QLabel("分隔符:"), 1, 0)
        self.edit_separator = QLineEdit()
        self.edit_separator.setText("_")
        self.edit_separator.setMaximumWidth(60)
        custom_layout.addWidget(self.edit_separator, 1, 1)
        custom_layout.addStretch()
        
        components_layout.addLayout(custom_layout)
        
        layout.addWidget(components_group)
        
        preview_group = QGroupBox("规则预览")
        preview_layout = QVBoxLayout(preview_group)
        
        self.label_rule_preview = QLabel("示例: image_0001.jpg")
        self.label_rule_preview.setFont(QFont("Consolas", 12))
        self.label_rule_preview.setStyleSheet("background-color: #e8f5e9; padding: 10px; border-radius: 5px;")
        preview_layout.addWidget(self.label_rule_preview)
        
        self.btn_update_preview = QPushButton("更新预览")
        preview_layout.addWidget(self.btn_update_preview)
        
        layout.addWidget(preview_group)
        layout.addStretch()
        
        return widget

    def _create_process_tab(self) -> QWidget:
        widget = QWidget()
        layout = QVBoxLayout(widget)
        
        resize_group = QGroupBox("尺寸调整")
        resize_layout = QVBoxLayout(resize_group)
        
        self.check_resize_enabled = QCheckBox("启用尺寸调整")
        resize_layout.addWidget(self.check_resize_enabled)
        
        resize_settings = QGridLayout()
        resize_settings.addWidget(QLabel("宽度:"), 0, 0)
        self.spin_resize_width = QSpinBox()
        self.spin_resize_width.setRange(1, 10000)
        self.spin_resize_width.setValue(1920)
        resize_settings.addWidget(self.spin_resize_width, 0, 1)
        
        resize_settings.addWidget(QLabel("高度:"), 0, 2)
        self.spin_resize_height = QSpinBox()
        self.spin_resize_height.setRange(1, 10000)
        self.spin_resize_height.setValue(1080)
        resize_settings.addWidget(self.spin_resize_height, 0, 3)
        
        self.check_keep_aspect = QCheckBox("保持宽高比")
        self.check_keep_aspect.setChecked(True)
        resize_settings.addWidget(self.check_keep_aspect, 1, 0, 1, 2)
        
        resize_layout.addLayout(resize_settings)
        
        layout.addWidget(resize_group)
        
        crop_group = QGroupBox("裁剪")
        crop_layout = QVBoxLayout(crop_group)
        
        self.check_crop_enabled = QCheckBox("启用裁剪")
        crop_layout.addWidget(self.check_crop_enabled)
        
        crop_settings = QGridLayout()
        crop_settings.addWidget(QLabel("X:"), 0, 0)
        self.spin_crop_x = QSpinBox()
        self.spin_crop_x.setRange(0, 10000)
        crop_settings.addWidget(self.spin_crop_x, 0, 1)
        
        crop_settings.addWidget(QLabel("Y:"), 0, 2)
        self.spin_crop_y = QSpinBox()
        self.spin_crop_y.setRange(0, 10000)
        crop_settings.addWidget(self.spin_crop_y, 0, 3)
        
        crop_settings.addWidget(QLabel("宽度:"), 1, 0)
        self.spin_crop_width = QSpinBox()
        self.spin_crop_width.setRange(1, 10000)
        self.spin_crop_width.setValue(800)
        crop_settings.addWidget(self.spin_crop_width, 1, 1)
        
        crop_settings.addWidget(QLabel("高度:"), 1, 2)
        self.spin_crop_height = QSpinBox()
        self.spin_crop_height.setRange(1, 10000)
        self.spin_crop_height.setValue(600)
        crop_settings.addWidget(self.spin_crop_height, 1, 3)
        
        crop_layout.addLayout(crop_settings)
        
        layout.addWidget(crop_group)
        
        rotate_group = QGroupBox("旋转")
        rotate_layout = QVBoxLayout(rotate_group)
        
        self.check_rotate_enabled = QCheckBox("启用旋转")
        rotate_layout.addWidget(self.check_rotate_enabled)
        
        rotate_settings = QHBoxLayout()
        rotate_settings.addWidget(QLabel("角度:"))
        self.spin_rotate_angle = QDoubleSpinBox()
        self.spin_rotate_angle.setRange(-360, 360)
        self.spin_rotate_angle.setSingleStep(90)
        self.spin_rotate_angle.setValue(0)
        rotate_settings.addWidget(self.spin_rotate_angle)
        
        quick_rotate = QHBoxLayout()
        self.btn_rotate_90 = QPushButton("90°")
        self.btn_rotate_180 = QPushButton("180°")
        self.btn_rotate_270 = QPushButton("270°")
        self.btn_rotate_neg90 = QPushButton("-90°")
        quick_rotate.addWidget(self.btn_rotate_90)
        quick_rotate.addWidget(self.btn_rotate_180)
        quick_rotate.addWidget(self.btn_rotate_270)
        quick_rotate.addWidget(self.btn_rotate_neg90)
        quick_rotate.addStretch()
        
        rotate_layout.addLayout(rotate_settings)
        rotate_layout.addLayout(quick_rotate)
        
        layout.addWidget(rotate_group)
        
        format_group = QGroupBox("格式转换")
        format_layout = QVBoxLayout(format_group)
        
        self.check_format_enabled = QCheckBox("启用格式转换")
        format_layout.addWidget(self.check_format_enabled)
        
        format_settings = QHBoxLayout()
        format_settings.addWidget(QLabel("目标格式:"))
        self.combo_output_format = QComboBox()
        self.combo_output_format.addItems(["original", "jpg", "png", "webp", "bmp", "tiff"])
        format_settings.addWidget(self.combo_output_format)
        
        format_settings.addWidget(QLabel("质量:"))
        self.slider_quality = QSlider(Qt.Horizontal)
        self.slider_quality.setRange(1, 100)
        self.slider_quality.setValue(90)
        format_settings.addWidget(self.slider_quality)
        
        self.label_quality = QLabel("90%")
        format_settings.addWidget(self.label_quality)
        format_settings.addStretch()
        
        format_layout.addLayout(format_settings)
        
        layout.addWidget(format_group)
        layout.addStretch()
        
        return widget

    def _create_watermark_tab(self) -> QWidget:
        widget = QWidget()
        layout = QVBoxLayout(widget)
        
        enable_group = QGroupBox("水印设置")
        enable_layout = QVBoxLayout(enable_group)
        
        self.check_watermark_enabled = QCheckBox("启用水印")
        enable_layout.addWidget(self.check_watermark_enabled)
        
        self.radio_text_watermark = QRadioButton("文字水印")
        self.radio_image_watermark = QRadioButton("图片水印")
        self.radio_text_watermark.setChecked(True)
        
        watermark_type_layout = QHBoxLayout()
        watermark_type_layout.addWidget(self.radio_text_watermark)
        watermark_type_layout.addWidget(self.radio_image_watermark)
        watermark_type_layout.addStretch()
        enable_layout.addLayout(watermark_type_layout)
        
        layout.addWidget(enable_group)
        
        text_group = QGroupBox("文字水印设置")
        text_layout = QVBoxLayout(text_group)
        
        text_content_layout = QHBoxLayout()
        text_content_layout.addWidget(QLabel("水印文字:"))
        self.edit_watermark_text = QLineEdit()
        self.edit_watermark_text.setText("水印文字")
        text_content_layout.addWidget(self.edit_watermark_text)
        text_layout.addLayout(text_content_layout)
        
        text_style_layout = QGridLayout()
        text_style_layout.addWidget(QLabel("字体大小:"), 0, 0)
        self.spin_font_size = QSpinBox()
        self.spin_font_size.setRange(8, 200)
        self.spin_font_size.setValue(32)
        text_style_layout.addWidget(self.spin_font_size, 0, 1)
        
        text_style_layout.addWidget(QLabel("颜色:"), 0, 2)
        self.btn_color_picker = QPushButton("选择颜色")
        self.btn_color_picker.setStyleSheet("background-color: white;")
        text_style_layout.addWidget(self.btn_color_picker, 0, 3)
        
        self.watermark_color = (255, 255, 255)
        
        text_layout.addLayout(text_style_layout)
        
        layout.addWidget(text_group)
        
        image_group = QGroupBox("图片水印设置")
        image_layout = QVBoxLayout(image_group)
        
        image_select_layout = QHBoxLayout()
        image_select_layout.addWidget(QLabel("水印图片:"))
        self.edit_watermark_image = QLineEdit()
        self.edit_watermark_image.setPlaceholderText("选择水印图片 (支持透明 PNG)")
        self.btn_browse_watermark = QPushButton("浏览...")
        image_select_layout.addWidget(self.edit_watermark_image)
        image_select_layout.addWidget(self.btn_browse_watermark)
        image_layout.addLayout(image_select_layout)
        
        image_size_layout = QHBoxLayout()
        image_size_layout.addWidget(QLabel("水印大小:"))
        self.spin_watermark_size = QSpinBox()
        self.spin_watermark_size.setRange(10, 500)
        self.spin_watermark_size.setValue(100)
        image_size_layout.addWidget(self.spin_watermark_size)
        image_size_layout.addStretch()
        image_layout.addLayout(image_size_layout)
        
        layout.addWidget(image_group)
        
        common_group = QGroupBox("通用设置")
        common_layout = QVBoxLayout(common_group)
        
        position_layout = QGridLayout()
        position_layout.addWidget(QLabel("位置:"), 0, 0)
        self.combo_watermark_position = QComboBox()
        position_names = [
            "左上角", "顶部居中", "右上角",
            "左居中", "居中", "右居中",
            "左下角", "底部居中", "右下角"
        ]
        self.combo_watermark_position.addItems(position_names)
        self.combo_watermark_position.setCurrentText("右下角")
        position_layout.addWidget(self.combo_watermark_position, 0, 1)
        
        position_layout.addWidget(QLabel("透明度:"), 0, 2)
        self.slider_opacity = QSlider(Qt.Horizontal)
        self.slider_opacity.setRange(0, 100)
        self.slider_opacity.setValue(50)
        position_layout.addWidget(self.slider_opacity, 0, 3)
        
        self.label_opacity = QLabel("50%")
        position_layout.addWidget(self.label_opacity, 0, 4)
        
        common_layout.addLayout(position_layout)
        
        layout.addWidget(common_group)
        layout.addStretch()
        
        return widget

    def _create_output_tab(self) -> QWidget:
        widget = QWidget()
        layout = QVBoxLayout(widget)
        
        output_dir_group = QGroupBox("输出目录")
        output_dir_layout = QVBoxLayout(output_dir_group)
        
        dir_layout = QHBoxLayout()
        dir_layout.addWidget(QLabel("输出目录:"))
        self.edit_output_dir = QLineEdit()
        self.edit_output_dir.setPlaceholderText("选择输出目录")
        self.btn_browse_output = QPushButton("浏览...")
        dir_layout.addWidget(self.edit_output_dir)
        dir_layout.addWidget(self.btn_browse_output)
        output_dir_layout.addLayout(dir_layout)
        
        options_layout = QHBoxLayout()
        self.check_overwrite = QCheckBox("覆盖已有文件")
        self.check_preserve_structure = QCheckBox("保持目录结构")
        options_layout.addWidget(self.check_overwrite)
        options_layout.addWidget(self.check_preserve_structure)
        options_layout.addStretch()
        output_dir_layout.addLayout(options_layout)
        
        layout.addWidget(output_dir_group)
        
        naming_group = QGroupBox("命名冲突处理")
        naming_layout = QVBoxLayout(naming_group)
        
        self.radio_skip = QRadioButton("跳过重复文件")
        self.radio_rename_auto = QRadioButton("自动重命名 (添加序号)")
        self.radio_rename_auto.setChecked(True)
        self.radio_overwrite = QRadioButton("覆盖")
        
        naming_layout.addWidget(self.radio_skip)
        naming_layout.addWidget(self.radio_rename_auto)
        naming_layout.addWidget(self.radio_overwrite)
        
        layout.addWidget(naming_group)
        
        log_group = QGroupBox("日志设置")
        log_layout = QVBoxLayout(log_group)
        
        self.check_save_log = QCheckBox("保存处理日志")
        self.check_save_log.setChecked(True)
        log_layout.addWidget(self.check_save_log)
        
        self.check_save_history = QCheckBox("保存处理规则到历史")
        self.check_save_history.setChecked(True)
        log_layout.addWidget(self.check_save_history)
        
        layout.addWidget(log_group)
        layout.addStretch()
        
        return widget

    def _connect_signals(self):
        self.btn_add_files.clicked.connect(self._add_files)
        self.btn_add_folder.clicked.connect(self._add_folder)
        self.btn_clear_files.clicked.connect(self._clear_files)
        self.file_list.itemSelectionChanged.connect(self._on_file_selected)
        
        self.btn_update_preview.clicked.connect(self._update_rule_preview)
        self.btn_save_rule.clicked.connect(self._save_current_rule)
        self.btn_delete_rule.clicked.connect(self._delete_current_rule)
        self.combo_rules.currentIndexChanged.connect(self._on_rule_selected)
        
        self.btn_rotate_90.clicked.connect(lambda: self._set_rotation(90))
        self.btn_rotate_180.clicked.connect(lambda: self._set_rotation(180))
        self.btn_rotate_270.clicked.connect(lambda: self._set_rotation(270))
        self.btn_rotate_neg90.clicked.connect(lambda: self._set_rotation(-90))
        
        self.slider_quality.valueChanged.connect(self._on_quality_changed)
        self.slider_opacity.valueChanged.connect(self._on_opacity_changed)
        
        self.btn_color_picker.clicked.connect(self._pick_color)
        self.btn_browse_watermark.clicked.connect(self._browse_watermark_image)
        self.btn_browse_output.clicked.connect(self._browse_output_dir)
        
        self.btn_preview.clicked.connect(self._generate_preview)
        self.btn_start.clicked.connect(self._start_processing)
        self.btn_cancel.clicked.connect(self._cancel_processing)
        
        self.combo_preview_mode.currentIndexChanged.connect(self._update_preview_display)

    def _add_files(self):
        files, _ = QFileDialog.getOpenFileNames(
            self, "选择图片文件", "",
            "图片文件 (*.jpg *.jpeg *.png *.webp *.bmp *.tiff *.tif);;所有文件 (*)"
        )
        if files:
            for file in files:
                if file not in self.selected_images:
                    self.selected_images.append(file)
                    self.file_list.addItem(os.path.basename(file))
            self._update_file_count()

    def _add_folder(self):
        folder = QFileDialog.getExistingDirectory(self, "选择图片文件夹")
        if folder:
            images = self.image_processor.get_supported_images(folder)
            for img in images:
                if img not in self.selected_images:
                    self.selected_images.append(img)
                    self.file_list.addItem(os.path.basename(img))
            self._update_file_count()

    def _clear_files(self):
        self.selected_images.clear()
        self.file_list.clear()
        self._update_file_count()
        self.preview_label.setText("请选择图片文件并点击预览")

    def _update_file_count(self):
        self.label_file_count.setText(f"已选择: {len(self.selected_images)} 个文件")

    def _on_file_selected(self):
        current = self.file_list.currentRow()
        if 0 <= current < len(self.selected_images):
            self.preview_image_path = self.selected_images[current]

    def _load_saved_rules(self):
        self.combo_rules.clear()
        rules = self.database.get_all_rules()
        for rule in rules:
            self.combo_rules.addItem(rule.name, rule.id)

    def _on_rule_selected(self, index):
        if index < 0:
            return
        rule_id = self.combo_rules.currentData()
        if rule_id:
            rule = self.database.get_rule(rule_id)
            if rule:
                self.current_rule = rule
                self._populate_rule_ui(rule)

    def _populate_rule_ui(self, rule: RenameRule):
        self.check_use_sequence.setChecked(rule.use_sequence)
        self.spin_sequence_start.setValue(rule.sequence_start)
        self.spin_sequence_padding.setValue(rule.sequence_padding)
        self.edit_sequence_prefix.setText(rule.sequence_prefix)
        self.edit_sequence_suffix.setText(rule.sequence_suffix)
        
        self.check_use_date.setChecked(rule.use_date)
        if rule.date_format in [self.combo_date_format.itemText(i) for i in range(self.combo_date_format.count())]:
            self.combo_date_format.setCurrentText(rule.date_format)
        
        date_source_map = {
            "file_modified": "文件修改时间",
            "file_created": "文件创建时间",
            "exif_date_time": "EXIF 拍摄时间",
            "exif_original": "EXIF 原始时间"
        }
        if rule.date_source in date_source_map:
            self.combo_date_source.setCurrentText(date_source_map[rule.date_source])
        
        self.check_use_exif.setChecked(rule.use_exif)
        if rule.exif_fields:
            self.combo_exif_fields.setEditText(rule.exif_fields)
        
        self.check_use_custom_text.setChecked(rule.use_custom_text)
        self.edit_custom_text.setText(rule.custom_text)
        
        position_map = {"prefix": "前缀", "suffix": "后缀"}
        if rule.custom_text_position in position_map:
            self.combo_custom_position.setCurrentText(position_map[rule.custom_text_position])
        
        self.edit_separator.setText(rule.separator)
        
        self._update_rule_preview()

    def _collect_rule_from_ui(self) -> RenameRule:
        rule = RenameRule()
        
        rule.use_sequence = self.check_use_sequence.isChecked()
        rule.sequence_start = self.spin_sequence_start.value()
        rule.sequence_padding = self.spin_sequence_padding.value()
        rule.sequence_prefix = self.edit_sequence_prefix.text()
        rule.sequence_suffix = self.edit_sequence_suffix.text()
        
        rule.use_date = self.check_use_date.isChecked()
        rule.date_format = self.combo_date_format.currentText()
        
        date_source_map = {
            "文件修改时间": "file_modified",
            "文件创建时间": "file_created",
            "EXIF 拍摄时间": "exif_date_time",
            "EXIF 原始时间": "exif_original"
        }
        rule.date_source = date_source_map.get(self.combo_date_source.currentText(), "file_modified")
        
        rule.use_exif = self.check_use_exif.isChecked()
        rule.exif_fields = self.combo_exif_fields.currentText()
        
        rule.use_custom_text = self.check_use_custom_text.isChecked()
        rule.custom_text = self.edit_custom_text.text()
        
        position_map = {"前缀": "prefix", "后缀": "suffix"}
        rule.custom_text_position = position_map.get(self.combo_custom_position.currentText(), "prefix")
        
        rule.separator = self.edit_separator.text() or "_"
        
        return rule

    def _save_current_rule(self):
        text, ok = QFileDialog.getSaveFileName(self, "保存规则", "", "规则文件 (*.rule);;所有文件 (*)")
        if ok and text:
            rule_name = os.path.splitext(os.path.basename(text))[0]
        else:
            rule_name, ok = QInputDialog.getText(self, "规则名称", "请输入规则名称:")
            if not ok or not rule_name:
                return
        
        rule = self._collect_rule_from_ui()
        rule.name = rule_name
        rule.description = "保存的重命名规则"
        
        existing = self.database.get_rule_by_name(rule_name)
        if existing:
            reply = QMessageBox.question(
                self, "确认", f"规则 '{rule_name}' 已存在，是否覆盖？",
                QMessageBox.Yes | QMessageBox.No
            )
            if reply == QMessageBox.No:
                return
            rule.id = existing.id
        
        self.database.save_rule(rule)
        self._load_saved_rules()
        self.status_bar.showMessage(f"规则 '{rule_name}' 已保存")

    def _delete_current_rule(self):
        current_index = self.combo_rules.currentIndex()
        if current_index < 0:
            QMessageBox.warning(self, "提示", "请先选择要删除的规则")
            return
        
        rule_name = self.combo_rules.currentText()
        rule_id = self.combo_rules.currentData()
        
        reply = QMessageBox.question(
            self, "确认删除", f"确定要删除规则 '{rule_name}' 吗？",
            QMessageBox.Yes | QMessageBox.No, QMessageBox.No
        )
        
        if reply == QMessageBox.Yes:
            self.database.delete_rule(rule_id)
            self._load_saved_rules()
            self.status_bar.showMessage(f"规则 '{rule_name}' 已删除")

    def _update_rule_preview(self):
        rule = self._collect_rule_from_ui()
        engine = RuleEngine(rule)
        preview = engine.preview_example()
        self.label_rule_preview.setText(f"示例: {preview['final_example']}")

    def _set_rotation(self, angle: float):
        self.spin_rotate_angle.setValue(angle)

    def _on_quality_changed(self, value: int):
        self.label_quality.setText(f"{value}%")

    def _on_opacity_changed(self, value: int):
        self.label_opacity.setText(f"{value}%")

    def _pick_color(self):
        color = QColorDialog.getColor()
        if color.isValid():
            self.watermark_color = (color.red(), color.green(), color.blue())
            self.btn_color_picker.setStyleSheet(
                f"background-color: rgb({color.red()}, {color.green()}, {color.blue()});"
            )

    def _browse_watermark_image(self):
        file, _ = QFileDialog.getOpenFileName(
            self, "选择水印图片", "",
            "图片文件 (*.png *.jpg *.jpeg *.webp);;所有文件 (*)"
        )
        if file:
            self.edit_watermark_image.setText(file)

    def _browse_output_dir(self):
        folder = QFileDialog.getExistingDirectory(self, "选择输出目录")
        if folder:
            self.edit_output_dir.setText(folder)

    def _generate_preview(self):
        if not self.selected_images:
            QMessageBox.warning(self, "提示", "请先选择图片文件")
            return
        
        if self.preview_image_path and os.path.exists(self.preview_image_path):
            self._display_preview_image(self.preview_image_path)
        elif self.selected_images:
            self._display_preview_image(self.selected_images[0])

    def _display_preview_image(self, image_path: str):
        mode = self.combo_preview_mode.currentText()
        
        original_img = self.image_processor.load_image(image_path)
        if original_img is None:
            self.preview_label.setText("无法加载图片")
            return
        
        h, w = original_img.shape[:2]
        self.preview_info.setText(f"原始尺寸: {w}x{h} | 文件: {os.path.basename(image_path)}")
        
        if mode == "原始图片":
            display_img = original_img
        else:
            display_img = self._apply_processing(original_img)
        
        self._show_cv_image(display_img)

    def _apply_processing(self, img: np.ndarray) -> np.ndarray:
        result = img.copy()
        
        if self.check_resize_enabled.isChecked():
            width = self.spin_resize_width.value()
            height = self.spin_resize_height.value()
            keep_aspect = self.check_keep_aspect.isChecked()
            result = self.image_processor.resize(result, width, height, keep_aspect=keep_aspect)
        
        if self.check_crop_enabled.isChecked():
            x = self.spin_crop_x.value()
            y = self.spin_crop_y.value()
            width = self.spin_crop_width.value()
            height = self.spin_crop_height.value()
            result = self.image_processor.crop(result, x, y, width, height)
        
        if self.check_rotate_enabled.isChecked():
            angle = self.spin_rotate_angle.value()
            if angle != 0:
                result = self.image_processor.rotate(result, angle)
        
        if self.check_watermark_enabled.isChecked():
            if self.radio_text_watermark.isChecked():
                text = self.edit_watermark_text.text()
                position_map = {
                    "左上角": "top_left", "顶部居中": "top_center", "右上角": "top_right",
                    "左居中": "center_left", "居中": "center", "右居中": "center_right",
                    "左下角": "bottom_left", "底部居中": "bottom_center", "右下角": "bottom_right"
                }
                position = position_map.get(self.combo_watermark_position.currentText(), "bottom_right")
                opacity = self.slider_opacity.value() / 100.0
                font_size = self.spin_font_size.value()
                color = self.watermark_color
                
                result = self.watermark_service.add_text_watermark(
                    result, text, position, opacity,
                    font_size=font_size, color=color
                )
            else:
                watermark_path = self.edit_watermark_image.text()
                if watermark_path and os.path.exists(watermark_path):
                    watermark_img = self.image_processor.load_image(watermark_path, flags=cv2.IMREAD_UNCHANGED)
                    if watermark_img is not None:
                        position_map = {
                            "左上角": "top_left", "顶部居中": "top_center", "右上角": "top_right",
                            "左居中": "center_left", "居中": "center", "右居中": "center_right",
                            "左下角": "bottom_left", "底部居中": "bottom_center", "右下角": "bottom_right"
                        }
                        position = position_map.get(self.combo_watermark_position.currentText(), "bottom_right")
                        opacity = self.slider_opacity.value() / 100.0
                        size = self.spin_watermark_size.value()
                        
                        result = self.watermark_service.add_image_watermark(
                            result, watermark_img, position, opacity, size
                        )
        
        return result

    def _show_cv_image(self, img: np.ndarray):
        h, w = img.shape[:2]
        bytes_per_line = 3 * w
        
        if len(img.shape) == 3 and img.shape[2] == 4:
            q_img = QImage(img.data, w, h, bytes_per_line + w, QImage.Format_RGBA8888)
        elif len(img.shape) == 3:
            rgb_img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
            q_img = QImage(rgb_img.data, w, h, 3 * w, QImage.Format_RGB888)
        else:
            q_img = QImage(img.data, w, h, w, QImage.Format_Grayscale8)
        
        label_size = self.preview_label.size()
        pixmap = QPixmap.fromImage(q_img)
        scaled_pixmap = pixmap.scaled(
            label_size.width() - 20, label_size.height() - 20,
            Qt.KeepAspectRatio, Qt.SmoothTransformation
        )
        self.preview_label.setPixmap(scaled_pixmap)

    def _update_preview_display(self):
        if self.preview_image_path and os.path.exists(self.preview_image_path):
            self._display_preview_image(self.preview_image_path)

    def _collect_settings(self) -> Dict[str, Any]:
        settings = {}
        
        settings['rename_enabled'] = self.check_rename_enabled.isChecked()
        if settings['rename_enabled']:
            settings['rename_rule'] = self._collect_rule_from_ui()
            settings['current_index'] = 1
        
        settings['resize_enabled'] = self.check_resize_enabled.isChecked()
        settings['resize_width'] = self.spin_resize_width.value()
        settings['resize_height'] = self.spin_resize_height.value()
        settings['resize_keep_aspect'] = self.check_keep_aspect.isChecked()
        
        settings['crop_enabled'] = self.check_crop_enabled.isChecked()
        settings['crop_x'] = self.spin_crop_x.value()
        settings['crop_y'] = self.spin_crop_y.value()
        settings['crop_width'] = self.spin_crop_width.value()
        settings['crop_height'] = self.spin_crop_height.value()
        
        settings['rotate_enabled'] = self.check_rotate_enabled.isChecked()
        settings['rotate_angle'] = self.spin_rotate_angle.value()
        
        settings['format_enabled'] = self.check_format_enabled.isChecked()
        settings['output_format'] = self.combo_output_format.currentText()
        settings['output_quality'] = self.slider_quality.value()
        
        settings['watermark_enabled'] = self.check_watermark_enabled.isChecked()
        settings['watermark_type'] = 'text' if self.radio_text_watermark.isChecked() else 'image'
        settings['watermark_text'] = self.edit_watermark_text.text()
        settings['watermark_image_path'] = self.edit_watermark_image.text()
        
        position_map = {
            "左上角": "top_left", "顶部居中": "top_center", "右上角": "top_right",
            "左居中": "center_left", "居中": "center", "右居中": "center_right",
            "左下角": "bottom_left", "底部居中": "bottom_center", "右下角": "bottom_right"
        }
        settings['watermark_position'] = position_map.get(self.combo_watermark_position.currentText(), "bottom_right")
        settings['watermark_opacity'] = self.slider_opacity.value() / 100.0
        settings['watermark_size'] = self.spin_font_size.value() if settings['watermark_type'] == 'text' else self.spin_watermark_size.value()
        settings['watermark_color'] = self.watermark_color
        
        return settings

    def _start_processing(self):
        if not self.selected_images:
            QMessageBox.warning(self, "提示", "请先选择图片文件")
            return
        
        output_dir = self.edit_output_dir.text()
        if not output_dir:
            QMessageBox.warning(self, "提示", "请选择输出目录")
            return
        
        if not os.path.exists(output_dir):
            os.makedirs(output_dir, exist_ok=True)
        
        self.btn_start.setEnabled(False)
        self.btn_cancel.setEnabled(True)
        self.progress_bar.setVisible(True)
        self.progress_bar.setRange(0, len(self.selected_images))
        self.progress_bar.setValue(0)
        
        settings = self._collect_settings()
        
        self.worker = ProcessingWorker(self.selected_images, output_dir, settings)
        self.worker.progress.connect(self._on_process_progress)
        self.worker.finished.connect(self._on_process_finished)
        self.worker.error.connect(self._on_process_error)
        self.worker.start()

    def _on_process_progress(self, current: int, total: int, message: str):
        self.progress_bar.setValue(current)
        self.status_bar.showMessage(message)

    def _on_process_finished(self, success: int, failed: int):
        self.btn_start.setEnabled(True)
        self.btn_cancel.setEnabled(False)
        self.progress_bar.setVisible(False)
        
        self._load_history()
        
        if failed > 0:
            QMessageBox.information(
                self, "处理完成",
                f"处理完成！\n成功: {success} 个\n失败: {failed} 个"
            )
        else:
            QMessageBox.information(
                self, "处理完成",
                f"全部处理完成！共 {success} 个文件"
            )
        
        self.status_bar.showMessage(f"处理完成: {success} 成功, {failed} 失败")

    def _on_process_error(self, error_msg: str):
        self.status_bar.showMessage(f"错误: {error_msg}")

    def _cancel_processing(self):
        if self.worker and self.worker.isRunning():
            self.worker.cancel()
            self.worker.wait()
        self.btn_start.setEnabled(True)
        self.btn_cancel.setEnabled(False)
        self.progress_bar.setVisible(False)
        self.status_bar.showMessage("已取消")

    def _load_history(self):
        self.history_table.setRowCount(0)
        
        history = self.database.get_processing_history(limit=50)
        
        for row_idx, record in enumerate(history):
            self.history_table.insertRow(row_idx)
            
            self.history_table.setItem(row_idx, 0, QTableWidgetItem(str(record[1])))
            self.history_table.setItem(row_idx, 1, QTableWidgetItem(str(record[2]) if record[2] else ""))
            self.history_table.setItem(row_idx, 2, QTableWidgetItem(str(record[4])))
            self.history_table.setItem(row_idx, 3, QTableWidgetItem(str(record[5])))
            self.history_table.setItem(row_idx, 4, QTableWidgetItem(str(record[3]) if record[3] else ""))

    def closeEvent(self, event):
        if self.worker and self.worker.isRunning():
            self.worker.cancel()
            self.worker.wait()
        event.accept()
