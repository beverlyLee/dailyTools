const { v4: uuidv4 } = require('uuid');
const Player = require('./Player');
const Card = require('../models/Card');

class Game {
  constructor(gameId = null) {
    this.gameId = gameId || uuidv4();
    this.status = 'waiting'; // waiting, playing, finished
    this.turn = 0;
    this.currentPlayerId = null;
    this.winnerId = null;
    
    this.player1 = null;
    this.player2 = null;
    this.actionQueue = [];
    this.eventLog = [];
  }

  // 添加玩家
  addPlayer(playerId, name) {
    if (!this.player1) {
      this.player1 = new Player(playerId, name);
      this.player1.isFirst = true;
      return { success: true, player: this.player1, position: 'player1' };
    } else if (!this.player2) {
      this.player2 = new Player(playerId, name);
      this.player2.isFirst = false;
      return { success: true, player: this.player2, position: 'player2' };
    }
    return { success: false, error: 'Game is full' };
  }

  // 游戏是否已满
  isFull() {
    return this.player1 && this.player2;
  }

  // 开始游戏
  async startGame() {
    if (!this.isFull()) {
      return { success: false, error: 'Not enough players' };
    }

    this.status = 'playing';
    
    // 加载所有卡牌到卡组
    const allCards = await this.loadAllCards();
    
    // 为每个玩家生成卡组（复制两次所有卡牌）
    this.player1.deck = this.generateDeck(allCards);
    this.player2.deck = this.generateDeck(allCards);
    
    // 洗牌
    this.shuffleDeck(this.player1.deck);
    this.shuffleDeck(this.player2.deck);
    
    // 先手玩家抽3张牌，后手抽4张+硬币
    for (let i = 0; i < 3; i++) {
      this.player1.drawCard();
    }
    for (let i = 0; i < 4; i++) {
      this.player2.drawCard();
    }
    
    // 后手玩家获得硬币
    const coinCard = this.createCoinCard();
    this.player2.hand.push(coinCard);
    
    // 先手玩家开始第一回合
    this.turn = 1;
    this.currentPlayerId = this.player1.playerId;
    this.player1.startNewTurn(this.turn);
    
    this.logEvent('game_start', {
      gameId: this.gameId,
      player1: this.player1.getState(),
      player2: this.player2.getState()
    });

    return { success: true, gameState: this.getGameState() };
  }

  // 加载所有卡牌
  async loadAllCards() {
    return new Promise((resolve, reject) => {
      Card.getAll((err, cards) => {
        if (err) {
          reject(err);
        } else {
          resolve(cards.map(cardData => new Card(cardData)));
        }
      });
    });
  }

  // 生成卡组（每种卡牌两张）
  generateDeck(allCards) {
    const deck = [];
    allCards.forEach(card => {
      // 传说卡只能一张
      const copies = card.rarity === 'legendary' ? 1 : 2;
      for (let i = 0; i < copies; i++) {
        deck.push(new Card({ ...card }));
      }
    });
    return deck;
  }

  // 洗牌（Fisher-Yates算法）
  shuffleDeck(deck) {
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }
  }

  // 创建硬币卡
  createCoinCard() {
    return new Card({
      id: 0,
      card_id: 'coin',
      name: '幸运币',
      type: 'spell',
      cost: 0,
      attack: null,
      health: null,
      rarity: 'common',
      description: '本回合中，获得一个法力水晶。',
      skill_type: 'spell',
      skill_description: 'gain_mana:1'
    });
  }

  // 获取当前玩家
  getCurrentPlayer() {
    if (this.currentPlayerId === this.player1?.playerId) {
      return this.player1;
    }
    if (this.currentPlayerId === this.player2?.playerId) {
      return this.player2;
    }
    return null;
  }

  // 获取对手玩家
  getOpponentPlayer() {
    if (this.currentPlayerId === this.player1?.playerId) {
      return this.player2;
    }
    if (this.currentPlayerId === this.player2?.playerId) {
      return this.player1;
    }
    return null;
  }

  // 出牌
  playCard(playerId, cardIndex, target = null) {
    if (this.status !== 'playing') {
      return { success: false, error: 'Game is not in progress' };
    }

    const currentPlayer = this.getCurrentPlayer();
    if (!currentPlayer || currentPlayer.playerId !== playerId) {
      return { success: false, error: 'Not your turn' };
    }

    const result = currentPlayer.playCard(cardIndex, target);
    
    if (!result.success) {
      return result;
    }

    this.logEvent('play_card', {
      playerId,
      card: result.card,
      type: result.type,
      target
    });

    // 处理技能效果
    const effectResults = this.processCardEffect(result, target);

    // 检查游戏结束
    this.checkGameOver();

    return {
      success: true,
      playResult: result,
      effects: effectResults,
      gameState: this.getGameState()
    };
  }

  // 处理卡牌效果
  processCardEffect(playResult, target) {
    const effects = [];
    const currentPlayer = this.getCurrentPlayer();
    const opponentPlayer = this.getOpponentPlayer();

    if (playResult.type === 'play_spell') {
      const spell = playResult.card;
      const skill = spell.parseSkill();
      
      if (!skill) return effects;

      // 获得法力（硬币）
      if (skill.gain_mana) {
        currentPlayer.mana = Math.min(currentPlayer.mana + skill.gain_mana, 10);
        effects.push({ type: 'gain_mana', amount: skill.gain_mana, playerId: currentPlayer.playerId });
      }

      // 造成伤害
      if (skill.damage) {
        if (target && target.isHero) {
          const damageResult = opponentPlayer.takeDamage(skill.damage, true);
          effects.push(damageResult);
        } else if (target && target.minionIndex !== undefined) {
          const damageResult = opponentPlayer.takeDamage(skill.damage, false, target.minionIndex);
          effects.push(damageResult);
        }
      }

      // AOE伤害
      if (skill.aoe_damage) {
        if (skill.target === 'enemy_minions') {
          const minionCount = opponentPlayer.board.length;
          for (let i = minionCount - 1; i >= 0; i--) {
            const damageResult = opponentPlayer.takeDamage(skill.aoe_damage, false, i);
            if (damageResult) {
              effects.push(damageResult);
            }
          }
        }
      }

      // 随机伤害
      if (skill.random_damage) {
        for (let i = 0; i < skill.random_damage; i++) {
          const targets = [{ type: 'hero', player: opponentPlayer }];
          opponentPlayer.board.forEach((_, idx) => {
            targets.push({ type: 'minion', player: opponentPlayer, index: idx });
          });
          
          if (targets.length > 0) {
            const randomTarget = targets[Math.floor(Math.random() * targets.length)];
            if (randomTarget.type === 'hero') {
              effects.push(randomTarget.player.takeDamage(1, true));
            } else {
              effects.push(randomTarget.player.takeDamage(1, false, randomTarget.index));
            }
          }
        }
      }

      // 治疗
      if (skill.heal) {
        if (target && target.isHero) {
          const healResult = currentPlayer.heal(skill.heal, true);
          effects.push(healResult);
        } else if (target && target.minionIndex !== undefined) {
          const healResult = currentPlayer.heal(skill.heal, false, target.minionIndex);
          effects.push(healResult);
        }
      }

      // 抽牌
      if (skill.draw) {
        for (let i = 0; i < skill.draw; i++) {
          const drawResult = currentPlayer.drawCard();
          effects.push(drawResult);
        }
      }

      // 冻结
      if (skill.freeze && target && target.minionIndex !== undefined) {
        if (opponentPlayer.board[target.minionIndex]) {
          opponentPlayer.board[target.minionIndex].frozen = true;
          effects.push({ type: 'freeze', playerId: opponentPlayer.playerId, minionIndex: target.minionIndex });
        }
      }
    }

    if (playResult.type === 'play_minion') {
      const minion = playResult.card;
      const skill = minion.parseSkill();
      
      // 战吼效果
      if (minion.hasBattlecry() && skill) {
        // 对自己英雄造成伤害
        if (skill.self_damage) {
          const damageResult = currentPlayer.takeDamage(skill.self_damage, true);
          effects.push(damageResult);
        }

        // 法术伤害+1
        if (skill.spell_damage) {
          minion.spellDamageBonus = skill.spell_damage;
          effects.push({ type: 'spell_damage_bonus', playerId: currentPlayer.playerId, minion, bonus: skill.spell_damage });
        }

        // 战场上每有一个其他友方随从，便获得+1/+1
        if (skill.buff_per_ally) {
          const allyCount = currentPlayer.board.length - 1; // 不包含自己
          if (allyCount > 0) {
            minion.attack += allyCount * skill.buff_per_ally;
            minion.health += allyCount * skill.buff_per_ally;
            minion.maxHealth += allyCount * skill.buff_per_ally;
            effects.push({ 
              type: 'minion_buff', 
              playerId: currentPlayer.playerId, 
              minion, 
              attackBuff: allyCount * skill.buff_per_ally,
              healthBuff: allyCount * skill.buff_per_ally
            });
          }
        }
      }
    }

    return effects;
  }

  // 随从攻击
  minionAttack(playerId, attackerIndex, targetIndex, isTargetHero) {
    if (this.status !== 'playing') {
      return { success: false, error: 'Game is not in progress' };
    }

    const currentPlayer = this.getCurrentPlayer();
    const opponentPlayer = this.getOpponentPlayer();

    if (!currentPlayer || currentPlayer.playerId !== playerId) {
      return { success: false, error: 'Not your turn' };
    }

    const attackResult = currentPlayer.minionAttack(attackerIndex, targetIndex, isTargetHero);
    
    if (!attackResult.success) {
      return attackResult;
    }

    const effects = [];
    const attacker = attackResult.attacker;

    this.logEvent('minion_attack', {
      playerId,
      attacker: { ...attacker, index: attackerIndex },
      targetIndex,
      isTargetHero
    });

    if (isTargetHero) {
      // 攻击敌方英雄
      const damageResult = opponentPlayer.takeDamage(attacker.attack, true);
      effects.push(damageResult);
    } else {
      // 攻击敌方随从
      const target = opponentPlayer.board[targetIndex];
      
      if (!target) {
        return { success: false, error: 'Target minion not found' };
      }

      // 互相造成伤害
      const attackerDamageResult = currentPlayer.takeDamage(target.attack, false, attackerIndex);
      const targetDamageResult = opponentPlayer.takeDamage(attacker.attack, false, targetIndex);

      if (attackerDamageResult) effects.push(attackerDamageResult);
      if (targetDamageResult) effects.push(targetDamageResult);

      // 处理亡语效果
      this.processDeathrattleEffects(effects, attackerDamageResult, currentPlayer);
      this.processDeathrattleEffects(effects, targetDamageResult, opponentPlayer);
    }

    // 检查游戏结束
    this.checkGameOver();

    return {
      success: true,
      attackResult,
      effects,
      gameState: this.getGameState()
    };
  }

  // 处理亡语效果
  processDeathrattleEffects(effects, deathResult, player) {
    if (!deathResult || deathResult.type !== 'minion_death') return;
    
    const minion = deathResult.minion;
    if (!minion.hasDeathrattle()) return;
    
    const skill = minion.parseSkill();
    if (!skill) return;

    // 抽牌
    if (skill.draw) {
      for (let i = 0; i < skill.draw; i++) {
        const drawResult = player.drawCard();
        effects.push(drawResult);
      }
    }

    // 召唤随从
    if (skill.summon === 'damaged_puppet') {
      if (player.board.length < 7) {
        const puppet = new Card({
          id: 0,
          card_id: 'damaged_puppet',
          name: '损坏的傀儡',
          type: 'minion',
          cost: 2,
          attack: 2,
          health: 1,
          rarity: 'common',
          description: '由麦田傀儡召唤。',
          skill_type: null,
          skill_description: null
        });
        puppet.instanceId = deathResult.minion.instanceId + '_puppet';
        puppet.canAttack = false;
        player.board.push(puppet);
        effects.push({ 
          type: 'summon_minion', 
          playerId: player.playerId, 
          minion: puppet,
          position: player.board.length - 1
        });
      }
    }
  }

  // 结束回合
  endTurn(playerId) {
    if (this.status !== 'playing') {
      return { success: false, error: 'Game is not in progress' };
    }

    const currentPlayer = this.getCurrentPlayer();
    if (!currentPlayer || currentPlayer.playerId !== playerId) {
      return { success: false, error: 'Not your turn' };
    }

    const effects = [];

    // 处理回合结束效果（如炎魔之王）
    currentPlayer.board.forEach(minion => {
      const skill = minion.parseSkill();
      if (skill && skill.end_turn_damage) {
        const opponentPlayer = this.getOpponentPlayer();
        const targets = [{ type: 'hero', player: opponentPlayer }];
        opponentPlayer.board.forEach((_, idx) => {
          targets.push({ type: 'minion', player: opponentPlayer, index: idx });
        });
        
        if (targets.length > 0) {
          const randomTarget = targets[Math.floor(Math.random() * targets.length)];
          if (randomTarget.type === 'hero') {
            effects.push(randomTarget.player.takeDamage(skill.end_turn_damage, true));
          } else {
            effects.push(randomTarget.player.takeDamage(skill.end_turn_damage, false, randomTarget.index));
          }
        }
      }
    });

    this.logEvent('end_turn', {
      playerId,
      turn: this.turn
    });

    // 切换到对手回合
    this.turn++;
    const opponentPlayer = this.getOpponentPlayer();
    this.currentPlayerId = opponentPlayer.playerId;
    
    // 对手开始新回合
    const turnStartResult = opponentPlayer.startNewTurn(this.turn);
    effects.push(turnStartResult);

    this.logEvent('start_turn', {
      playerId: opponentPlayer.playerId,
      turn: this.turn
    });

    // 检查游戏结束
    this.checkGameOver();

    return {
      success: true,
      effects,
      gameState: this.getGameState()
    };
  }

  // 检查游戏结束
  checkGameOver() {
    if (this.player1.heroHealth <= 0) {
      this.status = 'finished';
      this.winnerId = this.player2.playerId;
      this.logEvent('game_over', { winnerId: this.winnerId });
      return true;
    }
    if (this.player2.heroHealth <= 0) {
      this.status = 'finished';
      this.winnerId = this.player1.playerId;
      this.logEvent('game_over', { winnerId: this.winnerId });
      return true;
    }
    return false;
  }

  // 记录事件
  logEvent(type, data) {
    this.eventLog.push({
      timestamp: Date.now(),
      type,
      data
    });
  }

  // 获取游戏状态
  getGameState() {
    return {
      gameId: this.gameId,
      status: this.status,
      turn: this.turn,
      currentPlayerId: this.currentPlayerId,
      winnerId: this.winnerId,
      player1: this.player1 ? this.player1.getState() : null,
      player2: this.player2 ? this.player2.getState() : null,
      eventLog: this.eventLog.slice(-20) // 返回最近20个事件
    };
  }
}

module.exports = Game;
