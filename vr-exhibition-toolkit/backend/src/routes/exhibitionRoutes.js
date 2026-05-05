const express = require('express');

const exhibitionController = require('../controllers/exhibitionController');
const { protect, restrictTo } = require('../middlewares/auth');

const router = express.Router();

router.route('/')
  .get(protect, exhibitionController.getAllExhibitions)
  .post(protect, exhibitionController.createExhibition);

router.route('/:id')
  .get(protect, exhibitionController.getExhibition)
  .put(protect, exhibitionController.updateExhibition)
  .delete(protect, exhibitionController.deleteExhibition);

router.route('/:id/publish')
  .post(protect, restrictTo('admin', 'creator'), exhibitionController.publishExhibition);

router.route('/:id/unpublish')
  .post(protect, restrictTo('admin', 'creator'), exhibitionController.unpublishExhibition);

router.route('/:id/duplicate')
  .post(protect, exhibitionController.duplicateExhibition);

router.route('/:id/hotspots')
  .get(protect, exhibitionController.getHotspots)
  .post(protect, exhibitionController.addHotspot);

router.route('/:id/hotspots/:hotspotId')
  .put(protect, exhibitionController.updateHotspot)
  .delete(protect, exhibitionController.deleteHotspot);

router.route('/:id/paths')
  .get(protect, exhibitionController.getPaths)
  .post(protect, exhibitionController.addPath);

router.route('/:id/paths/:pathId')
  .put(protect, exhibitionController.updatePath)
  .delete(protect, exhibitionController.deletePath);

router.route('/:id/assets')
  .get(protect, exhibitionController.getAssets)
  .post(protect, exhibitionController.addAsset);

router.route('/:id/assets/:assetId')
  .put(protect, exhibitionController.updateAssetPosition)
  .delete(protect, exhibitionController.removeAsset);

router.route('/public')
  .get(exhibitionController.getPublicExhibitions);

module.exports = router;
