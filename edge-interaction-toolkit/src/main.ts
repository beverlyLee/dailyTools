import { CanvasEditor, WakewordDetector } from './index';

document.addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById('editor-canvas') as HTMLCanvasElement;
  if (canvas) {
    const editor = new CanvasEditor(canvas);
    console.log('Canvas Editor initialized');
    
    (window as any).editor = editor;
  }
  
  const initWakewordButton = document.getElementById('init-wakeword');
  if (initWakewordButton) {
    initWakewordButton.addEventListener('click', async () => {
      try {
        const detector = new WakewordDetector();
        await detector.init();
        
        detector.onWakeword(() => {
          console.log('Wakeword detected!');
          alert('你好小明！唤醒词检测成功！');
        });
        
        await detector.start();
        console.log('Wakeword detector started');
        
        (window as any).detector = detector;
      } catch (error) {
        console.error('Failed to initialize wakeword detector:', error);
        alert('初始化唤醒词检测器失败，请确保已授权麦克风权限');
      }
    });
  }
});
