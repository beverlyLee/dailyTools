const sharp = require('sharp');
const path = require('path');
const fs = require('fs');
const ImageResizer = require('../../ImageResizer');

function parseRatio(ratio) {
  const [w, h] = ratio.split(':').map(Number);
  return { widthRatio: w, heightRatio: h };
}

async function centerCrop(imagePath, options) {
  const resizer = new ImageResizer(options);
  const ext = path.extname(imagePath);
  const outputPath = path.join(
    path.dirname(imagePath),
    path.basename(imagePath, ext) + '_centered' + ext
  );

  await resizer.processImage(imagePath, outputPath, 'center');
  return outputPath;
}

async function padBackground(imagePath, options) {
  const resizer = new ImageResizer(options);
  const ext = path.extname(imagePath);
  const outputPath = path.join(
    path.dirname(imagePath),
    path.basename(imagePath, ext) + '_padded' + ext
  );

  await resizer.processImage(imagePath, outputPath, 'pad');
  return outputPath;
}

async function smartAvoid(imagePath, options) {
  const resizer = new ImageResizer(options);
  const ext = path.extname(imagePath);
  const outputPath = path.join(
    path.dirname(imagePath),
    path.basename(imagePath, ext) + '_smart' + ext
  );

  await resizer.processImage(imagePath, outputPath, 'smart');
  return outputPath;
}

async function removeBackground(imagePath, options) {
  const resizer = new ImageResizer(options);
  const ext = path.extname(imagePath);
  const outputExt = '.png';
  const outputPath = path.join(
    path.dirname(imagePath),
    path.basename(imagePath, ext) + '_nobg' + outputExt
  );

  await resizer.processImage(imagePath, outputPath, 'remove-bg');
  return outputPath;
}

module.exports = {
  centerCrop,
  padBackground,
  smartAvoid,
  removeBackground
};