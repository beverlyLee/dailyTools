const express = require('express');

const sessionController = require('../controllers/sessionController');
const { protect, restrictTo } = require('../middlewares/auth');

const router = express.Router();

router.use(protect);

router.route('/')
  .get(sessionController.getAllSessions)
  .post(sessionController.createSession);

router.route('/:id')
  .get(sessionController.getSession)
  .put(sessionController.updateSession)
  .delete(sessionController.deleteSession);

router.route('/:id/join')
  .post(sessionController.joinSession);

router.route('/:id/leave')
  .post(sessionController.leaveSession);

router.route('/:id/stats')
  .get(sessionController.getSessionStats);

router.route('/:id/users')
  .get(sessionController.getSessionUsers);

router.route('/:id/kick/:userId')
  .post(restrictTo('admin', 'moderator'), sessionController.kickUser);

router.route('/:id/mute/:userId')
  .post(restrictTo('admin', 'moderator'), sessionController.muteUser);

router.route('/:id/unmute/:userId')
  .post(restrictTo('admin', 'moderator'), sessionController.unmuteUser);

module.exports = router;
