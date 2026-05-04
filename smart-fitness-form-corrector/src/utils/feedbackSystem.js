export class FeedbackSystem {
  constructor() {
    this.speechEnabled = true;
    this.synthesis = window.speechSynthesis;
    this.lastSpokenMessage = '';
    this.lastSpokenTime = 0;
    this.speechCooldown = 2000;
    this.feedbackQueue = [];
    this.uiElements = null;
  }

  init(uiElements) {
    this.uiElements = uiElements;
    
    if ('speechSynthesis' in window) {
      this.synthesis = window.speechSynthesis;
      this.speechEnabled = true;
      console.log('Web Speech API 可用');
    } else {
      this.speechEnabled = false;
      console.warn('Web Speech API 不可用');
    }
  }

  toggleSpeech() {
    this.speechEnabled = !this.speechEnabled;
    return this.speechEnabled;
  }

  speak(text, force = false) {
    if (!this.speechEnabled || !this.synthesis) return;

    const now = Date.now();
    
    if (!force && text === this.lastSpokenMessage && now - this.lastSpokenTime < this.speechCooldown) {
      return;
    }

    if (this.synthesis.speaking) {
      this.feedbackQueue.push(text);
      return;
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'zh-CN';
    utterance.rate = 0.9;
    utterance.pitch = 1;
    utterance.volume = 1;

    const voices = this.synthesis.getVoices();
    const chineseVoice = voices.find(voice => voice.lang.includes('zh'));
    if (chineseVoice) {
      utterance.voice = chineseVoice;
    }

    utterance.onend = () => {
      this.processQueue();
    };

    this.lastSpokenMessage = text;
    this.lastSpokenTime = now;
    this.synthesis.speak(utterance);
  }

  processQueue() {
    if (this.feedbackQueue.length > 0 && !this.synthesis.speaking) {
      const nextText = this.feedbackQueue.shift();
      this.speak(nextText, true);
    }
  }

  stopSpeaking() {
    if (this.synthesis) {
      this.synthesis.cancel();
    }
    this.feedbackQueue = [];
  }

  showFeedback(message, type = 'info') {
    if (!this.uiElements || !this.uiElements.feedbackText) return;

    const feedbackElement = this.uiElements.feedbackText;
    feedbackElement.textContent = message;
    feedbackElement.className = 'feedback-text';
    feedbackElement.classList.add(type);
  }

  updateAngleDisplay(angles) {
    if (!this.uiElements) return;

    const angleElements = {
      leftKnee: this.uiElements.leftKneeAngle,
      rightKnee: this.uiElements.rightKneeAngle,
      leftHip: this.uiElements.leftHipAngle,
      rightHip: this.uiElements.rightHipAngle,
      leftShoulder: this.uiElements.leftShoulderAngle,
      rightShoulder: this.uiElements.rightShoulderAngle
    };

    for (const [key, element] of Object.entries(angleElements)) {
      if (element && angles[key] !== null && angles[key] !== undefined) {
        element.textContent = `${angles[key]}°`;
        element.className = 'angle-value';
      } else if (element) {
        element.textContent = '--°';
        element.className = 'angle-value';
      }
    }
  }

  updateAngleDisplayWithStatus(angles, exercise) {
    if (!this.uiElements || !exercise) return;

    this.updateAngleDisplay(angles);

    const standards = exercise.standards;
    const currentPhase = this.detectCurrentPhase(angles, exercise);

    if (currentPhase && standards[currentPhase]) {
      const phaseStandards = standards[currentPhase].angles;
      this.highlightAngleStatus(phaseStandards, angles);
    }
  }

  detectCurrentPhase(angles, exercise) {
    if (!angles || !exercise) return null;

    const standards = exercise.standards;
    let bestPhase = null;
    let bestMatch = 0;

    for (const [phaseName, phaseData] of Object.entries(standards)) {
      let matchScore = 0;
      let checkedAngles = 0;

      for (const [angleName, angleRange] of Object.entries(phaseData.angles)) {
        const currentAngle = angles[angleName];
        if (currentAngle !== null) {
          checkedAngles++;
          if (currentAngle >= angleRange.min && currentAngle <= angleRange.max) {
            matchScore++;
          }
        }
      }

      if (checkedAngles > 0) {
        const matchPercent = matchScore / checkedAngles;
        if (matchPercent > bestMatch) {
          bestMatch = matchPercent;
          bestPhase = phaseName;
        }
      }
    }

    return bestMatch >= 0.5 ? bestPhase : null;
  }

  highlightAngleStatus(phaseStandards, angles) {
    const angleElementMap = {
      leftKnee: this.uiElements?.leftKneeAngle,
      rightKnee: this.uiElements?.rightKneeAngle,
      leftHip: this.uiElements?.leftHipAngle,
      rightHip: this.uiElements?.rightHipAngle,
      leftShoulder: this.uiElements?.leftShoulderAngle,
      rightShoulder: this.uiElements?.rightShoulderAngle
    };

    for (const [angleName, angleRange] of Object.entries(phaseStandards)) {
      const element = angleElementMap[angleName];
      const currentAngle = angles[angleName];

      if (element && currentAngle !== null) {
        element.className = 'angle-value';
        if (currentAngle >= angleRange.min && currentAngle <= angleRange.max) {
          element.classList.add('good');
        } else {
          const deviation = Math.abs(currentAngle - angleRange.ideal);
          if (deviation > 30) {
            element.classList.add('error');
          } else {
            element.classList.add('warning');
          }
        }
      }
    }
  }

  updateStatusDisplay(statusKey, statusValue) {
    if (!this.uiElements) return;

    const statusElements = {
      camera: this.uiElements.cameraStatus,
      model: this.uiElements.modelStatus,
      pose: this.uiElements.poseStatus
    };

    const element = statusElements[statusKey];
    if (element) {
      element.textContent = this.getStatusText(statusKey, statusValue);
      element.className = 'status';
      element.classList.add(statusValue);
    }
  }

  getStatusText(key, value) {
    const statusTexts = {
      camera: {
        online: '已连接',
        offline: '未连接',
        connecting: '连接中...'
      },
      model: {
        ready: '已就绪',
        loading: '加载中...',
        error: '加载失败'
      },
      pose: {
        good: '姿势标准',
        warning: '需要调整',
        error: '姿势错误',
        unknown: '未检测',
        'needs-improvement': '需要改进'
      }
    };

    return statusTexts[key]?.[value] || value;
  }

  updateStats(stats) {
    if (!this.uiElements) return;

    if (this.uiElements.correctCount) {
      this.uiElements.correctCount.textContent = stats.correctCount || 0;
    }
    if (this.uiElements.improveCount) {
      this.uiElements.improveCount.textContent = stats.improveCount || 0;
    }
    if (this.uiElements.sessionTime) {
      this.uiElements.sessionTime.textContent = this.formatTime(stats.sessionTime || 0);
    }
  }

  formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  provideFormFeedback(evaluationResult) {
    if (!evaluationResult) return;

    let feedbackMessage = '';
    let feedbackType = 'info';

    if (evaluationResult.mistakes && evaluationResult.mistakes.length > 0) {
      const worstMistake = evaluationResult.mistakes.reduce((worst, current) => {
        if (!worst) return current;
        const severityOrder = { error: 2, warning: 1 };
        return severityOrder[current.severity] > severityOrder[worst.severity] ? current : worst;
      }, null);

      if (worstMistake) {
        feedbackMessage = worstMistake.feedback;
        feedbackType = worstMistake.severity;
        this.speak(feedbackMessage);
      }
    } else if (evaluationResult.phaseFeedback) {
      feedbackMessage = evaluationResult.phaseFeedback;
      feedbackType = evaluationResult.status === 'good' ? 'good' : 'warning';
      
      if (evaluationResult.status === 'good') {
        this.speak('做得好！继续保持');
      }
    } else {
      feedbackMessage = '检测中...';
    }

    this.showFeedback(feedbackMessage, feedbackType);
  }

  clearFeedback() {
    this.showFeedback('等待开始检测...', 'info');
    this.stopSpeaking();
  }
}
