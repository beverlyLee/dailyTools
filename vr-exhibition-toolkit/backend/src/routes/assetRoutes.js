const express = require('express');
const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const config = require('../config/config');
const assetController = require('../controllers/assetController');
const { protect, restrictTo } = require('../middlewares/auth');
const { AppError } = require('../middlewares/errorHandler');

const router = express.Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, config.uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}_${Date.now()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  
  const supportedFormats = [
    ...config.supportedModelFormats,
    ...config.supportedImageFormats,
    ...config.supportedAudioFormats
  ];
  
  if (supportedFormats.includes(ext)) {
    cb(null, true);
  } else {
    cb(new AppError(`不支持的文件格式: ${ext}`, 400), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: config.maxUploadSize
  }
});

router.route('/')
  .get(assetController.getAllAssets)
  .post(protect, upload.array('files', 10), assetController.uploadAssets);

router.route('/:id')
  .get(assetController.getAsset)
  .put(protect, assetController.updateAsset)
  .delete(protect, assetController.deleteAsset);

router.route('/upload/single')
  .post(protect, upload.single('file'), assetController.uploadSingleAsset);

router.route('/models')
  .get(assetController.getModelAssets);

router.route('/images')
  .get(assetController.getImageAssets);

router.route('/audio')
  .get(assetController.getAudioAssets);

router.route('/search')
  .post(assetController.searchAssets);

module.exports = router;
