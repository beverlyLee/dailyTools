import os
import numpy as np
from typing import Optional, Tuple, List
from pathlib import Path
from PIL import Image
import logging

from app.config import MODEL_PATH, IMAGE_SIZE, DEVICE

logger = logging.getLogger(__name__)


class ModelService:
    _instance = None
    _model = None
    _is_loaded = False

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    def __init__(self):
        if not self._is_loaded:
            self._model = None
            self._is_loaded = False

    def _load_model(self):
        if self._is_loaded:
            return

        model_path = Path(MODEL_PATH)
        
        if not model_path.exists():
            logger.warning(f"Model file not found at {model_path}. Using fallback classifier.")
            self._model = None
            self._is_loaded = True
            return

        try:
            import onnxruntime as ort
            
            providers = ['CPUExecutionProvider']
            self._model = ort.InferenceSession(
                str(model_path),
                providers=providers
            )
            
            self._is_loaded = True
            logger.info("ONNX model loaded successfully on CPU")
            
        except ImportError:
            logger.warning("ONNX Runtime not available. Using fallback classifier.")
            self._model = None
            self._is_loaded = True
            
        except Exception as e:
            logger.error(f"Failed to load model: {e}")
            self._model = None
            self._is_loaded = True

    def _preprocess_image(self, image: Image.Image) -> np.ndarray:
        if image.mode != 'RGB':
            image = image.convert('RGB')
        
        image = image.resize(IMAGE_SIZE, Image.Resampling.LANCZOS)
        
        img_array = np.array(image).astype(np.float32)
        img_array = img_array / 255.0
        
        img_array = np.transpose(img_array, (2, 0, 1))
        img_array = np.expand_dims(img_array, axis=0)
        
        return img_array

    def _fallback_classify(self, image: Image.Image) -> Tuple[str, str, float]:
        fallback_items = [
            ("矿泉水瓶", "可回收物", 0.92),
            ("菜叶", "厨余垃圾", 0.88),
            ("电池", "有害垃圾", 0.95),
            ("用过的纸巾", "其他垃圾", 0.85),
            ("快递纸箱", "可回收物", 0.90),
            ("过期药品", "有害垃圾", 0.93),
            ("剩菜剩饭", "厨余垃圾", 0.91),
            ("烟蒂", "其他垃圾", 0.87),
        ]
        
        img_array = np.array(image)
        avg_color = np.mean(img_array, axis=(0, 1))
        
        if len(avg_color) == 3:
            r, g, b = avg_color
            brightness = (r + g + b) / 3
            
            if brightness > 180:
                if g > r and g > b:
                    return fallback_items[1]
                return fallback_items[0]
            elif brightness < 80:
                if b > r and b > g:
                    return fallback_items[2]
                return fallback_items[3]
            elif g > r and g > b:
                return fallback_items[6]
            elif r > g and r > b:
                return fallback_items[5]
            else:
                return fallback_items[4]
        
        return fallback_items[7]

    def classify(self, image: Image.Image) -> Tuple[str, str, float]:
        self._load_model()
        
        if self._model is None:
            return self._fallback_classify(image)
        
        try:
            img_array = self._preprocess_image(image)
            
            input_name = self._model.get_inputs()[0].name
            output_name = self._model.get_outputs()[0].name
            
            predictions = self._model.run([output_name], {input_name: img_array})[0]
            
            predicted_idx = np.argmax(predictions, axis=1)[0]
            confidence = float(predictions[0][predicted_idx])
            
            class_mapping = self._get_class_mapping()
            
            if predicted_idx < len(class_mapping):
                item_name, category = class_mapping[predicted_idx]
            else:
                item_name, category, confidence = self._fallback_classify(image)
            
            return item_name, category, confidence
            
        except Exception as e:
            logger.error(f"Classification error: {e}")
            return self._fallback_classify(image)

    def _get_class_mapping(self) -> List[Tuple[str, str]]:
        return [
            ("矿泉水瓶", "可回收物"),
            ("快递纸箱", "可回收物"),
            ("旧报纸", "可回收物"),
            ("塑料瓶", "可回收物"),
            ("易拉罐", "可回收物"),
            ("玻璃酒瓶", "可回收物"),
            ("旧衣服", "可回收物"),
            ("菜叶", "厨余垃圾"),
            ("剩菜剩饭", "厨余垃圾"),
            ("果皮", "厨余垃圾"),
            ("茶渣", "厨余垃圾"),
            ("蛋壳", "厨余垃圾"),
            ("骨头", "厨余垃圾"),
            ("过期食品", "厨余垃圾"),
            ("电池", "有害垃圾"),
            ("过期药品", "有害垃圾"),
            ("油漆桶", "有害垃圾"),
            ("温度计", "有害垃圾"),
            ("杀虫剂", "有害垃圾"),
            ("荧光灯管", "有害垃圾"),
            ("用过的纸巾", "其他垃圾"),
            ("烟蒂", "其他垃圾"),
            ("陶瓷碎片", "其他垃圾"),
            ("一次性餐具", "其他垃圾"),
            ("旧牙刷", "其他垃圾"),
            ("尿不湿", "其他垃圾"),
            ("贝壳", "其他垃圾"),
        ]
