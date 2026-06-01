import os
import uuid
import asyncio
from typing import Optional
from pathlib import Path


class AudioService:
    def __init__(self, upload_dir: str = "./uploads"):
        self.upload_dir = Path(upload_dir)
        self.upload_dir.mkdir(parents=True, exist_ok=True)

    async def save_audio(self, file_content: bytes, original_filename: str) -> tuple[str, str]:
        file_ext = os.path.splitext(original_filename)[1] or ".webm"
        unique_filename = f"{uuid.uuid4()}{file_ext}"
        file_path = self.upload_dir / unique_filename

        with open(file_path, "wb") as f:
            f.write(file_content)

        return str(unique_filename), str(file_path)

    async def convert_to_wav(self, input_path: str) -> str:
        try:
            import ffmpeg
        except ImportError:
            return input_path

        output_path = str(Path(input_path).with_suffix(".wav"))
        
        if os.path.exists(output_path):
            return output_path

        try:
            loop = asyncio.get_event_loop()
            await loop.run_in_executor(
                None,
                lambda: (
                    ffmpeg
                    .input(input_path)
                    .output(output_path, ac=1, ar='16000')
                    .overwrite_output()
                    .run(quiet=True)
                )
            )
            return output_path
        except Exception as e:
            return input_path

    def get_audio_path(self, filename: str) -> Optional[Path]:
        file_path = self.upload_dir / filename
        return file_path if file_path.exists() else None
