const db = require('../database/database');

class Card {
  constructor(cardData) {
    this.id = cardData.id;
    this.cardId = cardData.card_id;
    this.name = cardData.name;
    this.type = cardData.type;
    this.cost = cardData.cost;
    this.attack = cardData.attack;
    this.health = cardData.health;
    this.maxHealth = cardData.health;
    this.rarity = cardData.rarity;
    this.description = cardData.description;
    this.skillType = cardData.skill_type;
    this.skillDescription = cardData.skill_description;
    
    // 游戏运行时状态
    this.instanceId = null;
    this.canAttack = false;
    this.frozen = false;
    this.spellDamageBonus = 0;
  }

  static getAll(callback) {
    db.all('SELECT * FROM cards', callback);
  }

  static getById(cardId, callback) {
    db.get('SELECT * FROM cards WHERE card_id = ?', [cardId], callback);
  }

  static getByType(type, callback) {
    db.all('SELECT * FROM cards WHERE type = ?', [type], callback);
  }

  // 解析技能描述
  parseSkill() {
    if (!this.skillDescription) return null;
    
    const skills = this.skillDescription.split(';');
    const parsed = {};
    
    skills.forEach(skill => {
      const [key, value] = skill.split(':');
      if (value === 'true') parsed[key] = true;
      else if (value === 'false') parsed[key] = false;
      else if (!isNaN(value)) parsed[key] = parseInt(value);
      else parsed[key] = value;
    });
    
    return parsed;
  }

  // 判断是否为随从卡
  isMinion() {
    return this.type === 'minion';
  }

  // 判断是否为法术卡
  isSpell() {
    return this.type === 'spell';
  }

  // 判断是否有战吼
  hasBattlecry() {
    return this.skillType && this.skillType.includes('battlecry');
  }

  // 判断是否有亡语
  hasDeathrattle() {
    return this.skillType && this.skillType.includes('deathrattle');
  }

  // 判断是否无法攻击
  cannotAttack() {
    const skill = this.parseSkill();
    return skill && skill.cannot_attack === true;
  }
}

module.exports = Card;
