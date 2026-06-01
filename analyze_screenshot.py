#!/usr/bin/env python3
"""分析截图的基本像素信息"""

from PIL import Image
import numpy as np

img_path = '/Users/liboyang/trae/dailyTools/aurora-dancer/img/aurora-round4-main.png'
img = Image.open(img_path)
img_array = np.array(img)

print(f"图片尺寸: {img_array.shape}")
print(f"图片类型: {img_array.dtype}")

# 计算整体亮度
brightness = np.mean(img_array)
print(f"整体平均亮度: {brightness:.2f} (0-255)")

# 检查左上角调试面板区域（0-250行, 0-300列）
panel_area = img_array[0:250, 0:300]
panel_brightness = np.mean(panel_area)
print(f"左上角区域亮度: {panel_brightness:.2f}")

# 检查不同颜色通道的平均值
r_mean = np.mean(img_array[:,:,0])
g_mean = np.mean(img_array[:,:,1])
b_mean = np.mean(img_array[:,:,2])
print(f"RGB 通道均值: R={r_mean:.1f}, G={g_mean:.1f}, B={b_mean:.1f}")

# 检查绿色和青色是否占主导
if g_mean > r_mean and g_mean > b_mean:
    print("✅ 绿色通道占主导，符合北极光特征")
else:
    print("⚠️  绿色通道不占主导")

# 检查画面中央区域的亮度分布
center_area = img_array[300:800, 600:1300]
center_brightness = np.mean(center_area)
print(f"画面中央亮度: {center_brightness:.2f}")

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
