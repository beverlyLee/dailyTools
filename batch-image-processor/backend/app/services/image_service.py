import cv2
import numpy as np
from typing import Tuple, Optional

class ImageService:
    def __init__(self):
        pass
    
    def load_image(self, path: str, flags: int = cv2.IMREAD_COLOR) -> Optional[np.ndarray]:
        try:
            img = cv2.imread(path, flags)
            if img is None:
                return None
            return img
        except Exception:
            return None
    
    def save_image(self, img: np.ndarray, path: str, quality: int = 90) -> bool:
        try:
            ext = path.split(".")[-1].lower()
            
            params = []
            if ext in ["jpg", "jpeg"]:
                params = [cv2.IMWRITE_JPEG_QUALITY, quality]
            elif ext == "png":
                params = [cv2.IMWRITE_PNG_COMPRESSION, int((100 - quality) / 10)]
            elif ext == "webp":
                params = [cv2.IMWRITE_WEBP_QUALITY, quality]
            
            cv2.imwrite(path, img, params)
            return True
        except Exception:
            return False
    
    def get_dimensions(self, img: np.ndarray) -> Tuple[int, int]:
        h, w = img.shape[:2]
        return w, h
    
    def resize(self, img: np.ndarray, width: int, height: int, 
               interpolation: int = cv2.INTER_AREA) -> np.ndarray:
        return cv2.resize(img, (width, height), interpolation=interpolation)
    
    def resize_by_scale(self, img: np.ndarray, scale_x: float, 
                        scale_y: float, interpolation: int = cv2.INTER_AREA) -> np.ndarray:
        return cv2.resize(img, None, fx=scale_x, fy=scale_y, interpolation=interpolation)
    
    def crop(self, img: np.ndarray, x: int, y: int, width: int, height: int) -> np.ndarray:
        h, w = img.shape[:2]
        
        x = max(0, min(x, w - 1))
        y = max(0, min(y, h - 1))
        crop_w = min(width, w - x)
        crop_h = min(height, h - y)
        
        return img[y:y + crop_h, x:x + crop_w]
    
    def rotate(self, img: np.ndarray, angle: float, expand: bool = True) -> np.ndarray:
        h, w = img.shape[:2]
        center = (w // 2, h // 2)
        
        M = cv2.getRotationMatrix2D(center, angle, 1.0)
        
        if expand:
            cos = np.abs(M[0, 0])
            sin = np.abs(M[0, 1])
            new_w = int((h * sin) + (w * cos))
            new_h = int((h * cos) + (w * sin))
            
            M[0, 2] += (new_w / 2) - center[0]
            M[1, 2] += (new_h / 2) - center[1]
            
            return cv2.warpAffine(img, M, (new_w, new_h))
        
        return cv2.warpAffine(img, M, (w, h))
    
    def rotate_90(self, img: np.ndarray, times: int = 1) -> np.ndarray:
        return np.rot90(img, k=times)
    
    def flip(self, img: np.ndarray, flip_code: int = 1) -> np.ndarray:
        return cv2.flip(img, flip_code)
    
    def convert_color(self, img: np.ndarray, code: int) -> np.ndarray:
        return cv2.cvtColor(img, code)
    
    def bgr_to_rgb(self, img: np.ndarray) -> np.ndarray:
        return cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
    
    def rgb_to_bgr(self, img: np.ndarray) -> np.ndarray:
        return cv2.cvtColor(img, cv2.COLOR_RGB2BGR)
    
    def bgr_to_gray(self, img: np.ndarray) -> np.ndarray:
        return cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    
    def add_border(self, img: np.ndarray, top: int, bottom: int, left: int, right: int,
                   border_type: int = cv2.BORDER_CONSTANT, value: Tuple = (0, 0, 0)) -> np.ndarray:
        return cv2.copyMakeBorder(img, top, bottom, left, right, border_type, value=value)
    
    def blur(self, img: np.ndarray, kernel_size: Tuple[int, int] = (5, 5)) -> np.ndarray:
        return cv2.GaussianBlur(img, kernel_size, 0)
    
    def sharpen(self, img: np.ndarray) -> np.ndarray:
        kernel = np.array([[-1, -1, -1],
                          [-1, 9, -1],
                          [-1, -1, -1]])
        return cv2.filter2D(img, -1, kernel)
    
    def adjust_brightness_contrast(self, img: np.ndarray, alpha: float = 1.0, beta: int = 0) -> np.ndarray:
        return cv2.convertScaleAbs(img, alpha=alpha, beta=beta)
    
    def adjust_brightness(self, img: np.ndarray, beta: int = 0) -> np.ndarray:
        return self.adjust_brightness_contrast(img, alpha=1.0, beta=beta)
    
    def adjust_contrast(self, img: np.ndarray, alpha: float = 1.0) -> np.ndarray:
        return self.adjust_brightness_contrast(img, alpha=alpha, beta=0)
    
    def equalize_histogram(self, img: np.ndarray) -> np.ndarray:
        if len(img.shape) == 2:
            return cv2.equalizeHist(img)
        
        ycrcb = cv2.cvtColor(img, cv2.COLOR_BGR2YCrCb)
        ycrcb[:, :, 0] = cv2.equalizeHist(ycrcb[:, :, 0])
        return cv2.cvtColor(ycrcb, cv2.COLOR_YCrCb2BGR)
    
    def encode_to_bytes(self, img: np.ndarray, ext: str = ".jpg", quality: int = 90) -> Optional[bytes]:
        try:
            params = []
            if ext.lower() in [".jpg", ".jpeg"]:
                params = [cv2.IMWRITE_JPEG_QUALITY, quality]
            elif ext.lower() == ".png":
                params = [cv2.IMWRITE_PNG_COMPRESSION, int((100 - quality) / 10)]
            elif ext.lower() == ".webp":
                params = [cv2.IMWRITE_WEBP_QUALITY, quality]
            
            _, buffer = cv2.imencode(ext, img, params)
            return buffer.tobytes()
        except Exception:
            return None
    
    def decode_from_bytes(self, data: bytes) -> Optional[np.ndarray]:
        try:
            nparr = np.frombuffer(data, np.uint8)
            return cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        except Exception:
            return None
