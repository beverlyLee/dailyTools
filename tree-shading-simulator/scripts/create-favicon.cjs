const fs = require('fs');
const path = require('path');

const publicDir = path.join(__dirname, '..', 'public');
const faviconPath = path.join(publicDir, 'favicon.ico');

const width = 32;
const height = 32;
const pixelDataSize = width * height * 4;

const png = [];

function crc32(data) {
  let crc = 0xFFFFFFFF;
  const table = [];
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) {
      c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[i] = c >>> 0;
  }
  for (let i = 0; i < data.length; i++) {
    crc = table[(crc ^ data[i]) & 0xFF] ^ (crc >>> 8);
  }
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

function createChunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const typeBuffer = Buffer.from(type, 'ascii');
  const crcData = Buffer.concat([typeBuffer, data]);
  const crcValue = crc32(crcData);
  const crcBuffer = Buffer.alloc(4);
  crcBuffer.writeUInt32BE(crcValue, 0);
  return Buffer.concat([length, typeBuffer, data, crcBuffer]);
}

const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(width, 0);
ihdr.writeUInt32BE(height, 4);
ihdr[8] = 8;
ihdr[9] = 6;
ihdr[10] = 0;
ihdr[11] = 0;
ihdr[12] = 0;

const rawData = [];
for (let y = 0; y < height; y++) {
  rawData.push(0);
  for (let x = 0; x < width; x++) {
    const cx = width / 2;
    const cy = height / 2;
    const dx = x - cx;
    const dy = y - cy;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 10) {
      rawData.push(0x32, 0xF0, 0x8C, 0xFF);
    } else if (dist < 14) {
      rawData.push(0x2D, 0x6A, 0x4F, 0xFF);
    } else {
      rawData.push(0x0A, 0x0B, 0x0D, 0xFF);
    }
  }
}

const rawBuffer = Buffer.from(rawData);
const zlib = require('zlib');
const compressed = zlib.deflateSync(rawBuffer);

const ihdrChunk = createChunk('IHDR', ihdr);
const idatChunk = createChunk('IDAT', compressed);
const iendChunk = createChunk('IEND', Buffer.alloc(0));

const pngBuffer = Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);

const iconDir = Buffer.alloc(6 + 16);
iconDir.writeUInt16LE(0, 0);
iconDir.writeUInt16LE(1, 2);
iconDir.writeUInt16LE(1, 4);
iconDir[6] = width;
iconDir[7] = height;
iconDir[8] = 0;
iconDir[9] = 0;
iconDir.writeUInt16LE(1, 10);
iconDir.writeUInt16LE(32, 12);
iconDir.writeUInt32LE(pngBuffer.length, 14);
iconDir.writeUInt32LE(22, 18);

const icoBuffer = Buffer.concat([iconDir, pngBuffer]);

fs.writeFileSync(faviconPath, icoBuffer);
console.log('Created favicon.ico:', icoBuffer.length, 'bytes');
