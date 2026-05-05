const { v4: uuidv4 } = require('uuid');

const logger = require('../utils/logger');
const { AppError } = require('../middlewares/errorHandler');

const exhibitions = new Map();

const getAllExhibitions = (req, res, next) => {
  try {
    const exhibitionList = Array.from(exhibitions.values()).filter(
      ex => ex.createdBy === req.user.id || ex.isPublic
    );
    
    res.status(200).json({
      status: 'success',
      results: exhibitionList.length,
      data: {
        exhibitions: exhibitionList
      }
    });
  } catch (error) {
    next(error);
  }
};

const createExhibition = (req, res, next) => {
  try {
    const { name, description, isPublic, settings } = req.body;
    
    if (!name) {
      return next(new AppError('请提供展览名称', 400));
    }
    
    const exhibitionId = uuidv4();
    const newExhibition = {
      id: exhibitionId,
      name,
      description: description || '',
      isPublic: isPublic || false,
      createdBy: req.user.id,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      lastEditedBy: req.user.id,
      isPublished: false,
      publishedAt: null,
      settings: {
        floorSize: { width: 20, depth: 20 },
        defaultLighting: true,
        background: '#000000',
        gravity: 9.8,
        walkSpeed: 3,
        runSpeed: 6,
        ...settings
      },
      assets: [],
      hotspots: [],
      paths: [],
      thumbnail: null
    };
    
    exhibitions.set(exhibitionId, newExhibition);
    
    logger.info(`展览已创建: ${exhibitionId} - ${name}`);
    
    res.status(201).json({
      status: 'success',
      data: {
        exhibition: newExhibition
      }
    });
  } catch (error) {
    next(error);
  }
};

const getExhibition = (req, res, next) => {
  try {
    const exhibition = exhibitions.get(req.params.id);
    
    if (!exhibition) {
      return next(new AppError('展览不存在', 404));
    }
    
    if (!exhibition.isPublic && exhibition.createdBy !== req.user?.id) {
      return next(new AppError('您没有权限访问此展览', 403));
    }
    
    res.status(200).json({
      status: 'success',
      data: {
        exhibition
      }
    });
  } catch (error) {
    next(error);
  }
};

const updateExhibition = (req, res, next) => {
  try {
    const exhibition = exhibitions.get(req.params.id);
    
    if (!exhibition) {
      return next(new AppError('展览不存在', 404));
    }
    
    if (exhibition.createdBy !== req.user.id && req.user.role !== 'admin') {
      return next(new AppError('您没有权限编辑此展览', 403));
    }
    
    const { name, description, isPublic, settings, thumbnail } = req.body;
    
    if (name) exhibition.name = name;
    if (description !== undefined) exhibition.description = description;
    if (isPublic !== undefined) exhibition.isPublic = isPublic;
    if (settings) exhibition.settings = { ...exhibition.settings, ...settings };
    if (thumbnail !== undefined) exhibition.thumbnail = thumbnail;
    
    exhibition.updatedAt = Date.now();
    exhibition.lastEditedBy = req.user.id;
    
    exhibitions.set(req.params.id, exhibition);
    
    logger.info(`展览已更新: ${req.params.id}`);
    
    res.status(200).json({
      status: 'success',
      data: {
        exhibition
      }
    });
  } catch (error) {
    next(error);
  }
};

const deleteExhibition = (req, res, next) => {
  try {
    const exhibition = exhibitions.get(req.params.id);
    
    if (!exhibition) {
      return next(new AppError('展览不存在', 404));
    }
    
    if (exhibition.createdBy !== req.user.id && req.user.role !== 'admin') {
      return next(new AppError('您没有权限删除此展览', 403));
    }
    
    exhibitions.delete(req.params.id);
    
    logger.info(`展览已删除: ${req.params.id} - ${exhibition.name}`);
    
    res.status(204).json({
      status: 'success',
      data: null
    });
  } catch (error) {
    next(error);
  }
};

const publishExhibition = (req, res, next) => {
  try {
    const exhibition = exhibitions.get(req.params.id);
    
    if (!exhibition) {
      return next(new AppError('展览不存在', 404));
    }
    
    if (exhibition.createdBy !== req.user.id && req.user.role !== 'admin') {
      return next(new AppError('您没有权限发布此展览', 403));
    }
    
    exhibition.isPublished = true;
    exhibition.publishedAt = Date.now();
    exhibition.updatedAt = Date.now();
    
    exhibitions.set(req.params.id, exhibition);
    
    logger.info(`展览已发布: ${req.params.id}`);
    
    res.status(200).json({
      status: 'success',
      message: '展览已发布',
      data: {
        exhibition
      }
    });
  } catch (error) {
    next(error);
  }
};

const unpublishExhibition = (req, res, next) => {
  try {
    const exhibition = exhibitions.get(req.params.id);
    
    if (!exhibition) {
      return next(new AppError('展览不存在', 404));
    }
    
    if (exhibition.createdBy !== req.user.id && req.user.role !== 'admin') {
      return next(new AppError('您没有权限取消发布此展览', 403));
    }
    
    exhibition.isPublished = false;
    exhibition.updatedAt = Date.now();
    
    exhibitions.set(req.params.id, exhibition);
    
    logger.info(`展览已取消发布: ${req.params.id}`);
    
    res.status(200).json({
      status: 'success',
      message: '展览已取消发布',
      data: {
        exhibition
      }
    });
  } catch (error) {
    next(error);
  }
};

const duplicateExhibition = (req, res, next) => {
  try {
    const originalExhibition = exhibitions.get(req.params.id);
    
    if (!originalExhibition) {
      return next(new AppError('展览不存在', 404));
    }
    
    const newExhibitionId = uuidv4();
    const newExhibition = {
      ...JSON.parse(JSON.stringify(originalExhibition)),
      id: newExhibitionId,
      name: `${originalExhibition.name} (副本)`,
      createdBy: req.user.id,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      lastEditedBy: req.user.id,
      isPublished: false,
      publishedAt: null
    };
    
    exhibitions.set(newExhibitionId, newExhibition);
    
    logger.info(`展览已复制: ${req.params.id} -> ${newExhibitionId}`);
    
    res.status(201).json({
      status: 'success',
      data: {
        exhibition: newExhibition
      }
    });
  } catch (error) {
    next(error);
  }
};

const getHotspots = (req, res, next) => {
  try {
    const exhibition = exhibitions.get(req.params.id);
    
    if (!exhibition) {
      return next(new AppError('展览不存在', 404));
    }
    
    res.status(200).json({
      status: 'success',
      results: exhibition.hotspots.length,
      data: {
        hotspots: exhibition.hotspots
      }
    });
  } catch (error) {
    next(error);
  }
};

const addHotspot = (req, res, next) => {
  try {
    const exhibition = exhibitions.get(req.params.id);
    
    if (!exhibition) {
      return next(new AppError('展览不存在', 404));
    }
    
    const { position, rotation, type, content, triggerRadius, isVisible } = req.body;
    
    if (!position) {
      return next(new AppError('请提供热点位置', 400));
    }
    
    const hotspotId = uuidv4();
    const newHotspot = {
      id: hotspotId,
      position,
      rotation: rotation || { x: 0, y: 0, z: 0 },
      type: type || 'info',
      content: content || {},
      triggerRadius: triggerRadius || 1.5,
      isVisible: isVisible !== undefined ? isVisible : true,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    
    exhibition.hotspots.push(newHotspot);
    exhibition.updatedAt = Date.now();
    
    exhibitions.set(req.params.id, exhibition);
    
    logger.info(`热点已添加: ${hotspotId} 到展览 ${req.params.id}`);
    
    res.status(201).json({
      status: 'success',
      data: {
        hotspot: newHotspot
      }
    });
  } catch (error) {
    next(error);
  }
};

const updateHotspot = (req, res, next) => {
  try {
    const exhibition = exhibitions.get(req.params.id);
    
    if (!exhibition) {
      return next(new AppError('展览不存在', 404));
    }
    
    const hotspotIndex = exhibition.hotspots.findIndex(
      h => h.id === req.params.hotspotId
    );
    
    if (hotspotIndex === -1) {
      return next(new AppError('热点不存在', 404));
    }
    
    const { position, rotation, type, content, triggerRadius, isVisible } = req.body;
    const hotspot = exhibition.hotspots[hotspotIndex];
    
    if (position) hotspot.position = position;
    if (rotation) hotspot.rotation = rotation;
    if (type) hotspot.type = type;
    if (content) hotspot.content = { ...hotspot.content, ...content };
    if (triggerRadius !== undefined) hotspot.triggerRadius = triggerRadius;
    if (isVisible !== undefined) hotspot.isVisible = isVisible;
    hotspot.updatedAt = Date.now();
    
    exhibition.updatedAt = Date.now();
    exhibitions.set(req.params.id, exhibition);
    
    logger.info(`热点已更新: ${req.params.hotspotId}`);
    
    res.status(200).json({
      status: 'success',
      data: {
        hotspot
      }
    });
  } catch (error) {
    next(error);
  }
};

const deleteHotspot = (req, res, next) => {
  try {
    const exhibition = exhibitions.get(req.params.id);
    
    if (!exhibition) {
      return next(new AppError('展览不存在', 404));
    }
    
    const hotspotIndex = exhibition.hotspots.findIndex(
      h => h.id === req.params.hotspotId
    );
    
    if (hotspotIndex === -1) {
      return next(new AppError('热点不存在', 404));
    }
    
    exhibition.hotspots.splice(hotspotIndex, 1);
    exhibition.updatedAt = Date.now();
    
    exhibitions.set(req.params.id, exhibition);
    
    logger.info(`热点已删除: ${req.params.hotspotId} 从展览 ${req.params.id}`);
    
    res.status(204).json({
      status: 'success',
      data: null
    });
  } catch (error) {
    next(error);
  }
};

const getPaths = (req, res, next) => {
  try {
    const exhibition = exhibitions.get(req.params.id);
    
    if (!exhibition) {
      return next(new AppError('展览不存在', 404));
    }
    
    res.status(200).json({
      status: 'success',
      results: exhibition.paths.length,
      data: {
        paths: exhibition.paths
      }
    });
  } catch (error) {
    next(error);
  }
};

const addPath = (req, res, next) => {
  try {
    const exhibition = exhibitions.get(req.params.id);
    
    if (!exhibition) {
      return next(new AppError('展览不存在', 404));
    }
    
    const { name, waypoints, isLoop, speed, isDefault } = req.body;
    
    if (!waypoints || waypoints.length === 0) {
      return next(new AppError('请提供路径点', 400));
    }
    
    const pathId = uuidv4();
    const newPath = {
      id: pathId,
      name: name || `路径 ${exhibition.paths.length + 1}`,
      waypoints,
      isLoop: isLoop || false,
      speed: speed || 2,
      isDefault: isDefault || false,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    
    if (newPath.isDefault) {
      exhibition.paths.forEach(p => p.isDefault = false);
    }
    
    exhibition.paths.push(newPath);
    exhibition.updatedAt = Date.now();
    
    exhibitions.set(req.params.id, exhibition);
    
    logger.info(`路径已添加: ${pathId} 到展览 ${req.params.id}`);
    
    res.status(201).json({
      status: 'success',
      data: {
        path: newPath
      }
    });
  } catch (error) {
    next(error);
  }
};

const updatePath = (req, res, next) => {
  try {
    const exhibition = exhibitions.get(req.params.id);
    
    if (!exhibition) {
      return next(new AppError('展览不存在', 404));
    }
    
    const pathIndex = exhibition.paths.findIndex(
      p => p.id === req.params.pathId
    );
    
    if (pathIndex === -1) {
      return next(new AppError('路径不存在', 404));
    }
    
    const { name, waypoints, isLoop, speed, isDefault } = req.body;
    const path = exhibition.paths[pathIndex];
    
    if (name) path.name = name;
    if (waypoints) path.waypoints = waypoints;
    if (isLoop !== undefined) path.isLoop = isLoop;
    if (speed) path.speed = speed;
    if (isDefault !== undefined) {
      if (isDefault) {
        exhibition.paths.forEach(p => p.isDefault = false);
      }
      path.isDefault = isDefault;
    }
    path.updatedAt = Date.now();
    
    exhibition.updatedAt = Date.now();
    exhibitions.set(req.params.id, exhibition);
    
    logger.info(`路径已更新: ${req.params.pathId}`);
    
    res.status(200).json({
      status: 'success',
      data: {
        path
      }
    });
  } catch (error) {
    next(error);
  }
};

const deletePath = (req, res, next) => {
  try {
    const exhibition = exhibitions.get(req.params.id);
    
    if (!exhibition) {
      return next(new AppError('展览不存在', 404));
    }
    
    const pathIndex = exhibition.paths.findIndex(
      p => p.id === req.params.pathId
    );
    
    if (pathIndex === -1) {
      return next(new AppError('路径不存在', 404));
    }
    
    exhibition.paths.splice(pathIndex, 1);
    exhibition.updatedAt = Date.now();
    
    exhibitions.set(req.params.id, exhibition);
    
    logger.info(`路径已删除: ${req.params.pathId} 从展览 ${req.params.id}`);
    
    res.status(204).json({
      status: 'success',
      data: null
    });
  } catch (error) {
    next(error);
  }
};

const getAssets = (req, res, next) => {
  try {
    const exhibition = exhibitions.get(req.params.id);
    
    if (!exhibition) {
      return next(new AppError('展览不存在', 404));
    }
    
    res.status(200).json({
      status: 'success',
      results: exhibition.assets.length,
      data: {
        assets: exhibition.assets
      }
    });
  } catch (error) {
    next(error);
  }
};

const addAsset = (req, res, next) => {
  try {
    const exhibition = exhibitions.get(req.params.id);
    
    if (!exhibition) {
      return next(new AppError('展览不存在', 404));
    }
    
    const { assetId, position, rotation, scale, name, type } = req.body;
    
    if (!assetId) {
      return next(new AppError('请提供资产ID', 400));
    }
    
    const exhibitionAssetId = uuidv4();
    const newExhibitionAsset = {
      id: exhibitionAssetId,
      assetId,
      name: name || `资产 ${exhibition.assets.length + 1}`,
      type: type || 'model',
      position: position || { x: 0, y: 0, z: 0 },
      rotation: rotation || { x: 0, y: 0, z: 0 },
      scale: scale || { x: 1, y: 1, z: 1 },
      isVisible: true,
      isCollidable: true,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    
    exhibition.assets.push(newExhibitionAsset);
    exhibition.updatedAt = Date.now();
    
    exhibitions.set(req.params.id, exhibition);
    
    logger.info(`资产已添加: ${exhibitionAssetId} 到展览 ${req.params.id}`);
    
    res.status(201).json({
      status: 'success',
      data: {
        asset: newExhibitionAsset
      }
    });
  } catch (error) {
    next(error);
  }
};

const updateAssetPosition = (req, res, next) => {
  try {
    const exhibition = exhibitions.get(req.params.id);
    
    if (!exhibition) {
      return next(new AppError('展览不存在', 404));
    }
    
    const assetIndex = exhibition.assets.findIndex(
      a => a.id === req.params.assetId
    );
    
    if (assetIndex === -1) {
      return next(new AppError('资产不存在', 404));
    }
    
    const { position, rotation, scale, name, isVisible, isCollidable } = req.body;
    const asset = exhibition.assets[assetIndex];
    
    if (position) asset.position = position;
    if (rotation) asset.rotation = rotation;
    if (scale) asset.scale = scale;
    if (name) asset.name = name;
    if (isVisible !== undefined) asset.isVisible = isVisible;
    if (isCollidable !== undefined) asset.isCollidable = isCollidable;
    asset.updatedAt = Date.now();
    
    exhibition.updatedAt = Date.now();
    exhibitions.set(req.params.id, exhibition);
    
    logger.info(`资产位置已更新: ${req.params.assetId}`);
    
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

const removeAsset = (req, res, next) => {
  try {
    const exhibition = exhibitions.get(req.params.id);
    
    if (!exhibition) {
      return next(new AppError('展览不存在', 404));
    }
    
    const assetIndex = exhibition.assets.findIndex(
      a => a.id === req.params.assetId
    );
    
    if (assetIndex === -1) {
      return next(new AppError('资产不存在', 404));
    }
    
    exhibition.assets.splice(assetIndex, 1);
    exhibition.updatedAt = Date.now();
    
    exhibitions.set(req.params.id, exhibition);
    
    logger.info(`资产已移除: ${req.params.assetId} 从展览 ${req.params.id}`);
    
    res.status(204).json({
      status: 'success',
      data: null
    });
  } catch (error) {
    next(error);
  }
};

const getPublicExhibitions = (req, res, next) => {
  try {
    const publicExhibitions = Array.from(exhibitions.values()).filter(
      ex => ex.isPublic && ex.isPublished
    );
    
    res.status(200).json({
      status: 'success',
      results: publicExhibitions.length,
      data: {
        exhibitions: publicExhibitions
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllExhibitions,
  createExhibition,
  getExhibition,
  updateExhibition,
  deleteExhibition,
  publishExhibition,
  unpublishExhibition,
  duplicateExhibition,
  getHotspots,
  addHotspot,
  updateHotspot,
  deleteHotspot,
  getPaths,
  addPath,
  updatePath,
  deletePath,
  getAssets,
  addAsset,
  updateAssetPosition,
  removeAsset,
  getPublicExhibitions
};
