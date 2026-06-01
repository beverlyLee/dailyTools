#!/usr/bin/env python3
from PIL import Image
import os

img_dir = '/Users/liboyang/trae/dailyTools/light-painter/img'

# 检查测试4的截图 - 原点连线问题
img4 = Image.open(f'{img_dir}/round4_04_no_origin_line.png')
img4 = img4.convert('RGB')
w4, h4 = img4.size
p4 = img4.load()

cx4, cy4 = w4//2, h4//2

print('=== 测试4: 原点连线检查 ===')
print(f'图片尺寸: {w4}x{h4}')
print(f'屏幕中心: ({cx4}, {cy4})')

draw_x1, draw_x2 = int(w4*0.7), int(w4*0.9)
draw_y1, draw_y2 = int(h4*0.2)-20, int(h4*0.2)+20

# 中心到绘制区域起点之间的区域
between_bright = 0
for y in range(cy4-30, cy4+30, 2):
    for x in range(cx4, draw_x1, 2):
        if 0 <= x < w4 and 0 <= y < h4:
            r, g, b = p4[x, y]
            if max(r, g, b) > 50:
                between_bright += 1

# 绘制区域的亮像素
draw_bright = 0
for y in range(draw_y1, draw_y2, 2):
    for x in range(draw_x1, draw_x2, 2):
        if 0 <= x < w4 and 0 <= y < h4:
            r, g, b = p4[x, y]
            if max(r, g, b) > 50:
                draw_bright += 1

# 中心附近的坐标轴/网格
center_bright = 0
for y in range(cy4-10, cy4+10, 2):
    for x in range(cx4-10, cx4+10, 2):
        if 0 <= x < w4 and 0 <= y < h4:
            r, g, b = p4[x, y]
            if max(r, g, b) > 50:
                center_bright += 1

print(f'中心附近(坐标轴): {center_bright} 亮像素')
print(f'中心到绘制区域之间: {between_bright} 亮像素')
print(f'绘制区域: {draw_bright} 亮像素')

if between_bright > 200 and between_bright > draw_bright * 0.5:
    print('⚠️  检测到原点连线！中心到绘制区域之间有连续亮像素')
else:
    print('✅ 无明显原点连线')

print()

# 检查测试5的截图 - 三角形
img5 = Image.open(f'{img_dir}/round4_05_triangle.png')
img5 = img5.convert('RGB')
w5, h5 = img5.size
p5 = img5.load()

cx5, cy5 = w5//2, h5//2

print('=== 测试5: 三角形绘制检查 ===')

tri_cx = int(w5 * 0.75)
tri_cy = int(h5 * 0.3)
size = 80

# 三角形区域
tri_bright = 0
for y in range(tri_cy - size - 30, tri_cy + size + 30, 2):
    for x in range(tri_cx - size - 30, tri_cx + size + 30, 2):
        if 0 <= x < w5 and 0 <= y < h5:
            r, g, b = p5[x, y]
            if max(r, g, b) > 50:
                tri_bright += 1

# 中心到三角形之间的区域
mid_bright = 0
for y in range(cy5 - 40, cy5 + 40, 2):
    for x in range(cx5, cx5 + 300, 2):
        if 0 <= x < w5 and 0 <= y < h5:
            r, g, b = p5[x, y]
            if max(r, g, b) > 50:
                mid_bright += 1

# 原点附近
origin_near = 0
for y in range(cy5 - 20, cy5 + 20, 2):
    for x in range(cx5 - 20, cx5 + 20, 2):
        if 0 <= x < w5 and 0 <= y < h5:
            r, g, b = p5[x, y]
            if max(r, g, b) > 50:
                origin_near += 1

print(f'原点附近: {origin_near} 亮像素')
print(f'中心到三角形之间: {mid_bright} 亮像素')
print(f'三角形区域: {tri_bright} 亮像素')

if mid_bright > 300 and tri_bright < 100:
    print('⚠️  三角形未绘制，但中间有亮像素 - 可能是原点连线！')
elif tri_bright > 100:
    print('✅ 三角形已绘制')
else:
    print('❓ 需要更多分析')

# 检查是否有从原点到绘制位置的连续亮线
# 沿着从原点到三角形中心的线采样
print()
print('=== 沿原点到三角形中心的线采样 ===')
dx = tri_cx - cx5
dy = tri_cy - cy5
line_bright = 0
for i in range(0, 100):
    t = i / 100.0
    lx = int(cx5 + dx * t)
    ly = int(cy5 + dy * t)
    if 0 <= lx < w5 and 0 <= ly < h5:
        r, g, b = p5[lx, ly]
        bright = max(r, g, b)
        if bright > 50:
            line_bright += 1
        if i % 10 == 0:
            print(f'  t={t:.1f} pos=({lx},{ly}) RGB=({r},{g},{b}) bright={bright}')

print(f'沿线上亮像素数: {line_bright}/100')
if line_bright > 30:
    print('⚠️  存在从原点到绘制点的连续亮线！')
else:
    print('✅ 无连续亮线')
