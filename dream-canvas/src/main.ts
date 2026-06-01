import { DreamScene } from './canvas/DreamScene';

const container = document.getElementById('app') as HTMLElement;
const scene = new DreamScene(container);
scene.start();

const handleResize = () => scene.resize();
window.addEventListener('resize', handleResize);

const handleMouseMove = (e: MouseEvent) => scene.onMouseMove(e);
window.addEventListener('mousemove', handleMouseMove);
