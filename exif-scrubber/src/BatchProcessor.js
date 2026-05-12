const fs = require('fs');
const path = require('path');
const ExifReader = require('./ExifReader');
const GpsStripper = require('./GpsStripper');

class BatchProcessor {
  constructor() {
    this.exifReader = new ExifReader();
    this.gpsStripper = new GpsStripper();
    this.supportedExtensions = ['.jpg', '.jpeg'];
  }

  findImagesInDirectory(directoryPath, recursive = true) {
    const results = [];

    const scanDirectory = (dir) => {
      const items = fs.readdirSync(dir);

      for (const item of items) {
        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory() && recursive) {
          scanDirectory(fullPath);
        } else if (stat.isFile()) {
          const ext = path.extname(item).toLowerCase();
          if (this.supportedExtensions.includes(ext)) {
            results.push(fullPath);
          }
        }
      }
    };

    if (!fs.existsSync(directoryPath)) {
      throw new Error(`目录不存在: ${directoryPath}`);
    }

    const stat = fs.statSync(directoryPath);
    if (!stat.isDirectory()) {
      throw new Error(`不是目录: ${directoryPath}`);
    }

    scanDirectory(directoryPath);
    return results;
  }

  scanDirectory(directoryPath, options = {}) {
    const {
      recursive = true,
      showAll = false
    } = options;

    const images = this.findImagesInDirectory(directoryPath, recursive);
    const results = [];

    for (const imagePath of images) {
      try {
        const info = this.exifReader.getSummary(imagePath);
        if (showAll || info.hasGps) {
          results.push(info);
        }
      } catch (error) {
        results.push({
          file: imagePath,
          error: error.message
        });
      }
    }

    return {
      directory: directoryPath,
      totalImages: images.length,
      withGps: results.filter(r => r.hasGps).length,
      withoutGps: results.filter(r => r.hasGps === false).length,
      images: results
    };
  }

  processDirectory(inputDir, options = {}) {
    const {
      recursive = true,
      outputDir = null,
      overwrite = false,
      outputSuffix = '_clean',
      removeAllExif = false,
      dryRun = false
    } = options;

    const images = this.findImagesInDirectory(inputDir, recursive);
    const results = [];
    let successCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    for (const imagePath of images) {
      try {
        const info = this.exifReader.getSummary(imagePath);
        const hasGps = info.hasGps;

        if (dryRun) {
          results.push({
            file: imagePath,
            hasGps: hasGps,
            wouldProcess: hasGps || removeAllExif,
            dryRun: true
          });
          if (hasGps || removeAllExif) {
            successCount++;
          } else {
            skippedCount++;
          }
          continue;
        }

        let outputPath = null;
        if (!overwrite && outputDir) {
          const relativePath = path.relative(inputDir, imagePath);
          const outputFilePath = path.join(outputDir, relativePath);
          const outputFileDir = path.dirname(outputFilePath);
          if (!fs.existsSync(outputFileDir)) {
            fs.mkdirSync(outputFileDir, { recursive: true });
          }
          outputPath = outputFilePath;
        }

        const processOptions = {
          overwrite,
          outputSuffix,
          removeAllExif
        };

        if (outputPath) {
          processOptions.outputDir = null;
          const result = this.gpsStripper.processImage(imagePath, processOptions);
          if (outputPath && !overwrite) {
            fs.renameSync(result.output, outputPath);
            result.output = outputPath;
          }
          results.push({ ...result, file: imagePath });
        } else {
          const result = this.gpsStripper.processImage(imagePath, processOptions);
          results.push({ ...result, file: imagePath });
        }

        const lastResult = results[results.length - 1];
        if (lastResult.skipped) {
          skippedCount++;
        } else {
          successCount++;
        }
      } catch (error) {
        errorCount++;
        results.push({
          file: imagePath,
          error: error.message,
          success: false
        });
      }
    }

    return {
      inputDir: inputDir,
      outputDir: outputDir,
      totalImages: images.length,
      success: successCount,
      skipped: skippedCount,
      errors: errorCount,
      dryRun: dryRun,
      results: results
    };
  }

  processDirectoryPreserveStructure(inputDir, outputDir, options = {}) {
    const processedOptions = {
      ...options,
      outputDir: outputDir,
      overwrite: false
    };
    return this.processDirectory(inputDir, processedOptions);
  }

  processFiles(fileList, options = {}) {
    const {
      outputDir = null,
      overwrite = false,
      outputSuffix = '_clean',
      removeAllExif = false
    } = options;

    const results = [];
    let successCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    for (const filePath of fileList) {
      if (!fs.existsSync(filePath)) {
        errorCount++;
        results.push({
          file: filePath,
          error: 'File not found',
          success: false
        });
        continue;
      }

      try {
        const processOptions = {
          outputDir,
          overwrite,
          outputSuffix,
          removeAllExif
        };

        const result = this.gpsStripper.processImage(filePath, processOptions);
        results.push({ ...result, file: filePath });

        if (result.skipped) {
          skippedCount++;
        } else {
          successCount++;
        }
      } catch (error) {
        errorCount++;
        results.push({
          file: filePath,
          error: error.message,
          success: false
        });
      }
    }

    return {
      totalFiles: fileList.length,
      success: successCount,
      skipped: skippedCount,
      errors: errorCount,
      results: results
    };
  }

  processAndVerifyDirectory(inputDir, options = {}) {
    const scanResult = this.scanDirectory(inputDir, {
      recursive: options.recursive !== false,
      showAll: false
    });

    const processResult = this.processDirectory(inputDir, options);

    const verifyScan = this.scanDirectory(inputDir, {
      recursive: options.recursive !== false,
      showAll: false
    });

    return {
      before: scanResult,
      after: verifyScan,
      processing: processResult,
      verified: verifyScan.withGps === 0 || processResult.dryRun
    };
  }
}

module.exports = BatchProcessor;
