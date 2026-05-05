#!/usr/bin/env python3
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from PySide6.QtWidgets import QApplication
from PySide6.QtGui import QFont

from batch_image_processor.ui.main_window import ImageMainWindow


def main():
    app = QApplication(sys.argv)
    
    app.setStyle("Fusion")
    
    font = QFont("Microsoft YaHei", 10)
    app.setFont(font)
    
    window = ImageMainWindow()
    window.show()
    
    sys.exit(app.exec())


if __name__ == "__main__":
    main()
