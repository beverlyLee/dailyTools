import { 
  init, 
  detect, 
  setOptions, 
  drawDetections,
  createDetector,
  createWorkerDetector,
  WorkerFaceDetector
} from '@edge-perception/face-detection';

class FaceDetectionDemo {
  constructor() {
    this.video = document.getElementById('video');
    this.canvas = document.getElementById('canvas');
    this.ctx = this.canvas.getContext('2d');
    this.statusEl = document.getElementById('status');
    this.startBtn = document.getElementById('startCamera');
    this.stopBtn = document.getElementById('stopCamera');
    this.detectOnceBtn = document.getElementById('detectOnce');
    this.useWorkerCheckbox = document.getElementById('useWorker');
    this.minFaceSizeInput = document.getElementById('minFaceSize');
    this.scoreThresholdInput = document.getElementById('scoreThreshold');
    this.enableLandmarksSelect = document.getElementById('enableLandmarks');
    
    this.detector = null;
    this.isRunning = false;
    this.animationId = null;
    this.lastFrameTime = 0;
    this.frameCount = 0;
    this.fps = 0;
    
    this.init();
  }

  async init() {
    try {
      this.setStatus('正在初始化人脸检测器...', 'loading');
      
      if (this.useWorkerCheckbox.checked) {
        this.detector = await createWorkerDetector({
          minFaceSize: 20,
          scaleFactor: 1.1,
          scoreThreshold: 0.7,
          enableLandmarks: 0,
        });
      } else {
        await init();
        this.detector = null;
        setOptions({
          minFaceSize: 20,
          scaleFactor: 1.1,
          scoreThreshold: 0.7,
          enableLandmarks: 0,
        });
      }
      
      this.setStatus('人脸检测器初始化完成', 'ready');
      this.bindEvents();
      
    } catch (error) {
      console.error('初始化失败:', error);
      this.setStatus(`初始化失败: ${error.message}`, 'error');
    }
  }

  bindEvents() {
    this.startBtn.addEventListener('click', () => this.startCamera());
    this.stopBtn.addEventListener('click', () => this.stopCamera());
    this.detectOnceBtn.addEventListener('click', () => this.detectOnce());
    
    this.minFaceSizeInput.addEventListener('input', (e) => {
      document.getElementById('minFaceSizeValue').textContent = e.target.value;
      this.updateOptions();
    });
    
    this.scoreThresholdInput.addEventListener('input', (e) => {
      document.getElementById('scoreThresholdValue').textContent = e.target.value;
      this.updateOptions();
    });
    
    this.enableLandmarksSelect.addEventListener('change', () => {
      this.updateOptions();
    });
  }

  updateOptions() {
    const options = {
      minFaceSize: parseInt(this.minFaceSizeInput.value),
      scoreThreshold: parseFloat(this.scoreThresholdInput.value),
      enableLandmarks: parseInt(this.enableLandmarksSelect.value) || null,
    };
    
    if (this.detector instanceof WorkerFaceDetector) {
      this.detector.setOptions(options);
    } else {
      setOptions(options);
    }
  }

  async startCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user',
        },
        audio: false,
      });
      
      this.video.srcObject = stream;
      await this.video.play();
      
      this.canvas.width = this.video.videoWidth;
      this.canvas.height = this.video.videoHeight;
      
      this.isRunning = true;
      this.startBtn.disabled = true;
      this.stopBtn.disabled = false;
      this.useWorkerCheckbox.disabled = true;
      
      this.detectLoop();
      
    } catch (error) {
      console.error('开启摄像头失败:', error);
      this.setStatus(`无法开启摄像头: ${error.message}`, 'error');
    }
  }

  stopCamera() {
    this.isRunning = false;
    
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
    
    if (this.video.srcObject) {
      this.video.srcObject.getTracks().forEach(track => track.stop());
      this.video.srcObject = null;
    }
    
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
    this.startBtn.disabled = false;
    this.stopBtn.disabled = true;
    this.useWorkerCheckbox.disabled = false;
    
    this.updateStats([], 0);
  }

  detectLoop() {
    if (!this.isRunning) return;
    
    const now = performance.now();
    this.frameCount++;
    
    if (now - this.lastFrameTime >= 1000) {
      this.fps = this.frameCount;
      this.frameCount = 0;
      this.lastFrameTime = now;
    }
    
    this.processFrame().then(() => {
      this.animationId = requestAnimationFrame(() => this.detectLoop());
    }).catch((error) => {
      console.error('检测失败:', error);
      this.animationId = requestAnimationFrame(() => this.detectLoop());
    });
  }

  async processFrame() {
    try {
      let detections;
      
      if (this.detector instanceof WorkerFaceDetector) {
        detections = await this.detector.detect(this.video);
      } else {
        detections = await detect(this.video);
      }
      
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      
      drawDetections(this.ctx, detections, {
        color: '#00ff00',
        lineWidth: 2,
        drawLandmarks: true,
      });
      
      this.updateStats(detections, this.fps);
      
    } catch (error) {
      console.error('处理帧失败:', error);
    }
  }

  async detectOnce() {
    try {
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = 640;
      tempCanvas.height = 480;
      const tempCtx = tempCanvas.getContext('2d');
      
      tempCtx.fillStyle = '#667eea';
      tempCtx.fillRect(0, 0, 640, 480);
      
      tempCtx.fillStyle = 'white';
      tempCtx.font = 'bold 32px sans-serif';
      tempCtx.textAlign = 'center';
      tempCtx.fillText('测试图像', 320, 200);
      
      tempCtx.fillStyle = '#ffcc00';
      tempCtx.beginPath();
      tempCtx.arc(320, 300, 80, 0, Math.PI * 2);
      tempCtx.fill();
      
      tempCtx.fillStyle = '#333';
      tempCtx.beginPath();
      tempCtx.arc(290, 280, 10, 0, Math.PI * 2);
      tempCtx.fill();
      tempCtx.beginPath();
      tempCtx.arc(350, 280, 10, 0, Math.PI * 2);
      tempCtx.fill();
      
      tempCtx.beginPath();
      tempCtx.arc(320, 320, 30, 0, Math.PI);
      tempCtx.stroke();
      
      let detections;
      
      if (this.detector instanceof WorkerFaceDetector) {
        detections = await this.detector.detect(tempCanvas);
      } else {
        detections = await detect(tempCanvas);
      }
      
      drawDetections(tempCtx, detections, {
        color: '#00ff00',
        lineWidth: 3,
        drawLandmarks: true,
      });
      
      this.ctx.drawImage(tempCanvas, 0, 0, this.canvas.width, this.canvas.height);
      this.updateStats(detections, 0);
      
    } catch (error) {
      console.error('单次检测失败:', error);
      this.setStatus(`检测失败: ${error.message}`, 'error');
    }
  }

  updateStats(detections, fps) {
    document.getElementById('faceCount').textContent = detections.length;
    document.getElementById('fps').textContent = fps;
    
    if (detections.length > 0) {
      const avgConfidence = detections.reduce((sum, d) => sum + d.bbox.confidence, 0) / detections.length;
      document.getElementById('avgConfidence').textContent = `${(avgConfidence * 100).toFixed(1)}%`;
    } else {
      document.getElementById('avgConfidence').textContent = '0%';
    }
  }

  setStatus(message, type) {
    this.statusEl.textContent = message;
    this.statusEl.className = `status ${type}`;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new FaceDetectionDemo();
});
