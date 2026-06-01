import tkinter as tk
from tkinter import ttk, messagebox, simpledialog
from datetime import datetime, timedelta
import threading
from typing import Optional

from inventory.database import MedicineDatabase
from scanner.barcode_scanner import BarcodeScanner


class MedicineManagerUI:
    def __init__(self, root: tk.Tk):
        self.root = root
        self.root.title("家庭药品管理系统")
        self.root.geometry("1000x700")
        
        self.db = MedicineDatabase()
        self.scanner = BarcodeScanner()
        
        self._setup_ui()
        self._check_expired_on_startup()
        self._refresh_medicine_list()

    def _setup_ui(self) -> None:
        main_frame = ttk.Frame(self.root, padding="10")
        main_frame.grid(row=0, column=0, sticky=(tk.W, tk.E, tk.N, tk.S))
        
        self.root.columnconfigure(0, weight=1)
        self.root.rowconfigure(0, weight=1)
        main_frame.columnconfigure(1, weight=1)
        main_frame.rowconfigure(1, weight=1)
        
        title_label = ttk.Label(
            main_frame, 
            text="💊 家庭药品管理系统", 
            font=('Arial', 20, 'bold')
        )
        title_label.grid(row=0, column=0, columnspan=2, pady=(0, 20))
        
        button_frame = ttk.Frame(main_frame)
        button_frame.grid(row=1, column=0, sticky=(tk.W, tk.E, tk.N), padx=(0, 10))
        
        self.scan_button = ttk.Button(
            button_frame, 
            text="📷 扫码添加药品", 
            command=self._start_barcode_scan,
            style='Accent.TButton'
        )
        self.scan_button.pack(fill=tk.X, pady=5)
        
        self.add_button = ttk.Button(
            button_frame, 
            text="➕ 手动添加药品", 
            command=self._show_add_dialog
        )
        self.add_button.pack(fill=tk.X, pady=5)
        
        self.edit_button = ttk.Button(
            button_frame, 
            text="✏️ 编辑选中药品", 
            command=self._show_edit_dialog
        )
        self.edit_button.pack(fill=tk.X, pady=5)
        
        self.delete_button = ttk.Button(
            button_frame, 
            text="🗑️ 删除选中药品", 
            command=self._delete_selected_medicine
        )
        self.delete_button.pack(fill=tk.X, pady=5)
        
        self.refresh_button = ttk.Button(
            button_frame, 
            text="🔄 刷新列表", 
            command=self._refresh_medicine_list
        )
        self.refresh_button.pack(fill=tk.X, pady=5)
        
        status_frame = ttk.LabelFrame(button_frame, text="📊 库存统计", padding="10")
        status_frame.pack(fill=tk.X, pady=20)
        
        self.total_label = ttk.Label(status_frame, text="药品总数: 0")
        self.total_label.pack(anchor=tk.W, pady=2)
        
        self.expired_label = ttk.Label(status_frame, text="❌ 已过期: 0", foreground='red')
        self.expired_label.pack(anchor=tk.W, pady=2)
        
        self.soon_label = ttk.Label(status_frame, text="⚠️ 即将过期: 0", foreground='orange')
        self.soon_label.pack(anchor=tk.W, pady=2)
        
        list_frame = ttk.Frame(main_frame)
        list_frame.grid(row=1, column=1, sticky=(tk.W, tk.E, tk.N, tk.S))
        list_frame.columnconfigure(0, weight=1)
        list_frame.rowconfigure(0, weight=1)
        
        columns = ('name', 'barcode', 'manufacturer', 'expiry_date', 'quantity', 'status')
        self.tree = ttk.Treeview(list_frame, columns=columns, show='headings', height=20)
        
        self.tree.heading('name', text='药品名称')
        self.tree.heading('barcode', text='条码')
        self.tree.heading('manufacturer', text='生产厂家')
        self.tree.heading('expiry_date', text='有效期')
        self.tree.heading('quantity', text='数量')
        self.tree.heading('status', text='状态')
        
        self.tree.column('name', width=200)
        self.tree.column('barcode', width=120)
        self.tree.column('manufacturer', width=150)
        self.tree.column('expiry_date', width=100)
        self.tree.column('quantity', width=60)
        self.tree.column('status', width=100)
        
        scrollbar = ttk.Scrollbar(list_frame, orient=tk.VERTICAL, command=self.tree.yview)
        self.tree.configure(yscrollcommand=scrollbar.set)
        
        self.tree.grid(row=0, column=0, sticky=(tk.W, tk.E, tk.N, tk.S))
        scrollbar.grid(row=0, column=1, sticky=(tk.N, tk.S))

    def _check_expired_on_startup(self) -> None:
        expired_count, soon_count = self.db.get_expiry_count()
        if expired_count > 0:
            messagebox.showwarning(
                "过期提醒", 
                f"⚠️ 发现 {expired_count} 个过期物品！\n请及时处理。"
            )

    def _refresh_medicine_list(self) -> None:
        for item in self.tree.get_children():
            self.tree.delete(item)
        
        medicines = self.db.get_all_medicines()
        
        for med in medicines:
            status = self.db.check_expiry_status(med['expiry_date'])
            status_text = self._get_status_text(status)
            
            values = (
                med['name'],
                med['barcode'],
                med['manufacturer'],
                med['expiry_date'],
                med['quantity'],
                status_text
            )
            
            item = self.tree.insert('', tk.END, values=values)
            
            if status == 'expired':
                self.tree.tag_configure('expired', background='#ffcccc')
                self.tree.item(item, tags=('expired',))
            elif status == 'critical':
                self.tree.tag_configure('critical', background='#ffe066')
                self.tree.item(item, tags=('critical',))
            elif status == 'warning':
                self.tree.tag_configure('warning', background='#fff3cd')
                self.tree.item(item, tags=('warning',))
        
        self._update_status_labels()

    def _get_status_text(self, status: str) -> str:
        status_map = {
            'expired': '❌ 已过期',
            'critical': '⚠️ 7天内',
            'warning': '⚡ 30天内',
            'normal': '✅ 正常'
        }
        return status_map.get(status, '未知')

    def _update_status_labels(self) -> None:
        medicines = self.db.get_all_medicines()
        expired = self.db.get_expired_medicines()
        soon = self.db.get_soon_expired_medicines()
        
        self.total_label.config(text=f"药品总数: {len(medicines)}")
        self.expired_label.config(text=f"❌ 已过期: {len(expired)}")
        self.soon_label.config(text=f"⚠️ 即将过期: {len(soon)}")

    def _start_barcode_scan(self) -> None:
        if not self.scanner.is_available():
            self._show_zbar_unavailable_dialog()
            return

        self.scan_button.config(state=tk.DISABLED)
        self.scan_button.config(text="📷 扫描中...")
        self.root.update()
        
        def scan_thread():
            result = None
            error_message = None
            try:
                result = self.scanner.start_scanner(self._on_barcode_scanned)
            except Exception as e:
                error_message = str(e)
            except:
                error_message = "扫描过程中发生未知错误"
            self.root.after(0, lambda: self._handle_scan_result(result, error_message))
        
        threading.Thread(target=scan_thread, daemon=True).start()

    def _handle_scan_result(self, result: Optional[str], error_message: Optional[str] = None) -> None:
        self._enable_scan_button()
        
        if error_message:
            result = messagebox.askyesno(
                "扫描遇到问题",
                f"条码扫描遇到问题：{error_message}\n\n是否切换到手动输入条码模式？"
            )
            if result:
                self._show_add_dialog('')
        elif result is None and self.scanner.is_available():
            result = messagebox.askyesno(
                "扫描提示",
                "未识别到条码。\n\n是否切换到手动输入条码模式？"
            )
            if result:
                self._show_add_dialog('')

    def _enable_scan_button(self) -> None:
        self.scan_button.config(state=tk.NORMAL)
        self.scan_button.config(text="📷 扫码添加药品")

    def _show_zbar_unavailable_dialog(self) -> None:
        dialog = tk.Toplevel(self.root)
        dialog.transient(self.root)
        dialog.grab_set()

        if self.scanner.opencv_barcode_available:
            dialog.title("条码扫描 - 提示")
            dialog.geometry("600x450")
            info_text = """💡 条码扫描功能可用

当前使用：OpenCV内置条码识别

注意事项：
  • 识别率可能稍低，请确保条码清晰
  • 确保光线充足
  • 将条码对准摄像头中央
  • 保持适当距离（约10-20厘米）
  • 按 ESC 键可取消扫描

提升识别率（可选）：
  安装 zbar 可获得更好的识别效果：

  1. macOS:
     brew install zbar

  2. Ubuntu/Debian:
     sudo apt-get install libzbar0

可选择直接继续扫描，或切换到手动输入。"""
        else:
            dialog.title("条码扫描不可用")
            dialog.geometry("550x400")
            info_text = """⚠️ 条码扫描功能不可用

原因：缺少条码识别依赖。

解决方法（可选）：
  1. 安装 OpenCV Python 包
  2. 或安装 zbar 共享库 + pyzbar

备选方案：
  可以手动输入条码号继续使用。"""

        text_widget = tk.Text(dialog, wrap=tk.WORD, padx=20, pady=20, height=17)
        text_widget.pack(fill=tk.BOTH, expand=True)
        text_widget.insert(tk.END, info_text)
        text_widget.config(state=tk.DISABLED)

        button_frame = ttk.Frame(dialog)
        button_frame.pack(fill=tk.X, padx=20, pady=10)

        def continue_scan():
            dialog.destroy()
            self._continue_scan_with_opencv()

        def manual_input():
            dialog.destroy()
            self._show_add_dialog('')

        if self.scanner.opencv_barcode_available:
            ttk.Button(button_frame, text="继续扫描", command=continue_scan).pack(side=tk.LEFT, padx=5)
        ttk.Button(button_frame, text="手动输入条码", command=manual_input).pack(side=tk.LEFT, padx=5)
        ttk.Button(button_frame, text="关闭", command=dialog.destroy).pack(side=tk.LEFT, padx=5)

    def _continue_scan_with_opencv(self) -> None:
        """直接使用OpenCV进行条码扫描"""
        self.scan_button.config(state=tk.DISABLED)
        self.scan_button.config(text="📷 扫描中...")
        self.root.update()
        
        def scan_thread():
            result = None
            error_message = None
            try:
                result = self.scanner.start_scanner(self._on_barcode_scanned)
            except Exception as e:
                error_message = str(e)
            except:
                error_message = "扫描过程中发生未知错误"
            self.root.after(0, lambda: self._handle_scan_result(result, error_message))
        
        threading.Thread(target=scan_thread, daemon=True).start()

    def _on_barcode_scanned(self, barcode: str) -> None:
        existing = self.db.get_medicine_by_barcode(barcode)
        
        if existing:
            result = messagebox.askyesno(
                "药品已存在",
                f"条码 {barcode} 对应的药品已存在：\n"
                f"药品名称：{existing['name']}\n"
                f"当前数量：{existing['quantity']}\n\n"
                f"是否增加数量？"
            )
            if result:
                new_qty = existing['quantity'] + 1
                self.db.update_quantity(barcode, new_qty)
                self._refresh_medicine_list()
                messagebox.showinfo("成功", f"数量已更新为：{new_qty}")
        else:
            self._show_add_dialog(barcode)

    def _show_add_dialog(self, barcode: str = '') -> None:
        dialog = tk.Toplevel(self.root)
        dialog.title("添加药品")
        dialog.geometry("450x400")
        dialog.transient(self.root)
        dialog.grab_set()
        
        ttk.Label(dialog, text="药品名称:").grid(row=0, column=0, padx=10, pady=10, sticky=tk.W)
        name_entry = ttk.Entry(dialog, width=30)
        name_entry.grid(row=0, column=1, padx=10, pady=10)
        
        ttk.Label(dialog, text="条码:").grid(row=1, column=0, padx=10, pady=10, sticky=tk.W)
        barcode_entry = ttk.Entry(dialog, width=30)
        barcode_entry.grid(row=1, column=1, padx=10, pady=10)
        if barcode:
            barcode_entry.insert(0, barcode)
        
        ttk.Label(dialog, text="生产厂家:").grid(row=2, column=0, padx=10, pady=10, sticky=tk.W)
        manufacturer_entry = ttk.Entry(dialog, width=30)
        manufacturer_entry.grid(row=2, column=1, padx=10, pady=10)
        
        ttk.Label(dialog, text="有效期 (YYYY-MM-DD):").grid(row=3, column=0, padx=10, pady=10, sticky=tk.W)
        expiry_entry = ttk.Entry(dialog, width=30)
        expiry_entry.grid(row=3, column=1, padx=10, pady=10)
        default_date = (datetime.now() + timedelta(days=365)).strftime('%Y-%m-%d')
        expiry_entry.insert(0, default_date)
        
        ttk.Label(dialog, text="数量:").grid(row=4, column=0, padx=10, pady=10, sticky=tk.W)
        quantity_entry = ttk.Entry(dialog, width=30)
        quantity_entry.grid(row=4, column=1, padx=10, pady=10)
        quantity_entry.insert(0, '1')
        
        ttk.Label(dialog, text="备注:").grid(row=5, column=0, padx=10, pady=10, sticky=tk.W)
        notes_entry = ttk.Entry(dialog, width=30)
        notes_entry.grid(row=5, column=1, padx=10, pady=10)
        
        def save():
            name = name_entry.get().strip()
            barcode_val = barcode_entry.get().strip()
            manufacturer = manufacturer_entry.get().strip()
            expiry_date = expiry_entry.get().strip()
            quantity = quantity_entry.get().strip()
            notes = notes_entry.get().strip()
            
            if not name or not barcode_val or not expiry_date or not quantity:
                messagebox.showerror("错误", "请填写所有必填字段！")
                return
            
            try:
                int(quantity)
            except ValueError:
                messagebox.showerror("错误", "数量必须是数字！")
                return
            
            try:
                datetime.strptime(expiry_date, '%Y-%m-%d')
            except ValueError:
                messagebox.showerror("错误", "日期格式错误，请使用 YYYY-MM-DD 格式！")
                return
            
            if self.db.add_medicine(barcode_val, name, expiry_date, manufacturer, int(quantity), notes):
                messagebox.showinfo("成功", "药品添加成功！")
                self._refresh_medicine_list()
                dialog.destroy()
            else:
                messagebox.showerror("错误", "添加失败，请重试！")
        
        button_frame = ttk.Frame(dialog)
        button_frame.grid(row=6, column=0, columnspan=2, pady=20)
        
        ttk.Button(button_frame, text="保存", command=save).pack(side=tk.LEFT, padx=10)
        ttk.Button(button_frame, text="取消", command=dialog.destroy).pack(side=tk.LEFT, padx=10)

    def _show_edit_dialog(self) -> None:
        selected = self.tree.selection()
        if not selected:
            messagebox.showwarning("提示", "请先选择要编辑的药品！")
            return
        
        item = self.tree.item(selected[0])
        barcode = item['values'][1]
        
        medicine = self.db.get_medicine_by_barcode(barcode)
        if not medicine:
            messagebox.showerror("错误", "未找到该药品！")
            return
        
        dialog = tk.Toplevel(self.root)
        dialog.title("编辑药品")
        dialog.geometry("450x400")
        dialog.transient(self.root)
        dialog.grab_set()
        
        ttk.Label(dialog, text="药品名称:").grid(row=0, column=0, padx=10, pady=10, sticky=tk.W)
        name_entry = ttk.Entry(dialog, width=30)
        name_entry.grid(row=0, column=1, padx=10, pady=10)
        name_entry.insert(0, medicine['name'])
        
        ttk.Label(dialog, text="条码:").grid(row=1, column=0, padx=10, pady=10, sticky=tk.W)
        barcode_entry = ttk.Entry(dialog, width=30)
        barcode_entry.grid(row=1, column=1, padx=10, pady=10)
        barcode_entry.insert(0, medicine['barcode'])
        barcode_entry.config(state='readonly')
        
        ttk.Label(dialog, text="生产厂家:").grid(row=2, column=0, padx=10, pady=10, sticky=tk.W)
        manufacturer_entry = ttk.Entry(dialog, width=30)
        manufacturer_entry.grid(row=2, column=1, padx=10, pady=10)
        manufacturer_entry.insert(0, medicine['manufacturer'])
        
        ttk.Label(dialog, text="有效期 (YYYY-MM-DD):").grid(row=3, column=0, padx=10, pady=10, sticky=tk.W)
        expiry_entry = ttk.Entry(dialog, width=30)
        expiry_entry.grid(row=3, column=1, padx=10, pady=10)
        expiry_entry.insert(0, medicine['expiry_date'])
        
        ttk.Label(dialog, text="数量:").grid(row=4, column=0, padx=10, pady=10, sticky=tk.W)
        quantity_entry = ttk.Entry(dialog, width=30)
        quantity_entry.grid(row=4, column=1, padx=10, pady=10)
        quantity_entry.insert(0, str(medicine['quantity']))
        
        ttk.Label(dialog, text="备注:").grid(row=5, column=0, padx=10, pady=10, sticky=tk.W)
        notes_entry = ttk.Entry(dialog, width=30)
        notes_entry.grid(row=5, column=1, padx=10, pady=10)
        notes_entry.insert(0, medicine['notes'] or '')
        
        def save():
            name = name_entry.get().strip()
            manufacturer = manufacturer_entry.get().strip()
            expiry_date = expiry_entry.get().strip()
            quantity = quantity_entry.get().strip()
            notes = notes_entry.get().strip()
            
            if not name or not expiry_date or not quantity:
                messagebox.showerror("错误", "请填写所有必填字段！")
                return
            
            try:
                int(quantity)
            except ValueError:
                messagebox.showerror("错误", "数量必须是数字！")
                return
            
            try:
                datetime.strptime(expiry_date, '%Y-%m-%d')
            except ValueError:
                messagebox.showerror("错误", "日期格式错误，请使用 YYYY-MM-DD 格式！")
                return
            
            if self.db.add_medicine(barcode, name, expiry_date, manufacturer, int(quantity), notes):
                messagebox.showinfo("成功", "药品更新成功！")
                self._refresh_medicine_list()
                dialog.destroy()
            else:
                messagebox.showerror("错误", "更新失败，请重试！")
        
        button_frame = ttk.Frame(dialog)
        button_frame.grid(row=6, column=0, columnspan=2, pady=20)
        
        ttk.Button(button_frame, text="保存", command=save).pack(side=tk.LEFT, padx=10)
        ttk.Button(button_frame, text="取消", command=dialog.destroy).pack(side=tk.LEFT, padx=10)

    def _delete_selected_medicine(self) -> None:
        selected = self.tree.selection()
        if not selected:
            messagebox.showwarning("提示", "请先选择要删除的药品！")
            return
        
        item = self.tree.item(selected[0])
        barcode = item['values'][1]
        name = item['values'][0]
        
        result = messagebox.askyesno(
            "确认删除",
            f"确定要删除药品「{name}」吗？"
        )
        
        if result:
            if self.db.delete_medicine(barcode):
                messagebox.showinfo("成功", "药品已删除！")
                self._refresh_medicine_list()
            else:
                messagebox.showerror("错误", "删除失败，请重试！")


def main():
    import tkinter as tk
    root = tk.Tk()
    app = MedicineManagerUI(root)
    root.mainloop()


if __name__ == "__main__":
    main()
