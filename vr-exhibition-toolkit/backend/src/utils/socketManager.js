const logger = require('./logger');
const config = require('../config/config');

const connectedUsers = new Map();
const sessions = new Map();
const userSessions = new Map();

const setupSocketIO = (io) => {
  io.on('connection', (socket) => {
    logger.info(`客户端连接: ${socket.id}`);
    
    socket.on('join_session', (data) => {
      handleJoinSession(socket, data, io);
    });
    
    socket.on('leave_session', (data) => {
      handleLeaveSession(socket, data, io);
    });
    
    socket.on('update_position', (data) => {
      handleUpdatePosition(socket, data, io);
    });
    
    socket.on('update_rotation', (data) => {
      handleUpdateRotation(socket, data, io);
    });
    
    socket.on('laser_pointer', (data) => {
      handleLaserPointer(socket, data, io);
    });
    
    socket.on('voice_chat', (data) => {
      handleVoiceChat(socket, data, io);
    });
    
    socket.on('chat_message', (data) => {
      handleChatMessage(socket, data, io);
    });
    
    socket.on('interact_hotspot', (data) => {
      handleHotspotInteraction(socket, data, io);
    });
    
    socket.on('disconnect', () => {
      handleDisconnect(socket, io);
    });
    
    socket.on('error', (error) => {
      logger.error(`Socket错误: ${socket.id} - ${error.message}`);
    });
  });
};

const handleJoinSession = (socket, data, io) => {
  const { sessionId, userId, username, avatar } = data;
  
  if (!sessionId || !userId) {
    socket.emit('error', { message: '缺少必要参数' });
    return;
  }
  
  if (!sessions.has(sessionId)) {
    sessions.set(sessionId, {
      id: sessionId,
      users: new Map(),
      startTime: Date.now(),
      maxUsers: config.maxUsersPerSession
    });
  }
  
  const session = sessions.get(sessionId);
  
  if (session.users.size >= session.maxUsers) {
    socket.emit('error', { message: '会话已满' });
    return;
  }
  
  const user = {
    id: userId,
    username: username || '匿名用户',
    avatar: avatar || '',
    socketId: socket.id,
    position: { x: 0, y: 0, z: 0 },
    rotation: { x: 0, y: 0, z: 0 },
    joinedAt: Date.now(),
    lastActive: Date.now()
  };
  
  session.users.set(userId, user);
  connectedUsers.set(socket.id, { userId, sessionId });
  userSessions.set(userId, sessionId);
  
  socket.join(sessionId);
  
  const usersList = Array.from(session.users.values()).map(u => ({
    id: u.id,
    username: u.username,
  avatar: u.avatar,
  position: u.position,
  rotation: u.rotation
}));

socket.emit('session_joined', {
  sessionId,
  users: usersList,
  startTime: session.startTime
});

socket.to(sessionId).emit('user_joined', {
  id: userId,
  username: user.username,
  avatar: user.avatar,
  position: user.position,
  rotation: user.rotation
});

logger.info(`用户 ${userId} (${user.username}) 加入会话 ${sessionId}`);
};

const handleLeaveSession = (socket, data, io) => {
  const { sessionId, userId } = data;
  
  if (!sessionId || !userId) {
    return;
  }
  
  const session = sessions.get(sessionId);
  if (!session) {
    return;
  }
  
  const user = session.users.get(userId);
  if (!user) {
    return;
  }
  
  session.users.delete(userId);
  connectedUsers.delete(socket.id);
  userSessions.delete(userId);
  
  socket.leave(sessionId);
  
  socket.to(sessionId).emit('user_left', {
    id: userId,
    username: user.username
  });
  
  if (session.users.size === 0) {
    sessions.delete(sessionId);
    logger.info(`会话 ${sessionId} 已结束，所有用户已离开`);
  }
  
  logger.info(`用户 ${userId} (${user.username}) 离开会话 ${sessionId}`);
};

const handleUpdatePosition = (socket, data, io) => {
  const { userId, sessionId, position } = data;
  
  if (!userId || !sessionId || !position) {
    return;
  }
  
  const session = sessions.get(sessionId);
  if (!session) {
    return;
  }
  
  const user = session.users.get(userId);
  if (!user) {
    return;
  }
  
  user.position = position;
  user.lastActive = Date.now();
  
  socket.to(sessionId).emit('user_position_updated', {
    id: userId,
    position
  });
};

const handleUpdateRotation = (socket, data, io) => {
  const { userId, sessionId, rotation } = data;
  
  if (!userId || !sessionId || !rotation) {
    return;
  }
  
  const session = sessions.get(sessionId);
  if (!session) {
    return;
  }
  
  const user = session.users.get(userId);
  if (!user) {
    return;
  }
  
  user.rotation = rotation;
  user.lastActive = Date.now();
  
  socket.to(sessionId).emit('user_rotation_updated', {
    id: userId,
    rotation
  });
};

const handleLaserPointer = (socket, data, io) => {
  const { userId, sessionId, isActive, position, direction } = data;
  
  if (!userId || !sessionId) {
    return;
  }
  
  const session = sessions.get(sessionId);
  if (!session) {
    return;
  }
  
  const user = session.users.get(userId);
  if (!user) {
    return;
  }
  
  user.lastActive = Date.now();
  
  socket.to(sessionId).emit('laser_pointer_updated', {
    id: userId,
    isActive,
    position,
    direction
  });
};

const handleVoiceChat = (socket, data, io) => {
  const { userId, sessionId, audioData, isSpeaking } = data;
  
  if (!userId || !sessionId) {
    return;
  }
  
  const session = sessions.get(sessionId);
  if (!session) {
    return;
  }
  
  const user = session.users.get(userId);
  if (!user) {
    return;
  }
  
  user.lastActive = Date.now();
  
  socket.to(sessionId).emit('voice_chat_data', {
    id: userId,
    audioData,
    isSpeaking
  });
};

const handleChatMessage = (socket, data, io) => {
  const { userId, sessionId, message, timestamp } = data;
  
  if (!userId || !sessionId || !message) {
    return;
  }
  
  const session = sessions.get(sessionId);
  if (!session) {
    return;
  }
  
  const user = session.users.get(userId);
  if (!user) {
    return;
  }
  
  user.lastActive = Date.now();
  
  const chatMessage = {
    id: Date.now().toString(),
    userId,
    username: user.username,
    message,
    timestamp: timestamp || Date.now()
  };
  
  io.to(sessionId).emit('chat_message_received', chatMessage);
  logger.info(`用户 ${userId} 在会话 ${sessionId} 发送消息: ${message.substring(0, 50)}`);
};

const handleHotspotInteraction = (socket, data, io) => {
  const { userId, sessionId, hotspotId, action } = data;
  
  if (!userId || !sessionId || !hotspotId) {
    return;
  }
  
  const session = sessions.get(sessionId);
  if (!session) {
    return;
  }
  
  const user = session.users.get(userId);
  if (!user) {
    return;
  }
  
  user.lastActive = Date.now();
  
  socket.to(sessionId).emit('hotspot_interaction', {
    id: userId,
    hotspotId,
    action,
    timestamp: Date.now()
  });
};

const handleDisconnect = (socket, io) => {
  const userData = connectedUsers.get(socket.id);
  if (!userData) {
    logger.info(`客户端断开连接: ${socket.id} (未加入任何会话)`);
    return;
  }
  
  const { userId, sessionId } = userData;
  
  handleLeaveSession(socket, { sessionId, userId }, io);
  
  logger.info(`客户端断开连接: ${socket.id} (用户 ${userId})`);
};

const getSessionStats = (sessionId) => {
  const session = sessions.get(sessionId);
  if (!session) {
    return null;
  }
  
  const users = Array.from(session.users.values());
  const now = Date.now();
  
  return {
    sessionId,
    userCount: users.length,
    maxUsers: session.maxUsers,
    startTime: session.startTime,
    duration: now - session.startTime,
    users: users.map(u => ({
      id: u.id,
      username: u.username,
      joinedAt: u.joinedAt,
      lastActive: u.lastActive,
      duration: now - u.joinedAt,
      position: u.position,
      rotation: u.rotation
    }))
  };
};

const getAllSessions = () => {
  const sessionList = [];
  
  sessions.forEach((session, sessionId) => {
    const stats = getSessionStats(sessionId);
    if (stats && sessionList.push(stats));
  });
  
  return sessionList;
};

const getTotalConnectedUsers = () => {
  return connectedUsers.size;
};

module.exports = {
  setupSocketIO,
  getSessionStats,
  getAllSessions,
  getTotalConnectedUsers,
  sessions,
  connectedUsers
};
