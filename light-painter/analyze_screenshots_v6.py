#!/usr/bin/env python3
"""检查截图 - 直接可视化分析"""

from PIL import Image
import os

IMG_DIR = "/Users/liboyang/trae/dailyTools/light-painter/img"

# 检查 v5 测试的截图
print("="*80)
print("截图分析")
print("="*80)

files = [
    "round6_v5_01_base.png",
    "round6_v5_02_draw.png", 
    "round6_v5_03_circle.png"
]

for fname in files:
    path = f"{IMG_DIR}/{fname}"
    if not os.path.exists(path):
        print(f"\n❌ {fname} 不存在")
        continue
    
    img = Image.open(path)
    img = img.convert('RGB')
    pixels = img.load()
    w, h = img.size
    
    print(f"\n📸 {fname} ({w}x{h})")
    
    # 统计不同阈值的像素
    for threshold in [30, 50, 80, 120]:
        count = 0
        for y in range(0, h, 4):
            for x in range(0, w, 4):
                r, g, b = pixels[x, y]
                if max(r, g, b) > threshold:
                    count += 1
        total = (w//4) * (h//4)
        print(f"  阈值{threshold:>3}: {count:>6}/{total} ({count/total*100:>5.1f}%)")
    
    # 检查一些特定区域
    # 中心区域
    cx, cy = w//2, h//2
    center_bright = 0
    for y in range(cy-50, cy+50, 2):
        for x in range(cx-50, cx+50, 2):
            if 0 <= x < w and 0 <= y < h:
                if max(pixels[x, y]) > 50:
                    center_bright += 1
    print(f"  中心100x100亮像素: {center_bright}")

print("\n" + "="*80)
print("检查 draw 和 base 的差异")
print("="*80)

# 直接比较两张图片
base = Image.open(f"{IMG_DIR}/round6_v5_01_base.png").convert('RGB')
draw = Image.open(f"{IMG_DIR}/round6_v5_02_draw.png").convert('RGB')

bp = base.load()
dp = draw.load()
w, h = base.size

diff_pixels = 0
total_diff = 0
max_diff = 0

for y in range(0, h, 4):
    for x in range(0, w, 4):
        br, bg, bb = bp[x, y]
        dr, dg, db = dp[x, y]
        diff = abs(br-dr) + abs(bg-dg) + abs(bb-db)
        if diff > 30:
            diff_pixels += 1
            total_diff += diff
            if diff > max_diff:
                max_diff = diff

print(f"差异像素数: {diff_pixels}")
print(f"总差异值: {total_diff}")
print(f"最大差异: {max_diff}")

if diff_pixels > 100:
    print("✅ 两张图片有明显差异，绘制成功")
else:
    print("⚠️  差异不明显")

# 检查斜线区域
print("\n检查斜线区域:")
line_bright = 0
for i in range(100):
    t = i / 99.0
    lx = int(200 + 800 * t)
    ly = int(200 + 400 * t)
    if 0 <= lx < w and 0 <= ly < h:
        r, g, b = dp[lx, ly]
        bright = max(r, g, b)
        if bright > 50:
            line_bright += 1
        if i % 10 == 0:
            print(f"  t={t:.1f} pos=({lx},{ly}) RGB=({r},{g},{b}) bright={bright}")

print(f"\n斜线上亮像素(>50): {line_bright}/100")
if line_bright > 50:
    print("✅ 斜线上有连续的亮像素，绘制成功")
