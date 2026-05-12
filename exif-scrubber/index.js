#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const ExifReader = require('./src/ExifReader');
const GpsStripper = require('./src/GpsStripper');
const BatchProcessor = require('./src/BatchProcessor');

const exifReader = new ExifReader();
const gpsStripper = new GpsStripper();
const batchProcessor = new BatchProcessor();

function printHelp() {
  console.log(`
EXIF 地理信息去标识化工具 (EXIF Scrubber)

用法:
  node index.js <命令> [选项] <路径>

命令:
  check <文件路径>           检查单个图片的 EXIF 信息，特别是 GPS 数据
  scan <目录路径>            扫描目录中的图片，显示哪些包含 GPS 信息
  strip <文件路径>           从单个图片中移除 GPS 信息
  scrub <目录路径>           批量移除目录中所有图片的 GPS 信息
  verify <文件路径>          处理图片并验证 GPS 已被移除

选项:
  -o, --output <目录>        指定输出目录（不覆盖原文件）
  -s, --suffix <后缀>        指定输出文件后缀（默认: _clean）
  -O, --overwrite            覆盖原文件（默认不覆盖）
  -a, --all                  移除所有 EXIF 信息（不只是 GPS）
  -r, --no-recursive         不递归扫描子目录
  -n, --dry-run              试运行，不实际修改文件
  -v, --verbose              显示详细信息
  -h, --help                 显示帮助信息

示例:
  node index.js check photo.jpg
  node index.js scan ./photos
  node index.js strip photo.jpg -o ./cleaned
  node index.js scrub ./photos -o ./cleaned -v
  node index.js scrub ./photos -O
  node index.js verify photo.jpg
`);
}

function parseArgs(args) {
  const result = {
    command: null,
    path: null,
    options: {
      outputDir: null,
      outputSuffix: '_clean',
      overwrite: false,
      removeAllExif: false,
      recursive: true,
      dryRun: false,
      verbose: false
    }
  };

  let i = 0;
  while (i < args.length) {
    const arg = args[i];

    if (!result.command) {
      result.command = arg;
      i++;
      continue;
    }

    if (!result.path && !arg.startsWith('-')) {
      result.path = arg;
      i++;
      continue;
    }

    switch (arg) {
      case '-o':
      case '--output':
        result.options.outputDir = args[++i];
        break;
      case '-s':
      case '--suffix':
        result.options.outputSuffix = args[++i];
        break;
      case '-O':
      case '--overwrite':
        result.options.overwrite = true;
        break;
      case '-a':
      case '--all':
        result.options.removeAllExif = true;
        break;
      case '-r':
      case '--no-recursive':
        result.options.recursive = false;
        break;
      case '-n':
      case '--dry-run':
        result.options.dryRun = true;
        break;
      case '-v':
      case '--verbose':
        result.options.verbose = true;
        break;
      case '-h':
      case '--help':
        printHelp();
        process.exit(0);
        break;
      default:
        if (!arg.startsWith('-') && !result.path) {
          result.path = arg;
        }
        break;
    }
    i++;
  }

  return result;
}

function printCheckResult(summary) {
  console.log(`\n📋 文件: ${summary.file}`);
  console.log(`📍 GPS 信息: ${summary.hasGps ? '✅ 存在' : '❌ 不存在'}`);
  
  if (summary.camera) {
    console.log(`📷 相机: ${summary.camera}`);
  }
  if (summary.dateTaken) {
    console.log(`📅 拍摄时间: ${summary.dateTaken}`);
  }
  
  if (summary.hasGps && summary.gps) {
    console.log('\n🌍 GPS 坐标:');
    const lat = summary.gps.latitude;
    const lng = summary.gps.longitude;
    const latRef = summary.gps.latitudeRef || '';
    const lngRef = summary.gps.longitudeRef || '';
    console.log(`   纬度: ${lat} ${latRef}`);
    console.log(`   经度: ${lng} ${lngRef}`);
    if (summary.gps.altitude !== undefined) {
      console.log(`   海拔: ${summary.gps.altitude} 米`);
    }
  }
  console.log('');
}

function handleCheck(filePath) {
  if (!fs.existsSync(filePath)) {
    console.error(`❌ 文件不存在: ${filePath}`);
    process.exit(1);
  }

  const summary = exifReader.getSummary(filePath);
  printCheckResult(summary);
}

function handleScan(dirPath, options) {
  if (!fs.existsSync(dirPath)) {
    console.error(`❌ 目录不存在: ${dirPath}`);
    process.exit(1);
  }

  console.log(`\n🔍 扫描目录: ${dirPath}`);
  console.log(`🔄 递归扫描: ${options.recursive ? '是' : '否'}`);

  const scanResult = batchProcessor.scanDirectory(dirPath, {
    recursive: options.recursive,
    showAll: options.verbose
  });

  console.log(`\n📊 扫描结果:`);
  console.log(`   图片总数: ${scanResult.totalImages}`);
  console.log(`   包含 GPS: ${scanResult.withGps}`);
  console.log(`   不含 GPS: ${scanResult.withoutGps}`);

  if (scanResult.images.length > 0) {
    console.log(`\n📁 图片列表:`);
    scanResult.images.forEach(img => {
      const gpsStatus = img.hasGps ? '📍 有 GPS' : '✅ 无 GPS';
      console.log(`   ${gpsStatus} - ${path.basename(img.file)}`);
      
      if (options.verbose && img.hasGps && img.gps) {
        const lat = img.gps.latitude;
        const lng = img.gps.longitude;
        console.log(`      坐标: ${lat}, ${lng}`);
      }
    });
  }
  console.log('');
}

function handleStrip(filePath, options) {
  if (!fs.existsSync(filePath)) {
    console.error(`❌ 文件不存在: ${filePath}`);
    process.exit(1);
  }

  console.log(`\n🧹 处理图片: ${filePath}`);

  if (options.dryRun) {
    const summary = exifReader.getSummary(filePath);
    const wouldProcess = summary.hasGps || options.removeAllExif;
    console.log(`📍 GPS 信息: ${summary.hasGps ? '存在' : '不存在'}`);
    console.log(`⚠️  试运行模式 - ${wouldProcess ? '将' : '不会'}处理此文件`);
    if (wouldProcess && options.verbose) {
      if (options.outputDir) {
        console.log(`   输出目录: ${options.outputDir}`);
      } else if (options.overwrite) {
        console.log(`   将覆盖原文件`);
      } else {
        const ext = path.extname(filePath);
        const baseName = path.basename(filePath, ext);
        console.log(`   输出文件: ${baseName}${options.outputSuffix}${ext}`);
      }
    }
    console.log('');
    return;
  }

  const result = gpsStripper.stripAndVerify(filePath, options);

  if (result.skipped) {
    console.log(`ℹ️  ${result.reason}`);
  } else {
    console.log(`✅ 处理成功!`);
    if (result.result.output !== filePath) {
      console.log(`📁 输出文件: ${result.result.output}`);
    }
    console.log(`📍 GPS 已移除: ${result.gpsRemoved ? '是' : '否'}`);
    console.log(`✓ 验证通过: ${result.verified ? '是' : '否'}`);
  }
  console.log('');
}

function handleScrub(dirPath, options) {
  if (!fs.existsSync(dirPath)) {
    console.error(`❌ 目录不存在: ${dirPath}`);
    process.exit(1);
  }

  console.log(`\n🧹 清理目录: ${dirPath}`);
  console.log(`🔄 递归处理: ${options.recursive ? '是' : '否'}`);
  if (options.dryRun) {
    console.log(`⚠️  试运行模式 - 不会实际修改文件`);
  }
  if (options.overwrite) {
    console.log(`⚠️  警告: 将覆盖原文件!`);
  }
  if (options.removeAllExif) {
    console.log(`⚠️  将移除所有 EXIF 信息!`);
  }
  if (options.outputDir) {
    console.log(`📁 输出目录: ${options.outputDir}`);
  }

  const processResult = batchProcessor.processDirectory(dirPath, {
    recursive: options.recursive,
    outputDir: options.outputDir,
    overwrite: options.overwrite,
    outputSuffix: options.outputSuffix,
    removeAllExif: options.removeAllExif,
    dryRun: options.dryRun
  });

  console.log(`\n📊 处理结果:`);
  console.log(`   图片总数: ${processResult.totalImages}`);
  console.log(`   成功处理: ${processResult.success}`);
  console.log(`   跳过: ${processResult.skipped}`);
  console.log(`   错误: ${processResult.errors}`);

  if (options.verbose && processResult.results.length > 0) {
    console.log(`\n📁 详细结果:`);
    processResult.results.forEach(item => {
      const fileName = path.basename(item.file);
      if (item.success && !item.skipped) {
        console.log(`   ✅ ${fileName}`);
      } else if (item.skipped) {
        console.log(`   ⏭️  ${fileName} - ${item.reason}`);
      } else if (item.error) {
        console.log(`   ❌ ${fileName} - ${item.error}`);
      }
    });
  }
  console.log('');
}

function handleVerify(filePath) {
  if (!fs.existsSync(filePath)) {
    console.error(`❌ 文件不存在: ${filePath}`);
    process.exit(1);
  }

  console.log(`\n🔍 验证文件: ${filePath}`);
  
  const summary = exifReader.getSummary(filePath);
  
  if (summary.hasGps) {
    console.log(`❌ 验证失败 - 文件仍包含 GPS 信息!`);
    printCheckResult(summary);
    process.exit(1);
  } else {
    console.log(`✅ 验证通过 - 文件不包含 GPS 信息`);
    if (summary.camera) {
      console.log(`📷 基础信息保留: 相机 = ${summary.camera}`);
    }
    if (summary.dateTaken) {
      console.log(`📅 基础信息保留: 拍摄时间 = ${summary.dateTaken}`);
    }
    console.log('');
  }
}

function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes('-h') || args.includes('--help')) {
    printHelp();
    process.exit(0);
  }

  const parsed = parseArgs(args);

  if (!parsed.command) {
    console.error('❌ 请指定命令');
    printHelp();
    process.exit(1);
  }

  if (!parsed.path) {
    console.error('❌ 请指定文件或目录路径');
    printHelp();
    process.exit(1);
  }

  try {
    switch (parsed.command) {
      case 'check':
        handleCheck(parsed.path);
        break;
      case 'scan':
        handleScan(parsed.path, parsed.options);
        break;
      case 'strip':
        handleStrip(parsed.path, parsed.options);
        break;
      case 'scrub':
        handleScrub(parsed.path, parsed.options);
        break;
      case 'verify':
        handleVerify(parsed.path);
        break;
      default:
        console.error(`❌ 未知命令: ${parsed.command}`);
        printHelp();
        process.exit(1);
    }
  } catch (error) {
    console.error(`❌ 发生错误: ${error.message}`);
    if (parsed.options.verbose) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

main();

module.exports = {
  ExifReader,
  GpsStripper,
  BatchProcessor
};
