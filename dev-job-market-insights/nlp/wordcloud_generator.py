import matplotlib
matplotlib.use('Agg')

from wordcloud import WordCloud
import matplotlib.pyplot as plt
import base64
from io import BytesIO
from typing import Dict, List, Any
import os


class WordCloudGenerator:
    def __init__(self):
        self.font_path = self._get_font_path()

    def _get_font_path(self):
        possible_paths = [
            '/System/Library/Fonts/PingFang.ttc',
            '/System/Library/Fonts/STHeiti Medium.ttc',
            '/usr/share/fonts/truetype/wqy/wqy-microhei.ttc',
            '/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc'
        ]
        for path in possible_paths:
            if os.path.exists(path):
                return path
        return None

    def generate_wordcloud(self, word_freq: Dict[str, int], 
                           width: int = 800, 
                           height: int = 400) -> str:
        wc = WordCloud(
            font_path=self.font_path,
            width=width,
            height=height,
            background_color='white',
            max_words=200,
            max_font_size=100,
            random_state=42,
            prefer_horizontal=0.7,
            colormap='viridis'
        )
        
        wc.generate_from_frequencies(word_freq)
        
        img_buffer = BytesIO()
        plt.figure(figsize=(width / 100, height / 100))
        plt.imshow(wc, interpolation='bilinear')
        plt.axis('off')
        plt.tight_layout(pad=0)
        plt.savefig(img_buffer, format='png', dpi=100, bbox_inches='tight', pad_inches=0)
        plt.close()
        
        img_buffer.seek(0)
        img_base64 = base64.b64encode(img_buffer.getvalue()).decode()
        
        return f'data:image/png;base64,{img_base64}'

    def generate_wordcloud_from_text(self, text: str, 
                                      width: int = 800, 
                                      height: int = 400) -> str:
        wc = WordCloud(
            font_path=self.font_path,
            width=width,
            height=height,
            background_color='white',
            max_words=200,
            max_font_size=100,
            random_state=42,
            prefer_horizontal=0.7,
            colormap='plasma'
        )
        
        wc.generate(text)
        
        img_buffer = BytesIO()
        plt.figure(figsize=(width / 100, height / 100))
        plt.imshow(wc, interpolation='bilinear')
        plt.axis('off')
        plt.tight_layout(pad=0)
        plt.savefig(img_buffer, format='png', dpi=100, bbox_inches='tight', pad_inches=0)
        plt.close()
        
        img_buffer.seek(0)
        img_base64 = base64.b64encode(img_buffer.getvalue()).decode()
        
        return f'data:image/png;base64,{img_base64}'
