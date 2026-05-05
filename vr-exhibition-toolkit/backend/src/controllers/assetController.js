const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

const config = require('../config/config');
const logger = require('../utils/logger');
const { AppError } = require('../middlewares/errorHandler');

const assets = new Map();
const assetTypes = {
  MODEL: 'model',
  IMAGE: 'image',
  AUDIO: 'audio'
};

const getAssetType = (filename) => {
  const ext = path.extname(filename).toLowerCase();
  
  if (config.supportedModelFormats.includes(ext)) {
    return assetTypes.MODEL;
  }
  if (config.supportedImageFormats.includes(ext)) {
    return assetTypes.IMAGE;
  }
  if (config.supportedAudioFormats.includes(ext)) {
    return assetTypes.AUDIO;
  }
  
  return 'unknown';
};

const getAllAssets = (req, res, next) => {
  try {
    const assetList = Array.from(assets.values());
    
    res.status(200).json({
      status: 'success',
      results: assetList.length,
      data: {
        assets: assetList
      }
    });
  } catch (error) {
    next(error);
  }
};

const uploadAssets = (req, res, next) => {
  try {
    if (!req.files || req.files.length === 0) {
      return next(new AppError('没有文件被上传', 400));
    }
    
    const uploadedAssets = [];
    
    req.files.forEach(file => {
      const assetId = uuidv4();
      const asset = {
        id: assetId,
        originalName: file.originalname,
        filename: file.filename,
        path: file.path,
        size: file.size,
        mimetype: file.mimetype,
        type: getAssetType(file.originalname),
        uploadedBy: req.user ? req.user.id : null,
        uploadedAt: Date.now(),
        url: `/uploads/${file.filename}`
      };
      
      assets.set(assetId, asset);
      uploadedAssets.push(asset);
      
      logger.info(`资产已上传: ${assetId} - ${file.originalname}`);
    });
    
    res.status(201).json({
      status: 'success',
      results: uploadedAssets.length,
      data: {
        assets: uploadedAssets
      }
    });
  } catch (error) {
    next(error);
  }
};

const uploadSingleAsset = (req, res, next) => {
  try {
    if (!req.file) {
      return next(new AppError('没有文件被上传', 400));
    }
    
    const assetId = uuidv4();
    const asset = {
      id: assetId,
      originalName: req.file.originalname,
      filename: req.file.filename,
      path: req.file.path,
      size: req.file.size,
      mimetype: req.file.mimetype,
      type: getAssetType(req.file.originalname),
      uploadedBy: req.user ? req.user.id : null,
      uploadedAt: Date.now(),
      url: `/uploads/${req.file.filename}`
    };
    
    assets.set(assetId, asset);
    
    logger.info(`资产已上传: ${assetId} - ${req.file.originalname}`);
    
    res.status(201).json({
      status: 'success',
      data: {
        asset
      }
    });
  } catch (error) {
    next(error);
  }
};

const getAsset = (req, res, next) => {
  try {
    const asset = assets.get(req.params.id);
    
    if (!asset) {
      return next(new AppError('资产不存在', 404));
    }
    
    res.status(200).json({
      status: 'success',
      data: {
        asset
      }
    });
  } catch (error) {
    next(error);
  }
};

const updateAsset = (req, res, next) => {
  try {
    const asset = assets.get(req.params.id);
    
    if (!asset) {
      return next(new AppError('资产不存在', 404));
    }
    
    const { name, description, tags } = req.body;
    
    if (name) asset.name = name;
    if (description) asset.description = description;
    if (tags) asset.tags = tags;
    asset.updatedAt = Date.now();
    
    assets.set(req.params.id, asset);
    
    logger.info(`资产已更新: ${req.params.id}`);
    
    res.status(200).json({
      status: 'success',
      data: {
        asset
      }
    });
  } catch (error) {
    next(error);
  }
};

const deleteAsset = (req, res, next) => {
  try {
    const asset = assets.get(req.params.id);
    
    if (!asset) {
      return next(new AppError('资产不存在', 404));
    }
    
    if (fs.existsSync(asset.path)) {
      fs.unlinkSync(asset.path);
    }
    
    assets.delete(req.params.id);
    
    logger.info(`资产已删除: ${req.params.id} - ${asset.originalName}`);
    
    res.status(204).json({
      status: 'success',
      data: null
    });
  } catch (error) {
    next(error);
  }
};

const getModelAssets = (req, res, next) => {
  try {
    const modelAssets = Array.from(assets.values()).filter(
      asset => asset.type === assetTypes.MODEL
    );
    
    res.status(200).json({
      status: 'success',
      results: modelAssets.length,
      data: {
        assets: modelAssets
      }
    });
  } catch (error) {
    next(error);
  }
};

const getImageAssets = (req, res, next) => {
  try {
    const imageAssets = Array.from(assets.values()).filter(
      asset => asset.type === assetTypes.IMAGE
    );
    
    res.status(200).json({
      status: 'success',
      results: imageAssets.length,
      data: {
        assets: imageAssets
      }
    });
  } catch (error) {
    next(error);
  }
};

const getAudioAssets = (req, res, next) => {
  try {
    const audioAssets = Array.from(assets.values()).filter(
      asset => asset.type === assetTypes.AUDIO
    );
    
    res.status(200).json({
      status: 'success',
      results: audioAssets.length,
      data: {
        assets: audioAssets
      }
    });
  } catch (error) {
    next(error);
  }
};

const searchAssets = (req, res, next) => {
  try {
    const { query, type, tags } = req.body;
    let results = Array.from(assets.values());
    
    if (query) {
      const lowerQuery = query.toLowerCase();
      results = results.filter(asset => 
        asset.originalName.toLowerCase().includes(lowerQuery) ||
        (asset.name && asset.name.toLowerCase().includes(lowerQuery)) ||
        (asset.description && asset.description.toLowerCase().includes(lowerQuery))
      );
    }
    
    if (type) {
      results = results.filter(asset => asset.type === type);
    }
    
    if (tags && tags.length > 0) {
      results = results.filter(asset => 
        asset.tags && asset.tags.some(tag => tags.includes(tag))
      );
    }
    
    res.status(200).json({
      status: 'success',
      results: results.length,
      data: {
        assets: results
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllAssets,
  uploadAssets,
  uploadSingleAsset,
  getAsset,
  updateAsset,
  deleteAsset,
  getModelAssets,
  getImageAssets,
  getAudioAssets,
  searchAssets
};
