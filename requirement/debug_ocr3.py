#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import subprocess
import os

image_path = "./test_ocr.png"
output_path = "./test_ocr_output"

print("截图...")
subprocess.run(["screencapture", "-x", image_path], check=True)

print(f"截图存在: {os.path.exists(image_path)}")
print(f"截图大小: {os.path.getsize(image_path)} bytes")
print(f"绝对路径: {os.path.abspath(image_path)}")

print("\n运行 tesseract 输出到文件...")
result = subprocess.run(
    ["tesseract", "-l", "eng", os.path.abspath(image_path), output_path],
    capture_output=True,
    cwd=os.getcwd()
)

print(f"returncode: {result.returncode}")
print(f"stderr: {result.stderr.decode('utf-8', errors='ignore')}")

txt_file = output_path + ".txt"
if os.path.exists(txt_file):
    print(f"\n输出文件存在: {txt_file}")
    print(f"文件大小: {os.path.getsize(txt_file)} bytes")
    with open(txt_file, 'r', encoding='utf-8', errors='ignore') as f:
        text = f.read()
    print(f"\n识别内容:\n{text[:500]}")
else:
    print(f"输出文件不存在: {txt_file}")

for f in [image_path, txt_file]:
    if os.path.exists(f):
        os.remove(f)
