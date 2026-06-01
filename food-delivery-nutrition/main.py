#!/usr/bin/env python3
import sys
import os
from dotenv import load_dotenv

load_dotenv()

from PyQt5.QtWidgets import QApplication
from src.ui.main_window import MainWindow

def main():
    app = QApplication(sys.argv)
    app.setApplicationName("外卖营养分析器")
    app.setApplicationVersion("1.0.0")
    
    window = MainWindow()
    window.show()
    
    sys.exit(app.exec_())

if __name__ == "__main__":
    main()
