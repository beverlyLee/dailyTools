import { FSMState, AIState, Enemy, Position, GameState } from '../types';
import { MapUtils } from '../algorithms/MapUtils';

export class FiniteStateMachine {
  private states: Map<AIState, FSMState>;
  private currentState: FSMState;
  private enemy: Enemy;

  constructor(enemy: Enemy, initialState: FSMState) {
    this.states = new Map();
    this.currentState = initialState;
    this.enemy = enemy;
  }

  addState(state: FSMState): void {
    this.states.set(state.name, state);
  }

  changeState(newStateName: AIState, playerPos: Position): void {
    const newState = this.states.get(newStateName);
    if (!newState) {
      throw new Error(`State ${newStateName} not found`);
    }

    if (this.currentState.onExit) {
      this.currentState.onExit(this.enemy, playerPos);
    }

    this.currentState = newState;
    this.enemy.ai = newStateName;

    if (this.currentState.onEnter) {
      this.currentState.onEnter(this.enemy, playerPos);
    }
  }

  update(playerPos: Position, gameState: GameState): void {
    const nextState = this.currentState.onUpdate(this.enemy, playerPos, gameState);
    
    if (nextState !== this.currentState.name) {
      this.changeState(nextState, playerPos);
    }
  }

  getCurrentState(): FSMState {
    return this.currentState;
  }
}
