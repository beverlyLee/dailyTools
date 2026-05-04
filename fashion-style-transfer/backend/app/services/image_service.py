import os
import uuid
import aiofiles
from pathlib import Path
from typing import Dict, Optional, Any, List
from loguru import logger
from datetime import datetime
from PIL import Image
import io

from ..config import settings


class ImageService:
    def __init__(self):
        self._upload_dir = settings.UPLOAD_DIR
        self._output_dir = settings.OUTPUT_DIR
        self._max_size = settings.MAX_UPLOAD_SIZE
        self._allowed_extensions = set(settings.ALLOWED_EXTENSIONS)

    def _validate_extension(self, filename: str) -> bool:
        ext = Path(filename).suffix.lower().lstrip('.')
        return ext in self._allowed_extensions

    def _generate_filename(self, original_filename: str) -> str:
        ext = Path(original_filename).suffix.lower()
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        unique_id = uuid.uuid4().hex[:8]
        return f"upload_{timestamp}_{unique_id}{ext}"

    async def save_uploaded_file(
        self, 
        file_content: bytes, 
        original_filename: str
    ) -> Dict[str, Any]:
        if not self._validate_extension(original_filename):
            raise ValueError(
                f"Invalid file extension. Allowed: {', '.join(self._allowed_extensions)}"
            )

        if len(file_content) > self._max_size:
            raise ValueError(
                f"File too large. Max size: {self._max_size / 1024 / 1024:.1f}MB"
            )

        filename = self._generate_filename(original_filename)
        filepath = self._upload_dir / filename

        async with aiofiles.open(filepath, 'wb') as f:
            await f.write(file_content)

        try:
            with Image.open(filepath) as img:
                width, height = img.size
                format_name = img.format

            return {
                "success": True,
                "image_path": str(filepath),
                "filename": filename,
                "original_name": original_filename,
                "metadata": {
                    "width": width,
                    "height": height,
                    "format": format_name,
                    "size_bytes": len(file_content),
                    "upload_time": datetime.now().isoformat(),
                },
            }
        except Exception as e:
            logger.error(f"Failed to process image: {e}")
            if filepath.exists():
                filepath.unlink()
            raise ValueError(f"Invalid image file: {e}")

    async def save_image_from_pil(
        self, 
        image: Image.Image, 
        filename: Optional[str] = None,
        is_output: bool = True
    ) -> Dict[str, Any]:
        if filename is None:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            unique_id = uuid.uuid4().hex[:8]
            filename = f"image_{timestamp}_{unique_id}.png"

        if is_output:
            filepath = self._output_dir / filename
        else:
            filepath = self._upload_dir / filename

        buffer = io.BytesIO()
        image.save(buffer, format='PNG')
        buffer.seek(0)
        image_data = buffer.read()

        async with aiofiles.open(filepath, 'wb') as f:
            await f.write(image_data)

        return {
            "success": True,
            "image_path": str(filepath),
            "filename": filename,
            "metadata": {
                "width": image.width,
                "height": image.height,
                "format": "PNG",
                "size_bytes": len(image_data),
                "save_time": datetime.now().isoformat(),
            },
        }

    async def get_image_info(self, image_path: str) -> Optional[Dict[str, Any]]:
        path = Path(image_path)
        if not path.exists():
            return None

        try:
            with Image.open(path) as img:
                return {
                    "path": str(path),
                    "filename": path.name,
                    "width": img.width,
                    "height": img.height,
                    "format": img.format,
                    "mode": img.mode,
                    "size_bytes": path.stat().st_size,
                    "modified_time": datetime.fromtimestamp(path.stat().st_mtime).isoformat(),
                }
        except Exception as e:
            logger.error(f"Failed to get image info: {e}")
            return None

    async def resize_image(
        self, 
        image_path: str, 
        max_width: int, 
        max_height: int,
        keep_aspect_ratio: bool = True
    ) -> Optional[Dict[str, Any]]:
        path = Path(image_path)
        if not path.exists():
            return None

        try:
            with Image.open(path) as img:
                if keep_aspect_ratio:
                    ratio = min(max_width / img.width, max_height / img.height)
                    new_width = int(img.width * ratio)
                    new_height = int(img.height * ratio)
                else:
                    new_width = max_width
                    new_height = max_height

                resized = img.resize((new_width, new_height), Image.Resampling.LANCZOS)
                
                timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
                unique_id = uuid.uuid4().hex[:8]
                new_filename = f"resized_{timestamp}_{unique_id}.png"
                new_path = self._output_dir / new_filename

                buffer = io.BytesIO()
                resized.save(buffer, format='PNG')
                buffer.seek(0)
                
                async with aiofiles.open(new_path, 'wb') as f:
                    await f.write(buffer.getvalue())

                return {
                    "success": True,
                    "original_path": image_path,
                    "resized_path": str(new_path),
                    "filename": new_filename,
                    "original_size": {"width": img.width, "height": img.height},
                    "resized_size": {"width": new_width, "height": new_height},
                }
        except Exception as e:
            logger.error(f"Failed to resize image: {e}")
            return None

    async def convert_image_format(
        self, 
        image_path: str, 
        target_format: str = 'PNG',
        quality: int = 100
    ) -> Optional[Dict[str, Any]]:
        path = Path(image_path)
        if not path.exists():
            return None

        target_format = target_format.upper()
        if target_format not in ['PNG', 'JPEG', 'JPG', 'WEBP']:
            raise ValueError(f"Unsupported format: {target_format}")

        try:
            with Image.open(path) as img:
                if img.mode == 'RGBA' and target_format in ['JPEG', 'JPG']:
                    img = img.convert('RGB')

                timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
                unique_id = uuid.uuid4().hex[:8]
                ext = target_format.lower()
                if ext == 'jpg':
                    ext = 'jpeg'
                new_filename = f"converted_{timestamp}_{unique_id}.{ext}"
                new_path = self._output_dir / new_filename

                buffer = io.BytesIO()
                
                if target_format in ['JPEG', 'JPG']:
                    img.save(buffer, format='JPEG', quality=quality, optimize=True)
                elif target_format == 'WEBP':
                    img.save(buffer, format='WEBP', quality=quality)
                else:
                    img.save(buffer, format='PNG')
                
                buffer.seek(0)
                
                async with aiofiles.open(new_path, 'wb') as f:
                    await f.write(buffer.getvalue())

                return {
                    "success": True,
                    "original_path": image_path,
                    "converted_path": str(new_path),
                    "filename": new_filename,
                    "original_format": img.format,
                    "target_format": target_format,
                    "quality": quality,
                }
        except Exception as e:
            logger.error(f"Failed to convert image: {e}")
            return None

    async def delete_image(self, image_path: str) -> bool:
        path = Path(image_path)
        try:
            if path.exists():
                path.unlink()
                logger.info(f"Deleted image: {image_path}")
                return True
            return False
        except Exception as e:
            logger.error(f"Failed to delete image: {e}")
            return False

    async def list_uploads(self) -> List[Dict[str, Any]]:
        images = []
        try:
            for file_path in self._upload_dir.iterdir():
                if file_path.is_file() and file_path.suffix.lower().lstrip('.') in self._allowed_extensions:
                    info = await self.get_image_info(str(file_path))
                    if info:
                        images.append(info)
            images.sort(key=lambda x: x.get('modified_time', ''), reverse=True)
        except Exception as e:
            logger.error(f"Failed to list uploads: {e}")
        return images

    async def list_outputs(self) -> List[Dict[str, Any]]:
        images = []
        try:
            for file_path in self._output_dir.iterdir():
                if file_path.is_file() and file_path.suffix.lower().lstrip('.') in self._allowed_extensions:
                    info = await self.get_image_info(str(file_path))
                    if info:
                        images.append(info)
            images.sort(key=lambda x: x.get('modified_time', ''), reverse=True)
        except Exception as e:
            logger.error(f"Failed to list outputs: {e}")
        return images

    def get_allowed_extensions(self) -> List[str]:
        return list(self._allowed_extensions)

    def get_max_size_mb(self) -> float:
        return self._max_size / 1024 / 1024


image_service = ImageService()
