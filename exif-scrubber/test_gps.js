const fs = require('fs');
const piexif = require('piexifjs');
const path = require('path');

const sourceImage = '/Users/liboyang/trae/dailyTools/household-bill-splitter/backend/uploads/20260503210441.jpg';
const testImageDir = path.join(__dirname, 'test_images');
const testImagePath = path.join(testImageDir, 'test_with_gps.jpg');

if (!fs.existsSync(testImageDir)) {
  fs.mkdirSync(testImageDir, { recursive: true });
}

console.log('复制图片...');
fs.copyFileSync(sourceImage, testImagePath);

console.log('读取图片...');
const jpegData = fs.readFileSync(testImagePath);
const binaryData = jpegData.toString('binary');

console.log('加载 EXIF 数据...');
const exifData = piexif.load(binaryData);

console.log('添加 GPS 信息...');

exifData['GPS'] = {
  [piexif.GPSIFD.GPSLatitudeRef]: 'N',
  [piexif.GPSIFD.GPSLatitude]: [[39, 1], [54, 1], [0, 1]],
  [piexif.GPSIFD.GPSLongitudeRef]: 'E',
  [piexif.GPSIFD.GPSLongitude]: [[116, 1], [23, 1], [0, 1]],
  [piexif.GPSIFD.GPSAltitudeRef]: 0,
  [piexif.GPSIFD.GPSAltitude]: [100, 1],
  [piexif.GPSIFD.GPSTimeStamp]: [[12, 1], [30, 1], [45, 1]],
  [piexif.GPSIFD.GPSDateStamp]: '2024:01:15'
};

exifData['0th'] = exifData['0th'] || {};
exifData['0th'][piexif.ImageIFD.Make] = 'TestCamera';
exifData['0th'][piexif.ImageIFD.Model] = 'TestModel X1';
exifData['0th'][piexif.ImageIFD.DateTime] = '2024:01:15 12:30:45';

console.log('保存修改后的图片...');
const exifBytes = piexif.dump(exifData);
const newImageData = piexif.insert(exifBytes, binaryData);
fs.writeFileSync(testImagePath, newImageData, 'binary');

console.log(`\n✅ 测试图片已创建: ${testImagePath}`);
console.log('✅ 已添加 GPS 信息:');
console.log('   纬度: 39.9° N');
console.log('   经度: 116.3833° E');
console.log('   海拔: 100 米');
console.log('');
console.log('现在可以运行以下命令测试:');
console.log(`  node index.js check ${testImagePath}`);
console.log(`  node index.js strip ${testImagePath} -o ${testImageDir}`);
