import { Enemy, AIState, Position, EnemyType } from '../types';
import { FiniteStateMachine } from './FiniteStateMachine';
import { IdleState, PatrolState, ChaseState, AttackState, FleeState } from './EnemyStates';

interface EnemyTemplate {
  name: string;
  char: string;
  color: string;
  baseHp: number;
  baseAttack: number;
  baseDefense: number;
  xpReward: number;
  initialState: AIState;
}

const enemyTemplates: Record<EnemyType, EnemyTemplate> = {
  [EnemyType.GOBLIN]: {
    name: '哥布林',
    char: 'g',
    color: '#4ade80',
    baseHp: 20,
    baseAttack: 5,
    baseDefense: 2,
    xpReward: 15,
    initialState: AIState.IDLE,
  },
  [EnemyType.ORC]: {
    name: '兽人',
    char: 'o',
    color: '#84cc16',
    baseHp: 40,
    baseAttack: 10,
    baseDefense: 5,
    xpReward: 30,
    initialState: AIState.PATROL,
  },
  [EnemyType.SKELETON]: {
    name: '骷髅',
    char: 'S',
    color: '#d1d5db',
    baseHp: 25,
    baseAttack: 8,
    baseDefense: 1,
    xpReward: 20,
    initialState: AIState.IDLE,
  },
  [EnemyType.SLIME]: {
    name: '史莱姆',
    char: 's',
    color: '#60a5fa',
    baseHp: 15,
    baseAttack: 3,
    baseDefense: 0,
    xpReward: 10,
    initialState: AIState.PATROL,
  },
  [EnemyType.BAT]: {
    name: '蝙蝠',
    char: 'b',
    color: '#a78bfa',
    baseHp: 10,
    baseAttack: 4,
    baseDefense: 0,
    xpReward: 8,
    initialState: AIState.PATROL,
  },
};

export class EnemyFactory {
  static createEnemy(
    type: EnemyType,
    position: Position,
    id: string,
    level: number = 1
  ): { enemy: Enemy; fsm: FiniteStateMachine } {
    const template = enemyTemplates[type];
    
    const levelMultiplier = 1 + (level - 1) * 0.2;
    
    const enemy: Enemy = {
      id,
      position: { ...position },
      name: template.name,
      char: template.char,
      color: template.color,
      ai: template.initialState,
      type,
      hp: Math.floor(template.baseHp * levelMultiplier),
      maxHp: Math.floor(template.baseHp * levelMultiplier),
      attack: Math.floor(template.baseAttack * levelMultiplier),
      defense: Math.floor(template.baseDefense * levelMultiplier),
      level,
      xp: 0,
      xpToNextLevel: 0,
    };

    const fsm = new FiniteStateMachine(enemy, this.createState(template.initialState));
    
    fsm.addState(new IdleState());
    fsm.addState(new PatrolState());
    fsm.addState(new ChaseState());
    fsm.addState(new AttackState());
    fsm.addState(new FleeState());

    return { enemy, fsm };
  }

  private static createState(stateType: AIState): IdleState {
    switch (stateType) {
      case AIState.PATROL:
        return new PatrolState() as unknown as IdleState;
      case AIState.IDLE:
      default:
        return new IdleState();
    }
  }

  static getRandomEnemyType(): EnemyType {
    const types = Object.values(EnemyType);
    return types[Math.floor(Math.random() * types.length)];
  }

  static getXpReward(type: EnemyType, level: number = 1): number {
    const template = enemyTemplates[type];
    const levelMultiplier = 1 + (level - 1) * 0.3;
    return Math.floor(template.xpReward * levelMultiplier);
  }
}
