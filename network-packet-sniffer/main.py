#!/usr/bin/env python3
"""
网络抓包分析工具
功能：网卡选择、实时抓包、协议解析、BPF过滤、数据存储
"""

import sys
from PyQt5.QtWidgets import QApplication
from ui import PacketSnifferUI


def main():
    app = QApplication(sys.argv)
    window = PacketSnifferUI()
    window.show()
    sys.exit(app.exec_())


if __name__ == "__main__":
    main()
