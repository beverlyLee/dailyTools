import os
import uuid
import base64
import numpy as np
from pathlib import Path
from typing import Dict, Optional, Any, List
from loguru import logger
from datetime import datetime
from PIL import Image, ImageDraw
import io

try:
    import torch
    HAS_TORCH = True
except ImportError:
    HAS_TORCH = False
    logger.warning("PyTorch not installed. Style transfer will use mock mode.")

try:
    from diffusers import StableDiffusionControlNetPipeline, ControlNetModel
    from diffusers.utils import load_image
    HAS_DIFFUSERS = True
except ImportError:
    HAS_DIFFUSERS = False
    logger.warning("Diffusers not installed. Style transfer will use mock mode.")

try:
    import cv2
    HAS_OPENCV = True
except ImportError:
    HAS_OPENCV = False

from ..config import settings
from ..models.schemas import Keypoints, Point
from .keypoint_detector import keypoint_detector


class StyleTransferService:
    def __init__(self):
        self._controlnet = None
        self._pipeline = None
        self._initialized = False
        self._device = settings.DEVICE

    def _initialize(self):
        if self._initialized:
            return

        if not HAS_TORCH or not HAS_DIFFUSERS:
            logger.info("Using mock style transfer (PyTorch/Diffusers not installed)")
            self._initialized = True
            return

        try:
            logger.info(f"Initializing ControlNet model: {settings.CONTROLNET_MODEL}")
            logger.info(f"Initializing base model: {settings.BASE_MODEL}")
            
            if self._device == "cuda" and not torch.cuda.is_available():
                logger.warning("CUDA not available, falling back to CPU")
                self._device = "cpu"

            self._controlnet = ControlNetModel.from_pretrained(
                settings.CONTROLNET_MODEL,
                torch_dtype=torch.float16 if self._device == "cuda" else torch.float32,
            )

            self._pipeline = StableDiffusionControlNetPipeline.from_pretrained(
                settings.BASE_MODEL,
                controlnet=self._controlnet,
                torch_dtype=torch.float16 if self._device == "cuda" else torch.float32,
            )

            if self._device == "cuda":
                self._pipeline.to("cuda")
                try:
                    self._pipeline.enable_xformers_memory_efficient_attention()
                except Exception as e:
                    logger.warning(f"XFormers not available: {e}")
                    self._pipeline.enable_attention_slicing()
            
            self._initialized = True
            logger.info(f"Style transfer pipeline initialized on {self._device}")

        except Exception as e:
            logger.error(f"Failed to initialize style transfer pipeline: {e}")
            logger.info("Falling back to mock mode")
            self._initialized = True

    def generate_openpose_image(
        self, 
        image_path: str, 
        keypoints: Optional[Keypoints] = None
    ) -> Image.Image:
        if keypoints is None:
            keypoints, _ = keypoint_detector.detect_from_path(image_path)
        
        if keypoints is None:
            raise ValueError("Failed to detect keypoints")

        try:
            original_image = Image.open(image_path).convert("RGB")
        except Exception as e:
            logger.error(f"Failed to open image: {e}")
            original_image = Image.new("RGB", (512, 768), "white")

        width, height = original_image.size
        pose_image = Image.new("RGB", (width, height), "black")
        draw = ImageDraw.Draw(pose_image)

        skeleton_connections = [
            ('left_shoulder', 'right_shoulder'),
            ('left_shoulder', 'left_elbow'),
            ('right_shoulder', 'right_elbow'),
            ('left_elbow', 'left_wrist'),
            ('right_elbow', 'right_wrist'),
            ('left_shoulder', 'left_hip'),
            ('right_shoulder', 'right_hip'),
            ('left_hip', 'right_hip'),
            ('left_hip', 'left_knee'),
            ('right_hip', 'right_knee'),
            ('left_knee', 'left_ankle'),
            ('right_knee', 'right_ankle'),
        ]

        kp_dict = keypoints.model_dump()
        
        for start_key, end_key in skeleton_connections:
            start_point = kp_dict.get(start_key)
            end_point = kp_dict.get(end_key)
            
            if start_point and end_point:
                x1 = int(start_point['x'] * width)
                y1 = int(start_point['y'] * height)
                x2 = int(end_point['x'] * width)
                y2 = int(end_point['y'] * height)
                
                draw.line([(x1, y1), (x2, y2)], fill=(0, 255, 0), width=4)

        point_colors = {
            'nose': (255, 0, 0),
            'left_eye': (0, 255, 255),
            'right_eye': (0, 255, 255),
            'left_ear': (0, 255, 255),
            'right_ear': (0, 255, 255),
            'left_shoulder': (255, 128, 0),
            'right_shoulder': (255, 128, 0),
            'left_elbow': (255, 128, 0),
            'right_elbow': (255, 128, 0),
            'left_wrist': (255, 128, 0),
            'right_wrist': (255, 128, 0),
            'left_hip': (0, 128, 255),
            'right_hip': (0, 128, 255),
            'left_knee': (0, 128, 255),
            'right_knee': (0, 128, 255),
            'left_ankle': (0, 128, 255),
            'right_ankle': (0, 128, 255),
        }

        for key, point in kp_dict.items():
            if point:
                x = int(point['x'] * width)
                y = int(point['y'] * height)
                color = point_colors.get(key, (255, 255, 255))
                draw.ellipse([(x - 6, y - 6), (x + 6, y + 6)], fill=color)

        return pose_image

    async def apply_style_transfer(
        self,
        source_image: str,
        target_fashion: Dict[str, Any],
        keypoints: Optional[Keypoints] = None,
        strength: float = 0.8,
        preserve_structure: bool = True,
        negative_prompt: Optional[str] = None,
        steps: int = 30,
        guidance_scale: float = 7.5,
        seed: Optional[int] = None,
    ) -> Dict[str, Any]:
        self._initialize()

        try:
            image_path = Path(source_image)
            if not image_path.exists():
                raise FileNotFoundError(f"Source image not found: {source_image}")

            if self._pipeline is None:
                return await self._mock_style_transfer(
                    source_image, target_fashion, keypoints, strength
                )

            logger.info(f"Applying style transfer with fashion: {target_fashion.get('name')}")

            openpose_image = self.generate_openpose_image(source_image, keypoints)
            
            target_size = (512, 768)
            openpose_image = openpose_image.resize(target_size, Image.Resampling.LANCZOS)

            prompt = target_fashion.get('prompt', '')
            if not prompt:
                fashion_name = target_fashion.get('name', 'traditional Chinese clothing')
                prompt = f"person wearing {fashion_name}, traditional Chinese clothing, elegant, high quality, detailed"

            default_negative = (
                "deformed, blurry, low quality, ugly, distorted, bad anatomy, "
                "extra limbs, missing limbs, watermark, text, signature"
            )
            if negative_prompt:
                negative_prompt = f"{default_negative}, {negative_prompt}"
            else:
                negative_prompt = default_negative

            generator = None
            if seed is not None:
                generator = torch.Generator(device=self._device).manual_seed(seed)

            output = self._pipeline(
                prompt=prompt,
                negative_prompt=negative_prompt,
                image=openpose_image,
                num_inference_steps=steps,
                guidance_scale=guidance_scale,
                controlnet_conditioning_scale=strength,
                generator=generator,
            )

            result_image = output.images[0]

            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            output_filename = f"result_{timestamp}_{uuid.uuid4().hex[:8]}.png"
            output_path = settings.get_output_path(output_filename)
            result_image.save(output_path, "PNG")

            result_url = f"/api/outputs/{output_filename}"

            return {
                "success": True,
                "result_image": str(output_path),
                "result_url": result_url,
                "prompt_used": prompt,
                "metadata": {
                    "fashion_style": target_fashion,
                    "strength": strength,
                    "steps": steps,
                    "guidance_scale": guidance_scale,
                    "seed": seed,
                    "preserve_structure": preserve_structure,
                },
            }

        except Exception as e:
            logger.error(f"Style transfer failed: {e}")
            return await self._mock_style_transfer(
                source_image, target_fashion, keypoints, strength
            )

    async def _mock_style_transfer(
        self,
        source_image: str,
        target_fashion: Dict[str, Any],
        keypoints: Optional[Keypoints] = None,
        strength: float = 0.8,
    ) -> Dict[str, Any]:
        logger.warning("Using mock style transfer")
        
        fashion_name = target_fashion.get('name', 'hanfu')
        fashion_category = target_fashion.get('category', '汉服')
        
        fashion_prompts = {
            '明制汉服': 'traditional Chinese Ming Dynasty hanfu, red and gold color scheme, elegant dragon embroidery, silk fabric',
            '唐制汉服': 'traditional Chinese Tang Dynasty hanfu, flowing silk dress with peony embroidery, vibrant colors',
            '现代旗袍': 'elegant modern Chinese qipao, silk fabric with floral patterns, body-hugging silhouette',
            '经典旗袍': 'classic vintage Shanghai qipao, red velvet fabric with traditional Chinese knot buttons',
            '宋制汉服': 'traditional Chinese Song Dynasty hanfu, light blue elegant dress with simple embroidery',
            '婚礼汉服': 'traditional Chinese wedding hanfu, red and gold ceremonial dress with phoenix embroidery',
        }
        
        prompt = fashion_prompts.get(fashion_name, f'{fashion_category} traditional clothing')
        
        mock_urls = {
            '明制汉服': 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=woman%20wearing%20traditional%20Chinese%20Ming%20Dynasty%20hanfu%20red%20gold%20elegant%20dragon%20embroidery&image_size=portrait_4_3',
            '唐制汉服': 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=woman%20wearing%20traditional%20Chinese%20Tang%20Dynasty%20hanfu%20flowing%20silk%20peony%20patterns&image_size=portrait_4_3',
            '现代旗袍': 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=woman%20wearing%20elegant%20modern%20Chinese%20qipao%20silk%20floral%20patterns&image_size=portrait_4_3',
            '经典旗袍': 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=woman%20wearing%20classic%20vintage%20Shanghai%20qipao%20red%20velvet&image_size=portrait_4_3',
            '宋制汉服': 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=woman%20wearing%20traditional%20Chinese%20Song%20Dynasty%20hanfu%20light%20blue%20elegant&image_size=portrait_4_3',
            '婚礼汉服': 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=woman%20wearing%20traditional%20Chinese%20wedding%20hanfu%20red%20gold%20ceremonial&image_size=portrait_4_3',
        }
        
        result_url = mock_urls.get(fashion_name, list(mock_urls.values())[0])

        return {
            "success": True,
            "result_image": result_url,
            "result_url": result_url,
            "prompt_used": prompt,
            "metadata": {
                "fashion_style": target_fashion,
                "strength": strength,
                "steps": 30,
                "guidance_scale": 7.5,
                "seed": None,
                "preserve_structure": True,
                "is_mock": True,
            },
        }

    async def inpaint_region(
        self,
        image_path: str,
        mask_points: List[List[Dict[str, float]]],
        prompt: str,
        strength: float = 0.6,
        steps: int = 20,
        guidance_scale: float = 7.5,
    ) -> Dict[str, Any]:
        self._initialize()

        try:
            logger.info(f"Performing inpainting with prompt: {prompt}")

            if self._pipeline is None:
                return await self._mock_inpaint(image_path, mask_points, prompt, strength)

            original_image = Image.open(image_path).convert("RGB")
            width, height = original_image.size

            mask_image = Image.new("L", (width, height), 0)
            draw = ImageDraw.Draw(mask_image)

            for point_list in mask_points:
                if len(point_list) < 2:
                    continue
                    
                points = []
                for p in point_list:
                    x = int(p.get('x', 0))
                    y = int(p.get('y', 0))
                    points.append((x, y))

                draw.line(points, fill=255, width=40)
                
                for x, y in points:
                    draw.ellipse([(x - 20, y - 20), (x + 20, y + 20)], fill=255)

            target_size = (512, 512)
            original_image = original_image.resize(target_size, Image.Resampling.LANCZOS)
            mask_image = mask_image.resize(target_size, Image.Resampling.LANCZOS)

            default_negative = (
                "deformed, blurry, low quality, ugly, distorted, bad anatomy"
            )

            from diffusers import StableDiffusionInpaintPipeline
            
            inpaint_pipeline = StableDiffusionInpaintPipeline.from_pretrained(
                "runwayml/stable-diffusion-inpainting",
                torch_dtype=torch.float16 if self._device == "cuda" else torch.float32,
            )
            
            if self._device == "cuda":
                inpaint_pipeline.to("cuda")

            output = inpaint_pipeline(
                prompt=prompt,
                negative_prompt=default_negative,
                image=original_image,
                mask_image=mask_image,
                num_inference_steps=steps,
                guidance_scale=guidance_scale,
                strength=strength,
            )

            result_image = output.images[0]

            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            output_filename = f"inpaint_{timestamp}_{uuid.uuid4().hex[:8]}.png"
            output_path = settings.get_output_path(output_filename)
            result_image.save(output_path, "PNG")

            result_url = f"/api/outputs/{output_filename}"

            return {
                "success": True,
                "result_image": str(output_path),
                "result_url": result_url,
                "prompt_used": prompt,
                "metadata": {
                    "strength": strength,
                    "steps": steps,
                    "guidance_scale": guidance_scale,
                },
            }

        except Exception as e:
            logger.error(f"Inpainting failed: {e}")
            return await self._mock_inpaint(image_path, mask_points, prompt, strength)

    async def _mock_inpaint(
        self,
        image_path: str,
        mask_points: List[List[Dict[str, float]]],
        prompt: str,
        strength: float = 0.6,
    ) -> Dict[str, Any]:
        logger.warning("Using mock inpainting")
        
        mock_url = 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=elegant%20chinese%20clothing%20detail%20embroidery%20gold%20dragon&image_size=square_hd'

        return {
            "success": True,
            "result_image": mock_url,
            "result_url": mock_url,
            "prompt_used": prompt,
            "metadata": {
                "strength": strength,
                "steps": 20,
                "guidance_scale": 7.5,
                "is_mock": True,
            },
        }

    def get_model_info(self) -> Dict[str, Any]:
        return {
            "controlnet_model": settings.CONTROLNET_MODEL,
            "base_model": settings.BASE_MODEL,
            "device": self._device,
            "is_loaded": self._pipeline is not None,
            "is_mock_mode": self._pipeline is None,
        }


style_transfer_service = StyleTransferService()
