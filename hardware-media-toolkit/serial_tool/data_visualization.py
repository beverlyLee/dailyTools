import sys
from collections import deque
from datetime import datetime
from PyQt6.QtCore import Qt, QTimer, pyqtSignal, QObject
from PyQt6.QtWidgets import QWidget, QVBoxLayout, QHBoxLayout, QLabel, QComboBox, QPushButton, QSpinBox, QCheckBox

from matplotlib.backends.backend_qt5agg import FigureCanvasQTAgg as FigureCanvas
from matplotlib.figure import Figure
import matplotlib.pyplot as plt

from utils.helpers import parse_numeric_data

class DataVisualizer(QObject):
    data_updated = pyqtSignal()
    
    def __init__(self, max_points=1000):
        super().__init__()
        self.max_points = max_points
        self.time_axis = deque(maxlen=max_points)
        self.channels = {}
        self.start_time = None
    
    def add_data(self, data, timestamp=None):
        if timestamp is None:
            timestamp = datetime.now()
        
        if self.start_time is None:
            self.start_time = timestamp
        
        elapsed = (timestamp - self.start_time).total_seconds()
        
        numbers = parse_numeric_data(data)
        if not numbers:
            return
        
        self.time_axis.append(elapsed)
        
        for i, value in enumerate(numbers):
            channel_name = f"Channel_{i+1}"
            if channel_name not in self.channels:
                self.channels[channel_name] = deque(maxlen=self.max_points)
            
            while len(self.channels[channel_name]) < len(self.time_axis) - 1:
                self.channels[channel_name].append(None)
            
            self.channels[channel_name].append(value)
        
        for name in self.channels:
            while len(self.channels[name]) < len(self.time_axis):
                self.channels[name].append(None)
        
        self.data_updated.emit()
    
    def get_channel_data(self, channel_name):
        if channel_name not in self.channels:
            return [], []
        
        times = []
        values = []
        for t, v in zip(self.time_axis, self.channels[channel_name]):
            if v is not None:
                times.append(t)
                values.append(v)
        
        return times, values
    
    def get_channel_names(self):
        return list(self.channels.keys())
    
    def clear(self):
        self.time_axis.clear()
        self.channels.clear()
        self.start_time = None
        self.data_updated.emit()
    
    def set_max_points(self, max_points):
        self.max_points = max_points
        self.time_axis = deque(maxlen=max_points)
        for name in self.channels:
            self.channels[name] = deque(self.channels[name], maxlen=max_points)

class PlotCanvas(FigureCanvas):
    def __init__(self, parent=None, width=5, height=4, dpi=100):
        self.fig = Figure(figsize=(width, height), dpi=dpi)
        self.axes = self.fig.add_subplot(111)
        super().__init__(self.fig)
        self.setParent(parent)
        
        self.axes.set_xlabel('Time (s)')
        self.axes.set_ylabel('Value')
        self.axes.grid(True, alpha=0.3)
        self.fig.tight_layout()
        
        self.lines = {}
        self.colors = plt.cm.tab10.colors
    
    def update_plot(self, visualizer, selected_channels=None):
        self.axes.clear()
        self.axes.set_xlabel('Time (s)')
        self.axes.set_ylabel('Value')
        self.axes.grid(True, alpha=0.3)
        
        if selected_channels is None:
            selected_channels = visualizer.get_channel_names()
        
        for i, channel in enumerate(selected_channels):
            times, values = visualizer.get_channel_data(channel)
            if times and values:
                color = self.colors[i % len(self.colors)]
                self.axes.plot(times, values, label=channel, color=color, linewidth=1.0)
        
        if selected_channels:
            self.axes.legend(loc='upper left', fontsize=8)
        
        self.axes.relim()
        self.axes.autoscale_view()
        self.draw()

class VisualizationWidget(QWidget):
    def __init__(self, visualizer=None):
        super().__init__()
        self.visualizer = visualizer if visualizer else DataVisualizer()
        self.init_ui()
        
        self.update_timer = QTimer()
        self.update_timer.timeout.connect(self._update_plot)
        self.update_timer.start(100)
    
    def init_ui(self):
        layout = QVBoxLayout(self)
        
        control_layout = QHBoxLayout()
        
        control_layout.addWidget(QLabel("显示通道:"))
        self.channel_combo = QComboBox()
        self.channel_combo.addItem("全部通道")
        self.channel_combo.currentTextChanged.connect(self._on_channel_changed)
        control_layout.addWidget(self.channel_combo)
        
        control_layout.addWidget(QLabel("最大点数:"))
        self.points_spin = QSpinBox()
        self.points_spin.setRange(100, 10000)
        self.points_spin.setValue(1000)
        self.points_spin.valueChanged.connect(self._on_points_changed)
        control_layout.addWidget(self.points_spin)
        
        self.auto_scale_check = QCheckBox("自动缩放")
        self.auto_scale_check.setChecked(True)
        control_layout.addWidget(self.auto_scale_check)
        
        self.clear_btn = QPushButton("清空图表")
        self.clear_btn.clicked.connect(self._clear_plot)
        control_layout.addWidget(self.clear_btn)
        
        control_layout.addStretch()
        layout.addLayout(control_layout)
        
        self.plot_canvas = PlotCanvas(self, width=8, height=5)
        layout.addWidget(self.plot_canvas)
        
        self.selected_channel = None
    
    def add_data(self, data, timestamp=None):
        self.visualizer.add_data(data, timestamp)
        self._update_channel_list()
    
    def _update_channel_list(self):
        channels = self.visualizer.get_channel_names()
        current_text = self.channel_combo.currentText()
        
        self.channel_combo.blockSignals(True)
        self.channel_combo.clear()
        self.channel_combo.addItem("全部通道")
        for ch in channels:
            self.channel_combo.addItem(ch)
        
        index = self.channel_combo.findText(current_text)
        if index >= 0:
            self.channel_combo.setCurrentIndex(index)
        self.channel_combo.blockSignals(False)
    
    def _on_channel_changed(self, text):
        if text == "全部通道":
            self.selected_channel = None
        else:
            self.selected_channel = text
    
    def _on_points_changed(self, value):
        self.visualizer.set_max_points(value)
    
    def _clear_plot(self):
        self.visualizer.clear()
        self.channel_combo.clear()
        self.channel_combo.addItem("全部通道")
        self.plot_canvas.update_plot(self.visualizer)
    
    def _update_plot(self):
        channels = None
        if self.selected_channel:
            channels = [self.selected_channel]
        self.plot_canvas.update_plot(self.visualizer, channels)
