from PIL import Image
img = Image.open('/Users/liboyang/trae/dailyTools/light-painter/img/debug_simple.png')
print(f'Size: {img.size}')
img = img.convert('RGB')
pixels = img.load()
w, h = img.size
cx, cy = w//2, h//2
print(f'Center pixel: {pixels[cx, cy]}')
non_black = sum(1 for y in range(0, h, 4) for x in range(0, w, 4) if max(pixels[x, y]) > 30)
print(f'Non-black pixels (step 4): {non_black}')
print(f'Top-left: {pixels[0, 0]}')
print(f'Bottom-right: {pixels[w-1, h-1]}')
