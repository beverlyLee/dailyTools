import os
from datetime import datetime
from typing import Optional, Dict, Any
from PIL import Image
from PIL.ExifTags import TAGS, GPSTAGS

try:
    import exifread
    HAS_EXIFREAD = True
except ImportError:
    HAS_EXIFREAD = False

class EXIFUtils:
    def __init__(self):
        pass
    
    def get_exif_data(self, image_path: str) -> Dict[str, Any]:
        exif_data = {}
        
        try:
            with Image.open(image_path) as img:
                if hasattr(img, '_getexif'):
                    exif = img._getexif()
                    if exif:
                        for tag_id, value in exif.items():
                            tag = TAGS.get(tag_id, tag_id)
                            if tag == "GPSInfo":
                                gps_data = {}
                                for gps_tag_id, gps_value in value.items():
                                    gps_tag = GPSTAGS.get(gps_tag_id, gps_tag_id)
                                    gps_data[gps_tag] = gps_value
                                exif_data[tag] = gps_data
                            else:
                                exif_data[tag] = value
        except Exception:
            pass
        
        if not exif_data and HAS_EXIFREAD:
            try:
                with open(image_path, 'rb') as f:
                    tags = exifread.process_file(f, details=False)
                    for tag, value in tags.items():
                        exif_data[tag] = str(value)
            except Exception:
                pass
        
        return exif_data
    
    def get_date_time(self, image_path: str) -> Optional[datetime]:
        exif_data = self.get_exif_data(image_path)
        
        date_time = exif_data.get("DateTime") or exif_data.get("Image DateTime")
        if date_time:
            try:
                return datetime.strptime(str(date_time), "%Y:%m:%d %H:%M:%S")
            except Exception:
                pass
        
        return None
    
    def get_date_time_original(self, image_path: str) -> Optional[datetime]:
        exif_data = self.get_exif_data(image_path)
        
        date_time = exif_data.get("DateTimeOriginal") or exif_data.get("EXIF DateTimeOriginal")
        if date_time:
            try:
                return datetime.strptime(str(date_time), "%Y:%m:%d %H:%M:%S")
            except Exception:
                pass
        
        return None
    
    def get_date_time_digitized(self, image_path: str) -> Optional[datetime]:
        exif_data = self.get_exif_data(image_path)
        
        date_time = exif_data.get("DateTimeDigitized") or exif_data.get("EXIF DateTimeDigitized")
        if date_time:
            try:
                return datetime.strptime(str(date_time), "%Y:%m:%d %H:%M:%S")
            except Exception:
                pass
        
        return None
    
    def get_make(self, image_path: str) -> Optional[str]:
        exif_data = self.get_exif_data(image_path)
        make = exif_data.get("Make") or exif_data.get("Image Make")
        return str(make).strip() if make else None
    
    def get_model(self, image_path: str) -> Optional[str]:
        exif_data = self.get_exif_data(image_path)
        model = exif_data.get("Model") or exif_data.get("Image Model")
        return str(model).strip() if model else None
    
    def get_lens_model(self, image_path: str) -> Optional[str]:
        exif_data = self.get_exif_data(image_path)
        lens = exif_data.get("LensModel") or exif_data.get("EXIF LensModel")
        return str(lens).strip() if lens else None
    
    def get_iso(self, image_path: str) -> Optional[int]:
        exif_data = self.get_exif_data(image_path)
        iso = exif_data.get("ISOSpeedRatings") or exif_data.get("EXIF ISOSpeedRatings")
        if iso:
            try:
                return int(iso)
            except Exception:
                pass
        return None
    
    def get_aperture(self, image_path: str) -> Optional[float]:
        exif_data = self.get_exif_data(image_path)
        aperture = exif_data.get("ApertureValue") or exif_data.get("EXIF ApertureValue")
        if aperture:
            try:
                if hasattr(aperture, 'num') and hasattr(aperture, 'den'):
                    val = aperture.num / aperture.den
                else:
                    val = float(aperture)
                return round(val, 2)
            except Exception:
                pass
        
        fnumber = exif_data.get("FNumber") or exif_data.get("EXIF FNumber")
        if fnumber:
            try:
                if hasattr(fnumber, 'num') and hasattr(fnumber, 'den'):
                    val = fnumber.num / fnumber.den
                else:
                    val = float(fnumber)
                return round(val, 2)
            except Exception:
                pass
        
        return None
    
    def get_shutter_speed(self, image_path: str) -> Optional[str]:
        exif_data = self.get_exif_data(image_path)
        shutter = exif_data.get("ExposureTime") or exif_data.get("EXIF ExposureTime")
        
        if shutter:
            try:
                if hasattr(shutter, 'num') and hasattr(shutter, 'den'):
                    num = shutter.num
                    den = shutter.den
                    if num == 1:
                        return f"1/{den}"
                    val = num / den
                    if val < 1:
                        return f"1/{int(den/num)}"
                    return f"{val:.2f}"
                else:
                    val = float(shutter)
                    if val < 1:
                        return f"1/{int(1/val)}"
                    return f"{val:.2f}"
            except Exception:
                pass
        
        return None
    
    def get_focal_length(self, image_path: str) -> Optional[float]:
        exif_data = self.get_exif_data(image_path)
        focal = exif_data.get("FocalLength") or exif_data.get("EXIF FocalLength")
        
        if focal:
            try:
                if hasattr(focal, 'num') and hasattr(focal, 'den'):
                    val = focal.num / focal.den
                else:
                    val = float(focal)
                return round(val, 1)
            except Exception:
                pass
        
        return None
    
    def get_orientation(self, image_path: str) -> Optional[int]:
        exif_data = self.get_exif_data(image_path)
        orientation = exif_data.get("Orientation")
        if orientation:
            try:
                return int(orientation)
            except Exception:
                pass
        return None
    
    def get_image_dimensions(self, image_path: str) -> Optional[tuple]:
        exif_data = self.get_exif_data(image_path)
        
        width = exif_data.get("ExifImageWidth") or exif_data.get("EXIF ExifImageWidth")
        height = exif_data.get("ExifImageHeight") or exif_data.get("EXIF ExifImageHeight")
        
        if width and height:
            try:
                return (int(width), int(height))
            except Exception:
                pass
        
        return None
    
    def get_gps_info(self, image_path: str) -> Optional[Dict[str, Any]]:
        exif_data = self.get_exif_data(image_path)
        gps_info = exif_data.get("GPSInfo")
        
        if gps_info:
            result = {}
            
            lat = gps_info.get("GPSLatitude")
            lat_ref = gps_info.get("GPSLatitudeRef")
            lon = gps_info.get("GPSLongitude")
            lon_ref = gps_info.get("GPSLongitudeRef")
            
            if lat and lat_ref and lon and lon_ref:
                try:
                    lat_decimal = self._convert_to_degrees(lat)
                    lon_decimal = self._convert_to_degrees(lon)
                    
                    if lat_ref == "S":
                        lat_decimal = -lat_decimal
                    if lon_ref == "W":
                        lon_decimal = -lon_decimal
                    
                    result["latitude"] = lat_decimal
                    result["longitude"] = lon_decimal
                except Exception:
                    pass
            
            altitude = gps_info.get("GPSAltitude")
            if altitude:
                try:
                    if hasattr(altitude, 'num') and hasattr(altitude, 'den'):
                        result["altitude"] = altitude.num / altitude.den
                    else:
                        result["altitude"] = float(altitude)
                except Exception:
                    pass
            
            return result if result else None
        
        return None
    
    def _convert_to_degrees(self, value) -> float:
        if hasattr(value, '__iter__') and len(value) >= 3:
            degrees = value[0]
            minutes = value[1]
            seconds = value[2]
            
            if hasattr(degrees, 'num') and hasattr(degrees, 'den'):
                degrees = degrees.num / degrees.den if degrees.den != 0 else 0
            if hasattr(minutes, 'num') and hasattr(minutes, 'den'):
                minutes = minutes.num / minutes.den if minutes.den != 0 else 0
            if hasattr(seconds, 'num') and hasattr(seconds, 'den'):
                seconds = seconds.num / seconds.den if seconds.den != 0 else 0
            
            return float(degrees) + float(minutes) / 60 + float(seconds) / 3600
        
        return float(value) if value else 0.0
    
    def has_exif(self, image_path: str) -> bool:
        exif_data = self.get_exif_data(image_path)
        return len(exif_data) > 0
    
    def get_summary(self, image_path: str) -> Dict[str, Any]:
        summary = {
            "has_exif": self.has_exif(image_path),
            "camera_make": self.get_make(image_path),
            "camera_model": self.get_model(image_path),
            "lens_model": self.get_lens_model(image_path),
            "date_time": self.get_date_time(image_path),
            "date_time_original": self.get_date_time_original(image_path),
            "iso": self.get_iso(image_path),
            "aperture": self.get_aperture(image_path),
            "shutter_speed": self.get_shutter_speed(image_path),
            "focal_length": self.get_focal_length(image_path),
            "orientation": self.get_orientation(image_path),
            "gps_info": self.get_gps_info(image_path)
        }
        
        for key, value in summary.items():
            if isinstance(value, datetime):
                summary[key] = value.isoformat()
        
        return summary
