import { FluidScene } from './fluids/FluidScene';

const canvas = document.getElementById('fluid-canvas') as HTMLCanvasElement;
if (!canvas) {
  throw new Error('Canvas element #fluid-canvas not found');
}

const fluidScene = new FluidScene(canvas);
fluidScene.start();

