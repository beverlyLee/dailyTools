import { FSMState, AIState, Enemy, Position, GameState, Player } from '../types';
import { MapUtils } from '../algorithms/MapUtils';

const SIGHT_RADIUS = 8;
const ATTACK_RANGE = 1;
const CHASE_RADIUS = 6;
const FLEE_HP_THRESHOLD = 0.25;

export class IdleState implements FSMState {
  name = AIState.IDLE;
  private waitTime: number = 0;

  onEnter(enemy: Enemy, player: Position): void {
    this.waitTime = Math.floor(Math.random() * 5) + 3;
  }

  onUpdate(enemy: Enemy, playerPos: Position, gameState: GameState): AIState {
    const distance = MapUtils.getDistance(enemy.position, playerPos);
    const canSee = MapUtils.lineOfSight(enemy.position, playerPos, gameState.map, SIGHT_RADIUS);

    if (canSee && distance <= SIGHT_RADIUS) {
      const hpRatio = enemy.hp / enemy.maxHp;
      if (hpRatio <= FLEE_HP_THRESHOLD) {
        return AIState.FLEE;
      }
      return AIState.CHASE;
    }

    this.waitTime--;
    if (this.waitTime <= 0) {
      return AIState.PATROL;
    }

    return AIState.IDLE;
  }
}

export class PatrolState implements FSMState {
  name = AIState.PATROL;
  private targetPos: Position | null = null;
  private stepsRemaining: number = 0;

  onEnter(enemy: Enemy, player: Position): void {
    this.targetPos = null;
    this.stepsRemaining = Math.floor(Math.random() * 8) + 5;
  }

  onUpdate(enemy: Enemy, playerPos: Position, gameState: GameState): AIState {
    const distance = MapUtils.getDistance(enemy.position, playerPos);
    const canSee = MapUtils.lineOfSight(enemy.position, playerPos, gameState.map, SIGHT_RADIUS);

    if (canSee && distance <= SIGHT_RADIUS) {
      const hpRatio = enemy.hp / enemy.maxHp;
      if (hpRatio <= FLEE_HP_THRESHOLD) {
        return AIState.FLEE;
      }
      return AIState.CHASE;
    }

    if (!this.targetPos || this.stepsRemaining <= 0) {
      const neighbors = MapUtils.getNeighbors(
        enemy.position.x,
        enemy.position.y,
        gameState.map.width,
        gameState.map.height
      );

      const validMoves = neighbors.filter(pos => 
        gameState.map.tiles[pos.y][pos.x].passable &&
        !this.isPositionOccupied(pos, gameState)
      );

      if (validMoves.length > 0) {
        this.targetPos = validMoves[Math.floor(Math.random() * validMoves.length)];
        this.stepsRemaining = Math.floor(Math.random() * 6) + 3;
      } else {
        return AIState.IDLE;
      }
    }

    if (this.targetPos) {
      enemy.position = { ...this.targetPos };
      this.targetPos = null;
      this.stepsRemaining--;
    }

    return AIState.PATROL;
  }

  private isPositionOccupied(pos: Position, gameState: GameState): boolean {
    if (pos.x === gameState.player.position.x && pos.y === gameState.player.position.y) {
      return true;
    }
    return gameState.enemies.some(e => 
      e.id !== gameState.player.id && 
      e.position.x === pos.x && 
      e.position.y === pos.y
    );
  }
}

export class ChaseState implements FSMState {
  name = AIState.CHASE;
  private lastKnownPosition: Position | null = null;

  onEnter(enemy: Enemy, player: Position): void {
    this.lastKnownPosition = { ...player };
  }

  onUpdate(enemy: Enemy, playerPos: Position, gameState: GameState): AIState {
    const distance = MapUtils.getDistance(enemy.position, playerPos);
    const canSee = MapUtils.lineOfSight(enemy.position, playerPos, gameState.map, SIGHT_RADIUS);

    if (canSee) {
      this.lastKnownPosition = { ...playerPos };
    }

    const hpRatio = enemy.hp / enemy.maxHp;
    if (hpRatio <= FLEE_HP_THRESHOLD && canSee) {
      return AIState.FLEE;
    }

    if (!canSee && this.lastKnownPosition) {
      const distanceToLastKnown = MapUtils.getDistance(enemy.position, this.lastKnownPosition);
      
      if (distanceToLastKnown <= 1) {
        this.lastKnownPosition = null;
        return AIState.PATROL;
      }
      
      this.moveTowards(enemy, this.lastKnownPosition, gameState);
      return AIState.CHASE;
    }

    if (distance <= ATTACK_RANGE) {
      return AIState.ATTACK;
    }

    if (distance > CHASE_RADIUS + SIGHT_RADIUS) {
      return AIState.PATROL;
    }

    this.moveTowards(enemy, playerPos, gameState);

    return AIState.CHASE;
  }

  private moveTowards(enemy: Enemy, target: Position, gameState: GameState): void {
    const dx = target.x - enemy.position.x;
    const dy = target.y - enemy.position.y;

    const moves: Position[] = [];

    if (dx > 0) moves.push({ x: enemy.position.x + 1, y: enemy.position.y });
    if (dx < 0) moves.push({ x: enemy.position.x - 1, y: enemy.position.y });
    if (dy > 0) moves.push({ x: enemy.position.x, y: enemy.position.y + 1 });
    if (dy < 0) moves.push({ x: enemy.position.x, y: enemy.position.y - 1 });

    const validMoves = moves.filter(pos => 
      MapUtils.isInBounds(pos.x, pos.y, gameState.map.width, gameState.map.height) &&
      gameState.map.tiles[pos.y][pos.x].passable &&
      !this.isPositionOccupied(pos, gameState)
    );

    if (validMoves.length > 0) {
      validMoves.sort((a, b) => 
        MapUtils.getDistance(a, target) - MapUtils.getDistance(b, target)
      );
      enemy.position = { ...validMoves[0] };
    }
  }

  private isPositionOccupied(pos: Position, gameState: GameState): boolean {
    if (pos.x === gameState.player.position.x && pos.y === gameState.player.position.y) {
      return false;
    }
    return gameState.enemies.some(e => 
      e.id !== gameState.player.id && 
      e.position.x === pos.x && 
      e.position.y === pos.y
    );
  }
}

export class AttackState implements FSMState {
  name = AIState.ATTACK;

  onUpdate(enemy: Enemy, playerPos: Position, gameState: GameState): AIState {
    const distance = MapUtils.getDistance(enemy.position, playerPos);

    const hpRatio = enemy.hp / enemy.maxHp;
    if (hpRatio <= FLEE_HP_THRESHOLD) {
      return AIState.FLEE;
    }

    if (distance > ATTACK_RANGE) {
      return AIState.CHASE;
    }

    const canSee = MapUtils.lineOfSight(enemy.position, playerPos, gameState.map, SIGHT_RADIUS);
    if (!canSee) {
      return AIState.PATROL;
    }

    return AIState.ATTACK;
  }
}

export class FleeState implements FSMState {
  name = AIState.FLEE;
  private fleeTime: number = 0;

  onEnter(enemy: Enemy, player: Position): void {
    this.fleeTime = 10;
  }

  onUpdate(enemy: Enemy, playerPos: Position, gameState: GameState): AIState {
    const distance = MapUtils.getDistance(enemy.position, playerPos);
    const canSee = MapUtils.lineOfSight(enemy.position, playerPos, gameState.map, SIGHT_RADIUS);

    const hpRatio = enemy.hp / enemy.maxHp;
    if (hpRatio > FLEE_HP_THRESHOLD * 1.5) {
      if (canSee && distance <= SIGHT_RADIUS) {
        return AIState.CHASE;
      }
      return AIState.PATROL;
    }

    if (!canSee && this.fleeTime <= 0) {
      return AIState.PATROL;
    }

    if (canSee) {
      this.moveAway(enemy, playerPos, gameState);
      this.fleeTime = 10;
    } else {
      this.wanderRandomly(enemy, gameState);
      this.fleeTime--;
    }

    return AIState.FLEE;
  }

  private moveAway(enemy: Enemy, threat: Position, gameState: GameState): void {
    const dx = enemy.position.x - threat.x;
    const dy = enemy.position.y - threat.y;

    const moves: Position[] = [];

    if (dx > 0) moves.push({ x: enemy.position.x + 1, y: enemy.position.y });
    if (dx < 0) moves.push({ x: enemy.position.x - 1, y: enemy.position.y });
    if (dy > 0) moves.push({ x: enemy.position.x, y: enemy.position.y + 1 });
    if (dy < 0) moves.push({ x: enemy.position.x, y: enemy.position.y - 1 });

    const validMoves = moves.filter(pos => 
      MapUtils.isInBounds(pos.x, pos.y, gameState.map.width, gameState.map.height) &&
      gameState.map.tiles[pos.y][pos.x].passable &&
      !this.isPositionOccupied(pos, gameState)
    );

    if (validMoves.length > 0) {
      validMoves.sort((a, b) => 
        MapUtils.getDistance(b, threat) - MapUtils.getDistance(a, threat)
      );
      enemy.position = { ...validMoves[0] };
    }
  }

  private wanderRandomly(enemy: Enemy, gameState: GameState): void {
    const neighbors = MapUtils.getNeighbors(
      enemy.position.x,
      enemy.position.y,
      gameState.map.width,
      gameState.map.height
    );

    const validMoves = neighbors.filter(pos => 
      gameState.map.tiles[pos.y][pos.x].passable &&
      !this.isPositionOccupied(pos, gameState)
    );

    if (validMoves.length > 0) {
      enemy.position = { ...validMoves[Math.floor(Math.random() * validMoves.length)] };
    }
  }

  private isPositionOccupied(pos: Position, gameState: GameState): boolean {
    if (pos.x === gameState.player.position.x && pos.y === gameState.player.position.y) {
      return true;
    }
    return gameState.enemies.some(e => 
      e.id !== gameState.player.id && 
      e.position.x === pos.x && 
      e.position.y === pos.y
    );
  }
}
