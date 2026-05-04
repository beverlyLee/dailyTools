import os
import io
import uuid
import base64
import numpy as np
from PIL import Image
from typing import Tuple, Optional, Dict, Any
from abc import ABC, abstractmethod

from ..config import settings


class BaseSRModel(ABC):
    @abstractmethod
    async def upscale(self, image: np.ndarray, scale: int = 2) -> np.ndarray:
        pass
    
    @abstractmethod
    async def inpaint(self, image: np.ndarray, mask: np.ndarray) -> np.ndarray:
        pass
    
    @abstractmethod
    async def colorize(self, image: np.ndarray) -> np.ndarray:
        pass


class MockSRModel(BaseSRModel):
    def __init__(self):
        self.model_loaded = True
        print("[MockSRModel] Using mock model for development")
    
    async def upscale(self, image: np.ndarray, scale: int = 2) -> np.ndarray:
        pil_img = Image.fromarray(image)
        new_size = (pil_img.width * scale, pil_img.height * scale)
        resized = pil_img.resize(new_size, Image.LANCZOS)
        return np.array(resized)
    
    async def inpaint(self, image: np.ndarray, mask: np.ndarray) -> np.ndarray:
        result = image.copy()
        if len(mask.shape) == 3:
            mask = mask[:, :, 0]
        mask_bool = mask > 127
        
        if len(result.shape) == 3:
            for c in range(result.shape[2]):
                channel = result[:, :, c]
                mean_val = np.mean(channel[~mask_bool])
                channel[mask_bool] = mean_val
        else:
            mean_val = np.mean(result[~mask_bool])
            result[mask_bool] = mean_val
        
        return result
    
    async def colorize(self, image: np.ndarray) -> np.ndarray:
        if len(image.shape) == 3 and image.shape[2] == 3:
            return image
        
        if len(image.shape) == 2:
            gray = image
        elif len(image.shape) == 3:
            gray = np.mean(image, axis=2).astype(np.uint8)
        else:
            return image
        
        colored = np.zeros((gray.shape[0], gray.shape[1], 3), dtype=np.uint8)
        
        intensity = gray.astype(np.float32) / 255.0
        
        for y in range(gray.shape[0]):
            for x in range(gray.shape[1]):
                val = intensity[y, x]
                
                if val < 0.3:
                    colored[y, x] = [
                        int(val * 100),
                        int(val * 80),
                        int(val * 150)
                    ]
                elif val < 0.6:
                    colored[y, x] = [
                        int(80 + val * 100),
                        int(120 + val * 80),
                        int(60 + val * 100)
                    ]
                else:
                    colored[y, x] = [
                        int(150 + (val - 0.6) * 150),
                        int(180 + (val - 0.6) * 120),
                        int(160 + (val - 0.6) * 140)
                    ]
        
        return colored


class ImageProcessor:
    def __init__(self):
        self.model: BaseSRModel = MockSRModel()
    
    async def load_image(self, image_path: str) -> Tuple[np.ndarray, Tuple[int, int]]:
        pil_img = Image.open(image_path).convert("RGB")
        return np.array(pil_img), (pil_img.width, pil_img.height)
    
    async def save_image(self, image: np.ndarray, output_path: str):
        pil_img = Image.fromarray(image)
        pil_img.save(output_path)
    
    async def image_to_base64(self, image: np.ndarray, format: str = "PNG") -> str:
        pil_img = Image.fromarray(image)
        buffer = io.BytesIO()
        pil_img.save(buffer, format=format)
        buffer.seek(0)
        return base64.b64encode(buffer.getvalue()).decode("utf-8")
    
    async def base64_to_image(self, base64_str: str) -> np.ndarray:
        if base64_str.startswith("data:image"):
            base64_str = base64_str.split(",", 1)[1]
        
        img_data = base64.b64decode(base64_str)
        pil_img = Image.open(io.BytesIO(img_data)).convert("RGB")
        return np.array(pil_img)
    
    async def process_image(
        self,
        image: np.ndarray,
        scale: int = 2,
        enable_inpainting: bool = False,
        enable_colorization: bool = False,
        mask: Optional[np.ndarray] = None
    ) -> Dict[str, Any]:
        result = {"original_shape": image.shape}
        
        processed = image.copy()
        
        if enable_inpainting and mask is not None:
            processed = await self.model.inpaint(processed, mask)
            result["inpainting_applied"] = True
        
        processed = await self.model.upscale(processed, scale)
        result["upscaled_shape"] = processed.shape
        result["scale"] = scale
        
        if enable_colorization:
            processed = await self.model.colorize(processed)
            result["colorization_applied"] = True
        
        result["processed_image"] = processed
        
        return result
    
    async def create_mask_from_annotation(
        self,
        width: int,
        height: int,
        annotations: list
    ) -> np.ndarray:
        mask = np.zeros((height, width), dtype=np.uint8)
        
        from PIL import ImageDraw
        pil_mask = Image.fromarray(mask)
        draw = ImageDraw.Draw(pil_mask)
        
        for annotation in annotations:
            shape_type = annotation.get("type", "")
            points = annotation.get("points", [])
            
            if shape_type == "freeform" and len(points) >= 2:
                flat_points = []
                for p in points:
                    flat_points.extend([p.get("x", 0), p.get("y", 0)])
                
                brush_size = annotation.get("brushSize", 10)
                for i in range(len(points) - 1):
                    x1, y1 = points[i].get("x", 0), points[i].get("y", 0)
                    x2, y2 = points[i + 1].get("x", 0), points[i + 1].get("y", 0)
                    draw.line([x1, y1, x2, y2], fill=255, width=brush_size)
            
            elif shape_type == "rectangle":
                if len(points) >= 2:
                    x1, y1 = points[0].get("x", 0), points[0].get("y", 0)
                    x2, y2 = points[1].get("x", 0), points[1].get("y", 0)
                    draw.rectangle([x1, y1, x2, y2], fill=255)
        
        return np.array(pil_mask)


image_processor = ImageProcessor()
