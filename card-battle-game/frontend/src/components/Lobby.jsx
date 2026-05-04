import React from 'react';

function Lobby({
  isConnected,
  playerName,
  targetRoomId,
  onPlayerNameChange,
  onRoomIdChange,
  onJoinGame,
  onReady,
  gameState,
  roomId
}) {
  const hasJoinedRoom = gameState !== null;
  const isRoomFull = gameState?.player1 && gameState?.player2;

  return (
    <div className="lobby">
      <div className="lobby-container">
        <h1 className="game-title">卡牌对战游戏</h1>
        <h2 className="game-subtitle">CCG Battle</h2>
        
        <div className="connection-status">
          <span className={`status-dot ${isConnected ? 'connected' : 'disconnected'}`}></span>
          <span>服务器状态: {isConnected ? '已连接' : '未连接'}</span>
        </div>

        {!hasJoinedRoom ? (
          <div className="join-form">
            <div className="form-group">
              <label>玩家名称:</label>
              <input
                type="text"
                value={playerName}
                onChange={(e) => onPlayerNameChange(e.target.value)}
                placeholder="请输入你的名字"
                maxLength={20}
              />
            </div>

            <div className="form-group">
              <label>房间ID (可选):</label>
              <input
                type="text"
                value={targetRoomId}
                onChange={(e) => onRoomIdChange(e.target.value)}
                placeholder="留空则创建新房间"
              />
            </div>

            <button
              className="btn-primary"
              onClick={onJoinGame}
              disabled={!isConnected || !playerName.trim()}
            >
              加入游戏
            </button>
          </div>
        ) : (
          <div className="room-info">
            <div className="room-id">
              <strong>房间ID:</strong> {roomId}
              <button
                className="btn-copy"
                onClick={() => navigator.clipboard.writeText(roomId)}
              >
                复制
              </button>
            </div>

            <div className="players-list">
              <h3>玩家列表</h3>
              <div className={`player-slot ${gameState.player1 ? 'occupied' : 'empty'}`}>
                <span className="player-label">玩家1 (先手):</span>
                <span className="player-name">
                  {gameState.player1?.name || '等待中...'}
                </span>
              </div>
              <div className={`player-slot ${gameState.player2 ? 'occupied' : 'empty'}`}>
                <span className="player-label">玩家2 (后手):</span>
                <span className="player-name">
                  {gameState.player2?.name || '等待中...'}
                </span>
              </div>
            </div>

            {isRoomFull ? (
              <button
                className="btn-primary btn-ready"
                onClick={onReady}
              >
                准备开始游戏
              </button>
            ) : (
              <div className="waiting-message">
                等待对手加入...
                <br />
                <small>将房间ID分享给你的朋友</small>
              </div>
            )}
          </div>
        )}

        <div className="game-rules">
          <h3>游戏规则</h3>
          <ul>
            <li>先手玩家抽3张牌，后手抽4张 + 幸运币</li>
            <li>每回合法力水晶上限+1（最多10点）</li>
            <li>使用法力水晶打出卡牌</li>
            <li>随从需要等待一回合才能攻击</li>
            <li>将对手英雄生命值降至0即可获胜</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export default Lobby;
