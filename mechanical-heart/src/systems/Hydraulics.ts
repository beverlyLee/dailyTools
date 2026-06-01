import gsap from 'gsap';

export type ChamberPhase = 'filling' | 'contracting' | 'ejecting' | 'resting';
export type BloodVessel = 'leftAtrium' | 'rightAtrium' | 'leftVentricle' | 'rightVentricle' | 'aorta' | 'pulmonary' | 'systemic';

export interface BloodParticle {
  id: number;
  position: number;
  vessel: BloodVessel;
}

export interface HydraulicState {
  leftVentricle: {
    pistonPosition: number;
    pressure: number;
    valveOpen: boolean;
    phase: ChamberPhase;
  };
  rightVentricle: {
    pistonPosition: number;
    pressure: number;
    valveOpen: boolean;
    phase: ChamberPhase;
  };
  atriumPressure: number;
  bloodParticles: BloodParticle[];
  isBeating: boolean;
  currentHeartRate: number;
}

export class HydraulicSystem {
  private state: HydraulicState;
  private animationTimeline: gsap.core.Timeline | null = null;
  private listeners: Set<(state: HydraulicState) => void> = new Set();
  private beatInterval: number | null = null;
  private particleIdCounter = 0;
  private cycleStartTime: number = 0;

  constructor() {
    this.state = {
      leftVentricle: {
        pistonPosition: 0,
        pressure: 30,
        valveOpen: false,
        phase: 'resting'
      },
      rightVentricle: {
        pistonPosition: 0,
        pressure: 25,
        valveOpen: false,
        phase: 'resting'
      },
      atriumPressure: 50,
      bloodParticles: [],
      isBeating: false,
      currentHeartRate: 75
    };
  }

  subscribe(listener: (state: HydraulicState) => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    this.listeners.forEach(listener => listener({ ...this.state }));
  }

  getState(): HydraulicState {
    return { ...this.state };
  }

  startBeating(heartRate: number = 75) {
    if (this.state.isBeating) return;
    
    this.state.isBeating = true;
    this.state.currentHeartRate = heartRate;
    this.state.rightVentricle.phase = 'resting';
    this.notify();
    this.performBeatCycle(heartRate);
  }

  stopBeating() {
    this.state.isBeating = false;
    this.clearBeatInterval();
    this.killAnimationTimeline();
    this.state.leftVentricle.phase = 'resting';
    this.state.rightVentricle.phase = 'resting';
    this.state.leftVentricle.valveOpen = false;
    this.state.rightVentricle.valveOpen = false;
    this.notify();
  }

  private killAnimationTimeline() {
    if (this.animationTimeline) {
      this.animationTimeline.kill();
      this.animationTimeline = null;
    }
  }

  private clearBeatInterval() {
    if (this.beatInterval) {
      clearInterval(this.beatInterval);
      this.beatInterval = null;
    }
  }

  updateHeartRate(newHeartRate: number) {
    if (!this.state.isBeating) return;
    if (this.state.currentHeartRate === newHeartRate) return;
    
    this.killAnimationTimeline();
    this.state.currentHeartRate = newHeartRate;
    this.notify();
    
    const cycleDuration = 60 / newHeartRate;
    this.scheduleNextBeat(cycleDuration);
    this.createAnimationTimeline(newHeartRate, 0);
  }

  private scheduleNextBeat(cycleDuration: number) {
    this.clearBeatInterval();
    this.beatInterval = window.setInterval(() => {
      if (!this.state.isBeating) return;
      this.killAnimationTimeline();
      this.createAnimationTimeline(this.state.currentHeartRate, 0);
    }, cycleDuration * 1000);
  }

  private performBeatCycle(heartRate: number) {
    const cycleDuration = 60 / heartRate;
    
    this.createAnimationTimeline(heartRate, 0);
    this.scheduleNextBeat(cycleDuration);
  }

  private createAnimationTimeline(heartRate: number, startTimeOffset: number) {
    const cycleDuration = 60 / heartRate;
    const halfCycle = cycleDuration * 0.5;
    
    this.killAnimationTimeline();
    this.animationTimeline = gsap.timeline();

    this.addBloodParticle('leftAtrium');
    this.addBloodParticle('rightAtrium');

    this.animateLeftVentricle(startTimeOffset, cycleDuration);
    this.animateRightVentricle(startTimeOffset + halfCycle, cycleDuration);
  }

  private animateLeftVentricle(startTime: number, totalDuration: number) {
    const phaseDuration = totalDuration * 0.25;

    this.animationTimeline?.call(() => {
      this.state.leftVentricle.phase = 'filling';
      this.state.leftVentricle.valveOpen = true;
      this.notify();
    }, null, startTime);

    this.animationTimeline?.to(this.state.leftVentricle, {
      pistonPosition: 1,
      pressure: 30,
      duration: phaseDuration,
      ease: 'power2.out',
      onUpdate: () => this.notify()
    }, startTime);

    this.animationTimeline?.call(() => {
      this.moveBloodFromAtriumToVentricle('left');
    }, null, startTime + phaseDuration * 0.7);

    this.animationTimeline?.call(() => {
      this.state.leftVentricle.phase = 'contracting';
      this.state.leftVentricle.valveOpen = false;
      this.notify();
    }, null, startTime + phaseDuration);

    this.animationTimeline?.to(this.state.leftVentricle, {
      pressure: 120,
      duration: phaseDuration * 0.4,
      ease: 'power2.in',
      onUpdate: () => this.notify()
    }, startTime + phaseDuration);

    this.animationTimeline?.call(() => {
      this.state.leftVentricle.phase = 'ejecting';
      this.notify();
      this.moveBloodFromVentricleToAorta('left');
    }, null, startTime + phaseDuration * 1.4);

    this.animationTimeline?.to(this.state.leftVentricle, {
      pistonPosition: 0,
      duration: phaseDuration * 0.8,
      ease: 'power2.in',
      onUpdate: () => this.notify()
    }, startTime + phaseDuration * 1.4);

    this.animationTimeline?.to(this.state.leftVentricle, {
      pressure: 30,
      duration: phaseDuration * 0.6,
      ease: 'power1.out',
      onUpdate: () => this.notify()
    }, startTime + phaseDuration * 1.6);

    this.animationTimeline?.call(() => {
      this.state.leftVentricle.phase = 'resting';
      this.notify();
    }, null, startTime + phaseDuration * 2);
  }

  private animateRightVentricle(startTime: number, totalDuration: number) {
    const phaseDuration = totalDuration * 0.25;

    this.animationTimeline?.call(() => {
      this.state.rightVentricle.phase = 'filling';
      this.state.rightVentricle.valveOpen = true;
      this.notify();
    }, null, startTime);

    this.animationTimeline?.to(this.state.rightVentricle, {
      pistonPosition: 1,
      pressure: 25,
      duration: phaseDuration,
      ease: 'power2.out',
      onUpdate: () => this.notify()
    }, startTime);

    this.animationTimeline?.call(() => {
      this.moveBloodFromAtriumToVentricle('right');
    }, null, startTime + phaseDuration * 0.7);

    this.animationTimeline?.call(() => {
      this.state.rightVentricle.phase = 'contracting';
      this.state.rightVentricle.valveOpen = false;
      this.notify();
    }, null, startTime + phaseDuration);

    this.animationTimeline?.to(this.state.rightVentricle, {
      pressure: 35,
      duration: phaseDuration * 0.4,
      ease: 'power2.in',
      onUpdate: () => this.notify()
    }, startTime + phaseDuration);

    this.animationTimeline?.call(() => {
      this.state.rightVentricle.phase = 'ejecting';
      this.notify();
      this.moveBloodFromVentricleToAorta('right');
    }, null, startTime + phaseDuration * 1.4);

    this.animationTimeline?.to(this.state.rightVentricle, {
      pistonPosition: 0,
      duration: phaseDuration * 0.8,
      ease: 'power2.in',
      onUpdate: () => this.notify()
    }, startTime + phaseDuration * 1.4);

    this.animationTimeline?.to(this.state.rightVentricle, {
      pressure: 25,
      duration: phaseDuration * 0.6,
      ease: 'power1.out',
      onUpdate: () => this.notify()
    }, startTime + phaseDuration * 1.6);

    this.animationTimeline?.call(() => {
      this.state.rightVentricle.phase = 'resting';
      this.notify();
    }, null, startTime + phaseDuration * 2);
  }

  private addBloodParticle(vessel: BloodVessel) {
    const particle: BloodParticle = {
      id: this.particleIdCounter++,
      position: 0,
      vessel
    };
    this.state.bloodParticles.push(particle);
    this.animateParticle(particle);
  }

  private moveBloodFromAtriumToVentricle(side: 'left' | 'right') {
    const atriumVessel = side === 'left' ? 'leftAtrium' : 'rightAtrium';
    const ventricleVessel = side === 'left' ? 'leftVentricle' : 'rightVentricle';
    
    const particlesToMove = this.state.bloodParticles.filter(
      p => p.vessel === atriumVessel && p.position > 0.6
    );
    
    particlesToMove.forEach(p => {
      p.vessel = ventricleVessel;
      p.position = 0;
      this.animateParticle(p);
    });
  }

  private moveBloodFromVentricleToAorta(side: 'left' | 'right') {
    const ventricleVessel = side === 'left' ? 'leftVentricle' : 'rightVentricle';
    const aortaVessel = side === 'left' ? 'aorta' : 'pulmonary';
    
    const particlesToMove = this.state.bloodParticles.filter(
      p => p.vessel === ventricleVessel && p.position > 0.5
    );
    
    particlesToMove.forEach(p => {
      p.vessel = aortaVessel;
      p.position = 0;
      this.animateParticle(p);
    });

    if (particlesToMove.length > 0) {
      setTimeout(() => {
        this.moveBloodToSystemic();
      }, 1500);
    }
  }

  private moveBloodToSystemic() {
    const particlesToMove = this.state.bloodParticles.filter(
      p => (p.vessel === 'aorta' || p.vessel === 'pulmonary') && p.position > 0.8
    );
    
    particlesToMove.forEach(p => {
      p.vessel = 'systemic';
      p.position = 0;
      this.animateParticle(p);
    });
  }

  private animateParticle(particle: BloodParticle) {
    gsap.to(particle, {
      position: 1,
      duration: 1.2,
      ease: 'power1.inOut',
      onUpdate: () => this.notify(),
      onComplete: () => {
        const index = this.state.bloodParticles.findIndex(p => p.id === particle.id);
        if (index > -1 && this.state.bloodParticles.length > 30) {
          this.state.bloodParticles.splice(index, 1);
        }
      }
    });
  }

  setAtriumPressure(pressure: number) {
    this.state.atriumPressure = pressure;
    this.notify();
  }

  cleanup() {
    this.stopBeating();
    this.listeners.clear();
  }
}

export const hydraulicSystem = new HydraulicSystem();
