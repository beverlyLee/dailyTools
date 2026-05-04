const Game = require('../src/game/Game');
const Player = require('../src/game/Player');
const Card = require('../src/models/Card');

// Mock 卡牌数据
const mockMinionCard = {
  id: 1,
  card_id: 'test_minion_1',
  name: '测试随从',
  type: 'minion',
  cost: 2,
  attack: 3,
  health: 3,
  rarity: 'common',
  description: '一个测试随从',
  skill_type: null,
  skill_description: null
};

const mockSpellCard = {
  id: 2,
  card_id: 'test_spell_1',
  name: '测试法术',
  type: 'spell',
  cost: 1,
  attack: null,
  health: null,
  rarity: 'common',
  description: '造成2点伤害',
  skill_type: 'spell',
  skill_description: 'damage:2'
};

const mockBattlecryMinion = {
  id: 3,
  card_id: 'test_battlecry_1',
  name: '战吼随从',
  type: 'minion',
  cost: 1,
  attack: 2,
  health: 1,
  rarity: 'common',
  description: '战吼：对自己英雄造成3点伤害',
  skill_type: 'battlecry',
  skill_description: 'self_damage:3'
};

describe('Player 玩家测试', () => {
  let player;

  beforeEach(() => {
    player = new Player('test-player-1', 'TestPlayer');
  });

  test('玩家初始状态应该正确', () => {
    expect(player.heroHealth).toBe(30);
    expect(player.maxHeroHealth).toBe(30);
    expect(player.mana).toBe(0);
    expect(player.maxMana).toBe(0);
    expect(player.hand).toEqual([]);
    expect(player.deck).toEqual([]);
    expect(player.board).toEqual([]);
  });

  test('startNewTurn 应该正确增加法力水晶', () => {
    // 第一回合
    player.startNewTurn(1);
    expect(player.maxMana).toBe(1);
    expect(player.mana).toBe(1);

    // 第二回合
    player.startNewTurn(2);
    expect(player.maxMana).toBe(2);
    expect(player.mana).toBe(2);

    // 第十回合后不应再增加
    player.maxMana = 10;
    player.startNewTurn(11);
    expect(player.maxMana).toBe(10);
    expect(player.mana).toBe(10);
  });

  test('drawCard 应该从卡组抽牌到手牌', () => {
    const testCard = new Card(mockMinionCard);
    player.deck.push(testCard);

    const result = player.drawCard();
    
    expect(result.type).toBe('draw');
    expect(player.hand.length).toBe(1);
    expect(player.deck.length).toBe(0);
  });

  test('手牌满时抽牌应该爆牌', () => {
    // 填充10张手牌
    for (let i = 0; i < 10; i++) {
      const card = new Card(mockMinionCard);
      card.instanceId = `card-${i}`;
      player.hand.push(card);
    }

    // 添加一张牌到卡组
    const testCard = new Card(mockMinionCard);
    player.deck.push(testCard);

    const result = player.drawCard();
    
    expect(result.type).toBe('burned');
    expect(player.hand.length).toBe(10); // 手牌数量不变
    expect(player.deck.length).toBe(0);
  });

  test('playCard 应该正确消耗法力并放置随从', () => {
    const testCard = new Card(mockMinionCard);
    testCard.instanceId = 'test-card-1';
    player.hand.push(testCard);
    player.mana = 5;

    const result = player.playCard(0);
    
    expect(result.success).toBe(true);
    expect(result.type).toBe('play_minion');
    expect(player.hand.length).toBe(0);
    expect(player.board.length).toBe(1);
    expect(player.mana).toBe(3); // 5 - 2 = 3
  });

  test('playCard 法力不足时应该失败', () => {
    const testCard = new Card(mockMinionCard); // 费用2
    testCard.instanceId = 'test-card-1';
    player.hand.push(testCard);
    player.mana = 1; // 只有1点法力

    const result = player.playCard(0);
    
    expect(result.success).toBe(false);
    expect(result.error).toBe('Not enough mana');
    expect(player.hand.length).toBe(1);
    expect(player.board.length).toBe(0);
  });

  test('takeDamage 应该正确扣减英雄血量', () => {
    const result = player.takeDamage(5, true);
    
    expect(result.type).toBe('hero_damage');
    expect(player.heroHealth).toBe(25);
    expect(result.newHealth).toBe(25);
  });

  test('heal 应该正确恢复英雄血量（不能超过最大值）', () => {
    player.heroHealth = 25;
    
    const result1 = player.heal(10, true);
    expect(result1.newHealth).toBe(30); // 应该回到30，不是35
    expect(result1.amount).toBe(5); // 只恢复了5点

    const result2 = player.heal(5, true);
    expect(result2.amount).toBe(0); // 已经满血，恢复0点
  });
});

describe('Game 游戏核心测试', () => {
  let game;

  beforeEach(() => {
    game = new Game('test-game-id');
  });

  test('游戏初始状态应该正确', () => {
    expect(game.status).toBe('waiting');
    expect(game.turn).toBe(0);
    expect(game.currentPlayerId).toBeNull();
    expect(game.winnerId).toBeNull();
    expect(game.player1).toBeNull();
    expect(game.player2).toBeNull();
  });

  test('addPlayer 应该正确添加玩家', () => {
    const result1 = game.addPlayer('player-1', 'Alice');
    expect(result1.success).toBe(true);
    expect(result1.position).toBe('player1');
    expect(game.player1).not.toBeNull();
    expect(game.player1.isFirst).toBe(true);

    const result2 = game.addPlayer('player-2', 'Bob');
    expect(result2.success).toBe(true);
    expect(result2.position).toBe('player2');
    expect(game.player2).not.toBeNull();
    expect(game.player2.isFirst).toBe(false);

    expect(game.isFull()).toBe(true);
  });

  test('房间满时不能再添加玩家', () => {
    game.addPlayer('player-1', 'Alice');
    game.addPlayer('player-2', 'Bob');

    const result = game.addPlayer('player-3', 'Charlie');
    expect(result.success).toBe(false);
    expect(result.error).toBe('Game is full');
  });

  test('getCurrentPlayer 应该返回当前回合的玩家', () => {
    game.addPlayer('player-1', 'Alice');
    game.addPlayer('player-2', 'Bob');

    game.currentPlayerId = 'player-1';
    expect(game.getCurrentPlayer()).toBe(game.player1);

    game.currentPlayerId = 'player-2';
    expect(game.getCurrentPlayer()).toBe(game.player2);
  });

  test('getOpponentPlayer 应该返回对手玩家', () => {
    game.addPlayer('player-1', 'Alice');
    game.addPlayer('player-2', 'Bob');

    game.currentPlayerId = 'player-1';
    expect(game.getOpponentPlayer()).toBe(game.player2);

    game.currentPlayerId = 'player-2';
    expect(game.getOpponentPlayer()).toBe(game.player1);
  });

  test('checkGameOver 应该在玩家死亡时正确判断游戏结束', () => {
    game.addPlayer('player-1', 'Alice');
    game.addPlayer('player-2', 'Bob');

    // 玩家1死亡
    game.player1.heroHealth = 0;
    expect(game.checkGameOver()).toBe(true);
    expect(game.status).toBe('finished');
    expect(game.winnerId).toBe('player-2');

    // 重置并测试玩家2死亡
    game = new Game('test-game-id');
    game.addPlayer('player-1', 'Alice');
    game.addPlayer('player-2', 'Bob');
    game.player2.heroHealth = 0;
    expect(game.checkGameOver()).toBe(true);
    expect(game.winnerId).toBe('player-1');
  });
});

describe('卡牌技能测试', () => {
  let game;

  beforeEach(() => {
    game = new Game('test-game-id');
    game.addPlayer('player-1', 'Alice');
    game.addPlayer('player-2', 'Bob');
  });

  test('Card 解析技能描述应该正确', () => {
    const card1 = new Card({
      ...mockMinionCard,
      skill_description: 'damage:3;freeze:true'
    });

    const skill = card1.parseSkill();
    expect(skill.damage).toBe(3);
    expect(skill.freeze).toBe(true);
  });

  test('Card hasBattlecry 应该正确判断战吼', () => {
    const card1 = new Card({ ...mockMinionCard, skill_type: 'battlecry' });
    const card2 = new Card({ ...mockMinionCard, skill_type: 'deathrattle' });
    const card3 = new Card({ ...mockMinionCard, skill_type: 'battlecry+deathrattle' });

    expect(card1.hasBattlecry()).toBe(true);
    expect(card2.hasBattlecry()).toBe(false);
    expect(card3.hasBattlecry()).toBe(true);
  });

  test('Card hasDeathrattle 应该正确判断亡语', () => {
    const card1 = new Card({ ...mockMinionCard, skill_type: 'battlecry' });
    const card2 = new Card({ ...mockMinionCard, skill_type: 'deathrattle' });
    const card3 = new Card({ ...mockMinionCard, skill_type: 'battlecry+deathrattle' });

    expect(card1.hasDeathrattle()).toBe(false);
    expect(card2.hasDeathrattle()).toBe(true);
    expect(card3.hasDeathrattle()).toBe(true);
  });

  test('战吼效果 - 火焰小鬼应该对自己造成伤害', () => {
    const player = game.player1;
    const initialHealth = player.heroHealth;
    
    const battlecryCard = new Card(mockBattlecryMinion);
    battlecryCard.instanceId = 'test-battlecry-1';
    player.hand.push(battlecryCard);
    player.mana = 5;
    player.board = [];

    game.currentPlayerId = player.playerId;
    
    const result = game.playCard(player.playerId, 0, null);
    
    expect(result.success).toBe(true);
    expect(result.playResult.type).toBe('play_minion');
    
    // 检查战吼效果
    const selfDamageEffect = result.effects.find(e => e.type === 'hero_damage');
    expect(selfDamageEffect).not.toBeNull();
    expect(selfDamageEffect.damage).toBe(3);
    expect(player.heroHealth).toBe(initialHealth - 3);
  });
});

describe('战斗系统测试', () => {
  let game;

  beforeEach(() => {
    game = new Game('test-game-id');
    game.addPlayer('player-1', 'Alice');
    game.addPlayer('player-2', 'Bob');
    game.status = 'playing';
    game.currentPlayerId = 'player-1';
    game.turn = 1;
  });

  test('随从攻击敌方英雄应该正确造成伤害', () => {
    const attackerCard = new Card(mockMinionCard); // 攻击力3
    attackerCard.instanceId = 'attacker-1';
    attackerCard.canAttack = true;
    
    game.player1.board = [attackerCard];
    game.player1.mana = 10;

    const initialHealth = game.player2.heroHealth;
    
    // 攻击敌方英雄
    const result = game.minionAttack('player-1', 0, -1, true);
    
    expect(result.success).toBe(true);
    
    // 检查伤害
    const heroDamageEffect = result.effects.find(e => e.type === 'hero_damage');
    expect(heroDamageEffect).not.toBeNull();
    expect(heroDamageEffect.damage).toBe(3);
    expect(game.player2.heroHealth).toBe(initialHealth - 3);
    
    // 检查攻击者已消耗攻击次数
    expect(attackerCard.canAttack).toBe(false);
  });

  test('随从攻击敌方随从应该互相造成伤害', () => {
    const attackerCard = new Card({
      ...mockMinionCard,
      attack: 4,
      health: 5
    });
    attackerCard.instanceId = 'attacker-1';
    attackerCard.canAttack = true;

    const targetCard = new Card({
      ...mockMinionCard,
      attack: 3,
      health: 3
    });
    targetCard.instanceId = 'target-1';

    game.player1.board = [attackerCard];
    game.player2.board = [targetCard];

    const result = game.minionAttack('player-1', 0, 0, false);
    
    expect(result.success).toBe(true);
    
    // 检查目标随从死亡（4点伤害 > 3生命值）
    const targetDeathEffect = result.effects.find(e => 
      e.type === 'minion_death' && e.playerId === 'player-2'
    );
    expect(targetDeathEffect).not.toBeNull();
    expect(game.player2.board.length).toBe(0);

    // 检查攻击者受到3点伤害（5 - 3 = 2生命值）
    const attackerDamageEffect = result.effects.find(e => 
      e.type === 'minion_damage' && e.playerId === 'player-1'
    );
    expect(attackerDamageEffect).not.toBeNull();
    expect(attackerCard.health).toBe(2);
  });

  test('随从交换后死亡应该触发亡语', () => {
    // 创建有亡语的随从
    const deathrattleCard = new Card({
      id: 4,
      card_id: 'test_deathrattle_1',
      name: '亡语随从',
      type: 'minion',
      cost: 2,
      attack: 2,
      health: 2,
      rarity: 'rare',
      description: '亡语：抽一张牌',
      skill_type: 'deathrattle',
      skill_description: 'draw:1'
    });
    deathrattleCard.instanceId = 'deathrattle-1';
    deathrattleCard.canAttack = true;

    // 添加一张牌到卡组
    const deckCard = new Card(mockMinionCard);
    game.player1.deck = [deckCard];
    game.player1.hand = [];
    game.player1.board = [deathrattleCard];

    // 敌方高攻击力随从
    const bigMinion = new Card({
      ...mockMinionCard,
      attack: 5,
      health: 5
    });
    bigMinion.instanceId = 'big-1';
    game.player2.board = [bigMinion];

    const initialHandCount = game.player1.hand.length;

    // 攻击（会导致我方随从死亡）
    const result = game.minionAttack('player-1', 0, 0, false);
    
    expect(result.success).toBe(true);
    
    // 检查亡语效果 - 抽牌
    const drawEffect = result.effects.find(e => 
      e.type === 'draw' && e.playerId === 'player-1'
    );
    expect(drawEffect).not.toBeNull();
    expect(game.player1.hand.length).toBe(initialHandCount + 1);
  });
});

describe('回合系统测试', () => {
  let game;

  beforeEach(() => {
    game = new Game('test-game-id');
    game.addPlayer('player-1', 'Alice');
    game.addPlayer('player-2', 'Bob');
    
    // 模拟游戏开始后的状态
    game.status = 'playing';
    game.currentPlayerId = 'player-1';
    game.turn = 1;
    
    // 初始化牌库
    game.player1.deck = [new Card(mockMinionCard), new Card(mockMinionCard)];
    game.player2.deck = [new Card(mockMinionCard), new Card(mockMinionCard)];
    
    // 初始化玩家1第一回合
    game.player1.startNewTurn(1);
  });

  test('endTurn 应该正确切换回合', () => {
    const initialTurn = game.turn;
    const initialPlayerId = game.currentPlayerId;

    const result = game.endTurn('player-1');
    
    expect(result.success).toBe(true);
    expect(game.turn).toBe(initialTurn + 1);
    expect(game.currentPlayerId).not.toBe(initialPlayerId);
    expect(game.currentPlayerId).toBe('player-2');

    // 检查玩家2的法力水晶
    expect(game.player2.maxMana).toBe(1);
    expect(game.player2.mana).toBe(1);
  });

  test('不是当前玩家不能结束回合', () => {
    const result = game.endTurn('player-2');
    
    expect(result.success).toBe(false);
    expect(result.error).toBe('Not your turn');
  });

  test('新回合开始时随从应该可以攻击', () => {
    // 添加一个随从到场上
    const minion = new Card(mockMinionCard);
    minion.instanceId = 'test-minion';
    minion.canAttack = false;
    game.player1.board = [minion];

    // 结束回合
    game.endTurn('player-1');
    
    // 再次回到玩家1的回合
    game.endTurn('player-2');

    // 检查随从现在可以攻击
    expect(minion.canAttack).toBe(true);
  });

  test('冻结状态的随从新回合应该被解冻', () => {
    const minion = new Card(mockMinionCard);
    minion.instanceId = 'test-minion';
    minion.frozen = true;
    game.player1.board = [minion];

    // 结束回合
    game.endTurn('player-1');
    
    // 再次回到玩家1的回合
    game.endTurn('player-2');

    // 检查随从已解冻
    expect(minion.frozen).toBe(false);
  });
});
