import React, { useState, useEffect } from 'react';
import { useGameSocket } from './hooks/useGameSocket';
import GameBoard from './components/GameBoard';
import Lobby from './components/Lobby';
import './App.css';

function App() {
  const {
    isConnected,
    gameState,
    playerId,
    roomId,
    error,
    gameEvents,
    connect,
    joinGame,
    ready,
    playCard,
    minionAttack,
    endTurn,
    getCurrentPlayer,
    getOpponentPlayer,
    isMyTurn,
    setError
  } = useGameSocket();

  const [playerName, setPlayerName] = useState('');
  const [targetRoomId, setTargetRoomId] = useState('');
  const [selectedCardIndex, setSelectedCardIndex] = useState(null);
  const [selectedMinionIndex, setSelectedMinionIndex] = useState(null);
  const [gamePhase, setGamePhase] = useState('lobby'); // lobby, playing

  // 连接服务器
  useEffect(() => {
    connect();
  }, [connect]);

  // 监听游戏状态变化
  useEffect(() => {
    if (gameState) {
      if (gameState.status === 'playing') {
        setGamePhase('playing');
      } else if (gameState.status === 'finished') {
        alert(`游戏结束！胜利者: ${gameState.winnerId === playerId ? '你' : '对手'}`);
      }
    }
  }, [gameState, playerId]);

  // 处理加入游戏
  const handleJoinGame = () => {
    if (!playerName.trim()) {
      alert('请输入玩家名称');
      return;
    }
    joinGame(playerName.trim(), targetRoomId.trim() || null);
  };

  // 处理准备
  const handleReady = () => {
    ready();
  };

  // 处理选择手牌
  const handleSelectCard = (index) => {
    if (!isMyTurn()) return;
    
    const currentPlayer = getCurrentPlayer();
    if (!currentPlayer) return;
    
    const card = currentPlayer.hand[index];
    if (card && card.cost <= currentPlayer.mana) {
      setSelectedCardIndex(index);
      setSelectedMinionIndex(null);
    }
  };

  // 处理出牌
  const handlePlayCard = (target = null) => {
    if (selectedCardIndex === null) return;
    playCard(selectedCardIndex, target);
    setSelectedCardIndex(null);
  };

  // 处理选择场上随从
  const handleSelectMinion = (index) => {
    if (!isMyTurn()) return;
    
    const currentPlayer = getCurrentPlayer();
    if (!currentPlayer) return;
    
    const minion = currentPlayer.board[index];
    if (minion && minion.canAttack) {
      setSelectedMinionIndex(index);
      setSelectedCardIndex(null);
    }
  };

  // 处理随从攻击
  const handleMinionAttack = (targetIndex, isTargetHero = false) => {
    if (selectedMinionIndex === null) return;
    minionAttack(selectedMinionIndex, targetIndex, isTargetHero);
    setSelectedMinionIndex(null);
  };

  // 处理结束回合
  const handleEndTurn = () => {
    if (!isMyTurn()) return;
    endTurn();
    setSelectedCardIndex(null);
    setSelectedMinionIndex(null);
  };

  // 清除选择
  const handleClearSelection = () => {
    setSelectedCardIndex(null);
    setSelectedMinionIndex(null);
  };

  // 清除错误
  useEffect(() => {
    if (error) {
      alert(`错误: ${error}`);
      setError(null);
    }
  }, [error, setError]);

  // 获取玩家数据
  const currentPlayer = getCurrentPlayer();
  const opponentPlayer = getOpponentPlayer();

  return (
    <div className="app">
      {gamePhase === 'lobby' ? (
        <Lobby
          isConnected={isConnected}
          playerName={playerName}
          targetRoomId={targetRoomId}
          onPlayerNameChange={setPlayerName}
          onRoomIdChange={setTargetRoomId}
          onJoinGame={handleJoinGame}
          onReady={handleReady}
          gameState={gameState}
          roomId={roomId}
        />
      ) : (
        <GameBoard
          currentPlayer={currentPlayer}
          opponentPlayer={opponentPlayer}
          gameState={gameState}
          isMyTurn={isMyTurn()}
          selectedCardIndex={selectedCardIndex}
          selectedMinionIndex={selectedMinionIndex}
          onSelectCard={handleSelectCard}
          onPlayCard={handlePlayCard}
          onSelectMinion={handleSelectMinion}
          onMinionAttack={handleMinionAttack}
          onEndTurn={handleEndTurn}
          onClearSelection={handleClearSelection}
          gameEvents={gameEvents}
          playerId={playerId}
        />
      )}
    </div>
  );
}

export default App;
