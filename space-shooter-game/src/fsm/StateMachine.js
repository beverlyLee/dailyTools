/**
 * 状态机系统 (Finite State Machine - FSM)
 * 
 * 状态机是一种行为设计模式，用于管理对象在不同状态之间的转换。
 * 在太空射击游戏中，敌人可以处于多种状态（移动、攻击、受伤、死亡等），
 * 使用状态机可以清晰地管理这些状态之间的转换逻辑。
 * 
 * 工作原理：
 * - 每个状态是一个独立的类，包含进入、更新和退出方法
 * - 状态机维护当前状态，并处理状态转换
 * - 状态之间可以定义转换条件
 */

/**
 * 基础状态类
 * 所有具体状态都应该继承此类
 */
export class State {
  /**
   * 构造函数
   * @param {string} name - 状态名称
   */
  constructor(name) {
    this.name = name;
    this.owner = null;
  }

  /**
   * 进入状态时调用
   * @param {*} owner - 状态的拥有者（通常是敌人实例）
   */
  enter(owner) {
    this.owner = owner;
    console.log(`进入状态: ${this.name}`);
  }

  /**
   * 更新状态
   * @param {number} time - 当前时间
   * @param {number} delta - 帧间隔时间
   */
  update(time, delta) {
    // 由子类实现
  }

  /**
   * 退出状态时调用
   */
  exit() {
    console.log(`退出状态: ${this.name}`);
    this.owner = null;
  }
}

/**
 * 状态机类
 * 管理状态的转换和更新
 */
export class StateMachine {
  /**
   * 构造函数
   * @param {*} owner - 状态机的拥有者
   */
  constructor(owner) {
    this.owner = owner;
    this.states = new Map(); // 存储所有状态
    this.currentState = null; // 当前状态
    this.previousState = null; // 上一个状态
  }

  /**
   * 添加状态到状态机
   * @param {State} state - 要添加的状态
   */
  addState(state) {
    this.states.set(state.name, state);
  }

  /**
   * 切换到指定状态
   * @param {string} stateName - 要切换到的状态名称
   * @returns {boolean} 是否成功切换
   */
  changeState(stateName) {
    const newState = this.states.get(stateName);
    
    if (!newState) {
      console.warn(`状态不存在: ${stateName}`);
      return false;
    }
    
    // 如果是同一个状态，不执行任何操作
    if (this.currentState && this.currentState.name === stateName) {
      return true;
    }
    
    // 退出当前状态
    if (this.currentState) {
      this.previousState = this.currentState;
      this.currentState.exit();
    }
    
    // 进入新状态
    this.currentState = newState;
    this.currentState.enter(this.owner);
    
    return true;
  }

  /**
   * 返回到上一个状态
   * @returns {boolean} 是否成功返回
   */
  revertToPreviousState() {
    if (this.previousState) {
      return this.changeState(this.previousState.name);
    }
    return false;
  }

  /**
   * 更新当前状态
   * @param {number} time - 当前时间
   * @param {number} delta - 帧间隔时间
   */
  update(time, delta) {
    if (this.currentState) {
      this.currentState.update(time, delta);
    }
  }

  /**
   * 获取当前状态名称
   * @returns {string|null} 当前状态名称
   */
  getCurrentStateName() {
    return this.currentState ? this.currentState.name : null;
  }

  /**
   * 检查是否处于指定状态
   * @param {string} stateName - 状态名称
   * @returns {boolean} 是否处于该状态
   */
  isInState(stateName) {
    return this.currentState && this.currentState.name === stateName;
  }

  /**
   * 清空状态机
   */
  clear() {
    if (this.currentState) {
      this.currentState.exit();
    }
    this.states.clear();
    this.currentState = null;
    this.previousState = null;
  }
}

/**
 * 状态转换条件类
 * 用于定义状态之间的转换规则
 */
export class Transition {
  /**
   * 构造函数
   * @param {string} fromState - 源状态
   * @param {string} toState - 目标状态
   * @param {Function} condition - 转换条件函数，返回boolean
   */
  constructor(fromState, toState, condition) {
    this.fromState = fromState;
    this.toState = toState;
    this.condition = condition;
  }

  /**
   * 检查是否满足转换条件
   * @param {*} owner - 状态拥有者
   * @returns {boolean} 是否满足条件
   */
  check(owner) {
    return this.condition(owner);
  }
}

/**
 * 带转换的状态机
 * 支持自动根据条件转换状态
 */
export class TransitionStateMachine extends StateMachine {
  constructor(owner) {
    super(owner);
    this.transitions = new Map(); // 存储状态转换规则
  }

  /**
   * 添加状态转换规则
   * @param {Transition} transition - 转换规则
   */
  addTransition(transition) {
    if (!this.transitions.has(transition.fromState)) {
      this.transitions.set(transition.fromState, []);
    }
    this.transitions.get(transition.fromState).push(transition);
  }

  /**
   * 检查并执行状态转换
   */
  checkTransitions() {
    if (!this.currentState) return;
    
    const stateTransitions = this.transitions.get(this.currentState.name);
    if (!stateTransitions) return;
    
    for (const transition of stateTransitions) {
      if (transition.check(this.owner)) {
        this.changeState(transition.toState);
        break; // 找到第一个满足条件的转换后停止
      }
    }
  }

  /**
   * 重写update方法，增加状态转换检查
   * @param {number} time - 当前时间
   * @param {number} delta - 帧间隔时间
   */
  update(time, delta) {
    // 先检查状态转换
    this.checkTransitions();
    
    // 再更新当前状态
    super.update(time, delta);
  }
}
