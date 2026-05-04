const Game = require('../game/Game');

// 游戏房间管理
const gameRooms = new Map(); // roomId -> Game instance
const playerGameMap = new Map(); // playerId -> roomId

class GameSocket {
  constructor(io) {
    this.io = io;
    this.initialize();
  }

  initialize() {
    this.io.on('connection', (socket) => {
      console.log('Player connected:', socket.id);

      // 玩家加入游戏
      socket.on('join_game', (data) => {
        this.handleJoinGame(socket, data);
      });

      // 准备开始游戏
      socket.on('ready', (data) => {
        this.handleReady(socket, data);
      });

      // 出牌
      socket.on('play_card', (data) => {
        this.handlePlayCard(socket, data);
      });

      // 随从攻击
      socket.on('minion_attack', (data) => {
        this.handleMinionAttack(socket, data);
      });

      // 结束回合
      socket.on('end_turn', (data) => {
        this.handleEndTurn(socket, data);
      });

      // 获取游戏状态
      socket.on('get_game_state', (data) => {
        this.handleGetGameState(socket, data);
      });

      // 断开连接
      socket.on('disconnect', () => {
        this.handleDisconnect(socket);
      });
    });
  }

  // 处理玩家加入游戏
  handleJoinGame(socket, { playerId, playerName, roomId }) {
    const targetRoomId = roomId || this.generateRoomId();
    
    // 如果房间不存在，创建新房间
    if (!gameRooms.has(targetRoomId)) {
      const game = new Game(targetRoomId);
      gameRooms.set(targetRoomId, game);
    }

    const game = gameRooms.get(targetRoomId);
    
    if (game.isFull()) {
      socket.emit('error', { message: 'Room is full' });
      return;
    }

    // 添加玩家到游戏
    const result = game.addPlayer(playerId || socket.id, playerName || 'Player');
    
    if (!result.success) {
      socket.emit('error', { message: result.error });
      return;
    }

    // 记录玩家所属房间
    playerGameMap.set(result.player.playerId, targetRoomId);
    
    // 加入Socket.IO房间
    socket.join(targetRoomId);
    
    // 发送加入成功消息
    socket.emit('game_joined', {
      roomId: targetRoomId,
      playerId: result.player.playerId,
      position: result.position,
      gameState: game.getGameState()
    });

    // 广播给房间内其他玩家
    socket.to(targetRoomId).emit('player_joined', {
      playerId: result.player.playerId,
      playerName: result.player.name,
      gameState: game.getGameState()
    });

    console.log(`Player ${result.player.name} joined room ${targetRoomId}`);
  }

  // 处理玩家准备
  async handleReady(socket, { playerId, roomId }) {
    const game = gameRooms.get(roomId);
    
    if (!game) {
      socket.emit('error', { message: 'Game not found' });
      return;
    }

    if (!game.isFull()) {
      socket.emit('waiting_for_opponent', { message: 'Waiting for opponent to join' });
      return;
    }

    // 开始游戏
    try {
      const result = await game.startGame();
      
      if (!result.success) {
        socket.emit('error', { message: result.error });
        return;
      }

      // 广播游戏开始
      this.io.to(roomId).emit('game_started', {
        gameState: result.gameState
      });

      console.log(`Game ${roomId} started`);
    } catch (error) {
      socket.emit('error', { message: error.message });
    }
  }

  // 处理出牌
  handlePlayCard(socket, { playerId, roomId, cardIndex, target }) {
    const game = gameRooms.get(roomId);
    
    if (!game) {
      socket.emit('error', { message: 'Game not found' });
      return;
    }

    const result = game.playCard(playerId, cardIndex, target);
    
    if (!result.success) {
      socket.emit('error', { message: result.error });
      return;
    }

    // 广播出牌事件
    this.io.to(roomId).emit('card_played', {
      playerId,
      playResult: result.playResult,
      effects: result.effects,
      gameState: result.gameState
    });

    console.log(`Player ${playerId} played card in room ${roomId}`);
  }

  // 处理随从攻击
  handleMinionAttack(socket, { playerId, roomId, attackerIndex, targetIndex, isTargetHero }) {
    const game = gameRooms.get(roomId);
    
    if (!game) {
      socket.emit('error', { message: 'Game not found' });
      return;
    }

    const result = game.minionAttack(playerId, attackerIndex, targetIndex, isTargetHero);
    
    if (!result.success) {
      socket.emit('error', { message: result.error });
      return;
    }

    // 广播攻击事件
    this.io.to(roomId).emit('minion_attacked', {
      playerId,
      attackResult: result.attackResult,
      effects: result.effects,
      gameState: result.gameState
    });

    console.log(`Player ${playerId} minion attacked in room ${roomId}`);
  }

  // 处理结束回合
  handleEndTurn(socket, { playerId, roomId }) {
    const game = gameRooms.get(roomId);
    
    if (!game) {
      socket.emit('error', { message: 'Game not found' });
      return;
    }

    const result = game.endTurn(playerId);
    
    if (!result.success) {
      socket.emit('error', { message: result.error });
      return;
    }

    // 广播回合结束事件
    this.io.to(roomId).emit('turn_ended', {
      playerId,
      effects: result.effects,
      gameState: result.gameState
    });

    console.log(`Player ${playerId} ended turn in room ${roomId}`);
  }

  // 处理获取游戏状态
  handleGetGameState(socket, { roomId, playerId }) {
    const game = gameRooms.get(roomId);
    
    if (!game) {
      socket.emit('error', { message: 'Game not found' });
      return;
    }

    socket.emit('game_state', {
      gameState: game.getGameState()
    });
  }

  // 处理断开连接
  handleDisconnect(socket) {
    console.log('Player disconnected:', socket.id);
    
    // 查找玩家所属的游戏
    const roomId = playerGameMap.get(socket.id);
    
    if (roomId && gameRooms.has(roomId)) {
      const game = gameRooms.get(roomId);
      
      // 广播玩家离开
      this.io.to(roomId).emit('player_left', {
        playerId: socket.id,
        gameState: game.getGameState()
      });

      // 清理
      playerGameMap.delete(socket.id);
      
      // 如果房间为空，可以清理
      if (!game.player1 && !game.player2) {
        gameRooms.delete(roomId);
      }
    }
  }

  // 生成房间ID
  generateRoomId() {
    return 'ROOM_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
  }
}

module.exports = GameSocket;
