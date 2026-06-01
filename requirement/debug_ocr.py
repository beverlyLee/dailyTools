#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import subprocess
import os

image_path = "/tmp/test_ocr.png"

print("截图...")
subprocess.run(["screencapture", "-x", image_path], check=True)

print(f"截图大小: {os.path.getsize(image_path)} bytes")

print("\n运行 tesseract...")
result = subprocess.run(
    ["tesseract", "-l", "chi_sim+eng", image_path, "stdout"],
    capture_output=True
)

print(f"returncode: {result.returncode}")
print(f"stdout length: {len(result.stdout)}")
print(f"stderr: {result.stderr.decode('utf-8', errors='ignore')}")

print("\nstdout (raw):")
print(repr(result.stdout[:200]))

text = result.stdout.decode('utf-8', errors='ignore')
print(f"\n解码后的文本长度: {len(text)}")
print(f"文本内容:\n{text[:500]}")
