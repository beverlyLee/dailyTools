import { useEffect, useRef, useState, useCallback } from 'react';
import io from 'socket.io-client';

const SERVER_URL = 'http://localhost:3001';

export function useGameSocket() {
  const socketRef = useRef(null);
  const [isConnected, setIsConnected] = useState(false);
  const [gameState, setGameState] = useState(null);
  const [playerId, setPlayerId] = useState(null);
  const [roomId, setRoomId] = useState(null);
  const [error, setError] = useState(null);
  const [gameEvents, setGameEvents] = useState([]);

  // 连接服务器
  const connect = useCallback(() => {
    if (socketRef.current) {
      return;
    }

    const socket = io(SERVER_URL, {
      transports: ['websocket', 'polling']
    });

    socket.on('connect', () => {
      setIsConnected(true);
      console.log('Connected to game server');
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
      console.log('Disconnected from game server');
    });

    // 游戏事件监听
    socket.on('game_joined', (data) => {
      setPlayerId(data.playerId);
      setRoomId(data.roomId);
      setGameState(data.gameState);
      addGameEvent({ type: 'game_joined', data });
    });

    socket.on('player_joined', (data) => {
      setGameState(data.gameState);
      addGameEvent({ type: 'player_joined', data });
    });

    socket.on('game_started', (data) => {
      setGameState(data.gameState);
      addGameEvent({ type: 'game_started', data });
    });

    socket.on('card_played', (data) => {
      setGameState(data.gameState);
      addGameEvent({ type: 'card_played', data });
    });

    socket.on('minion_attacked', (data) => {
      setGameState(data.gameState);
      addGameEvent({ type: 'minion_attacked', data });
    });

    socket.on('turn_ended', (data) => {
      setGameState(data.gameState);
      addGameEvent({ type: 'turn_ended', data });
    });

    socket.on('game_state', (data) => {
      setGameState(data.gameState);
    });

    socket.on('error', (data) => {
      setError(data.message);
      console.error('Game error:', data.message);
    });

    socket.on('player_left', (data) => {
      setGameState(data.gameState);
      addGameEvent({ type: 'player_left', data });
    });

    socketRef.current = socket;
  }, []);

  // 添加游戏事件
  const addGameEvent = (event) => {
    setGameEvents(prev => [...prev.slice(-19), { ...event, timestamp: Date.now() }]);
  };

  // 断开连接
  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }
  }, []);

  // 加入游戏
  const joinGame = useCallback((playerName, targetRoomId = null) => {
    if (!socketRef.current) {
      connect();
      return;
    }

    socketRef.current.emit('join_game', {
      playerName,
      roomId: targetRoomId
    });
  }, [connect]);

  // 准备开始游戏
  const ready = useCallback(() => {
    if (!socketRef.current || !playerId || !roomId) {
      return;
    }

    socketRef.current.emit('ready', {
      playerId,
      roomId
    });
  }, [playerId, roomId]);

  // 出牌
  const playCard = useCallback((cardIndex, target = null) => {
    if (!socketRef.current || !playerId || !roomId) {
      return;
    }

    socketRef.current.emit('play_card', {
      playerId,
      roomId,
      cardIndex,
      target
    });
  }, [playerId, roomId]);

  // 随从攻击
  const minionAttack = useCallback((attackerIndex, targetIndex, isTargetHero = false) => {
    if (!socketRef.current || !playerId || !roomId) {
      return;
    }

    socketRef.current.emit('minion_attack', {
      playerId,
      roomId,
      attackerIndex,
      targetIndex,
      isTargetHero
    });
  }, [playerId, roomId]);

  // 结束回合
  const endTurn = useCallback(() => {
    if (!socketRef.current || !playerId || !roomId) {
      return;
    }

    socketRef.current.emit('end_turn', {
      playerId,
      roomId
    });
  }, [playerId, roomId]);

  // 获取游戏状态
  const getGameState = useCallback(() => {
    if (!socketRef.current || !roomId) {
      return;
    }

    socketRef.current.emit('get_game_state', {
      roomId,
      playerId
    });
  }, [playerId, roomId]);

  // 清理
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  // 获取当前玩家数据
  const getCurrentPlayer = useCallback(() => {
    if (!gameState || !playerId) return null;
    
    if (gameState.player1?.playerId === playerId) {
      return gameState.player1;
    }
    if (gameState.player2?.playerId === playerId) {
      return gameState.player2;
    }
    return null;
  }, [gameState, playerId]);

  // 获取对手玩家数据
  const getOpponentPlayer = useCallback(() => {
    if (!gameState || !playerId) return null;
    
    if (gameState.player1?.playerId === playerId) {
      return gameState.player2;
    }
    if (gameState.player2?.playerId === playerId) {
      return gameState.player1;
    }
    return null;
  }, [gameState, playerId]);

  // 判断是否是当前回合
  const isMyTurn = useCallback(() => {
    if (!gameState || !playerId) return false;
    return gameState.currentPlayerId === playerId;
  }, [gameState, playerId]);

  return {
    isConnected,
    gameState,
    playerId,
    roomId,
    error,
    gameEvents,
    connect,
    disconnect,
    joinGame,
    ready,
    playCard,
    minionAttack,
    endTurn,
    getGameState,
    getCurrentPlayer,
    getOpponentPlayer,
    isMyTurn,
    setError
  };
}
