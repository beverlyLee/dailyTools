import cv2
import numpy as np
from typing import Tuple, Optional
from app.services.image_service import ImageService

class WatermarkService:
    def __init__(self):
        self.image_service = ImageService()
    
    def add_text_watermark(
        self,
        img: np.ndarray,
        text: str,
        position: str = "bottom_right",
        opacity: float = 0.5,
        font_face: int = cv2.FONT_HERSHEY_SIMPLEX,
        font_size: int = 32,
        font_thickness: int = 2,
        color: Tuple[int, int, int] = (255, 255, 255),
        margin: int = 20
    ) -> np.ndarray:
        opacity = max(0.0, min(1.0, opacity))
        
        overlay = img.copy()
        
        h, w = img.shape[:2]
        
        text_scale = font_size / 30.0
        (text_width, text_height), baseline = cv2.getTextSize(
            text, font_face, text_scale, font_thickness
        )
        
        x, y = self._calculate_position(
            position, w, h, text_width, text_height + baseline, margin
        )
        
        cv2.putText(
            overlay, text, (x, y + text_height),
            font_face, text_scale, color, font_thickness, cv2.LINE_AA
        )
        
        result = cv2.addWeighted(overlay, opacity, img, 1 - opacity, 0)
        
        return result
    
    def add_image_watermark(
        self,
        img: np.ndarray,
        watermark_img: np.ndarray,
        position: str = "bottom_right",
        opacity: float = 0.5,
        size: int = 100,
        margin: int = 20
    ) -> np.ndarray:
        opacity = max(0.0, min(1.0, opacity))
        
        h, w = img.shape[:2]
        
        watermark_h, watermark_w = watermark_img.shape[:2]
        scale = size / max(watermark_w, watermark_h)
        new_w = int(watermark_w * scale)
        new_h = int(watermark_h * scale)
        
        resized_watermark = self.image_service.resize(watermark_img, new_w, new_h)
        
        x, y = self._calculate_position(
            position, w, h, new_w, new_h, margin
        )
        
        result = img.copy()
        
        if len(resized_watermark.shape) == 3 and resized_watermark.shape[2] == 4:
            alpha_channel = resized_watermark[:, :, 3] / 255.0
            alpha_channel = alpha_channel * opacity
            
            for c in range(3):
                result[y:y + new_h, x:x + new_w, c] = (
                    resized_watermark[:, :, c] * alpha_channel +
                    result[y:y + new_h, x:x + new_w, c] * (1 - alpha_channel)
                )
        else:
            overlay = result.copy()
            overlay[y:y + new_h, x:x + new_w] = resized_watermark
            result = cv2.addWeighted(overlay, opacity, result, 1 - opacity, 0)
        
        return result
    
    def _calculate_position(
        self,
        position: str,
        img_width: int,
        img_height: int,
        element_width: int,
        element_height: int,
        margin: int
    ) -> Tuple[int, int]:
        position_map = {
            "top_left": (margin, margin),
            "top_center": ((img_width - element_width) // 2, margin),
            "top_right": (img_width - element_width - margin, margin),
            "center_left": (margin, (img_height - element_height) // 2),
            "center": ((img_width - element_width) // 2, (img_height - element_height) // 2),
            "center_right": (img_width - element_width - margin, (img_height - element_height) // 2),
            "bottom_left": (margin, img_height - element_height - margin),
            "bottom_center": ((img_width - element_width) // 2, img_height - element_height - margin),
            "bottom_right": (img_width - element_width - margin, img_height - element_height - margin)
        }
        
        return position_map.get(position.lower(), position_map["bottom_right"])
    
    def add_tiled_watermark(
        self,
        img: np.ndarray,
        watermark_img: np.ndarray,
        opacity: float = 0.3,
        tile_size: int = 150,
        spacing: int = 50
    ) -> np.ndarray:
        opacity = max(0.0, min(1.0, opacity))
        
        h, w = img.shape[:2]
        
        watermark_h, watermark_w = watermark_img.shape[:2]
        scale = tile_size / max(watermark_w, watermark_h)
        new_w = int(watermark_w * scale)
        new_h = int(watermark_h * scale)
        
        resized_watermark = self.image_service.resize(watermark_img, new_w, new_h)
        
        result = img.copy()
        overlay = result.copy()
        
        for y in range(0, h, new_h + spacing):
            for x in range(0, w, new_w + spacing):
                if y + new_h <= h and x + new_w <= w:
                    overlay[y:y + new_h, x:x + new_w] = resized_watermark
        
        result = cv2.addWeighted(overlay, opacity, result, 1 - opacity, 0)
        
        return result
    
    def add_text_tiled_watermark(
        self,
        img: np.ndarray,
        text: str,
        opacity: float = 0.3,
        font_size: int = 24,
        spacing: int = 100,
        angle: float = -30,
        color: Tuple[int, int, int] = (255, 255, 255)
    ) -> np.ndarray:
        opacity = max(0.0, min(1.0, opacity))
        
        h, w = img.shape[:2]
        
        overlay = np.zeros((h * 2, w * 2, 3), dtype=np.uint8)
        overlay_h, overlay_w = overlay.shape[:2]
        
        font_face = cv2.FONT_HERSHEY_SIMPLEX
        font_scale = font_size / 30.0
        font_thickness = 2
        
        (text_width, text_height), baseline = cv2.getTextSize(
            text, font_face, font_scale, font_thickness
        )
        
        step_x = text_width + spacing
        step_y = text_height + spacing + 50
        
        for y in range(0, overlay_h, step_y):
            for x in range(0, overlay_w, step_x):
                cv2.putText(
                    overlay, text, (x, y + text_height),
                    font_face, font_scale, color, font_thickness, cv2.LINE_AA
                )
        
        M = cv2.getRotationMatrix2D((overlay_w // 2, overlay_h // 2), angle, 1.0)
        rotated_overlay = cv2.warpAffine(overlay, M, (overlay_w, overlay_h))
        
        start_y = (overlay_h - h) // 2
        start_x = (overlay_w - w) // 2
        cropped_overlay = rotated_overlay[start_y:start_y + h, start_x:start_x + w]
        
        result = cv2.addWeighted(cropped_overlay, opacity, img, 1 - opacity, 0)
        
        return result
    
    def create_text_watermark_image(
        self,
        text: str,
        width: int = 200,
        height: int = 100,
        font_size: int = 32,
        color: Tuple[int, int, int] = (255, 255, 255),
        bg_transparent: bool = True
    ) -> np.ndarray:
        if bg_transparent:
            img = np.zeros((height, width, 4), dtype=np.uint8)
        else:
            img = np.zeros((height, width, 3), dtype=np.uint8)
        
        font_face = cv2.FONT_HERSHEY_SIMPLEX
        font_scale = font_size / 30.0
        font_thickness = 2
        
        (text_width, text_height), baseline = cv2.getTextSize(
            text, font_face, font_scale, font_thickness
        )
        
        x = (width - text_width) // 2
        y = (height + text_height) // 2
        
        if bg_transparent:
            bgr_color = color + (255,)
        else:
            bgr_color = color
        
        cv2.putText(
            img, text, (x, y),
            font_face, font_scale, bgr_color, font_thickness, cv2.LINE_AA
        )
        
        return img
