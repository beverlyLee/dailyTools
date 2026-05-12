const fs = require('fs');
const path = require('path');
const piexif = require('piexifjs');
const ExifReader = require('./ExifReader');

class GpsStripper {
  constructor() {
    this.exifReader = new ExifReader();
  }

  stripGpsFromFile(inputPath, outputPath = null) {
    const binaryData = this.exifReader.loadImage(inputPath);
    const exifData = piexif.load(binaryData);
    const hadGps = exifData['GPS'] && Object.keys(exifData['GPS']).length > 0;

    const newExifData = JSON.parse(JSON.stringify(exifData));
    newExifData['GPS'] = {};

    if (newExifData['0th'] && newExifData['0th'][34853]) {
      delete newExifData['0th'][34853];
    }

    const exifBytes = piexif.dump(newExifData);
    const newImageData = piexif.insert(exifBytes, binaryData);

    const output = outputPath || inputPath;
    fs.writeFileSync(output, newImageData, 'binary');

    return {
      success: true,
      input: inputPath,
      output: output,
      wasOverwritten: !outputPath,
      gpsRemoved: hadGps
    };
  }

  stripGpsFromData(binaryData) {
    const exifData = piexif.load(binaryData);

    const newExifData = JSON.parse(JSON.stringify(exifData));
    newExifData['GPS'] = {};

    if (newExifData['0th'] && newExifData['0th'][34853]) {
      delete newExifData['0th'][34853];
    }

    const exifBytes = piexif.dump(newExifData);
    return piexif.insert(exifBytes, binaryData);
  }

  removeAllExif(inputPath, outputPath = null) {
    const binaryData = this.exifReader.loadImage(inputPath);
    const exifBytes = piexif.dump({});
    const newImageData = piexif.insert(exifBytes, binaryData);

    const output = outputPath || inputPath;
    fs.writeFileSync(output, newImageData, 'binary');

    return {
      success: true,
      input: inputPath,
      output: output,
      wasOverwritten: !outputPath,
      allExifRemoved: true
    };
  }

  processImage(inputPath, options = {}) {
    const {
      outputDir = null,
      outputSuffix = '_clean',
      overwrite = false,
      removeAllExif = false
    } = options;

    const inputInfo = this.exifReader.getSummary(inputPath);
    const hasGps = inputInfo.hasGps;

    if (!hasGps && !removeAllExif) {
      return {
        success: true,
        skipped: true,
        reason: 'No GPS data to remove',
        file: inputPath
      };
    }

    let outputPath = null;
    if (!overwrite) {
      if (outputDir) {
        if (!fs.existsSync(outputDir)) {
          fs.mkdirSync(outputDir, { recursive: true });
        }
        const fileName = path.basename(inputPath);
        outputPath = path.join(outputDir, fileName);
      } else {
        const ext = path.extname(inputPath);
        const baseName = path.basename(inputPath, ext);
        const dirName = path.dirname(inputPath);
        outputPath = path.join(dirName, `${baseName}${outputSuffix}${ext}`);
      }
    }

    if (removeAllExif) {
      return this.removeAllExif(inputPath, outputPath);
    }

    return this.stripGpsFromFile(inputPath, outputPath);
  }

  stripAndVerify(inputPath, options = {}) {
    const beforeInfo = this.exifReader.getSummary(inputPath);
    
    if (!beforeInfo.hasGps) {
      return {
        success: true,
        skipped: true,
        reason: 'No GPS data found in image',
        before: beforeInfo,
        after: beforeInfo
      };
    }

    const result = this.processImage(inputPath, options);

    const verifyPath = result.output || inputPath;
    const afterInfo = this.exifReader.getSummary(verifyPath);

    return {
      success: true,
      processed: true,
      result: result,
      before: beforeInfo,
      after: afterInfo,
      gpsRemoved: !afterInfo.hasGps,
      verified: !afterInfo.hasGps
    };
  }
}

module.exports = GpsStripper;
