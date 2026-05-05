const { v4: uuidv4 } = require('uuid');

const config = require('../config/config');
const logger = require('../utils/logger');
const { AppError } = require('../middlewares/errorHandler');
const { 
  getSessionStats: getLiveSessionStats, 
  getAllSessions: getAllLiveSessions, 
  getTotalConnectedUsers 
} = require('../utils/socketManager');

const sessions = new Map();
const mutedUsers = new Map();

const getAllSessions = (req, res, next) => {
  try {
    const sessionList = Array.from(sessions.values());
    const liveSessions = getAllLiveSessions();
    
    const mergedSessions = sessionList.map(session => {
      const liveStats = liveSessions.find(l => l.sessionId === session.id);
      return {
        ...session,
        liveStats: liveStats || null
      };
    });
    
    res.status(200).json({
      status: 'success',
      results: mergedSessions.length,
      data: {
        sessions: mergedSessions,
        totalConnectedUsers: getTotalConnectedUsers()
      }
    });
  } catch (error) {
    next(error);
  }
};

const createSession = (req, res, next) => {
  try {
    const { name, exhibitionId, maxUsers, isPrivate, password } = req.body;
    
    const sessionId = uuidv4();
    const newSession = {
      id: sessionId,
      name: name || `VR展厅会话 ${new Date().toLocaleString()}`,
      exhibitionId: exhibitionId || null,
      maxUsers: maxUsers || config.maxUsersPerSession,
      isPrivate: isPrivate || false,
      password: password || null,
      createdBy: req.user.id,
      createdAt: Date.now(),
      status: 'active'
    };
    
    sessions.set(sessionId, newSession);
    
    logger.info(`会话已创建: ${sessionId} - ${newSession.name}`);
    
    res.status(201).json({
      status: 'success',
      data: {
        session: newSession
      }
    });
  } catch (error) {
    next(error);
  }
};

const getSession = (req, res, next) => {
  try {
    const session = sessions.get(req.params.id);
    
    if (!session) {
      return next(new AppError('会话不存在', 404));
    }
    
    const liveStats = getLiveSessionStats(req.params.id);
    
    res.status(200).json({
      status: 'success',
      data: {
        session,
        liveStats
      }
    });
  } catch (error) {
    next(error);
  }
};

const updateSession = (req, res, next) => {
  try {
    const session = sessions.get(req.params.id);
    
    if (!session) {
      return next(new AppError('会话不存在', 404));
    }
    
    const { name, maxUsers, isPrivate, password, status } = req.body;
    
    if (name) session.name = name;
    if (maxUsers) session.maxUsers = maxUsers;
    if (isPrivate !== undefined) session.isPrivate = isPrivate;
    if (password !== undefined) session.password = password;
    if (status) session.status = status;
    
    session.updatedAt = Date.now();
    sessions.set(req.params.id, session);
    
    logger.info(`会话已更新: ${req.params.id}`);
    
    res.status(200).json({
      status: 'success',
      data: {
        session
      }
    });
  } catch (error) {
    next(error);
  }
};

const deleteSession = (req, res, next) => {
  try {
    const session = sessions.get(req.params.id);
    
    if (!session) {
      return next(new AppError('会话不存在', 404));
    }
    
    sessions.delete(req.params.id);
    
    logger.info(`会话已删除: ${req.params.id} - ${session.name}`);
    
    res.status(204).json({
      status: 'success',
      data: null
    });
  } catch (error) {
    next(error);
  }
};

const joinSession = (req, res, next) => {
  try {
    const session = sessions.get(req.params.id);
    
    if (!session) {
      return next(new AppError('会话不存在', 404));
    }
    
    if (session.status !== 'active') {
      return next(new AppError('会话已结束', 400));
    }
    
    if (session.isPrivate && session.password) {
      const { password } = req.body;
      if (password !== session.password) {
        return next(new AppError('密码错误', 401));
      }
    }
    
    const liveStats = getLiveSessionStats(req.params.id);
    
    if (liveStats && liveStats.userCount >= session.maxUsers) {
      return next(new AppError('会话已满', 400));
    }
    
    res.status(200).json({
      status: 'success',
      message: '可以加入会话',
      data: {
        sessionId: session.id,
        sessionName: session.name,
        exhibitionId: session.exhibitionId
      }
    });
  } catch (error) {
    next(error);
  }
};

const leaveSession = (req, res, next) => {
  try {
    const session = sessions.get(req.params.id);
    
    if (!session) {
      return next(new AppError('会话不存在', 404));
    }
    
    res.status(200).json({
      status: 'success',
      message: '已离开会话'
    });
  } catch (error) {
    next(error);
  }
};

const getSessionStats = (req, res, next) => {
  try {
    const liveStats = getLiveSessionStats(req.params.id);
    
    if (!liveStats) {
      return next(new AppError('会话不存在或没有活跃用户', 404));
    }
    
    res.status(200).json({
      status: 'success',
      data: {
        stats: liveStats
      }
    });
  } catch (error) {
    next(error);
  }
};

const getSessionUsers = (req, res, next) => {
  try {
    const liveStats = getLiveSessionStats(req.params.id);
    
    if (!liveStats) {
      return next(new AppError('会话不存在或没有活跃用户', 404));
    }
    
    res.status(200).json({
      status: 'success',
      results: liveStats.users.length,
      data: {
        users: liveStats.users
      }
    });
  } catch (error) {
    next(error);
  }
};

const kickUser = (req, res, next) => {
  try {
    const { id: sessionId, userId } = req.params;
    
    const session = sessions.get(sessionId);
    
    if (!session) {
      return next(new AppError('会话不存在', 404));
    }
    
    logger.info(`用户 ${userId} 被踢出会话 ${sessionId}`);
    
    res.status(200).json({
      status: 'success',
      message: `用户 ${userId} 已被踢出会话`
    });
  } catch (error) {
    next(error);
  }
};

const muteUser = (req, res, next) => {
  try {
    const { id: sessionId, userId } = req.params;
    
    const session = sessions.get(sessionId);
    
    if (!session) {
      return next(new AppError('会话不存在', 404));
    }
    
    if (!mutedUsers.has(sessionId)) {
      mutedUsers.set(sessionId, new Set());
    }
    
    mutedUsers.get(sessionId).add(userId);
    
    logger.info(`用户 ${userId} 在会话 ${sessionId} 被静音`);
    
    res.status(200).json({
      status: 'success',
      message: `用户 ${userId} 已被静音`
    });
  } catch (error) {
    next(error);
  }
};

const unmuteUser = (req, res, next) => {
  try {
    const { id: sessionId, userId } = req.params;
    
    if (mutedUsers.has(sessionId)) {
      mutedUsers.get(sessionId).delete(userId);
    }
    
    logger.info(`用户 ${userId} 在会话 ${sessionId} 被解除静音`);
    
    res.status(200).json({
      status: 'success',
      message: `用户 ${userId} 已被解除静音`
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllSessions,
  createSession,
  getSession,
  updateSession,
  deleteSession,
  joinSession,
  leaveSession,
  getSessionStats,
  getSessionUsers,
  kickUser,
  muteUser,
  unmuteUser
};
