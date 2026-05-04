/**
 * 状态机系统测试
 * 测试State、StateMachine、Transition和TransitionStateMachine类的功能
 */

import { State, StateMachine, Transition, TransitionStateMachine } from '../src/fsm/StateMachine.js';

// 模拟状态拥有者
class MockOwner {
  constructor() {
    this.health = 100;
    this.isDead = false;
  }
}

// 具体状态实现
class TestState1 extends State {
  constructor() {
    super('State1');
    this.enterCalled = false;
    this.updateCalled = false;
    this.exitCalled = false;
  }
  
  enter(owner) {
    super.enter(owner);
    this.enterCalled = true;
  }
  
  update(time, delta) {
    this.updateCalled = true;
  }
  
  exit() {
    super.exit();
    this.exitCalled = true;
  }
}

class TestState2 extends State {
  constructor() {
    super('State2');
  }
}

describe('State', () => {
  let state;
  let owner;
  
  beforeEach(() => {
    state = new TestState1();
    owner = new MockOwner();
  });
  
  test('should have correct name', () => {
    expect(state.name).toBe('State1');
  });
  
  test('should enter state with owner', () => {
    expect(state.owner).toBeNull();
    expect(state.enterCalled).toBe(false);
    
    state.enter(owner);
    
    expect(state.owner).toBe(owner);
    expect(state.enterCalled).toBe(true);
  });
  
  test('should update state', () => {
    state.enter(owner);
    expect(state.updateCalled).toBe(false);
    
    state.update(1000, 16);
    
    expect(state.updateCalled).toBe(true);
  });
  
  test('should exit state', () => {
    state.enter(owner);
    expect(state.exitCalled).toBe(false);
    
    state.exit();
    
    expect(state.exitCalled).toBe(true);
    expect(state.owner).toBeNull();
  });
});

describe('StateMachine', () => {
  let stateMachine;
  let owner;
  let state1;
  let state2;
  
  beforeEach(() => {
    owner = new MockOwner();
    state1 = new TestState1();
    state2 = new TestState2();
    
    stateMachine = new StateMachine(owner);
    stateMachine.addState(state1);
    stateMachine.addState(state2);
  });
  
  test('should add states to machine', () => {
    expect(stateMachine.states.size).toBe(2);
    expect(stateMachine.states.has('State1')).toBe(true);
    expect(stateMachine.states.has('State2')).toBe(true);
  });
  
  test('should change state and call enter/exit', () => {
    expect(stateMachine.currentState).toBeNull();
    expect(state1.enterCalled).toBe(false);
    
    // 切换到State1
    stateMachine.changeState('State1');
    
    expect(stateMachine.currentState).toBe(state1);
    expect(state1.enterCalled).toBe(true);
    expect(stateMachine.getCurrentStateName()).toBe('State1');
    
    // 切换到State2
    state1.enterCalled = false;
    state1.exitCalled = false;
    
    stateMachine.changeState('State2');
    
    expect(stateMachine.currentState).toBe(state2);
    expect(state1.exitCalled).toBe(true);
    expect(stateMachine.previousState).toBe(state1);
  });
  
  test('should not change to same state', () => {
    stateMachine.changeState('State1');
    state1.enterCalled = false;
    state1.exitCalled = false;
    
    const result = stateMachine.changeState('State1');
    
    expect(result).toBe(true);
    expect(state1.enterCalled).toBe(false);
    expect(state1.exitCalled).toBe(false);
  });
  
  test('should return false for non-existent state', () => {
    const result = stateMachine.changeState('NonExistentState');
    expect(result).toBe(false);
    expect(stateMachine.currentState).toBeNull();
  });
  
  test('should revert to previous state', () => {
    stateMachine.changeState('State1');
    stateMachine.changeState('State2');
    
    expect(stateMachine.getCurrentStateName()).toBe('State2');
    
    const result = stateMachine.revertToPreviousState();
    
    expect(result).toBe(true);
    expect(stateMachine.getCurrentStateName()).toBe('State1');
  });
  
  test('should check if in specific state', () => {
    expect(stateMachine.isInState('State1')).toBe(false);
    
    stateMachine.changeState('State1');
    
    expect(stateMachine.isInState('State1')).toBe(true);
    expect(stateMachine.isInState('State2')).toBe(false);
  });
  
  test('should update current state', () => {
    stateMachine.changeState('State1');
    state1.updateCalled = false;
    
    stateMachine.update(1000, 16);
    
    expect(state1.updateCalled).toBe(true);
  });
  
  test('should clear state machine', () => {
    stateMachine.changeState('State1');
    
    stateMachine.clear();
    
    expect(stateMachine.currentState).toBeNull();
    expect(stateMachine.previousState).toBeNull();
    expect(stateMachine.states.size).toBe(0);
  });
});

describe('Transition', () => {
  let owner;
  
  beforeEach(() => {
    owner = new MockOwner();
  });
  
  test('should create transition with condition', () => {
    const condition = jest.fn((o) => o.health > 50);
    const transition = new Transition('State1', 'State2', condition);
    
    expect(transition.fromState).toBe('State1');
    expect(transition.toState).toBe('State2');
  });
  
  test('should check condition and return true', () => {
    owner.health = 80;
    const condition = jest.fn((o) => o.health > 50);
    const transition = new Transition('State1', 'State2', condition);
    
    const result = transition.check(owner);
    
    expect(result).toBe(true);
    expect(condition).toHaveBeenCalledWith(owner);
  });
  
  test('should check condition and return false', () => {
    owner.health = 30;
    const condition = jest.fn((o) => o.health > 50);
    const transition = new Transition('State1', 'State2', condition);
    
    const result = transition.check(owner);
    
    expect(result).toBe(false);
  });
});

describe('TransitionStateMachine', () => {
  let stateMachine;
  let owner;
  let state1;
  let state2;
  let state3;
  
  beforeEach(() => {
    owner = new MockOwner();
    state1 = new TestState1();
    state1.name = 'Idle';
    state2 = new TestState2();
    state2.name = 'Moving';
    state3 = new State('Dead');
    
    stateMachine = new TransitionStateMachine(owner);
    stateMachine.addState(state1);
    stateMachine.addState(state2);
    stateMachine.addState(state3);
  });
  
  test('should add transitions', () => {
    const transition1 = new Transition('Idle', 'Moving', () => true);
    const transition2 = new Transition('Moving', 'Dead', () => owner.isDead);
    
    stateMachine.addTransition(transition1);
    stateMachine.addTransition(transition2);
    
    expect(stateMachine.transitions.size).toBe(2);
    expect(stateMachine.transitions.has('Idle')).toBe(true);
    expect(stateMachine.transitions.has('Moving')).toBe(true);
  });
  
  test('should check transitions and change state', () => {
    // 添加从Idle到Moving的转换
    const transition = new Transition('Idle', 'Moving', () => true);
    stateMachine.addTransition(transition);
    
    // 初始状态
    stateMachine.changeState('Idle');
    expect(stateMachine.getCurrentStateName()).toBe('Idle');
    
    // 更新应该触发转换
    stateMachine.update(1000, 16);
    
    expect(stateMachine.getCurrentStateName()).toBe('Moving');
  });
  
  test('should not transition when condition is false', () => {
    // 添加从Idle到Moving的转换（条件为false）
    const transition = new Transition('Idle', 'Moving', () => false);
    stateMachine.addTransition(transition);
    
    // 初始状态
    stateMachine.changeState('Idle');
    expect(stateMachine.getCurrentStateName()).toBe('Idle');
    
    // 更新不应该触发转换
    stateMachine.update(1000, 16);
    
    expect(stateMachine.getCurrentStateName()).toBe('Idle');
  });
  
  test('should only transition from current state', () => {
    // 添加从Idle到Moving的转换
    const transition1 = new Transition('Idle', 'Moving', () => true);
    // 添加从Moving到Dead的转换
    const transition2 = new Transition('Moving', 'Dead', () => true);
    
    stateMachine.addTransition(transition1);
    stateMachine.addTransition(transition2);
    
    // 初始状态是Moving
    stateMachine.changeState('Moving');
    expect(stateMachine.getCurrentStateName()).toBe('Moving');
    
    // 更新应该触发从Moving到Dead的转换，而不是Idle到Moving
    stateMachine.update(1000, 16);
    
    expect(stateMachine.getCurrentStateName()).toBe('Dead');
  });
});
