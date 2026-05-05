import os
import re
from datetime import datetime
from typing import Optional, List, Dict, Any
from dataclasses import dataclass, field
from batch_image_processor.utils.exif_utils import EXIFUtils


@dataclass
class RenameRule:
    id: Optional[int] = None
    name: str = ""
    description: str = ""
    
    use_sequence: bool = True
    sequence_start: int = 1
    sequence_padding: int = 4
    sequence_prefix: str = ""
    sequence_suffix: str = ""
    
    use_date: bool = False
    date_format: str = "%Y%m%d"
    date_source: str = "file_modified"
    
    use_exif: bool = False
    exif_fields: str = ""
    
    use_custom_text: bool = False
    custom_text: str = ""
    custom_text_position: str = "prefix"
    
    separator: str = "_"
    
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class RuleEngine:
    DATE_FORMATS = {
        "%Y%m%d": "20240504",
        "%Y-%m-%d": "2024-05-04",
        "%d%m%Y": "04052024",
        "%d-%m-%Y": "04-05-2024",
        "%Y%m%d_%H%M%S": "20240504_143022",
        "%Y%m%d-%H%M%S": "20240504-143022",
    }
    
    DATE_SOURCES = [
        "file_modified", "file_created", 
        "exif_date_time", "exif_original"
    ]
    
    EXIF_FIELD_OPTIONS = [
        "MAKE", "MODEL", "LENS", "ISO", 
        "APERTURE", "SHUTTER", "FOCAL", 
        "DATETIME", "ORIGINAL_DATE"
    ]
    
    def __init__(self, rule: RenameRule = None):
        self.rule = rule or RenameRule()
        self.exif_utils = EXIFUtils()
    
    def generate_filename(
        self, 
        image_path: str, 
        index: int = 1, 
        total: int = 1
    ) -> str:
        parts = []
        
        base_name, original_ext = os.path.splitext(os.path.basename(image_path))
        original_ext = original_ext.lstrip(".")
        
        if self.rule.use_custom_text and self.rule.custom_text_position == "prefix":
            if self.rule.custom_text:
                parts.append(self._sanitize_text(self.rule.custom_text))
        
        if self.rule.use_date:
            date_str = self._get_date_string(image_path)
            if date_str:
                parts.append(date_str)
        
        if self.rule.use_exif:
            exif_str = self._get_exif_string(image_path)
            if exif_str:
                parts.append(exif_str)
        
        if self.rule.use_sequence:
            sequence_str = self._get_sequence_string(index, total)
            if sequence_str:
                parts.append(sequence_str)
        
        if self.rule.use_custom_text and self.rule.custom_text_position == "suffix":
            if self.rule.custom_text:
                parts.append(self._sanitize_text(self.rule.custom_text))
        
        if not parts:
            parts.append(base_name)
        
        separator = self.rule.separator or "_"
        filename = separator.join(parts)
        
        return f"{filename}.{original_ext}"
    
    def _get_sequence_string(self, index: int, total: int) -> str:
        start = self.rule.sequence_start or 1
        padding = self.rule.sequence_padding or 4
        
        sequence_num = start + index - 1
        
        sequence_str = str(sequence_num).zfill(padding)
        
        prefix = self.rule.sequence_prefix or ""
        suffix = self.rule.sequence_suffix or ""
        
        return f"{prefix}{sequence_str}{suffix}"
    
    def _get_date_string(self, image_path: str) -> str:
        date_source = self.rule.date_source or "file_modified"
        date_format = self.rule.date_format or "%Y%m%d"
        
        try:
            if date_source == "file_modified":
                timestamp = os.path.getmtime(image_path)
                dt = datetime.fromtimestamp(timestamp)
            elif date_source == "file_created":
                timestamp = os.path.getctime(image_path)
                dt = datetime.fromtimestamp(timestamp)
            elif date_source == "exif_date_time":
                exif_date = self.exif_utils.get_date_time(image_path)
                if exif_date:
                    return exif_date.strftime(date_format)
                timestamp = os.path.getmtime(image_path)
                dt = datetime.fromtimestamp(timestamp)
            elif date_source == "exif_original":
                exif_date = self.exif_utils.get_date_time_original(image_path)
                if exif_date:
                    return exif_date.strftime(date_format)
                timestamp = os.path.getmtime(image_path)
                dt = datetime.fromtimestamp(timestamp)
            else:
                timestamp = os.path.getmtime(image_path)
                dt = datetime.fromtimestamp(timestamp)
            
            return dt.strftime(date_format)
        except Exception:
            return ""
    
    def _get_exif_string(self, image_path: str) -> str:
        fields = self.rule.exif_fields or ""
        if not fields:
            return ""
        
        field_list = [f.strip() for f in fields.split(",")]
        values = []
        
        for field in field_list:
            field = field.upper()
            value = None
            
            try:
                if field == "MAKE":
                    value = self.exif_utils.get_make(image_path)
                elif field == "MODEL":
                    value = self.exif_utils.get_model(image_path)
                elif field == "LENS":
                    value = self.exif_utils.get_lens_model(image_path)
                elif field == "ISO":
                    iso = self.exif_utils.get_iso(image_path)
                    value = f"ISO{iso}" if iso else None
                elif field == "APERTURE":
                    aperture = self.exif_utils.get_aperture(image_path)
                    value = f"f{aperture}" if aperture else None
                elif field == "SHUTTER":
                    shutter = self.exif_utils.get_shutter_speed(image_path)
                    value = f"{shutter}s" if shutter else None
                elif field == "FOCAL":
                    focal = self.exif_utils.get_focal_length(image_path)
                    value = f"{focal}mm" if focal else None
                elif field == "DATETIME":
                    dt = self.exif_utils.get_date_time(image_path)
                    value = dt.strftime("%Y%m%d") if dt else None
                elif field == "ORIGINAL_DATE":
                    dt = self.exif_utils.get_date_time_original(image_path)
                    value = dt.strftime("%Y%m%d") if dt else None
            except Exception:
                pass
            
            if value:
                values.append(self._sanitize_text(str(value)))
        
        return "_".join(values) if values else ""
    
    def _sanitize_text(self, text: str) -> str:
        invalid_chars = r'[<>:"/\\|?*]'
        sanitized = re.sub(invalid_chars, "_", text)
        sanitized = sanitized.strip()
        return sanitized
    
    def generate_batch_filenames(
        self, 
        image_paths: List[str]
    ) -> List[Dict[str, Any]]:
        results = []
        
        for index, image_path in enumerate(image_paths, 1):
            try:
                new_filename = self.generate_filename(
                    image_path, 
                    index, 
                    len(image_paths)
                )
                
                results.append({
                    "original_path": image_path,
                    "original_filename": os.path.basename(image_path),
                    "new_filename": new_filename,
                    "success": True
                })
            except Exception as e:
                results.append({
                    "original_path": image_path,
                    "original_filename": os.path.basename(image_path),
                    "new_filename": None,
                    "success": False,
                    "error": str(e)
                })
        
        return results
    
    def validate_rule(self) -> Dict[str, Any]:
        issues = []
        
        if not self.rule.use_sequence and not self.rule.use_date and \
           not self.rule.use_exif and not self.rule.use_custom_text:
            issues.append("至少需要启用一种命名规则组件")
        
        if self.rule.use_sequence:
            if self.rule.sequence_padding < 1 or self.rule.sequence_padding > 10:
                issues.append("序号填充位数应在 1-10 之间")
            if self.rule.sequence_start < 0:
                issues.append("序号起始值不能为负数")
        
        if self.rule.use_date:
            try:
                datetime.now().strftime(self.rule.date_format)
            except Exception:
                issues.append(f"无效的日期格式: {self.rule.date_format}")
        
        if self.rule.use_custom_text:
            if self.rule.custom_text and len(self.rule.custom_text) > 100:
                issues.append("自定义文本长度不能超过 100 个字符")
            
            valid_positions = ["prefix", "suffix", "none"]
            if self.rule.custom_text_position and \
               self.rule.custom_text_position not in valid_positions:
                issues.append(f"无效的自定义文本位置: {self.rule.custom_text_position}")
        
        if self.rule.separator and len(self.rule.separator) > 5:
            issues.append("分隔符长度不能超过 5 个字符")
        
        return {
            "valid": len(issues) == 0,
            "issues": issues
        }
    
    def preview_example(self, sample_path: str = None) -> Dict[str, str]:
        example_path = sample_path or "/tmp/example.jpg"
        
        preview = {
            "sequence": "",
            "date": "",
            "exif": "",
            "custom_text": "",
            "final_example": ""
        }
        
        if self.rule.use_sequence:
            preview["sequence"] = self._get_sequence_string(1, 10)
        
        if self.rule.use_date:
            preview["date"] = datetime.now().strftime(self.rule.date_format or "%Y%m%d")
        
        if self.rule.use_custom_text:
            preview["custom_text"] = self._sanitize_text(self.rule.custom_text)
        
        parts = []
        if self.rule.use_custom_text and self.rule.custom_text_position == "prefix":
            if self.rule.custom_text:
                parts.append(preview["custom_text"])
        if self.rule.use_date:
            parts.append(preview["date"])
        if self.rule.use_sequence:
            parts.append(preview["sequence"])
        if self.rule.use_custom_text and self.rule.custom_text_position == "suffix":
            if self.rule.custom_text:
                parts.append(preview["custom_text"])
        
        separator = self.rule.separator or "_"
        if parts:
            preview["final_example"] = separator.join(parts) + ".jpg"
        else:
            preview["final_example"] = "example.jpg"
        
        return preview
