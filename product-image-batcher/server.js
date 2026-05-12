const express = require('express');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const archiver = require('archiver');
const ImageResizer = require('./ImageResizer');
const {
  centerCrop,
  padBackground,
  smartAvoid,
  removeBackground
} = require('./backend/services/cropModes');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

const uploadDir = path.join(__dirname, 'uploads');
const outputDir = path.join(__dirname, 'output');

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    const basename = path.basename(file.originalname, ext);
    cb(null, basename + '-' + uniqueSuffix + ext);
  }
});

const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|webp|gif/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('只支持图片文件: JPEG, PNG, WebP, GIF'));
    }
  },
  limits: {
    fileSize: 20 * 1024 * 1024
  }
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.post('/api/process', upload.array('images', 100), async (req, res) => {
  try {
    const {
      mode = 'smart',
      targetSize = 1000,
      ratio = '1:1',
      bgColor = '#ffffff',
      quality = 90
    } = req.body;

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: '请上传至少一张图片' });
    }

    const resizer = new ImageResizer({
      mode,
      targetSize: parseInt(targetSize),
      ratio,
      bgColor,
      quality: parseInt(quality)
    });

    const results = [];
    const processedFiles = [];

    for (const file of req.files) {
      try {
        let outputPath;
        
        switch (mode) {
          case 'center':
            outputPath = await centerCrop(file.path, resizer.options);
            break;
          case 'pad':
            outputPath = await padBackground(file.path, resizer.options);
            break;
          case 'remove-bg':
            outputPath = await removeBackground(file.path, resizer.options);
            break;
          case 'smart':
          default:
            outputPath = await smartAvoid(file.path, resizer.options);
            break;
        }

        const originalName = file.originalname.replace(/\.[^/.]+$/, '');
        const ext = path.extname(file.path);
        const finalName = `${originalName}_${mode}${ext}`;
        const finalPath = path.join(outputDir, finalName);

        if (fs.existsSync(outputPath)) {
          if (outputPath !== finalPath) {
            if (fs.existsSync(finalPath)) {
              fs.unlinkSync(finalPath);
            }
            fs.renameSync(outputPath, finalPath);
          }
          processedFiles.push(finalPath);
        }

        results.push({
          original: file.originalname,
          processed: finalName,
          status: 'success'
        });
      } catch (error) {
        results.push({
          original: file.originalname,
          status: 'error',
          message: error.message
        });
      }
    }

    if (processedFiles.length === 0) {
      return res.status(400).json({ error: '没有成功处理的图片' });
    }

    if (processedFiles.length === 1) {
      const filePath = processedFiles[0];
      const fileName = path.basename(filePath);
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
      res.setHeader('Content-Type', 'application/octet-stream');
      return res.download(filePath, fileName, (err) => {
        if (!err) {
          try {
            fs.unlinkSync(filePath);
          } catch (e) {}
        }
      });
    }

    const zipFileName = `processed_images_${Date.now()}.zip`;
    const zipPath = path.join(outputDir, zipFileName);
    
    const output = fs.createWriteStream(zipPath);
    const archive = archiver('zip', {
      zlib: { level: 9 }
    });

    archive.pipe(output);

    for (const filePath of processedFiles) {
      const fileName = path.basename(filePath);
      archive.file(filePath, { name: fileName });
    }

    await archive.finalize();

    output.on('close', () => {
      res.setHeader('Content-Disposition', `attachment; filename="${zipFileName}"`);
      res.setHeader('Content-Type', 'application/zip');
      
      res.download(zipPath, zipFileName, (err) => {
        try {
          fs.unlinkSync(zipPath);
        } catch (e) {}
        
        for (const filePath of processedFiles) {
          try {
            fs.unlinkSync(filePath);
          } catch (e) {}
        }
      });
    });

  } catch (error) {
    console.error('处理错误:', error);
    res.status(500).json({ 
      error: '处理图片时发生错误', 
      message: error.message 
    });
  } finally {
    for (const file of req.files) {
      try {
        fs.unlinkSync(file.path);
      } catch (e) {}
    }
  }
});

app.post('/api/preview', upload.single('image'), async (req, res) => {
  try {
    const {
      mode = 'smart',
      targetSize = 1000,
      ratio = '1:1',
      bgColor = '#ffffff',
      quality = 90
    } = req.body;

    if (!req.file) {
      return res.status(400).json({ error: '请上传预览图片' });
    }

    const resizer = new ImageResizer({
      mode,
      targetSize: parseInt(targetSize),
      ratio,
      bgColor,
      quality: parseInt(quality)
    });

    let outputPath;
    switch (mode) {
      case 'center':
        outputPath = await centerCrop(req.file.path, resizer.options);
        break;
      case 'pad':
        outputPath = await padBackground(req.file.path, resizer.options);
        break;
      case 'remove-bg':
        outputPath = await removeBackground(req.file.path, resizer.options);
        break;
      case 'smart':
      default:
        outputPath = await smartAvoid(req.file.path, resizer.options);
        break;
    }

    const imageBuffer = fs.readFileSync(outputPath);
    const base64 = imageBuffer.toString('base64');
    const ext = path.extname(outputPath).replace('.', '');
    
    res.json({
      preview: `data:image/${ext === 'jpg' ? 'jpeg' : ext};base64,${base64}`,
      mode
    });

    try {
      fs.unlinkSync(outputPath);
      fs.unlinkSync(req.file.path);
    } catch (e) {}

  } catch (error) {
    console.error('预览错误:', error);
    res.status(500).json({ 
      error: '生成预览时发生错误', 
      message: error.message 
    });
  }
});

app.listen(PORT, () => {
  console.log(`\n========================================`);
  console.log(`电商商品主图批量处理器`);
  console.log(`运行在: http://localhost:${PORT}`);
  console.log(`========================================\n`);
});

module.exports = app;