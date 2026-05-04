const { v4: uuidv4 } = require('uuid');

class Player {
  constructor(playerId, name) {
    this.playerId = playerId || uuidv4();
    this.name = name || 'Player';
    this.heroHealth = 30;
    this.maxHeroHealth = 30;
    this.mana = 0;
    this.maxMana = 0;
    this.hand = [];
    this.deck = [];
    this.board = [];
    this.isFirst = false;
    this.hasUsedCoin = false;
  }

  // 初始化新回合
  startNewTurn(turnNumber) {
    // 增加最大法力水晶（最多10点）
    if (this.maxMana < 10) {
      this.maxMana++;
    }
    
    // 恢复法力水晶
    this.mana = this.maxMana;
    
    // 所有随从可以攻击（除非有特殊限制）
    this.board.forEach(minion => {
      if (!minion.cannotAttack() && !minion.frozen) {
        minion.canAttack = true;
      }
      // 重置冰冻状态
      minion.frozen = false;
    });
    
    // 抽一张牌
    return this.drawCard();
  }

  // 抽牌
  drawCard() {
    if (this.deck.length === 0) {
      // 疲劳伤害
      const fatigueDamage = (30 - this.heroHealth - this.deck.length) + 1;
      this.heroHealth -= fatigueDamage;
      return { type: 'fatigue', damage: fatigueDamage, playerId: this.playerId };
    }
    
    if (this.hand.length >= 10) {
      // 手牌已满，爆牌
      const burnedCard = this.deck.shift();
      return { type: 'burned', card: burnedCard, playerId: this.playerId };
    }
    
    const card = this.deck.shift();
    card.instanceId = uuidv4();
    this.hand.push(card);
    return { type: 'draw', card, playerId: this.playerId };
  }

  // 出牌
  playCard(cardIndex, target = null) {
    const card = this.hand[cardIndex];
    
    if (!card) {
      return { success: false, error: 'Card not found in hand' };
    }
    
    if (card.cost > this.mana) {
      return { success: false, error: 'Not enough mana' };
    }
    
    // 消耗法力
    this.mana -= card.cost;
    
    // 从手牌移除
    this.hand.splice(cardIndex, 1);
    
    if (card.isMinion()) {
      // 检查场上是否已满（最多7个随从）
      if (this.board.length >= 7) {
        return { success: false, error: 'Board is full' };
      }
      
      // 放置到场上
      card.instanceId = uuidv4();
      card.canAttack = false; // 随从不能立即攻击（除非有冲锋）
      this.board.push(card);
      
      return { 
        success: true, 
        type: 'play_minion', 
        card, 
        playerId: this.playerId,
        position: this.board.length - 1
      };
    }
    
    if (card.isSpell()) {
      return { 
        success: true, 
        type: 'play_spell', 
        card, 
        playerId: this.playerId,
        target
      };
    }
    
    return { success: false, error: 'Unknown card type' };
  }

  // 随从攻击
  minionAttack(minionIndex, targetIndex, isTargetHero = false) {
    const attacker = this.board[minionIndex];
    
    if (!attacker) {
      return { success: false, error: 'Attacker not found' };
    }
    
    if (!attacker.canAttack) {
      return { success: false, error: 'Minion cannot attack this turn' };
    }
    
    if (attacker.frozen) {
      return { success: false, error: 'Minion is frozen' };
    }
    
    if (attacker.cannotAttack()) {
      return { success: false, error: 'Minion cannot attack by skill effect' };
    }
    
    // 标记为已攻击
    attacker.canAttack = false;
    
    return {
      success: true,
      attacker,
      attackerIndex: minionIndex,
      targetIndex,
      isTargetHero,
      playerId: this.playerId
    };
  }

  // 受到伤害
  takeDamage(damage, isHero = true, minionIndex = -1) {
    if (isHero) {
      this.heroHealth -= damage;
      return { type: 'hero_damage', playerId: this.playerId, damage, newHealth: this.heroHealth };
    } else {
      if (minionIndex >= 0 && minionIndex < this.board.length) {
        this.board[minionIndex].health -= damage;
        const minion = this.board[minionIndex];
        
        if (minion.health <= 0) {
          // 随从死亡
          this.board.splice(minionIndex, 1);
          return { type: 'minion_death', playerId: this.playerId, minion, position: minionIndex };
        }
        
        return { type: 'minion_damage', playerId: this.playerId, minion, damage, newHealth: minion.health };
      }
    }
    return null;
  }

  // 治疗
  heal(amount, isHero = true, minionIndex = -1) {
    if (isHero) {
      const oldHealth = this.heroHealth;
      this.heroHealth = Math.min(this.heroHealth + amount, this.maxHeroHealth);
      return { type: 'hero_heal', playerId: this.playerId, amount: this.heroHealth - oldHealth, newHealth: this.heroHealth };
    } else {
      if (minionIndex >= 0 && minionIndex < this.board.length) {
        const minion = this.board[minionIndex];
        const oldHealth = minion.health;
        minion.health = Math.min(minion.health + amount, minion.maxHealth);
        return { type: 'minion_heal', playerId: this.playerId, minion, amount: minion.health - oldHealth, newHealth: minion.health };
      }
    }
    return null;
  }

  // 获取玩家状态
  getState() {
    return {
      playerId: this.playerId,
      name: this.name,
      heroHealth: this.heroHealth,
      maxHeroHealth: this.maxHeroHealth,
      mana: this.mana,
      maxMana: this.maxMana,
      hand: this.hand.map(card => ({
        ...card,
        instanceId: card.instanceId
      })),
      board: this.board.map(minion => ({
        ...minion,
        instanceId: minion.instanceId,
        canAttack: minion.canAttack,
        frozen: minion.frozen
      })),
      deckCount: this.deck.length,
      isFirst: this.isFirst,
      hasUsedCoin: this.hasUsedCoin
    };
  }
}

module.exports = Player;
