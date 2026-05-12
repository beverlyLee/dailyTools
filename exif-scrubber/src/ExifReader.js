const fs = require('fs');
const piexif = require('piexifjs');

class ExifReader {
  constructor() {
    this.gpsTags = {
      0x0000: 'GPSVersionID',
      0x0001: 'GPSLatitudeRef',
      0x0002: 'GPSLatitude',
      0x0003: 'GPSLongitudeRef',
      0x0004: 'GPSLongitude',
      0x0005: 'GPSAltitudeRef',
      0x0006: 'GPSAltitude',
      0x0007: 'GPSTimeStamp',
      0x0008: 'GPSSatellites',
      0x0009: 'GPSStatus',
      0x000A: 'GPSMeasureMode',
      0x000B: 'GPSDOP',
      0x000C: 'GPSSpeedRef',
      0x000D: 'GPSSpeed',
      0x000E: 'GPSTrackRef',
      0x000F: 'GPSTrack',
      0x0010: 'GPSImgDirectionRef',
      0x0011: 'GPSImgDirection',
      0x0012: 'GPSMapDatum',
      0x0013: 'GPSDestLatitudeRef',
      0x0014: 'GPSDestLatitude',
      0x0015: 'GPSDestLongitudeRef',
      0x0016: 'GPSDestLongitude',
      0x0017: 'GPSDestBearingRef',
      0x0018: 'GPSDestBearing',
      0x0019: 'GPSDestDistanceRef',
      0x001A: 'GPSDestDistance',
      0x001C: 'GPSProcessingMethod',
      0x001D: 'GPSAreaInformation',
      0x001E: 'GPSDateStamp',
      0x001F: 'GPSDifferential'
    };
  }

  loadImage(imagePath) {
    if (!fs.existsSync(imagePath)) {
      throw new Error(`文件不存在: ${imagePath}`);
    }
    const jpegData = fs.readFileSync(imagePath);
    return jpegData.toString('binary');
  }

  getExifData(imagePath) {
    try {
      const binaryData = this.loadImage(imagePath);
      const exifData = piexif.load(binaryData);
      return this.formatExifData(exifData);
    } catch (error) {
      return {
        hasGps: false,
        error: error.message
      };
    }
  }

  formatExifData(exifData) {
    const result = {
      hasGps: false,
      gpsInfo: {},
      basicInfo: {
        image: {},
        photo: {},
        exif: {}
      }
    };

    if (exifData['GPS'] && Object.keys(exifData['GPS']).length > 0) {
      result.hasGps = true;
      result.gpsInfo = this.formatGpsInfo(exifData['GPS']);
    }

    if (exifData['0th']) {
      result.basicInfo.image = this.formatImageInfo(exifData['0th']);
    }

    if (exifData['Exif']) {
      result.basicInfo.exif = this.formatExifInfo(exifData['Exif']);
    }

    if (exifData['1st']) {
      result.basicInfo.photo = this.formatPhotoInfo(exifData['1st']);
    }

    return result;
  }

  formatGpsInfo(gpsData) {
    const result = {};
    for (const [tagId, value] of Object.entries(gpsData)) {
      const tagName = this.gpsTags[tagId] || `UnknownTag_${tagId}`;
      result[tagName] = this.formatGpsValue(tagId, value);
    }
    return result;
  }

  formatGpsValue(tagId, value) {
    if (tagId == 0x0002 || tagId == 0x0004) {
      return this.coordinateToDecimal(value);
    }
    if (tagId == 0x0006) {
      return typeof value === 'object' && value.length === 2
        ? value[0] / value[1]
        : value;
    }
    return value;
  }

  coordinateToDecimal(coordinate) {
    if (!coordinate || coordinate.length !== 3) return coordinate;
    const [degrees, minutes, seconds] = coordinate;
    const deg = degrees[0] / degrees[1];
    const min = minutes[0] / minutes[1] / 60;
    const sec = seconds[0] / seconds[1] / 3600;
    return deg + min + sec;
  }

  formatImageInfo(imageData) {
    const mapping = {
      271: 'Make',
      272: 'Model',
      274: 'Orientation',
      282: 'XResolution',
      283: 'YResolution',
      306: 'DateTime'
    };
    return this.mapTags(imageData, mapping);
  }

  formatExifInfo(exifData) {
    const mapping = {
      36867: 'DateTimeOriginal',
      36868: 'DateTimeDigitized',
      37510: 'UserComment',
      34850: 'ExposureProgram',
      33434: 'ExposureTime',
      33437: 'FNumber',
      34855: 'ISOSpeedRatings',
      37386: 'FocalLength'
    };
    return this.mapTags(exifData, mapping);
  }

  formatPhotoInfo(photoData) {
    const mapping = {
      271: 'Make',
      272: 'Model',
      306: 'DateTime'
    };
    return this.mapTags(photoData, mapping);
  }

  mapTags(data, mapping) {
    const result = {};
    for (const [tagId, tagName] of Object.entries(mapping)) {
      if (data[tagId]) {
        result[tagName] = data[tagId];
      }
    }
    return result;
  }

  hasGpsInfo(imagePath) {
    const info = this.getExifData(imagePath);
    return info.hasGps;
  }

  getSummary(imagePath) {
    const data = this.getExifData(imagePath);
    const summary = {
      file: imagePath,
      hasGps: data.hasGps
    };

    if (data.basicInfo.image.Make) {
      summary.camera = `${data.basicInfo.image.Make} ${data.basicInfo.image.Model || ''}`.trim();
    }

    if (data.basicInfo.image.DateTime) {
      summary.dateTaken = data.basicInfo.image.DateTime;
    } else if (data.basicInfo.exif.DateTimeOriginal) {
      summary.dateTaken = data.basicInfo.exif.DateTimeOriginal;
    }

    if (data.hasGps) {
      summary.gps = {
        latitude: data.gpsInfo.GPSLatitude,
        latitudeRef: data.gpsInfo.GPSLatitudeRef,
        longitude: data.gpsInfo.GPSLongitude,
        longitudeRef: data.gpsInfo.GPSLongitudeRef,
        altitude: data.gpsInfo.GPSAltitude
      };
    }

    return summary;
  }
}

module.exports = ExifReader;
