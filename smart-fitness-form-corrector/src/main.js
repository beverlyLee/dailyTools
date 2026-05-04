import { PoseEstimator } from './utils/poseEstimator.js';
import { AngleCalculator, SymmetryChecker } from './utils/angleCalculator.js';
import { FormEvaluator, EXERCISE_LIBRARY } from './utils/exerciseLibrary.js';
import { FeedbackSystem } from './utils/feedbackSystem.js';
import { PoseRenderer } from './utils/poseRenderer.js';

class SmartFitnessApp {
  constructor() {
    this.poseEstimator = new PoseEstimator();
    this.angleCalculator = AngleCalculator;
    this.symmetryChecker = SymmetryChecker;
    this.formEvaluator = new FormEvaluator();
    this.feedbackSystem = new FeedbackSystem();
    this.poseRenderer = null;

    this.video = null;
    this.canvas = null;
    this.loadingOverlay = null;

    this.isRunning = false;
    this.animationFrameId = null;
    this.currentExercise = 'squat';

    this.stats = {
      correctCount: 0,
      improveCount: 0,
      sessionTime: 0
    };

    this.sessionStartTime = null;
    this.lastEvaluationTime = 0;
    this.evaluationCooldown = 500;

    this.uiElements = {};
  }

  async init() {
    this.cacheDOMElements();
    this.bindEvents();
    this.initFeedbackSystem();

    try {
      this.updateStatus('model', 'loading');
      await this.poseEstimator.init();
      this.updateStatus('model', 'ready');
      this.hideLoadingOverlay();
      console.log('模型加载成功');
    } catch (error) {
      console.error('模型加载失败:', error);
      this.updateStatus('model', 'error');
      this.feedbackSystem.showFeedback('模型加载失败，请刷新页面重试', 'error');
    }

    this.formEvaluator.setExercise(this.currentExercise);
  }

  cacheDOMElements() {
    this.video = document.getElementById('video');
    this.canvas = document.getElementById('canvas');
    this.loadingOverlay = document.getElementById('loadingOverlay');

    this.uiElements = {
      exerciseSelect: document.getElementById('exerciseSelect'),
      startBtn: document.getElementById('startBtn'),
      stopBtn: document.getElementById('stopBtn'),
      toggleFeedback: document.getElementById('toggleFeedback'),
      feedbackText: document.getElementById('feedbackText'),
      leftKneeAngle: document.getElementById('leftKneeAngle'),
      rightKneeAngle: document.getElementById('rightKneeAngle'),
      leftHipAngle: document.getElementById('leftHipAngle'),
      rightHipAngle: document.getElementById('rightHipAngle'),
      leftShoulderAngle: document.getElementById('leftShoulderAngle'),
      rightShoulderAngle: document.getElementById('rightShoulderAngle'),
      cameraStatus: document.getElementById('cameraStatus'),
      modelStatus: document.getElementById('modelStatus'),
      poseStatus: document.getElementById('poseStatus'),
      correctCount: document.getElementById('correctCount'),
      improveCount: document.getElementById('improveCount'),
      sessionTime: document.getElementById('sessionTime')
    };

    this.poseRenderer = new PoseRenderer(this.canvas);
  }

  bindEvents() {
    this.uiElements.exerciseSelect.addEventListener('change', (e) => {
      this.currentExercise = e.target.value;
      this.formEvaluator.setExercise(this.currentExercise);
      this.feedbackSystem.showFeedback(`已切换到: ${EXERCISE_LIBRARY[this.currentExercise].name}`, 'info');
    });

    this.uiElements.startBtn.addEventListener('click', () => this.startCamera());
    this.uiElements.stopBtn.addEventListener('click', () => this.stopCamera());
    this.uiElements.toggleFeedback.addEventListener('click', () => this.toggleSpeechFeedback());

    window.addEventListener('resize', () => {
      if (this.video.videoWidth > 0) {
        this.poseRenderer.setVideoSize(this.video.videoWidth, this.video.videoHeight);
      }
    });
  }

  initFeedbackSystem() {
    this.feedbackSystem.init(this.uiElements);
  }

  async startCamera() {
    try {
      this.updateStatus('camera', 'connecting');
      
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user'
        },
        audio: false
      });

      this.video.srcObject = stream;
      
      this.video.onloadedmetadata = () => {
        this.video.play();
        this.poseRenderer.setVideoSize(this.video.videoWidth, this.video.videoHeight);
        this.updateStatus('camera', 'online');
        this.isRunning = true;
        this.sessionStartTime = Date.now();
        this.stats.sessionTime = 0;
        this.startPoseDetection();
        this.updateUIState(true);
      };

    } catch (error) {
      console.error('无法访问摄像头:', error);
      this.updateStatus('camera', 'offline');
      this.feedbackSystem.showFeedback('无法访问摄像头，请确保已授予权限', 'error');
    }
  }

  stopCamera() {
    this.isRunning = false;

    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    if (this.video.srcObject) {
      const stream = this.video.srcObject;
      const tracks = stream.getTracks();
      tracks.forEach(track => track.stop());
      this.video.srcObject = null;
    }

    this.poseRenderer.clear();
    this.feedbackSystem.clearFeedback();
    this.updateStatus('camera', 'offline');
    this.updateStatus('pose', 'unknown');
    this.updateUIState(false);
    this.feedbackSystem.stopSpeaking();
  }

  startPoseDetection() {
    const detect = async () => {
      if (!this.isRunning) return;

      try {
        const pose = await this.poseEstimator.estimatePose(this.video);
        
        if (pose) {
          const angles = this.angleCalculator.calculateAllAngles(pose.keypoints);
          
          const now = Date.now();
          let evaluationResult = null;
          
          if (now - this.lastEvaluationTime > this.evaluationCooldown) {
            evaluationResult = this.formEvaluator.evaluate(pose.keypoints, angles);
            this.lastEvaluationTime = now;
            
            this.processEvaluationResult(evaluationResult);
          }

          this.feedbackSystem.updateAngleDisplayWithStatus(
            angles, 
            EXERCISE_LIBRARY[this.currentExercise]
          );

          this.poseRenderer.drawPose(pose, evaluationResult);
          this.poseRenderer.drawAngleLabels(angles, pose.keypoints);

          this.updateSessionTime();
        } else {
          this.poseRenderer.drawNoPoseMessage();
          this.updateStatus('pose', 'unknown');
        }

      } catch (error) {
        console.error('姿态检测出错:', error);
      }

      this.animationFrameId = requestAnimationFrame(detect);
    };

    detect();
  }

  processEvaluationResult(result) {
    if (!result) return;

    let poseStatus = 'unknown';
    if (result.status === 'good') {
      poseStatus = 'good';
    } else if (result.status === 'warning') {
      poseStatus = 'needs-improvement';
    } else if (result.status === 'error') {
      poseStatus = 'needs-improvement';
    }

    this.updateStatus('pose', poseStatus);
    this.feedbackSystem.provideFormFeedback(result);

    if (result.mistakes && result.mistakes.length > 0) {
      this.stats.improveCount++;
    } else if (result.status === 'good') {
      this.stats.correctCount++;
    }

    this.feedbackSystem.updateStats(this.stats);
  }

  updateSessionTime() {
    if (this.sessionStartTime) {
      const elapsed = Math.floor((Date.now() - this.sessionStartTime) / 1000);
      this.stats.sessionTime = elapsed;
      this.feedbackSystem.updateStats(this.stats);
    }
  }

  updateStatus(type, value) {
    this.feedbackSystem.updateStatusDisplay(type, value);
  }

  updateUIState(isRunning) {
    this.uiElements.startBtn.disabled = isRunning;
    this.uiElements.stopBtn.disabled = !isRunning;
    this.uiElements.exerciseSelect.disabled = isRunning;
  }

  toggleSpeechFeedback() {
    const isEnabled = this.feedbackSystem.toggleSpeech();
    this.uiElements.toggleFeedback.textContent = `🔊 语音反馈: ${isEnabled ? '开启' : '关闭'}`;
    this.uiElements.toggleFeedback.classList.toggle('btn-primary', isEnabled);
    this.uiElements.toggleFeedback.classList.toggle('btn-secondary', !isEnabled);
  }

  hideLoadingOverlay() {
    if (this.loadingOverlay) {
      this.loadingOverlay.classList.add('hidden');
    }
  }

  showLoadingOverlay() {
    if (this.loadingOverlay) {
      this.loadingOverlay.classList.remove('hidden');
    }
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  const app = new SmartFitnessApp();
  await app.init();
});
