export interface PendulumState {
  theta1: number;
  theta2: number;
  omega1: number;
  omega2: number;
}

export interface PhysicsParams {
  l1: number;
  l2: number;
  m1: number;
  m2: number;
  g: number;
  damping: number;
}

export interface StateDerivatives {
  dTheta1: number;
  dTheta2: number;
  dOmega1: number;
  dOmega2: number;
}

export class Integrator {
  private params: PhysicsParams;

  constructor(params: PhysicsParams) {
    this.params = { ...params };
  }

  public computeDerivatives(state: PendulumState): StateDerivatives {
    const { theta1, theta2, omega1, omega2 } = state;
    const { l1, l2, m1, m2, g, damping } = this.params;

    const delta = theta2 - theta1;
    const sinDelta = Math.sin(delta);
    const cosDelta = Math.cos(delta);

    const sin1 = Math.sin(theta1);
    const sin2 = Math.sin(theta2);

    const M = m1 + m2;

    const denom = M - m2 * cosDelta * cosDelta;
    const denom1 = l1 * denom;
    const denom2 = l2 * denom;

    const alpha1 = (
      m2 * l1 * omega1 * omega1 * sinDelta * cosDelta
      + m2 * g * sin2 * cosDelta
      + m2 * l2 * omega2 * omega2 * sinDelta
      - M * g * sin1
    ) / denom1 - damping * omega1;

    const alpha2 = (
      -m2 * l2 * omega2 * omega2 * sinDelta * cosDelta
      + M * g * sin1 * cosDelta
      - M * l1 * omega1 * omega1 * sinDelta
      - M * g * sin2
    ) / denom2 - damping * omega2;

    return {
      dTheta1: omega1,
      dTheta2: omega2,
      dOmega1: alpha1,
      dOmega2: alpha2
    };
  }

  public rk4Step(state: PendulumState, dt: number): PendulumState {
    const k1 = this.computeDerivatives(state);

    const state2: PendulumState = {
      theta1: state.theta1 + 0.5 * dt * k1.dTheta1,
      theta2: state.theta2 + 0.5 * dt * k1.dTheta2,
      omega1: state.omega1 + 0.5 * dt * k1.dOmega1,
      omega2: state.omega2 + 0.5 * dt * k1.dOmega2
    };
    const k2 = this.computeDerivatives(state2);

    const state3: PendulumState = {
      theta1: state.theta1 + 0.5 * dt * k2.dTheta1,
      theta2: state.theta2 + 0.5 * dt * k2.dTheta2,
      omega1: state.omega1 + 0.5 * dt * k2.dOmega1,
      omega2: state.omega2 + 0.5 * dt * k2.dOmega2
    };
    const k3 = this.computeDerivatives(state3);

    const state4: PendulumState = {
      theta1: state.theta1 + dt * k3.dTheta1,
      theta2: state.theta2 + dt * k3.dTheta2,
      omega1: state.omega1 + dt * k3.dOmega1,
      omega2: state.omega2 + dt * k3.dOmega2
    };
    const k4 = this.computeDerivatives(state4);

    return {
      theta1: state.theta1 + (dt / 6) * (k1.dTheta1 + 2 * k2.dTheta1 + 2 * k3.dTheta1 + k4.dTheta1),
      theta2: state.theta2 + (dt / 6) * (k1.dTheta2 + 2 * k2.dTheta2 + 2 * k3.dTheta2 + k4.dTheta2),
      omega1: state.omega1 + (dt / 6) * (k1.dOmega1 + 2 * k2.dOmega1 + 2 * k3.dOmega1 + k4.dOmega1),
      omega2: state.omega2 + (dt / 6) * (k1.dOmega2 + 2 * k2.dOmega2 + 2 * k3.dOmega2 + k4.dOmega2)
    };
  }

  public eulerStep(state: PendulumState, dt: number): PendulumState {
    const derivs = this.computeDerivatives(state);
    return {
      theta1: state.theta1 + dt * derivs.dTheta1,
      theta2: state.theta2 + dt * derivs.dTheta2,
      omega1: state.omega1 + dt * derivs.dOmega1,
      omega2: state.omega2 + dt * derivs.dOmega2
    };
  }

  public updateParams(params: Partial<PhysicsParams>): void {
    this.params = { ...this.params, ...params };
  }

  public getParams(): PhysicsParams {
    return { ...this.params };
  }
}
