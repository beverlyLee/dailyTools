#!/usr/bin/env python3
import sys
import os
from datetime import datetime, timedelta
from PyQt5.QtWidgets import (
    QApplication, QMainWindow, QWidget, QVBoxLayout, QHBoxLayout,
    QCalendarWidget, QListWidget, QListWidgetItem, QPushButton,
    QLabel, QFileDialog, QMessageBox, QSplitter, QGroupBox,
    QFormLayout, QLineEdit, QDialog, QDialogButtonBox, QTabWidget,
    QProgressDialog
)
from PyQt5.QtCore import Qt, QDate, QThread, pyqtSignal
from PyQt5.QtGui import QFont, QColor

from matplotlib.backends.backend_qt5agg import FigureCanvasQTAgg as FigureCanvas
from matplotlib.figure import Figure
import matplotlib.dates as mdates
import matplotlib.pyplot as plt

from dotenv import load_dotenv

from ..nutrition_db.database import (
    init_database, get_orders_by_date, get_daily_calories, save_order, get_connection
)
from ..nutrition_db.food_matcher import FoodMatcher, get_exercise_equivalent, get_daily_calories_goal, get_ai_nutrition_advice
from ..input.csv_importer import CSVImporter, create_sample_csv
from ..input.ocr_parser import OCRParser

plt.rcParams['font.sans-serif'] = ['SimHei', 'Arial Unicode MS', 'PingFang SC', 'Microsoft YaHei']
plt.rcParams['axes.unicode_minus'] = False
plt.rcParams['font.family'] = 'sans-serif'

class AIThread(QThread):
    finished = pyqtSignal(str)
    
    def __init__(self, daily_calories, goal_calories, food_items, api_key, endpoint=None, model=None, max_retries=2, timeout=20):
        super().__init__()
        self.daily_calories = daily_calories
        self.goal_calories = goal_calories
        self.food_items = food_items
        self.api_key = api_key
        self.endpoint = endpoint
        self.model = model
        self.max_retries = max_retries
        self.timeout = timeout
    
    def run(self):
        advice = get_ai_nutrition_advice(
            self.daily_calories,
            self.goal_calories,
            self.food_items,
            self.api_key,
            self.endpoint,
            self.model,
            self.max_retries,
            self.timeout
        )
        self.finished.emit(advice)

class MainWindow(QMainWindow):
    def __init__(self):
        super().__init__()
        load_dotenv()
        init_database()
        self.food_matcher = FoodMatcher()
        self.csv_importer = CSVImporter()
        self.ocr_parser = OCRParser()
        
        self.ark_api_key = os.getenv('ARK_API_KEY', '').strip()
        self.volc_endpoint = os.getenv('VOLCENGINE_ENDPOINT', 'https://ark.cn-beijing.volces.com/api/v3/chat/completions').strip()
        self.ark_model = os.getenv('ARK_MODEL', 'doubao-pro-32k').strip()
        self.ai_max_retries = int(os.getenv('AI_MAX_RETRIES', '2'))
        self.ai_timeout = int(os.getenv('AI_TIMEOUT', '20'))
        
        self.setWindowTitle("外卖营养分析器 - 健康饮食助手")
        self.setGeometry(100, 100, 1200, 800)
        
        self.init_ui()
        self.load_today_data()
    
    def init_ui(self):
        central_widget = QWidget()
        self.setCentralWidget(central_widget)
        
        main_layout = QVBoxLayout(central_widget)
        
        toolbar_layout = QHBoxLayout()
        self.btn_import_csv = QPushButton("导入CSV订单")
        self.btn_import_csv.clicked.connect(self.import_csv)
        self.btn_import_ocr = QPushButton("识别订单截图")
        self.btn_import_ocr.clicked.connect(self.import_ocr)
        self.btn_add_order = QPushButton("手动添加订单")
        self.btn_add_order.clicked.connect(self.add_order_manually)
        self.btn_sample = QPushButton("生成示例数据")
        self.btn_sample.clicked.connect(self.generate_sample_data)
        self.btn_ai_suggest = QPushButton("AI 饮食建议")
        self.btn_ai_suggest.clicked.connect(self.show_ai_suggestion)
        
        toolbar_layout.addWidget(self.btn_import_csv)
        toolbar_layout.addWidget(self.btn_import_ocr)
        toolbar_layout.addWidget(self.btn_add_order)
        toolbar_layout.addWidget(self.btn_sample)
        toolbar_layout.addWidget(self.btn_ai_suggest)
        toolbar_layout.addStretch()
        
        main_layout.addLayout(toolbar_layout)
        
        splitter = QSplitter(Qt.Horizontal)
        
        left_widget = QWidget()
        left_layout = QVBoxLayout(left_widget)
        
        calendar_group = QGroupBox("选择日期")
        calendar_layout = QVBoxLayout()
        self.calendar = QCalendarWidget()
        self.calendar.clicked.connect(self.on_date_changed)
        calendar_layout.addWidget(self.calendar)
        calendar_group.setLayout(calendar_layout)
        left_layout.addWidget(calendar_group)
        
        stats_group = QGroupBox("今日统计")
        stats_layout = QFormLayout()
        self.label_today_calories = QLabel("0 kcal")
        self.label_today_calories.setStyleSheet("font-size: 18px; font-weight: bold; color: #e74c3c;")
        self.label_goal = QLabel("0 kcal")
        self.label_status = QLabel("正常")
        stats_layout.addRow("今日摄入:", self.label_today_calories)
        stats_layout.addRow("目标摄入:", self.label_goal)
        stats_layout.addRow("营养状态:", self.label_status)
        stats_group.setLayout(stats_layout)
        left_layout.addWidget(stats_group)
        
        left_layout.addStretch()
        
        tab_widget = QTabWidget()
        
        orders_widget = QWidget()
        orders_layout = QVBoxLayout(orders_widget)
        orders_layout.addWidget(QLabel("当日订单列表:"))
        self.order_list = QListWidget()
        self.order_list.itemClicked.connect(self.on_order_clicked)
        orders_layout.addWidget(self.order_list)
        tab_widget.addTab(orders_widget, "当日订单")
        
        chart_widget = QWidget()
        chart_layout = QVBoxLayout(chart_widget)
        chart_layout.addWidget(QLabel("近期热量趋势:"))
        
        self.figure = Figure(figsize=(8, 4), dpi=100)
        self.canvas = FigureCanvas(self.figure)
        chart_layout.addWidget(self.canvas)
        
        tab_widget.addTab(chart_widget, "热量趋势")
        
        splitter.addWidget(left_widget)
        splitter.addWidget(tab_widget)
        splitter.setSizes([350, 850])
        
        main_layout.addWidget(splitter)
        
        self.status_bar = self.statusBar()
        self.status_label = QLabel("准备就绪")
        self.status_bar.addWidget(self.status_label)
        
        self.load_chart_data()
    
    def load_today_data(self):
        today = datetime.now().strftime('%Y-%m-%d')
        self.load_date_data(today)
        
        goal = get_daily_calories_goal()
        self.label_goal.setText(f"{goal['lose_weight']} kcal")
    
    def load_date_data(self, date_str):
        orders = get_orders_by_date(date_str)
        self.order_list.clear()
        
        total_calories = 0
        
        for order in orders:
            item_text = f"[{order['order_date']}] {order['restaurant_name']}\n"
            item_text += f"  菜品: {order['foods']}\n"
            item_text += f"  热量: {order['total_calories']:.0f} kcal  金额: ¥{order['total_price']:.2f}"
            
            item = QListWidgetItem(item_text)
            item.setData(Qt.UserRole, order)
            
            if order['total_calories'] > 800:
                item.setBackground(QColor(255, 235, 235))
            elif order['total_calories'] > 500:
                item.setBackground(QColor(255, 250, 230))
            
            self.order_list.addItem(item)
            total_calories += order['total_calories']
        
        self.label_today_calories.setText(f"{total_calories:.0f} kcal")
        self.status_label.setText(f"已加载 {len(orders)} 条订单，共 {total_calories:.0f} kcal")
        
        goal = get_daily_calories_goal()
        if total_calories > goal['tdee']:
            self.label_status.setText("⚠️ 超标")
            self.label_status.setStyleSheet("color: #e74c3c; font-weight: bold;")
        elif total_calories < goal['lose_weight']:
            self.label_status.setText("✅ 达标")
            self.label_status.setStyleSheet("color: #27ae60; font-weight: bold;")
        else:
            self.label_status.setText("ℹ️ 正常")
            self.label_status.setStyleSheet("color: #3498db; font-weight: bold;")
    
    def on_date_changed(self, date):
        date_str = date.toString('yyyy-MM-dd')
        self.load_date_data(date_str)
    
    def on_order_clicked(self, item):
        order = item.data(Qt.UserRole)
        
        calories = order['total_calories']
        exercises = get_exercise_equivalent(calories)
        
        exercise_text = "\n".join([f"  {k}: {v}" for k, v in exercises.items()])
        msg = f"订单详情:\n{order['foods']}\n\n"
        msg += f"总热量: {calories:.0f} kcal\n\n"
        msg += f"💡 消耗这些热量需要:\n{exercise_text}"
        
        QMessageBox.information(self, "订单营养分析", msg)
    
    def import_csv(self):
        file_path, _ = QFileDialog.getOpenFileName(
            self, "选择CSV文件", "", "CSV文件 (*.csv);;所有文件 (*.*)"
        )
        
        if file_path:
            try:
                is_valid, validate_msg = self.csv_importer.validate_csv(file_path)
                
                if not is_valid:
                    msgBox = QMessageBox(self)
                    msgBox.setWindowTitle("格式验证失败")
                    msgBox.setText(validate_msg)
                    msgBox.setIcon(QMessageBox.Warning)
                    msgBox.exec()
                    return
                
                msgBox = QMessageBox(self)
                msgBox.setWindowTitle("开始导入")
                msgBox.setText(f"{validate_msg}\n\n确定要导入这些订单数据吗？")
                msgBox.setInformativeText(self.csv_importer.get_parse_rules())
                msgBox.setStandardButtons(QMessageBox.Ok | QMessageBox.Cancel)
                msgBox.setDefaultButton(QMessageBox.Ok)
                msgBox.setIcon(QMessageBox.Information)
                
                if msgBox.exec() == QMessageBox.Ok:
                    saved, total = self.csv_importer.import_and_save(file_path)
                    QMessageBox.information(
                        self, "导入成功",
                        f"成功导入 {saved}/{total} 条订单数据！"
                    )
                    self.load_today_data()
                    self.load_chart_data()
                    
            except Exception as e:
                QMessageBox.critical(self, "导入失败", f"导入出错: {str(e)}")
    
    def import_ocr(self):
        if not self.ocr_parser.is_available():
            msgBox = QMessageBox(self)
            msgBox.setWindowTitle("OCR 不可用")
            msgBox.setText(self.ocr_parser.get_install_message())
            msgBox.setIcon(QMessageBox.Warning)
            msgBox.exec()
            return
        
        file_path, _ = QFileDialog.getOpenFileName(
            self, "选择订单截图", "",
            "图片文件 (*.png *.jpg *.jpeg *.bmp);;所有文件 (*.*)"
        )
        
        if file_path:
            try:
                result = self.ocr_parser.parse_image(file_path)
                if result:
                    items = []
                    for item in result['items']:
                        food_result = self.food_matcher.calculate_calories(
                            item['name'], quantity=item['quantity']
                        )
                        items.append({
                            'food_name': food_result['display_name'],
                            'quantity': item['quantity'],
                            'calories': food_result['total_calories'],
                            'protein': food_result.get('protein', 0),
                            'fat': food_result.get('fat', 0),
                            'carbs': food_result.get('carbs', 0),
                        })
                    
                    save_order(
                        result['order_date'],
                        'OCR识别',
                        result['restaurant_name'],
                        result['total_price'],
                        items
                    )
                    
                    QMessageBox.information(
                        self, "识别成功",
                        f"成功识别并保存订单！\n商家: {result['restaurant_name']}\n"
                        f"菜品数量: {len(items)}"
                    )
                    self.load_today_data()
                    self.load_chart_data()
                else:
                    QMessageBox.warning(self, "识别失败", "未能识别订单内容，请确保截图清晰，包含菜品名称和商家信息")
            except Exception as e:
                QMessageBox.critical(self, "识别出错", f"OCR识别出错: {str(e)}")
    
    def add_order_manually(self):
        dialog = QDialog(self)
        dialog.setWindowTitle("手动添加订单")
        dialog.setMinimumWidth(400)
        
        layout = QFormLayout(dialog)
        
        date_edit = QLineEdit(datetime.now().strftime('%Y-%m-%d'))
        restaurant_edit = QLineEdit()
        food_edit = QLineEdit()
        price_edit = QLineEdit()
        
        layout.addRow("订单日期:", date_edit)
        layout.addRow("商家名称:", restaurant_edit)
        layout.addRow("菜品名称(用逗号分隔):", food_edit)
        layout.addRow("价格:", price_edit)
        
        buttons = QDialogButtonBox(
            QDialogButtonBox.Ok | QDialogButtonBox.Cancel
        )
        buttons.accepted.connect(dialog.accept)
        buttons.rejected.connect(dialog.reject)
        layout.addRow(buttons)
        
        if dialog.exec_() == QDialog.Accepted:
            food_names = [n.strip() for n in food_edit.text().split(',') if n.strip()]
            items = []
            
            for name in food_names:
                food_result = self.food_matcher.calculate_calories(name, quantity=1)
                items.append({
                    'food_name': food_result['display_name'],
                    'quantity': 1,
                    'calories': food_result['total_calories'],
                    'protein': food_result.get('protein', 0),
                    'fat': food_result.get('fat', 0),
                    'carbs': food_result.get('carbs', 0),
                })
            
            try:
                price = float(price_edit.text()) if price_edit.text() else 0.0
            except:
                price = 0.0
            
            save_order(
                date_edit.text(),
                '手动添加',
                restaurant_edit.text() or '未知商家',
                price,
                items
            )
            
            QMessageBox.information(self, "添加成功", "订单已添加！")
            self.load_today_data()
            self.load_chart_data()
    
    def generate_sample_data(self):
        try:
            sample_path = os.path.join(
                os.path.dirname(os.path.dirname(os.path.dirname(__file__))),
                'data', 'sample_orders.csv'
            )
            create_sample_csv(sample_path)
            saved, total = self.csv_importer.import_and_save(sample_path)
            
            QMessageBox.information(
                self, "生成成功",
                f"已生成示例数据并导入 {saved}/{total} 条订单！\n"
                f"示例文件位置: {sample_path}"
            )
            
            self.load_today_data()
            self.load_chart_data()
        except Exception as e:
            QMessageBox.critical(self, "生成失败", f"出错: {str(e)}")
    
    def get_today_food_items(self, date_str):
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("""
            SELECT oi.food_name
            FROM orders o
            JOIN order_items oi ON o.id = oi.order_id
            WHERE o.order_date = ?
        """, (date_str,))
        items = [row[0] for row in cursor.fetchall()]
        conn.close()
        return items
    
    def show_ai_suggestion(self):
        today = datetime.now().strftime('%Y-%m-%d')
        orders = get_orders_by_date(today)
        total_calories = sum(o['total_calories'] for o in orders)
        food_items = self.get_today_food_items(today)
        
        goal = get_daily_calories_goal()
        
        has_api_key = (
            self.ark_api_key and 
            self.ark_api_key.strip() != '' and 
            self.ark_api_key != 'your_ark_api_key_here' and
            len(self.ark_api_key) > 10
        )
        
        has_data = total_calories > 0 and len(food_items) > 0
        
        if not has_data:
            advice = """ℹ️  今日暂无饮食记录

请添加外卖订单后，再次获取AI饮食建议！

💡 提示:
  • 可以通过CSV导入历史订单
  • 可以通过OCR识别订单截图
  • 也可以手动添加当日订单
"""
            QMessageBox.information(self, "AI 饮食建议", advice)
            return
        
        if not has_api_key:
            advice = f"""⚠️ 未配置 ARK_API_KEY

当前使用本地内置建议引擎。

📊 今日摄入: {total_calories:.0f} kcal
🎯 减重目标: {goal['lose_weight']:.0f} kcal
📋 今日食物: {', '.join(food_items[:5])}{'...' if len(food_items) > 5 else ''}

💡 如需更个性化的AI饮食建议，请:
  1. 在火山引擎申请API密钥
  2. 将密钥配置到 .env 文件的 ARK_API_KEY 字段

当前配置:
  ARK_API_KEY: {'已配置' if self.ark_api_key else '未配置'}
  ARK_MODEL: {self.ark_model}
  Endpoint: {self.volc_endpoint}
"""
            QMessageBox.information(self, "AI 饮食建议", advice)
            return
        
        progress = QProgressDialog(f"正在获取AI饮食建议... (超时: {self.ai_timeout}秒, 重试: {self.ai_max_retries}次)", "取消", 0, 0, self)
        progress.setWindowModality(Qt.WindowModal)
        progress.show()
        
        self.ai_thread = AIThread(
            total_calories,
            goal['lose_weight'],
            food_items,
            self.ark_api_key,
            self.volc_endpoint,
            self.ark_model,
            self.ai_max_retries,
            self.ai_timeout
        )
        
        def on_ai_finished(advice):
            progress.close()
            QMessageBox.information(self, "AI 饮食建议", advice)
        
        self.ai_thread.finished.connect(on_ai_finished)
        self.ai_thread.start()
    
    def load_chart_data(self):
        end_date = datetime.now()
        start_date = end_date - timedelta(days=14)
        
        start_str = start_date.strftime('%Y-%m-%d')
        end_str = end_date.strftime('%Y-%m-%d')
        
        data = get_daily_calories(start_str, end_str)
        
        goal = get_daily_calories_goal()
        
        self.figure.clear()
        ax = self.figure.add_subplot(111)
        
        all_dates = []
        calories_list = []
        current = start_date
        while current <= end_date:
            date_str = current.strftime('%Y-%m-%d')
            all_dates.append(current)
            
            calories = 0
            for d in data:
                if d['order_date'] == date_str:
                    calories = d['total_calories']
                    break
            calories_list.append(calories)
            
            current += timedelta(days=1)
        
        ax.plot(all_dates, calories_list, 'o-', label='实际摄入', color='#3498db', linewidth=2)
        ax.axhline(y=goal['lose_weight'], color='#e74c3c', linestyle='--', 
                  label=f"目标({goal['lose_weight']} kcal)")
        
        ax.set_title('每日摄入热量趋势 (kcal)', fontsize=14, pad=20)
        ax.set_xlabel('日期', fontsize=11)
        ax.set_ylabel('热量 (kcal)', fontsize=11)
        ax.legend(loc='upper right')
        ax.grid(True, alpha=0.3)
        
        ax.xaxis.set_major_formatter(mdates.DateFormatter('%m-%d'))
        ax.xaxis.set_major_locator(mdates.DayLocator(interval=2))
        
        self.figure.tight_layout()
        self.canvas.draw()

if __name__ == '__main__':
    app = QApplication(sys.argv)
    window = MainWindow()
    window.show()
    sys.exit(app.exec_())
