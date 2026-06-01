#!/usr/bin/env python3
"""分析第5轮截图的像素信息"""

from PIL import Image
import numpy as np

img_path = '/Users/liboyang/trae/dailyTools/aurora-dancer/img/aurora-round5-main.png'
img = Image.open(img_path)
img_array = np.array(img)

print(f"图片尺寸: {img_array.shape}")
print(f"图片类型: {img_array.dtype}")

# 计算整体亮度
brightness = np.mean(img_array)
print(f"整体平均亮度: {brightness:.2f} (0-255)")

# 检查左上角调试面板区域
panel_area = img_array[0:250, 0:300]
panel_brightness = np.mean(panel_area)
print(f"左上角区域亮度: {panel_brightness:.2f}")

# 检查不同颜色通道的平均值
r_mean = np.mean(img_array[:,:,0])
g_mean = np.mean(img_array[:,:,1])
b_mean = np.mean(img_array[:,:,2])
print(f"RGB 通道均值: R={r_mean:.1f}, G={g_mean:.1f}, B={b_mean:.1f}")

if g_mean > r_mean and g_mean > b_mean:
    print("✅ 绿色通道占主导，符合北极光特征")
else:
    print("⚠️  绿色通道不占主导")

# 检查画面中央区域的亮度分布
center_area = img_array[300:800, 600:1300]
center_brightness = np.mean(center_area)
center_max = np.max(center_area)
print(f"画面中央亮度: 平均={center_brightness:.2f}, 最大={center_max:.2f}")

if center_max < 245:
    print("✅ 中央区域无过曝（最大值<245）")
else:
    print(f"❌ 中央区域仍有过曝（最大值={center_max}）")

# 检查顶部和底部区域
top_area = img_array[0:200, :]
bottom_area = img_array[880:1080, :]
print(f"顶部区域亮度: {np.mean(top_area):.2f}")
print(f"底部区域亮度: {np.mean(bottom_area):.2f}")

# 检查是否有极光覆盖整个画面（非完全黑暗）
left_edge = img_array[:, 0:100]
right_edge = img_array[:, 1820:1920]
print(f"左边缘亮度: {np.mean(left_edge):.2f}")
print(f"右边缘亮度: {np.mean(right_edge):.2f}")

# 统计非黑暗像素（亮度>20）
non_dark_pixels = np.sum(np.mean(img_array, axis=2) > 20)
total_pixels = img_array.shape[0] * img_array.shape[1]
coverage_ratio = non_dark_pixels / total_pixels * 100
print(f"非黑暗像素覆盖率: {coverage_ratio:.1f}%")

if coverage_ratio >= 90:
    print("✅ 夜空覆盖率达到 90%+")
else:
    print(f"❌ 夜空覆盖率不足 90%（实际 {coverage_ratio:.1f}%）")

# 检查边缘是否有明显空白
if np.mean(left_edge) > 60 and np.mean(right_edge) > 60:
    print("✅ 左右边缘无明显空白")
else:
    print(f"❌ 边缘仍有空白（左={np.mean(left_edge):.1f}, 右={np.mean(right_edge):.1f}）")

# 检查光线条纹（像素局部对比度）
# 在中央区域计算相邻像素的亮度差
center_gray = np.mean(center_area, axis=2)
horizontal_diff = np.abs(np.diff(center_gray, axis=1))
vertical_diff = np.abs(np.diff(center_gray, axis=0))
avg_contrast = (np.mean(horizontal_diff) + np.mean(vertical_diff)) / 2
print(f"中央区域平均局部对比度: {avg_contrast:.2f}")

if avg_contrast > 15:
    print("✅ 有明显的光线条纹对比度")
else:
    print(f"❌ 条纹对比度不足（实际 {avg_contrast:.1f}，期望 >15）")

# 检查颜色渐变（从底部到顶部）
height = img_array.shape[0]
bottom_half = img_array[height//2:, :]
top_half = img_array[:height//2, :]

bottom_g = np.mean(bottom_half[:,:,1])
bottom_b = np.mean(bottom_half[:,:,2])
top_g = np.mean(top_half[:,:,1])
top_b = np.mean(top_half[:,:,2])

print(f"\n颜色渐变分析:")
print(f"  底部: G={bottom_g:.1f}, B={bottom_b:.1f}")
print(f"  顶部: G={top_g:.1f}, B={top_b:.1f}")
print(f"  G通道变化: {bottom_g - top_g:.1f}（底部-顶部）")
print(f"  B通道变化: {top_b - bottom_b:.1f}（顶部-底部）")

if bottom_g > top_g and top_b > bottom_b:
    print("✅ 颜色渐变正确：底部偏绿，顶部偏蓝紫")
else:
    print("❌ 颜色渐变异常")
