const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

class ImageResizer {
  constructor(options = {}) {
    this.options = {
      targetSize: options.targetSize || 1000,
      ratio: options.ratio || '1:1',
      mode: options.mode || 'smart',
      bgColor: options.bgColor || '#ffffff',
      quality: options.quality || 90,
      removeBackground: options.removeBackground || false,
      ...options
    };
  }

  parseRatio(ratio) {
    const [w, h] = ratio.split(':').map(Number);
    return { widthRatio: w, heightRatio: h };
  }

  hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : { r: 255, g: 255, b: 255 };
  }

  async getOrientatedImage(imagePath) {
    const tempDir = path.dirname(imagePath);
    const tempName = `oriented_${Date.now()}_${Math.round(Math.random() * 100000)}.png`;
    const tempPath = path.join(tempDir, tempName);

    await sharp(imagePath)
      .rotate()
      .toFormat('png')
      .toFile(tempPath);

    const metadata = await sharp(tempPath).metadata();

    return {
      path: tempPath,
      width: metadata.width,
      height: metadata.height,
      channels: metadata.channels || 3
    };
  }

  cleanupTempFile(filePath) {
    try {
      if (filePath && fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (e) {}
  }

  async detectSubject(imagePath) {
    try {
      const image = sharp(imagePath);
      const metadata = await image.metadata();

      const { width, height } = metadata;

      const smallSize = 150;
      const smallImage = await image
        .resize(smallSize, smallSize, { fit: 'inside', withoutEnlargement: true })
        .toColourspace('lab')
        .raw()
        .toBuffer();

      const cols = Math.min(smallSize, width);
      const rows = Math.min(smallSize, height);

      const luminanceData = [];
      for (let i = 0; i < smallImage.length; i += 3) {
        luminanceData.push(smallImage[i]);
      }

      const saliencyMap = this.calculateSaliency(luminanceData, cols, rows);
      const subjectRegion = this.findSubjectRegion(saliencyMap, cols, rows, width, height);

      const expandedRegion = this.expandSubjectRegion(subjectRegion, width, height, 0.15);

      return {
        width,
        height,
        subjectRegion: expandedRegion
      };
    } catch (error) {
      console.warn('主体检测失败，使用默认区域:', error.message);
      const metadata = await sharp(imagePath).metadata();
      return {
        width: metadata.width,
        height: metadata.height,
        subjectRegion: {
          left: 0,
          top: 0,
          width: metadata.width,
          height: metadata.height,
          centerX: metadata.width / 2,
          centerY: metadata.height / 2
        }
      };
    }
  }

  expandSubjectRegion(region, imageWidth, imageHeight, expandRatio = 0.1) {
    const expandX = region.width * expandRatio;
    const expandY = region.height * expandRatio;

    const newLeft = Math.max(0, region.left - expandX);
    const newTop = Math.max(0, region.top - expandY);
    const newWidth = Math.min(imageWidth - newLeft, region.width + expandX * 2);
    const newHeight = Math.min(imageHeight - newTop, region.height + expandY * 2);

    return {
      left: newLeft,
      top: newTop,
      width: newWidth,
      height: newHeight,
      centerX: newLeft + newWidth / 2,
      centerY: newTop + newHeight / 2
    };
  }

  calculateSaliency(luminance, cols, rows) {
    const saliency = new Array(rows * cols).fill(0);
    const centerX = cols / 2;
    const centerY = rows / 2;

    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const idx = y * cols + x;
        const lum = luminance[idx] || 128;

        let localContrast = 0;
        let count = 0;
        const radius = 3;

        for (let dy = -radius; dy <= radius; dy++) {
          for (let dx = -radius; dx <= radius; dx++) {
            const nx = x + dx;
            const ny = y + dy;
            if (nx >= 0 && nx < cols && ny >= 0 && ny < rows) {
              const nIdx = ny * cols + nx;
              localContrast += Math.abs(lum - (luminance[nIdx] || 128));
              count++;
            }
          }
        }

        const distanceFromCenter = Math.sqrt(
          Math.pow(x - centerX, 2) + Math.pow(y - centerY, 2)
        );
        const maxDistance = Math.sqrt(Math.pow(cols / 2, 2) + Math.pow(rows / 2, 2));
        const centerBias = 1 - (distanceFromCenter / maxDistance * 0.4);

        saliency[idx] = (localContrast / count) * centerBias;
      }
    }

    return saliency;
  }

  findSubjectRegion(saliency, cols, rows, originalWidth, originalHeight) {
    let totalX = 0;
    let totalY = 0;
    let totalWeight = 0;
    let maxSaliency = 0;

    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const idx = y * cols + x;
        const weight = saliency[idx];
        totalX += x * weight;
        totalY += y * weight;
        totalWeight += weight;
        maxSaliency = Math.max(maxSaliency, weight);
      }
    }

    if (totalWeight === 0) {
      return {
        left: 0,
        top: 0,
        width: originalWidth,
        height: originalHeight,
        centerX: originalWidth / 2,
        centerY: originalHeight / 2
      };
    }

    const scaleX = originalWidth / cols;
    const scaleY = originalHeight / rows;

    const centerX = (totalX / totalWeight) * scaleX;
    const centerY = (totalY / totalWeight) * scaleY;

    let minX = cols, maxX = 0, minY = rows, maxY = 0;
    const threshold = maxSaliency * 0.2;

    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        if (saliency[y * cols + x] >= threshold) {
          minX = Math.min(minX, x);
          maxX = Math.max(maxX, x);
          minY = Math.min(minY, y);
          maxY = Math.max(maxY, y);
        }
      }
    }

    if (maxX < minX) {
      minX = 0;
      maxX = cols;
      minY = 0;
      maxY = rows;
    }

    const padding = Math.round((maxX - minX + maxY - minY) / 4 * 0.15);
    minX = Math.max(0, minX - padding);
    maxX = Math.min(cols - 1, maxX + padding);
    minY = Math.max(0, minY - padding);
    maxY = Math.min(rows - 1, maxY + padding);

    return {
      left: minX * scaleX,
      top: minY * scaleY,
      width: (maxX - minX + 1) * scaleX,
      height: (maxY - minY + 1) * scaleY,
      centerX,
      centerY
    };
  }

  calculateSafeCropRegion(originalWidth, originalHeight, targetAspect, subject) {
    const subjectLeft = subject.left;
    const subjectTop = subject.top;
    const subjectWidth = subject.width;
    const subjectHeight = subject.height;
    const subjectRight = subjectLeft + subjectWidth;
    const subjectBottom = subjectTop + subjectHeight;

    const originalAspect = originalWidth / originalHeight;

    let cropWidth, cropHeight;
    let left = 0, top = 0;

    if (originalAspect > targetAspect) {
      cropHeight = originalHeight;
      cropWidth = Math.round(originalHeight * targetAspect);

      const requiredLeft = Math.max(0, subjectLeft - 5);
      const requiredRight = Math.min(originalWidth, subjectRight + 5);
      const requiredWidth = requiredRight - requiredLeft;

      if (cropWidth >= requiredWidth) {
        const subjectCenterX = subjectLeft + subjectWidth / 2;
        left = Math.max(0, Math.min(originalWidth - cropWidth, subjectCenterX - cropWidth / 2));
        left = Math.min(left, requiredLeft);
        left = Math.max(left, requiredRight - cropWidth);
      } else {
        left = requiredLeft;
        cropWidth = requiredWidth;
        cropHeight = Math.round(cropWidth / targetAspect);
        top = Math.max(0, Math.min(originalHeight - cropHeight,
          (subjectTop + subjectHeight / 2) - cropHeight / 2));
      }
    } else {
      cropWidth = originalWidth;
      cropHeight = Math.round(originalWidth / targetAspect);

      const requiredTop = Math.max(0, subjectTop - 5);
      const requiredBottom = Math.min(originalHeight, subjectBottom + 5);
      const requiredHeight = requiredBottom - requiredTop;

      if (cropHeight >= requiredHeight) {
        const subjectCenterY = subjectTop + subjectHeight / 2;
        top = Math.max(0, Math.min(originalHeight - cropHeight, subjectCenterY - cropHeight / 2));
        top = Math.min(top, requiredTop);
        top = Math.max(top, requiredBottom - cropHeight);
      } else {
        top = requiredTop;
        cropHeight = requiredHeight;
        cropWidth = Math.round(cropHeight * targetAspect);
        left = Math.max(0, Math.min(originalWidth - cropWidth,
          (subjectLeft + subjectWidth / 2) - cropWidth / 2));
      }
    }

    left = Math.max(0, Math.min(originalWidth - cropWidth, left || 0));
    top = Math.max(0, Math.min(originalHeight - cropHeight, top || 0));

    const finalLeft = Math.max(0, Math.min(originalWidth - cropWidth, Math.round(left)));
    const finalTop = Math.max(0, Math.min(originalHeight - cropHeight, Math.round(top)));
    const finalWidth = Math.min(originalWidth - finalLeft, Math.round(cropWidth));
    const finalHeight = Math.min(originalHeight - finalTop, Math.round(cropHeight));

    return {
      left: finalLeft,
      top: finalTop,
      width: finalWidth,
      height: finalHeight
    };
  }

  async removeBackground(imagePath, outputPath) {
    try {
      const oriented = await this.getOrientatedImage(imagePath);
      const { width, height, channels } = oriented;

      const smallSize = 200;
      const resizedSmall = await sharp(oriented.path)
        .resize(smallSize, smallSize, { fit: 'inside', withoutEnlargement: true })
        .toColourspace('srgb');
      const smallMetadata = await resizedSmall.metadata();
      const smallCols = smallMetadata.width;
      const smallRows = smallMetadata.height;
      const smallBuffer = await resizedSmall.raw().toBuffer();

      const subject = await this.detectSubject(oriented.path);
      const bgColor = this.detectBackgroundColor(smallBuffer, smallCols, smallRows, subject, width, height);

      const fullBuffer = await sharp(oriented.path).toColourspace('srgb').raw().toBuffer();
      const mask = this.createForegroundMask(fullBuffer, width, height, bgColor, subject, channels);

      const rgbaBuffer = this.applyMaskToImage(fullBuffer, width, height, mask, channels);

      await sharp(rgbaBuffer, {
        raw: {
          width: width,
          height: height,
          channels: 4
        }
      }).png().toFile(outputPath);

      this.cleanupTempFile(oriented.path);
      return outputPath;
    } catch (error) {
      console.error('抠图失败:', error);
      const ext = path.extname(imagePath);
      const outputExt = ext === '.png' ? ext : '.png';
      const finalOutputPath = outputPath.replace(path.extname(outputPath), outputExt);

      await sharp(imagePath)
        .rotate()
        .png()
        .toFile(finalOutputPath);

      return finalOutputPath;
    }
  }

  detectBackgroundColor(smallBuffer, cols, rows, subject, originalWidth, originalHeight) {
    const subjectScaleX = cols / originalWidth;
    const subjectScaleY = rows / originalHeight;

    const subjectLeft = Math.round(subject.subjectRegion.left * subjectScaleX);
    const subjectTop = Math.round(subject.subjectRegion.top * subjectScaleY);
    const subjectWidth = Math.round(subject.subjectRegion.width * subjectScaleX);
    const subjectHeight = Math.round(subject.subjectRegion.height * subjectScaleY);
    const subjectRight = subjectLeft + subjectWidth;
    const subjectBottom = subjectTop + subjectHeight;

    const borderPixels = [];
    const borderWidth = 5;

    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const isInSubject = x >= subjectLeft && x < subjectRight &&
                           y >= subjectTop && y < subjectBottom;
        const isBorder = x < borderWidth || x >= cols - borderWidth ||
                        y < borderWidth || y >= rows - borderWidth;

        if (isBorder || !isInSubject) {
          const idx = (y * cols + x) * 3;
          borderPixels.push({
            r: smallBuffer[idx],
            g: smallBuffer[idx + 1],
            b: smallBuffer[idx + 2]
          });
        }
      }
    }

    if (borderPixels.length === 0) {
      return { r: 255, g: 255, b: 255, tolerance: 50 };
    }

    let totalR = 0, totalG = 0, totalB = 0;
    borderPixels.forEach(p => {
      totalR += p.r;
      totalG += p.g;
      totalB += p.b;
    });

    return {
      r: Math.round(totalR / borderPixels.length),
      g: Math.round(totalG / borderPixels.length),
      b: Math.round(totalB / borderPixels.length),
      tolerance: 55
    };
  }

  createForegroundMask(buffer, width, height, bgColor, subject, channels) {
    const mask = new Uint8Array(width * height);
    const subjectRegion = subject.subjectRegion;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const pixelIdx = (y * width + x);
        let r, g, b;

        if (channels >= 4) {
          r = buffer[pixelIdx * 4];
          g = buffer[pixelIdx * 4 + 1];
          b = buffer[pixelIdx * 4 + 2];
        } else {
          r = buffer[pixelIdx * 3];
          g = buffer[pixelIdx * 3 + 1];
          b = buffer[pixelIdx * 3 + 2];
        }

        const distance = Math.sqrt(
          Math.pow(r - bgColor.r, 2) +
          Math.pow(g - bgColor.g, 2) +
          Math.pow(b - bgColor.b, 2)
        );

        const inSubject = x >= subjectRegion.left &&
                         x < subjectRegion.left + subjectRegion.width &&
                         y >= subjectRegion.top &&
                         y < subjectRegion.top + subjectRegion.height;

        const tolerance = inSubject ? bgColor.tolerance * 0.8 : bgColor.tolerance;
        const threshold = inSubject ? tolerance * 0.4 : tolerance;

        const maskIdx = pixelIdx;
        if (distance > threshold) {
          mask[maskIdx] = 255;
        } else if (inSubject && distance > tolerance * 0.2) {
          const alpha = (distance - tolerance * 0.2) / (tolerance * 0.3);
          mask[maskIdx] = Math.min(255, Math.round(alpha * 255));
        } else {
          mask[maskIdx] = 0;
        }
      }
    }

    return mask;
  }

  applyMaskToImage(buffer, width, height, mask, channels) {
    const rgba = Buffer.alloc(width * height * 4);

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const pixelIdx = (y * width + x);
        const dstIdx = pixelIdx * 4;
        let r, g, b;

        if (channels >= 4) {
          r = buffer[pixelIdx * 4];
          g = buffer[pixelIdx * 4 + 1];
          b = buffer[pixelIdx * 4 + 2];
        } else {
          r = buffer[pixelIdx * 3];
          g = buffer[pixelIdx * 3 + 1];
          b = buffer[pixelIdx * 3 + 2];
        }

        rgba[dstIdx] = r;
        rgba[dstIdx + 1] = g;
        rgba[dstIdx + 2] = b;
        rgba[dstIdx + 3] = mask[pixelIdx];
      }
    }

    return rgba;
  }

  async composeWithBackground(foregroundPath, bgColor, outputPath) {
    const { r, g, b } = this.hexToRgb(bgColor);

    const fgMetadata = await sharp(foregroundPath).metadata();
    const { width, height } = fgMetadata;

    const bgBuffer = Buffer.alloc(width * height * 4);
    for (let i = 0; i < width * height; i++) {
      const idx = i * 4;
      bgBuffer[idx] = r;
      bgBuffer[idx + 1] = g;
      bgBuffer[idx + 2] = b;
      bgBuffer[idx + 3] = 255;
    }

    const bgImage = sharp(bgBuffer, {
      raw: { width, height, channels: 4 }
    });

    await bgImage
      .composite([{
        input: foregroundPath,
        blend: 'over'
      }])
      .jpeg({ quality: this.options.quality })
      .toFile(outputPath);

    return outputPath;
  }

  async processImage(imagePath, outputPath, mode = 'smart') {
    const { widthRatio, heightRatio } = this.parseRatio(this.options.ratio);
    const targetSize = this.options.targetSize;
    const targetWidth = targetSize;
    const targetHeight = Math.round(targetSize * (heightRatio / widthRatio));

    let processed;

    if (this.options.removeBackground && mode !== 'remove-bg') {
      const tempDir = path.dirname(imagePath);
      const tempName = path.basename(imagePath, path.extname(imagePath));
      const tempPath = path.join(tempDir, `${tempName}_nobg.png`);

      await this.removeBackground(imagePath, tempPath);
      imagePath = tempPath;
    }

    switch (mode) {
      case 'center':
        processed = await this.centerCrop(imagePath, targetWidth, targetHeight);
        break;
      case 'pad':
        processed = await this.padBackground(imagePath, targetWidth, targetHeight);
        break;
      case 'remove-bg':
        processed = await this.removeBackgroundMode(imagePath, targetWidth, targetHeight);
        break;
      case 'smart':
      default:
        processed = await this.smartCrop(imagePath, targetWidth, targetHeight);
        break;
    }

    const ext = path.extname(imagePath).toLowerCase();
    if (this.options.removeBackground || mode === 'remove-bg') {
      processed = processed.png({ quality: this.options.quality, compressionLevel: 6 });
    } else if (ext === '.jpg' || ext === '.jpeg') {
      processed = processed.jpeg({ quality: this.options.quality });
    } else if (ext === '.png') {
      processed = processed.png({ quality: this.options.quality });
    } else if (ext === '.webp') {
      processed = processed.webp({ quality: this.options.quality });
    }

    await processed.toFile(outputPath);
    return outputPath;
  }

  async centerCrop(imagePath, targetWidth, targetHeight) {
    const oriented = await this.getOrientatedImage(imagePath);
    const { width, height } = oriented;

    const originalAspect = width / height;
    const targetAspect = targetWidth / targetHeight;

    let cropWidth, cropHeight;
    if (originalAspect > targetAspect) {
      cropHeight = height;
      cropWidth = Math.round(height * targetAspect);
    } else {
      cropWidth = width;
      cropHeight = Math.round(width / targetAspect);
    }

    let left = Math.round((width - cropWidth) / 2);
    let top = Math.round((height - cropHeight) / 2);

    left = Math.max(0, Math.min(width - cropWidth, left));
    top = Math.max(0, Math.min(height - cropHeight, top));

    const result = sharp(oriented.path)
      .extract({
        left: left,
        top: top,
        width: cropWidth,
        height: cropHeight
      })
      .resize(targetWidth, targetHeight, { fit: 'inside', kernel: 'lanczos3' });

    this.cleanupTempFile(oriented.path);
    return result;
  }

  async padBackground(imagePath, targetWidth, targetHeight) {
    return sharp(imagePath)
      .rotate()
      .resize(targetWidth, targetHeight, {
        fit: 'contain',
        background: this.options.bgColor,
        kernel: 'lanczos3'
      });
  }

  async removeBackgroundMode(imagePath, targetWidth, targetHeight) {
    const tempDir = path.dirname(imagePath);
    const tempName = path.basename(imagePath, path.extname(imagePath));
    const tempPath = path.join(tempDir, `${tempName}_nobg_temp.png`);

    await this.removeBackground(imagePath, tempPath);

    const fgMetadata = await sharp(tempPath).metadata();
    const fgWidth = fgMetadata.width;
    const fgHeight = fgMetadata.height;
    const originalAspect = fgWidth / fgHeight;
    const targetAspect = targetWidth / targetHeight;

    let scaleFactor;
    if (originalAspect > targetAspect) {
      scaleFactor = targetWidth / fgWidth;
    } else {
      scaleFactor = targetHeight / fgHeight;
    }

    const scaledWidth = Math.round(fgWidth * scaleFactor);
    const scaledHeight = Math.round(fgHeight * scaleFactor);

    const left = Math.round((targetWidth - scaledWidth) / 2);
    const top = Math.round((targetHeight - scaledHeight) / 2);

    const { r, g, b } = this.hexToRgb(this.options.bgColor);
    const bgBuffer = Buffer.alloc(targetWidth * targetHeight * 4);
    for (let i = 0; i < targetWidth * targetHeight; i++) {
      const idx = i * 4;
      bgBuffer[idx] = r;
      bgBuffer[idx + 1] = g;
      bgBuffer[idx + 2] = b;
      bgBuffer[idx + 3] = 255;
    }

    const resizedFgBuffer = await sharp(tempPath)
      .resize(scaledWidth, scaledHeight, { fit: 'inside', kernel: 'lanczos3' })
      .ensureAlpha()
      .raw()
      .toBuffer();

    this.cleanupTempFile(tempPath);

    return sharp(bgBuffer, {
      raw: { width: targetWidth, height: targetHeight, channels: 4 }
    }).composite([{
      input: resizedFgBuffer,
      raw: { width: scaledWidth, height: scaledHeight, channels: 4 },
      left,
      top,
      blend: 'over'
    }]);
  }

  async smartCrop(imagePath, targetWidth, targetHeight) {
    const oriented = await this.getOrientatedImage(imagePath);
    const { width, height } = oriented;

    const subject = await this.detectSubject(oriented.path);
    const targetAspect = targetWidth / targetHeight;

    const cropRegion = this.calculateSafeCropRegion(
      width,
      height,
      targetAspect,
      subject.subjectRegion
    );

    cropRegion.left = Math.max(0, Math.min(width - cropRegion.width, cropRegion.left));
    cropRegion.top = Math.max(0, Math.min(height - cropRegion.height, cropRegion.top));
    cropRegion.width = Math.min(width - cropRegion.left, cropRegion.width);
    cropRegion.height = Math.min(height - cropRegion.top, cropRegion.height);

    const result = sharp(oriented.path)
      .extract({
        left: cropRegion.left,
        top: cropRegion.top,
        width: cropRegion.width,
        height: cropRegion.height
      })
      .resize(targetWidth, targetHeight, { fit: 'inside', kernel: 'lanczos3' });

    this.cleanupTempFile(oriented.path);
    return result;
  }
}

module.exports = ImageResizer;