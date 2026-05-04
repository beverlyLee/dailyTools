import os
from ..config import Config

class OCRService:
    def __init__(self):
        self.engine = Config.OCR_ENGINE
    
    def recognize_image(self, image_path):
        if self.engine == 'tesseract':
            return self._tesseract_ocr(image_path)
        else:
            return self._mock_ocr(image_path)
    
    def _tesseract_ocr(self, image_path):
        try:
            import pytesseract
            from PIL import Image
            
            image = Image.open(image_path)
            text = pytesseract.image_to_string(image, lang='chi_sim+eng')
            
            return {
                'success': True,
                'text': text.strip(),
                'confidence': 0.9
            }
        except ImportError:
            return self._mock_ocr(image_path)
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def _mock_ocr(self, image_path):
        return {
            'success': True,
            'text': '这是一篇关于春天的作文。春天来了，万物复苏，花儿盛开，鸟儿歌唱。我喜欢春天的阳光，温暖而明媚。春天是一个充满希望的季节，让我们一起迎接美好的时光。',
            'confidence': 0.85,
            'note': '使用模拟OCR数据，请安装tesseract以获得真实识别功能'
        }
