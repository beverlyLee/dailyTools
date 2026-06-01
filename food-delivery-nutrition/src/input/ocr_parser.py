#!/usr/bin/env python3
import os
import re
import shutil
from PIL import Image, ImageFile
import pytesseract
from dotenv import load_dotenv

load_dotenv()

ImageFile.LOAD_TRUNCATED_IMAGES = True

class OCRParser:
    def __init__(self):
        self.tesseract_cmd = os.getenv('TESSERACT_CMD', 'tesseract')
        self.tessdata_prefix = os.getenv('TESSDATA_PREFIX', '')
        self.tesseract_installed = False
        self.chinese_langpack_installed = False
        self.install_message = ""
        self.tesseract_path = None
        self._check_tesseract_installation()
    
    def _check_tesseract_installation(self):
        self.tesseract_installed = False
        self.chinese_langpack_installed = False
        
        try:
            tesseract_path = None
            
            if os.path.exists(self.tesseract_cmd) and os.path.isfile(self.tesseract_cmd):
                tesseract_path = self.tesseract_cmd
            else:
                tesseract_in_path = shutil.which('tesseract')
                if tesseract_in_path:
                    tesseract_path = tesseract_in_path
            
            if not tesseract_path:
                self.install_message = self._get_install_guide()
                return
            
            self.tesseract_path = tesseract_path
            pytesseract.pytesseract.tesseract_cmd = tesseract_path
            
            try:
                version = pytesseract.get_tesseract_version()
                self.tesseract_installed = True
            except Exception as e:
                self.install_message = self._get_install_guide() + f"\n错误详情: {str(e)}"
                return
            
            self._check_chinese_language_pack()
            
            if self.tesseract_installed and self.chinese_langpack_installed:
                self.install_message = f"✅ Tesseract 状态正常\n\n版本: {version}\n语言包: 已安装中文支持\n路径: {tesseract_path}"
            elif self.tesseract_installed and not self.chinese_langpack_installed:
                self.install_message = self._get_chinese_langpack_guide()
            
        except Exception as e:
            self.tesseract_installed = False
            self.chinese_langpack_installed = False
            self.install_message = f"""❌ Tesseract 初始化失败

错误信息: {str(e)}

请按以下步骤排查:
1. 确认已正确安装 Tesseract OCR
2. 检查 .env 中的 TESSERACT_CMD 路径是否正确
3. 确认有中文语言包（chi_sim.traineddata）

{self._get_install_guide()}
"""
    
    def _check_chinese_language_pack(self):
        try:
            tessdata_paths = []
            
            if self.tessdata_prefix:
                tessdata_paths.append(self.tessdata_prefix)
            
            if self.tesseract_path:
                base_dir = os.path.dirname(os.path.dirname(self.tesseract_path))
                tessdata_paths.append(os.path.join(base_dir, 'share', 'tessdata'))
                tessdata_paths.append(os.path.join(base_dir, 'tessdata'))
                tessdata_paths.append('/usr/local/share/tessdata')
                tessdata_paths.append('/opt/homebrew/share/tessdata')
                tessdata_paths.append('/usr/share/tesseract-ocr/4.00/tessdata')
                tessdata_paths.append('/usr/share/tessdata')
            
            found = False
            checked_paths = []
            for tessdata_path in tessdata_paths:
                if tessdata_path and os.path.isdir(tessdata_path):
                    chi_sim_path = os.path.join(tessdata_path, 'chi_sim.traineddata')
                    checked_paths.append(chi_sim_path)
                    if os.path.exists(chi_sim_path):
                        self.chinese_langpack_installed = True
                        found = True
                        break
            
            if not found:
                try:
                    lang_list = pytesseract.get_languages()
                    if 'chi_sim' in lang_list:
                        self.chinese_langpack_installed = True
                except:
                    pass
            
        except Exception as e:
            self.chinese_langpack_installed = False
    
    def _get_install_guide(self):
        return """❌ Tesseract OCR 未安装或未配置

📦 安装方法:

macOS:
  brew install tesseract
  brew install tesseract-lang  # 中文语言包

Windows:
  1. 下载安装包: https://github.com/UB-Mannheim/tesseract/wiki
  2. 安装时勾选中文语言包 (Chinese Simplified)
  3. 将安装路径添加到系统环境变量 PATH
  4. 默认识别路径: C:\\Program Files\\Tesseract-OCR\\tesseract.exe

Linux (Ubuntu/Debian):
  sudo apt install tesseract-ocr
  sudo apt install tesseract-ocr-chi-sim

⚙️  配置方法:
  在 .env 文件中设置:
  TESSERACT_CMD=/usr/local/bin/tesseract
  TESSDATA_PREFIX=/usr/local/share/tessdata
"""
    
    def _get_chinese_langpack_guide(self):
        return """⚠️ 中文语言包未安装

Tesseract 已安装，但缺少中文识别支持（chi_sim.traineddata）。

📦 安装中文语言包:

macOS:
  brew install tesseract-lang

Windows:
  1. 下载中文语言包: https://github.com/tesseract-ocr/tessdata/raw/main/chi_sim.traineddata
  2. 将下载的文件放到 Tesseract 安装目录的 tessdata 文件夹中
  3. 通常路径: C:\\Program Files\\Tesseract-OCR\\tessdata\\

Linux (Ubuntu/Debian):
  sudo apt install tesseract-ocr-chi-sim

手动安装:
  1. 下载: https://github.com/tesseract-ocr/tessdata/raw/main/chi_sim.traineddata
  2. 放置到 tessdata 目录
  3. 在 .env 中设置 TESSDATA_PREFIX=/path/to/tessdata

⚙️ 当前检查的语言包路径:
  /opt/homebrew/share/tessdata/chi_sim.traineddata
  /usr/local/share/tessdata/chi_sim.traineddata
"""
    
    def is_available(self):
        return self.tesseract_installed and self.chinese_langpack_installed
    
    def get_install_message(self):
        return self.install_message
    
    def get_status(self):
        return {
            'tesseract_installed': self.tesseract_installed,
            'chinese_langpack_installed': self.chinese_langpack_installed,
            'message': self.install_message
        }
    
    def _validate_image(self, image_path):
        if not os.path.exists(image_path):
            return False, f"图片文件不存在: {image_path}"
        
        if not os.path.isfile(image_path):
            return False, f"路径不是文件: {image_path}"
        
        file_size = os.path.getsize(image_path)
        if file_size == 0:
            return False, "图片文件为空（大小为0字节）"
        
        if file_size < 100:
            return False, f"图片文件过小 ({file_size} 字节)，可能已损坏"
        
        try:
            with Image.open(image_path) as img:
                img.verify()
                
                width, height = img.size
                if width < 50 or height < 50:
                    return False, f"图片尺寸过小 ({width}x{height})，无法识别"
                
                if img.mode not in ['RGB', 'L', 'RGBA']:
                    try:
                        img.convert('RGB')
                    except:
                        return False, f"不支持的图片格式: {img.mode}"
                
                return True, f"图片验证通过: {width}x{height}, {file_size} 字节"
                
        except Exception as e:
            error_msg = str(e)
            if 'premature end of data segment' in error_msg.lower() or 'bad data' in error_msg.lower():
                return False, f"""图片文件已损坏（JPEG数据不完整）

错误原因: 文件下载不完整或传输过程中损坏
建议: 
  1. 重新截取订单图片
  2. 确保截图完整保存后再导入
  3. 尝试使用 PNG 格式而非 JPEG

技术详情: {error_msg}"""
            elif 'truncated' in error_msg.lower():
                return False, f"""图片被截断，无法读取

建议: 重新截取完整的订单图片"""
            else:
                return False, f"""图片验证失败: {error_msg}

建议: 
  1. 确认图片文件完整可读
  2. 尝试使用常用格式（JPG、PNG）
  3. 重新截取订单图片"""
    
    def parse_image(self, image_path):
        if not self.tesseract_installed:
            raise RuntimeError(self.install_message)
        
        if not self.chinese_langpack_installed:
            raise RuntimeError(self._get_chinese_langpack_guide())
        
        img_valid, img_msg = self._validate_image(image_path)
        if not img_valid:
            raise RuntimeError(img_msg)
        
        try:
            image = Image.open(image_path)
            
            if image.mode in ['RGBA', 'P']:
                image = image.convert('RGB')
            
            text = pytesseract.image_to_string(image, lang='chi_sim+eng')
            
            if not text or len(text.strip()) < 5:
                raise RuntimeError("识别结果为空，请确保图片清晰且包含订单内容（商家名称、菜品等）")
            
            return self._parse_text(text)
            
        except Exception as e:
            error_msg = str(e)
            
            if 'chi_sim' in error_msg and 'language' in error_msg.lower():
                raise RuntimeError(self._get_chinese_langpack_guide() + f"\n\n错误详情: {error_msg}")
            
            if 'TESSDATA_PREFIX' in error_msg or 'tessdata' in error_msg.lower():
                raise RuntimeError(f"""语言包路径配置错误

请在 .env 文件中设置正确的 TESSDATA_PREFIX 路径:
TESSDATA_PREFIX=/path/to/tessdata

错误详情: {error_msg}

{self._get_chinese_langpack_guide()}""")
            
            raise RuntimeError(f"OCR识别失败: {error_msg}")
    
    def _parse_text(self, text):
        lines = [line.strip() for line in text.split('\n') if line.strip()]
        
        result = {
            'restaurant_name': self._extract_restaurant(lines),
            'order_date': self._extract_date(lines),
            'items': self._extract_items(lines),
            'total_price': self._extract_price(lines),
            'raw_text': text
        }
        
        return result
    
    def _extract_restaurant(self, lines):
        keywords = ['店', '餐厅', '馆', '肯德基', '麦当劳', '必胜客', '汉堡王', '星巴克',
                   '火锅', '烧烤', '奶茶', '川菜', '粤菜', '湘菜', '面馆', '饺子', '便当',
                   'KFC', 'McDonald', 'Starbucks']
        
        for line in lines[:10]:
            for keyword in keywords:
                if keyword in line:
                    clean_name = re.sub(r'[^\w\u4e00-\u9fff]', '', line)
                    if len(clean_name) > 2:
                        return clean_name
        
        return '未知商家'
    
    def _extract_date(self, lines):
        date_patterns = [
            r'(\d{4})[-/年](\d{1,2})[-/月](\d{1,2})',
            r'(\d{2})[-/](\d{2})[-/](\d{2})',
            r'(\d{4})年(\d{1,2})月(\d{1,2})日',
        ]
        
        for line in lines:
            for pattern in date_patterns:
                match = re.search(pattern, line)
                if match:
                    groups = match.groups()
                    if len(groups[0]) == 4:
                        year = groups[0]
                        month = groups[1].zfill(2)
                        day = groups[2].zfill(2)
                    else:
                        year = '20' + groups[0]
                        month = groups[1].zfill(2)
                        day = groups[2].zfill(2)
                    return f"{year}-{month}-{day}"
        
        from datetime import datetime
        return datetime.now().strftime('%Y-%m-%d')
    
    def _extract_items(self, lines):
        items = []
        
        food_keywords = ['饭', '面', '堡', '鸡', '肉', '菜', '汤', '奶茶', '可乐', '薯条',
                        '汉堡', '披萨', '炸鸡', '饺子', '包子', '米饭', '牛肉', '猪肉',
                        'fish', 'chicken', 'beef', 'rice', 'noodle', 'burger']
        
        for line in lines:
            has_food = any(keyword in line for keyword in food_keywords)
            has_price = re.search(r'[￥¥$]\s*\d+[.]?\d*', line)
            has_quantity = re.search(r'[x×*]\s*\d+', line) or re.search(r'\d+份', line)
            
            if has_food or (has_price and len(line) > 5):
                item_name = re.sub(r'[￥¥$]\s*\d+[.]?\d*', '', line)
                item_name = re.sub(r'[x×*]\s*\d+', '', item_name)
                item_name = re.sub(r'\d+份', '', item_name)
                item_name = re.sub(r'[^\w\u4e00-\u9fff\s]', '', item_name).strip()
                
                quantity_match = re.search(r'[x×*]\s*(\d+)', line)
                quantity = int(quantity_match.group(1)) if quantity_match else 1
                
                if item_name and len(item_name) > 1:
                    items.append({
                        'name': item_name,
                        'quantity': quantity
                    })
        
        return items
    
    def _extract_price(self, lines):
        total_keywords = ['合计', '总计', '实付', '应付', 'total', 'amount']
        
        for line in reversed(lines):
            has_total = any(keyword in line for keyword in total_keywords)
            price_match = re.search(r'[￥¥$]\s*(\d+[.]?\d*)', line)
            
            if has_total and price_match:
                try:
                    return float(price_match.group(1))
                except:
                    pass
        
        for line in reversed(lines):
            price_match = re.search(r'[￥¥$]\s*(\d+[.]?\d*)', line)
            if price_match:
                try:
                    return float(price_match.group(1))
                except:
                    pass
        
        return 0.0

def test_ocr():
    parser = OCRParser()
    print("OCR解析器初始化完成")
    print("请传入外卖截图路径进行测试")

if __name__ == '__main__':
    test_ocr()
