const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '../../data/game.db');

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
  } else {
    console.log('Connected to the SQLite database.');
    initializeDatabase();
  }
});

function initializeDatabase() {
  // 卡牌表
  db.run(`
    CREATE TABLE IF NOT EXISTS cards (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      card_id TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('minion', 'spell', 'weapon')),
      cost INTEGER NOT NULL DEFAULT 0,
      attack INTEGER,
      health INTEGER,
      rarity TEXT CHECK(rarity IN ('common', 'rare', 'epic', 'legendary')),
      description TEXT,
      skill_type TEXT,
      skill_description TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 游戏对局表
  db.run(`
    CREATE TABLE IF NOT EXISTS games (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      game_id TEXT UNIQUE NOT NULL,
      player1_id TEXT NOT NULL,
      player2_id TEXT,
      status TEXT DEFAULT 'waiting' CHECK(status IN ('waiting', 'playing', 'finished')),
      winner_id TEXT,
      turn INTEGER DEFAULT 0,
      current_player_id TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      finished_at DATETIME
    )
  `);

  // 玩家表
  db.run(`
    CREATE TABLE IF NOT EXISTS players (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      player_id TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      wins INTEGER DEFAULT 0,
      losses INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 插入初始卡牌数据
  seedCards();
}

function seedCards() {
  const cards = [
    // 基础随从卡
    { card_id: 'minion_1', name: '火焰小鬼', type: 'minion', cost: 1, attack: 2, health: 1, rarity: 'common', description: '战吼：对自己的英雄造成3点伤害。', skill_type: 'battlecry', skill_description: 'self_damage:3' },
    { card_id: 'minion_2', name: '血法师萨尔诺斯', type: 'minion', cost: 2, attack: 1, health: 1, rarity: 'rare', description: '法术伤害+1；亡语：抽一张牌。', skill_type: 'battlecry+deathrattle', skill_description: 'spell_damage:1;draw:1' },
    { card_id: 'minion_3', name: '麦田傀儡', type: 'minion', cost: 3, attack: 2, health: 3, rarity: 'common', description: '亡语：召唤一个2/1的损坏的傀儡。', skill_type: 'deathrattle', skill_description: 'summon:damaged_puppet' },
    { card_id: 'minion_4', name: '雪人', type: 'minion', cost: 4, attack: 4, health: 5, rarity: 'common', description: '普通的雪人，没有特殊技能。', skill_type: null, skill_description: null },
    { card_id: 'minion_5', name: '霜狼督军', type: 'minion', cost: 5, attack: 4, health: 4, rarity: 'common', description: '战吼：战场上每有一个其他友方随从，便获得+1/+1。', skill_type: 'battlecry', skill_description: 'buff_per_ally:1' },
    { card_id: 'minion_6', name: '石拳食人魔', type: 'minion', cost: 6, attack: 6, health: 7, rarity: 'common', description: '优质的6费随从。', skill_type: null, skill_description: null },
    { card_id: 'minion_7', name: '炎魔之王拉格纳罗斯', type: 'minion', cost: 8, attack: 8, health: 8, rarity: 'legendary', description: '无法攻击。在你的回合结束时，随机对一个敌人造成8点伤害。', skill_type: 'triggered', skill_description: 'end_turn_damage:8;cannot_attack:true' },
    
    // 法术卡
    { card_id: 'spell_1', name: '奥术飞弹', type: 'spell', cost: 1, rarity: 'common', description: '造成3点伤害，随机分配到所有敌方角色身上。', skill_type: 'spell', skill_description: 'random_damage:3' },
    { card_id: 'spell_2', name: '寒冰箭', type: 'spell', cost: 2, rarity: 'common', description: '造成3点伤害，并冻结目标。', skill_type: 'spell', skill_description: 'damage:3;freeze:true' },
    { card_id: 'spell_3', name: '火球术', type: 'spell', cost: 4, rarity: 'common', description: '造成6点伤害。', skill_type: 'spell', skill_description: 'damage:6' },
    { card_id: 'spell_4', name: '烈焰风暴', type: 'spell', cost: 6, rarity: 'rare', description: '对所有敌方随从造成6点伤害。', skill_type: 'spell', skill_description: 'aoe_damage:6;target:enemy_minions' },
    { card_id: 'spell_5', name: '治疗术', type: 'spell', cost: 1, rarity: 'common', description: '恢复5点生命值。', skill_type: 'spell', skill_description: 'heal:5' },
    { card_id: 'spell_6', name: '奥术智慧', type: 'spell', cost: 3, rarity: 'common', description: '抽2张牌。', skill_type: 'spell', skill_description: 'draw:2' }
  ];

  cards.forEach(card => {
    db.run(`
      INSERT OR IGNORE INTO cards (card_id, name, type, cost, attack, health, rarity, description, skill_type, skill_description)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [card.card_id, card.name, card.type, card.cost, card.attack, card.health, card.rarity, card.description, card.skill_type, card.skill_description]);
  });

  console.log('Card data seeded.');
}

module.exports = db;
