import React, { useRef, useEffect, useState } from 'react';
import { Stage, Layer, Group, Rect, Text, Image as KonvaImage } from 'react-konva';

// 卡牌类型颜色
const CARD_COLORS = {
  minion: '#4a90d9',
  spell: '#9b59b6',
  weapon: '#e67e22'
};

// 卡牌稀有度边框颜色
const RARITY_COLORS = {
  common: '#95a5a6',
  rare: '#3498db',
  epic: '#9b59b6',
  legendary: '#f1c40f'
};

function GameBoard({
  currentPlayer,
  opponentPlayer,
  gameState,
  isMyTurn,
  selectedCardIndex,
  selectedMinionIndex,
  onSelectCard,
  onPlayCard,
  onSelectMinion,
  onMinionAttack,
  onEndTurn,
  onClearSelection,
  gameEvents,
  playerId
}) {
  const stageRef = useRef(null);
  const [stageSize, setStageSize] = useState({ width: window.innerWidth, height: window.innerHeight });

  // 监听窗口大小变化
  useEffect(() => {
    const handleResize = () => {
      setStageSize({ width: window.innerWidth, height: window.innerHeight });
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // 计算卡牌尺寸和位置
  const cardWidth = 120;
  const cardHeight = 180;
  const minionWidth = 100;
  const minionHeight = 130;

  // 绘制卡牌
  const renderCard = (card, x, y, isSelected, onClick, isPlayable = true) => {
    if (!card) return null;

    const rarityColor = RARITY_COLORS[card.rarity] || RARITY_COLORS.common;
    const cardColor = CARD_COLORS[card.type] || CARD_COLORS.minion;

    return (
      <Group
        key={card.instanceId || card.cardId}
        x={x}
        y={y}
        onClick={onClick}
        onTap={onClick}
      >
        {/* 卡牌背景 */}
        <Rect
          width={cardWidth}
          height={cardHeight}
          fill={cardColor}
          stroke={isSelected ? '#2ecc71' : rarityColor}
          strokeWidth={isSelected ? 4 : 2}
          cornerRadius={8}
          shadowColor="black"
          shadowBlur={isSelected ? 20 : 10}
          shadowOffset={{ x: 2, y: 2 }}
          shadowOpacity={0.5}
          opacity={isPlayable ? 1 : 0.6}
        />

        {/* 费用 */}
        <Rect
          x={5}
          y={5}
          width={30}
          height={30}
          fill="#2980b9"
          stroke="#fff"
          strokeWidth={2}
          cornerRadius={15}
        />
        <Text
          x={5}
          y={8}
          width={30}
          text={card.cost.toString()}
          fontSize={20}
          fontStyle="bold"
          fill="#fff"
          align="center"
        />

        {/* 卡牌名称 */}
        <Text
          x={10}
          y={40}
          width={cardWidth - 20}
          text={card.name}
          fontSize={14}
          fontStyle="bold"
          fill="#fff"
          align="center"
          wrap="word"
        />

        {/* 卡牌类型标识 */}
        <Text
          x={10}
          y={60}
          width={cardWidth - 20}
          text={card.type === 'minion' ? '随从' : card.type === 'spell' ? '法术' : '武器'}
          fontSize={10}
          fill="rgba(255,255,255,0.8)"
          align="center"
        />

        {/* 描述 */}
        <Text
          x={10}
          y={75}
          width={cardWidth - 20}
          height={60}
          text={card.description || ''}
          fontSize={10}
          fill="rgba(255,255,255,0.9)"
          align="center"
          wrap="word"
        />

        {/* 攻击力和生命值 (仅限随从) */}
        {card.type === 'minion' && (
          <>
            <Rect
              x={5}
              y={cardHeight - 35}
              width={30}
              height={30}
              fill="#e74c3c"
              stroke="#fff"
              strokeWidth={2}
              cornerRadius={5}
            />
            <Text
              x={5}
              y={cardHeight - 32}
              width={30}
              text={card.attack.toString()}
              fontSize={18}
              fontStyle="bold"
              fill="#fff"
              align="center"
            />

            <Rect
              x={cardWidth - 35}
              y={cardHeight - 35}
              width={30}
              height={30}
              fill="#27ae60"
              stroke="#fff"
              strokeWidth={2}
              cornerRadius={5}
            />
            <Text
              x={cardWidth - 35}
              y={cardHeight - 32}
              width={30}
              text={card.health.toString()}
              fontSize={18}
              fontStyle="bold"
              fill="#fff"
              align="center"
            />
          </>
        )}
      </Group>
    );
  };

  // 绘制场上随从
  const renderMinion = (minion, x, y, isSelected, onClick, isMine, canAttack) => {
    if (!minion) return null;

    return (
      <Group
        key={minion.instanceId || minion.cardId}
        x={x}
        y={y}
        onClick={onClick}
        onTap={onClick}
      >
        {/* 随从背景 */}
        <Rect
          width={minionWidth}
          height={minionHeight}
          fill={isMine ? '#2c3e50' : '#c0392b'}
          stroke={isSelected ? '#2ecc71' : (canAttack ? '#f39c12' : '#7f8c8d')}
          strokeWidth={isSelected ? 4 : 2}
          cornerRadius={8}
          shadowColor="black"
          shadowBlur={10}
          shadowOffset={{ x: 2, y: 2 }}
          shadowOpacity={0.5}
        />

        {/* 随从名称 */}
        <Text
          x={5}
          y={5}
          width={minionWidth - 10}
          text={minion.name}
          fontSize={12}
          fontStyle="bold"
          fill="#fff"
          align="center"
          wrap="word"
        />

        {/* 状态指示 */}
        {minion.frozen && (
          <Rect
            x={minionWidth / 2 - 20}
            y={30}
            width={40}
            height={20}
            fill="#3498db"
            cornerRadius={4}
          />
        )}
        {minion.frozen && (
          <Text
            x={minionWidth / 2 - 20}
            y={32}
            width={40}
            text="❄️"
            fontSize={14}
            align="center"
          />
        )}

        {/* 攻击力 */}
        <Rect
          x={5}
          y={minionHeight - 35}
          width={30}
          height={30}
          fill="#e74c3c"
          stroke="#fff"
          strokeWidth={2}
          cornerRadius={5}
        />
        <Text
          x={5}
          y={minionHeight - 32}
          width={30}
          text={minion.attack.toString()}
          fontSize={18}
          fontStyle="bold"
          fill="#fff"
          align="center"
        />

        {/* 生命值 */}
        <Rect
          x={minionWidth - 35}
          y={minionHeight - 35}
          width={30}
          height={30}
          fill={minion.health < minion.maxHealth ? '#e74c3c' : '#27ae60'}
          stroke="#fff"
          strokeWidth={2}
          cornerRadius={5}
        />
        <Text
          x={minionWidth - 35}
          y={minionHeight - 32}
          width={30}
          text={minion.health.toString()}
          fontSize={18}
          fontStyle="bold"
          fill="#fff"
          align="center"
        />

        {/* 可攻击指示器 */}
        {canAttack && isMine && (
          <Rect
            x={minionWidth / 2 - 15}
            y={minionHeight - 38}
            width={30}
            height={5}
            fill="#2ecc71"
            cornerRadius={2}
          />
        )}
      </Group>
    );
  };

  // 绘制英雄
  const renderHero = (player, x, y, isMine, onClick) => {
    if (!player) return null;

    const healthPercent = player.heroHealth / player.maxHeroHealth;

    return (
      <Group
        x={x}
        y={y}
        onClick={onClick}
        onTap={onClick}
      >
        {/* 英雄背景 */}
        <Rect
          width={120}
          height={120}
          fill={isMine ? '#2980b9' : '#8e44ad'}
          stroke={isMine ? '#3498db' : '#9b59b6'}
          strokeWidth={3}
          cornerRadius={10}
          shadowColor="black"
          shadowBlur={15}
          shadowOffset={{ x: 3, y: 3 }}
          shadowOpacity={0.6}
        />

        {/* 英雄名称 */}
        <Text
          x={10}
          y={10}
          width={100}
          text={player.name}
          fontSize={14}
          fontStyle="bold"
          fill="#fff"
          align="center"
        />

        {/* 生命值 */}
        <Rect
          x={30}
          y={40}
          width={60}
          height={40}
          fill="#c0392b"
          stroke="#fff"
          strokeWidth={2}
          cornerRadius={5}
        />
        <Text
          x={30}
          y={45}
          width={60}
          text={`${player.heroHealth}`}
          fontSize={28}
          fontStyle="bold"
          fill="#fff"
          align="center"
        />

        {/* 生命值条 */}
        <Rect
          x={10}
          y={95}
          width={100}
          height={10}
          fill="#333"
          cornerRadius={5}
        />
        <Rect
          x={10}
          y={95}
          width={100 * healthPercent}
          height={10}
          fill={healthPercent > 0.5 ? '#27ae60' : healthPercent > 0.25 ? '#f39c12' : '#e74c3c'}
          cornerRadius={5}
        />
      </Group>
    );
  };

  // 绘制法力水晶
  const renderMana = (player, x, y) => {
    if (!player) return null;

    const crystals = [];
    for (let i = 0; i < player.maxMana; i++) {
      crystals.push(
        <Group key={i} x={x + i * 25} y={y}>
          <Rect
            width={20}
            height={20}
            fill={i < player.mana ? '#3498db' : '#34495e'}
            stroke={i < player.mana ? '#2980b9' : '#2c3e50'}
            strokeWidth={2}
            cornerRadius={10}
          />
        </Group>
      );
    }

    // 法力文字
    crystals.push(
      <Text
        key="mana-text"
        x={x}
        y={y + 25}
        width={player.maxMana * 25}
        text={`法力: ${player.mana}/${player.maxMana}`}
        fontSize={12}
        fill="#fff"
        align="center"
      />
    );

    return <Group>{crystals}</Group>;
  };

  // 计算位置
  const centerX = stageSize.width / 2;
  const centerY = stageSize.height / 2;

  // 我方手牌位置
  const handStartX = centerX - ((currentPlayer?.hand?.length || 0) * (cardWidth + 10)) / 2 + cardWidth / 2;
  const handY = stageSize.height - cardHeight - 30;

  // 我方场上位置
  const myBoardStartX = centerX - ((currentPlayer?.board?.length || 0) * (minionWidth + 15)) / 2 + minionWidth / 2;
  const myBoardY = centerY + 20;

  // 敌方场上位置
  const opponentBoardStartX = centerX - ((opponentPlayer?.board?.length || 0) * (minionWidth + 15)) / 2 + minionWidth / 2;
  const opponentBoardY = centerY - minionHeight - 60;

  // 敌方手牌位置（只显示数量，不显示具体卡牌）
  const opponentHandX = centerX - ((opponentPlayer?.hand?.length || 0) * 40) / 2 + 20;
  const opponentHandY = 20;

  // 处理点击背景清除选择
  const handleStageClick = () => {
    onClearSelection();
  };

  // 处理点击敌方英雄
  const handleOpponentHeroClick = () => {
    if (selectedMinionIndex !== null) {
      onMinionAttack(-1, true);
    } else if (selectedCardIndex !== null) {
      const card = currentPlayer?.hand?.[selectedCardIndex];
      if (card?.type === 'spell') {
        const skill = card.skillDescription;
        if (skill?.includes('damage') || skill?.includes('heal')) {
          onPlayCard({ isHero: true });
        }
      }
    }
  };

  // 处理点击敌方随从
  const handleOpponentMinionClick = (index) => {
    if (selectedMinionIndex !== null) {
      onMinionAttack(index, false);
    } else if (selectedCardIndex !== null) {
      const card = currentPlayer?.hand?.[selectedCardIndex];
      if (card?.type === 'spell') {
        onPlayCard({ minionIndex: index });
      }
    }
  };

  // 处理出牌到场上（随从卡）
  const handlePlayToBoard = () => {
    if (selectedCardIndex !== null) {
      const card = currentPlayer?.hand?.[selectedCardIndex];
      if (card?.type === 'minion') {
        onPlayCard(null);
      }
    }
  };

  return (
    <div className="game-board">
      {/* 游戏信息栏 */}
      <div className="game-info">
        <div className="turn-info">
          <span className={`turn-indicator ${isMyTurn ? 'my-turn' : 'opponent-turn'}`}>
            {isMyTurn ? '轮到你了！' : '对手回合'}
          </span>
          <span className="turn-number">回合 {gameState?.turn || 0}</span>
        </div>
        
        <div className="action-buttons">
          {selectedCardIndex !== null && (
            <button
              className="btn-action"
              onClick={handlePlayToBoard}
            >
              放置随从
            </button>
          )}
          <button
            className={`btn-end-turn ${isMyTurn ? 'active' : 'disabled'}`}
            onClick={onEndTurn}
            disabled={!isMyTurn}
          >
            结束回合
          </button>
        </div>
      </div>

      {/* Konva 游戏画布 */}
      <Stage
        ref={stageRef}
        width={stageSize.width}
        height={stageSize.height}
        onClick={handleStageClick}
        style={{ position: 'absolute', top: 0, left: 0 }}
      >
        <Layer>
          {/* 背景 */}
          <Rect
            width={stageSize.width}
            height={stageSize.height}
            fillPatternImage={null}
            fill="linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)"
          />

          {/* 中间分隔线 */}
          <Rect
            x={centerX - 300}
            y={centerY - 10}
            width={600}
            height={20}
            fill="rgba(0,0,0,0.3)"
            cornerRadius={10}
          />

          {/* 敌方手牌（背面） */}
          {opponentPlayer?.hand?.map((_, index) => (
            <Group key={`opponent-card-${index}`} x={opponentHandX + index * 40} y={opponentHandY}>
              <Rect
                width={35}
                height={50}
                fill="#2c3e50"
                stroke="#34495e"
                strokeWidth={2}
                cornerRadius={5}
              />
              <Text
                x={10}
                y={18}
                width={15}
                text="?"
                fontSize={16}
                fontStyle="bold"
                fill="#7f8c8d"
                align="center"
              />
            </Group>
          ))}

          {/* 敌方英雄 */}
          {renderHero(
            opponentPlayer,
            centerX - 60,
            80,
            false,
            handleOpponentHeroClick
          )}

          {/* 敌方法力 */}
          {renderMana(opponentPlayer, centerX - 125, 210)}

          {/* 敌方场上随从 */}
          {opponentPlayer?.board?.map((minion, index) =>
            renderMinion(
              minion,
              opponentBoardStartX + index * (minionWidth + 15) - minionWidth / 2,
              opponentBoardY,
              false,
              () => handleOpponentMinionClick(index),
              false,
              false
            )
          )}

          {/* 我方场上随从 */}
          {currentPlayer?.board?.map((minion, index) =>
            renderMinion(
              minion,
              myBoardStartX + index * (minionWidth + 15) - minionWidth / 2,
              myBoardY,
              selectedMinionIndex === index,
              () => onSelectMinion(index),
              true,
              minion.canAttack
            )
          )}

          {/* 我方英雄 */}
          {renderHero(
            currentPlayer,
            centerX - 60,
            stageSize.height - 180,
            true,
            null
          )}

          {/* 我方法力 */}
          {renderMana(currentPlayer, centerX - 125, stageSize.height - 50)}

          {/* 我方手牌 */}
          {currentPlayer?.hand?.map((card, index) =>
            renderCard(
              card,
              handStartX + index * (cardWidth + 10) - cardWidth / 2,
              handY,
              selectedCardIndex === index,
              () => onSelectCard(index),
              isMyTurn && card.cost <= currentPlayer.mana
            )
          )}
        </Layer>
      </Stage>

      {/* 事件日志 */}
      <div className="event-log">
        <h4>游戏日志</h4>
        <div className="log-entries">
          {gameEvents?.slice(-10).map((event, index) => (
            <div key={index} className="log-entry">
              <span className="log-type">[{event.type}]</span>
              <span className="log-time">{new Date(event.timestamp).toLocaleTimeString()}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 选中状态提示 */}
      {(selectedCardIndex !== null || selectedMinionIndex !== null) && (
        <div className="selection-hint">
          {selectedCardIndex !== null && (
            <span>已选择卡牌: {currentPlayer?.hand?.[selectedCardIndex]?.name}</span>
          )}
          {selectedMinionIndex !== null && (
            <span>已选择随从: {currentPlayer?.board?.[selectedMinionIndex]?.name} - 点击敌方目标攻击</span>
          )}
          <button className="btn-cancel" onClick={onClearSelection}>取消</button>
        </div>
      )}
    </div>
  );
}

export default GameBoard;
