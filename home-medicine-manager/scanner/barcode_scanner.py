import cv2
import os
import sys
import ctypes
import ctypes.util
import numpy as np
from typing import Optional, Callable

ZBAR_AVAILABLE = False
OPENCV_BARCODE_AVAILABLE = False
decode = None
ZBAR_LOAD_ERROR = None
_barcode_detector = None

# macOS OpenCV摄像头优化
if sys.platform == 'darwin':
    os.environ['OPENCV_AVFOUNDATION_SKIP_AUTH'] = '0'


def _preload_zbar_library():
    """预加载zbar共享库到系统中，解决pyzbar找不到库的问题"""
    possible_paths = [
        '/opt/homebrew/lib/libzbar.0.dylib',
        '/opt/homebrew/lib/libzbar.dylib',
        '/usr/local/lib/libzbar.0.dylib',
        '/usr/local/lib/libzbar.dylib',
        '/usr/lib/libzbar.so.0',
        '/usr/lib/x86_64-linux-gnu/libzbar.so.0',
        '/usr/lib/aarch64-linux-gnu/libzbar.so.0',
    ]
    
    zbar_path = ctypes.util.find_library('zbar')
    if zbar_path:
        possible_paths.insert(0, zbar_path)
    
    for path in possible_paths:
        if os.path.exists(path):
            try:
                ctypes.CDLL(path, mode=ctypes.RTLD_GLOBAL)
                return True, None
            except Exception as e:
                continue
    
    return False, "zbar shared library not found in common paths"


def _init_opencv_barcode():
    """初始化OpenCV内置条码检测器（不依赖zbar）"""
    global OPENCV_BARCODE_AVAILABLE, _barcode_detector
    
    try:
        if hasattr(cv2, 'barcode'):
            _barcode_detector = cv2.barcode.BarcodeDetector()
            OPENCV_BARCODE_AVAILABLE = True
            return True
    except Exception:
        pass
    
    try:
        import numpy as np
        OPENCV_BARCODE_AVAILABLE = False
    except ImportError:
        pass
    
    return False


def _init_zbar():
    """初始化zbar，尝试各种加载方式"""
    global ZBAR_AVAILABLE, decode, ZBAR_LOAD_ERROR
    
    try:
        from pyzbar.pyzbar import decode
        ZBAR_AVAILABLE = True
        return True
    except ImportError as e:
        ZBAR_LOAD_ERROR = str(e)
        
        if "Unable to find zbar shared library" in str(e):
            success, error = _preload_zbar_library()
            if success:
                try:
                    if 'pyzbar' in sys.modules:
                        del sys.modules['pyzbar']
                    if 'pyzbar.pyzbar' in sys.modules:
                        del sys.modules['pyzbar.pyzbar']
                    if 'pyzbar.zbar_library' in sys.modules:
                        del sys.modules['pyzbar.zbar_library']
                    
                    from pyzbar.pyzbar import decode
                    ZBAR_AVAILABLE = True
                    return True
                except ImportError as e2:
                    ZBAR_LOAD_ERROR = str(e2)
    
    return False


def _decode_with_opencv(frame):
    """使用OpenCV内置条码检测器，包含图像预处理提升识别率"""
    if not OPENCV_BARCODE_AVAILABLE or _barcode_detector is None:
        return []
    
    # 多种图像预处理方式尝试
    processed_frames = [frame]
    
    try:
        # 1. 灰度化
        if len(frame.shape) == 3:
            gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
            processed_frames.append(gray)
            
            # 2. 对比度增强
            clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
            enhanced = clahe.apply(gray)
            processed_frames.append(enhanced)
            
            # 3. 二值化
            _, binary = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
            processed_frames.append(binary)
    except:
        pass
    
    for img in processed_frames:
        try:
            decoded, data, points = _barcode_detector.detectAndDecode(img)
            if data:
                results = []
                for i, barcode_data in enumerate(data):
                    if barcode_data:
                        results.append(type('Barcode', (), {
                            'data': barcode_data.encode('utf-8'),
                            'type': 'EAN13'
                        }))
                if results:
                    return results
        except:
            continue
    
    return []


_init_zbar()
if not ZBAR_AVAILABLE:
    _init_opencv_barcode()



class BarcodeScanner:
    def __init__(self):
        self.cap = None
        self.is_running = False
        self.zbar_available = ZBAR_AVAILABLE
        self.opencv_barcode_available = OPENCV_BARCODE_AVAILABLE

    def is_available(self) -> bool:
        return self.zbar_available or self.opencv_barcode_available

    def get_scan_method(self) -> str:
        if self.zbar_available:
            return 'pyzbar'
        elif self.opencv_barcode_available:
            return 'opencv'
        else:
            return 'none'

    def _detect_barcodes(self, frame):
        if self.zbar_available and decode is not None:
            return decode(frame)
        elif self.opencv_barcode_available:
            return _decode_with_opencv(frame)
        else:
            return []

    def start_scanner(self, callback: Callable[[str], None], camera_id: int = 0) -> Optional[str]:
        if not self.is_available():
            return None
        
        error_count = 0
        max_errors = 20
        frame_count = 0
        
        try:
            self.cap = cv2.VideoCapture(camera_id)
            
            if sys.platform == 'darwin':
                self.cap.set(cv2.CAP_PROP_FRAME_WIDTH, 1280)
                self.cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 720)
            
            if not self.cap.isOpened():
                print("无法打开摄像头")
                return None
                
            self.is_running = True
            scan_method = self.get_scan_method()

            while self.is_running:
                ret, frame = self.cap.read()
                if not ret:
                    break
                
                frame_count += 1
                display_frame = frame.copy()
                
                try:
                    barcodes = self._detect_barcodes(frame)
                    for barcode in barcodes:
                        try:
                            barcode_data = barcode.data.decode('utf-8')
                            if self._is_ean13(barcode_data):
                                cv2.putText(display_frame, 'SCANNED!', (50, 50), 
                                          cv2.FONT_HERSHEY_SIMPLEX, 1.5, (0, 255, 0), 3)
                                cv2.imshow('Barcode Scanner - Press ESC to exit', display_frame)
                                cv2.waitKey(500)
                                
                                callback(barcode_data)
                                self.is_running = False
                                self.stop_scanner()
                                return barcode_data
                        except:
                            continue
                except:
                    error_count += 1
                    if error_count >= max_errors:
                        print(f"条码识别错误过多({max_errors}次)，请改用手动输入模式")
                        break
                    continue

                try:
                    if frame_count % 30 == 0:
                        hint = f'Scanning ({scan_method}) - Place barcode in center'
                        cv2.putText(display_frame, hint, (30, 40), 
                                  cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 200, 0), 2)
                        cv2.putText(display_frame, 'Press ESC to cancel', (30, display_frame.shape[0] - 30), 
                                  cv2.FONT_HERSHEY_SIMPLEX, 0.6, (200, 200, 200), 2)
                    
                    cv2.imshow('Barcode Scanner - Press ESC to exit', display_frame)
                    key = cv2.waitKey(1) & 0xFF
                    if key == 27:
                        self.is_running = False
                        break
                except:
                    error_count += 1
                    if error_count >= max_errors:
                        break
                    continue

            self.stop_scanner()
            return None
        except Exception as e:
            print(f"条码扫描错误: {e}")
            self.stop_scanner()
            return None
        except:
            print("条码扫描发生未知错误")
            self.stop_scanner()
            return None

    def stop_scanner(self) -> None:
        self.is_running = False
        try:
            if self.cap:
                self.cap.release()
                self.cap = None
        except:
            pass
        try:
            cv2.destroyAllWindows()
        except:
            pass

    def _is_ean13(self, barcode: str) -> bool:
        if len(barcode) != 13:
            return False
        if not barcode.isdigit():
            return False
        return self._validate_ean13_checksum(barcode)

    def _validate_ean13_checksum(self, barcode: str) -> bool:
        total = 0
        for i in range(12):
            digit = int(barcode[i])
            if i % 2 == 0:
                total += digit
            else:
                total += digit * 3
        check_digit = (10 - (total % 10)) % 10
        return check_digit == int(barcode[12])

    def scan_single_image(self, image_path: str) -> Optional[str]:
        if not self.is_available():
            return None
            
        try:
            frame = cv2.imread(image_path)
            if frame is None:
                return None

            barcodes = self._detect_barcodes(frame)
            for barcode in barcodes:
                barcode_data = barcode.data.decode('utf-8')
                if self._is_ean13(barcode_data):
                    return barcode_data
            return None
        except Exception as e:
            print(f"图片条码识别错误: {e}")
            return None
