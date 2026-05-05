import { 
  init, 
  createVoiceWakeupDetector,
  VoiceWakeupDetector,
  RingBuffer
} from '@edge-perception/voice-wakeup';

class VoiceWakeupDemo {
  constructor() {
    this.statusEl = document.getElementById('status');
    this.startBtn = document.getElementById('startListening');
    this.stopBtn = document.getElementById('stopListening');
    this.clearHistoryBtn = document.getElementById('clearHistory');
    this.wakeWordInput = document.getElementById('wakeWord');
    this.detectionThresholdInput = document.getElementById('detectionThreshold');
    this.vadAggressivenessSelect = document.getElementById('vadAggressiveness');
    this.vadLight = document.getElementById('vadLight');
    this.vadStatus = document.getElementById('vadStatus');
    this.energyFill = document.getElementById('energyFill');
    this.historyContainer = document.getElementById('wakeupHistory');
    this.detectionAnimation = document.getElementById('detectionAnimation');
    this.detectionInfo = document.getElementById('detectionInfo');
    this.visualizerCanvas = document.getElementById('visualizerCanvas');
    this.visualizerCtx = this.visualizerCanvas.getContext('2d');
    
    this.detector = null;
    this.isListening = false;
    this.audioContext = null;
    this.mediaStream = null;
    this.analyser = null;
    this.scriptProcessor = null;
    this.animationId = null;
    
    this.detectionHistory = [];
    this.detectionCount = 0;
    this.totalConfidence = 0;
    this.listeningStartTime = 0;
    this.lastEnergy = 0;
    
    this.init();
  }

  async init() {
    try {
      this.setStatus('正在初始化语音检测器...', 'loading');
      
      await init();
      
      this.detector = await createVoiceWakeupDetector({
        wakeWordConfig: {
          wakeWord: this.wakeWordInput.value,
          threshold: parseFloat(this.detectionThresholdInput.value),
        },
        vadConfig: {
          aggressiveness: parseInt(this.vadAggressivenessSelect.value),
        },
      });
      
      this.detector.onWakeup((result) => this.handleWakeup(result));
      this.detector.onVADResult((result) => this.handleVADResult(result));
      
      this.setStatus('语音检测器初始化完成', 'ready');
      this.bindEvents();
      this.initVisualizer();
      
    } catch (error) {
      console.error('初始化失败:', error);
      this.setStatus(`初始化失败: ${error.message}`, 'error');
    }
  }

  bindEvents() {
    this.startBtn.addEventListener('click', () => this.startListening());
    this.stopBtn.addEventListener('click', () => this.stopListening());
    this.clearHistoryBtn.addEventListener('click', () => this.clearHistory());
    
    this.wakeWordInput.addEventListener('change', () => {
      if (this.detector) {
        this.detector.setWakeWord(this.wakeWordInput.value);
      }
    });
    
    this.detectionThresholdInput.addEventListener('input', (e) => {
      document.getElementById('detectionThresholdValue').textContent = e.target.value;
      if (this.detector) {
        this.detector.setThreshold(parseFloat(e.target.value));
      }
    });
    
    this.vadAggressivenessSelect.addEventListener('change', (e) => {
      if (this.detector) {
        this.detector.setVADAggressiveness(parseInt(e.target.value));
      }
    });
  }

  initVisualizer() {
    const container = this.visualizerCanvas.parentElement;
    this.visualizerCanvas.width = container.offsetWidth;
    this.visualizerCanvas.height = container.offsetHeight;
  }

  async startListening() {
    try {
      this.setStatus('正在请求麦克风权限...', 'loading');
      
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 16000,
          channelCount: 1,
        },
        video: false,
      });
      
      this.mediaStream = stream;
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)({
        sampleRate: 16000,
      });
      
      const source = this.audioContext.createMediaStreamSource(stream);
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 256;
      
      const bufferSize = 2048;
      this.scriptProcessor = this.audioContext.createScriptProcessor(bufferSize, 1, 1);
      
      source.connect(this.analyser);
      this.analyser.connect(this.scriptProcessor);
      this.scriptProcessor.connect(this.audioContext.destination);
      
      this.scriptProcessor.onaudioprocess = (e) => {
        const inputData = e.inputBuffer.getChannelData(0);
        
        if (this.detector && this.isListening) {
          this.detector.processAudio(inputData);
        }
        
        const energy = this.calculateEnergy(inputData);
        this.updateEnergy(energy);
      };
      
      this.isListening = true;
      this.listeningStartTime = performance.now();
      this.startBtn.disabled = true;
      this.stopBtn.disabled = false;
      this.setStatus('正在监听... 请说 "你好小明"', 'listening');
      
      this.startVisualizer();
      this.startTimer();
      
    } catch (error) {
      console.error('开启麦克风失败:', error);
      this.setStatus(`无法开启麦克风: ${error.message}`, 'error');
    }
  }

  stopListening() {
    this.isListening = false;
    
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
    
    if (this.scriptProcessor) {
      this.scriptProcessor.disconnect();
      this.scriptProcessor = null;
    }
    
    if (this.analyser) {
      this.analyser.disconnect();
      this.analyser = null;
    }
    
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
      this.mediaStream = null;
    }
    
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    
    this.startBtn.disabled = false;
    this.stopBtn.disabled = true;
    this.setStatus('语音检测器初始化完成', 'ready');
    
    this.visualizerCtx.clearRect(0, 0, this.visualizerCanvas.width, this.visualizerCanvas.height);
    this.vadLight.classList.remove('active');
    this.vadStatus.textContent = '未检测到语音';
    this.energyFill.style.width = '0%';
  }

  calculateEnergy(samples) {
    let sum = 0;
    for (let i = 0; i < samples.length; i++) {
      sum += samples[i] * samples[i];
    }
    return Math.sqrt(sum / samples.length);
  }

  updateEnergy(energy) {
    this.lastEnergy = energy;
    const percent = Math.min(100, energy * 200);
    this.energyFill.style.width = `${percent}%`;
  }

  handleWakeup(result) {
    console.log('检测到唤醒词:', result);
    
    this.detectionCount++;
    this.totalConfidence += result.confidence;
    
    this.detectionInfo.textContent = `检测到 "${result.wakeWord || this.wakeWordInput.value}" (置信度: ${(result.confidence * 100).toFixed(1)}%)`;
    this.detectionAnimation.classList.add('active');
    
    setTimeout(() => {
      this.detectionAnimation.classList.remove('active');
    }, 2000);
    
    this.addToHistory(result);
    this.updateStats();
  }

  handleVADResult(result) {
    if (result.isSpeech) {
      this.vadLight.classList.add('active');
      this.vadStatus.textContent = '检测到语音';
    } else {
      this.vadLight.classList.remove('active');
      this.vadStatus.textContent = '未检测到语音';
    }
  }

  addToHistory(result) {
    const now = new Date();
    const timeStr = now.toLocaleTimeString('zh-CN');
    
    const historyItem = {
      time: timeStr,
      confidence: result.confidence,
      wakeWord: result.wakeWord || this.wakeWordInput.value,
    };
    
    this.detectionHistory.unshift(historyItem);
    if (this.detectionHistory.length > 20) {
      this.detectionHistory.pop();
    }
    
    this.renderHistory();
  }

  renderHistory() {
    if (this.detectionHistory.length === 0) {
      this.historyContainer.innerHTML = '<p style="color: #999; text-align: center; padding: 20px;">暂无检测记录</p>';
      return;
    }
    
    this.historyContainer.innerHTML = this.detectionHistory.map(item => `
      <div class="wakeup-item">
        <span class="wakeup-time">${item.time} - "${item.wakeWord}"</span>
        <span class="wakeup-confidence">${(item.confidence * 100).toFixed(1)}%</span>
      </div>
    `).join('');
  }

  clearHistory() {
    this.detectionHistory = [];
    this.detectionCount = 0;
    this.totalConfidence = 0;
    this.renderHistory();
    this.updateStats();
  }

  updateStats() {
    document.getElementById('detectionCount').textContent = this.detectionCount;
    
    if (this.detectionCount > 0) {
      const avg = this.totalConfidence / this.detectionCount;
      document.getElementById('avgConfidence').textContent = `${(avg * 100).toFixed(1)}%`;
    } else {
      document.getElementById('avgConfidence').textContent = '0%';
    }
  }

  startVisualizer() {
    const draw = () => {
      if (!this.isListening) return;
      
      this.animationId = requestAnimationFrame(draw);
      
      if (!this.analyser) return;
      
      const bufferLength = this.analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      this.analyser.getByteFrequencyData(dataArray);
      
      const width = this.visualizerCanvas.width;
      const height = this.visualizerCanvas.height;
      
      this.visualizerCtx.clearRect(0, 0, width, height);
      
      const barWidth = (width / bufferLength) * 2.5;
      let barHeight;
      let x = 0;
      
      for (let i = 0; i < bufferLength; i++) {
        barHeight = (dataArray[i] / 255) * height;
        
        const gradient = this.visualizerCtx.createLinearGradient(0, height - barHeight, 0, height);
        gradient.addColorStop(0, '#f093fb');
        gradient.addColorStop(1, '#f5576c');
        
        this.visualizerCtx.fillStyle = gradient;
        this.visualizerCtx.fillRect(x, height - barHeight, barWidth - 1, barHeight);
        
        x += barWidth;
      }
    };
    
    draw();
  }

  startTimer() {
    const updateTime = () => {
      if (!this.isListening) return;
      
      const elapsed = Math.floor((performance.now() - this.listeningStartTime) / 1000);
      document.getElementById('listeningTime').textContent = `${elapsed}s`;
      
      setTimeout(updateTime, 1000);
    };
    
    updateTime();
  }

  setStatus(message, type) {
    this.statusEl.textContent = message;
    this.statusEl.className = `status ${type}`;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new VoiceWakeupDemo();
});
