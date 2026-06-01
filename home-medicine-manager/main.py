#!/usr/bin/env python3
"""家庭药品管理系统
通过扫码管理药品有效期，解决过期浪费问题

使用方法:
    python main.py
    python start.py  (推荐，自动处理依赖问题)
"""
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))


def main():
    import tkinter as tk
    from ui.main_window import MedicineManagerUI
    
    root = tk.Tk()
    app = MedicineManagerUI(root)
    root.mainloop()


if __name__ == "__main__":
    main()
