class SpeechRecognizer {
    constructor(options = {}) {
        this.recognition = null;
        this.isListening = false;
        this.language = options.language || 'zh-CN';
        this.continuous = options.continuous !== false;
        this.interimResults = options.interimResults !== false;
        
        this.recognitionTimeout = options.recognitionTimeout || 15000;
        this.silenceTimeout = options.silenceTimeout || 8000;
        this.recognitionTimer = null;
        this.silenceTimer = null;
        
        this.onStart = options.onStart || null;
        this.onEnd = options.onEnd || null;
        this.onError = options.onError || null;
        this.onResult = options.onResult || null;
        this.onTimeout = options.onTimeout || null;
        this.onAudioLevel = options.onAudioLevel || null;
        this.onDebug = options.onDebug || null;
        
        this.audioContext = null;
        this.analyser = null;
        this.mediaStream = null;
        this.audioLevelInterval = null;
        
        this.hasInitialized = false;
    }

    async init() {
        if (this.hasInitialized) return true;
        
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        
        if (!SpeechRecognition) {
            throw new Error('当前浏览器不支持 Web Speech API，请使用 Chrome 或 Edge 浏览器');
        }
        
        this.recognition = new SpeechRecognition();
        this.recognition.lang = this.language;
        this.recognition.continuous = this.continuous;
        this.recognition.interimResults = this.interimResults;
        
        this.recognition.onstart = () => this._onRecognitionStart();
        this.recognition.onend = () => this._onRecognitionEnd();
        this.recognition.onerror = (event) => this._onRecognitionError(event);
        this.recognition.onresult = (event) => this._onRecognitionResult(event);
        
        this.hasInitialized = true;
        this._debug('SpeechRecognizer initialized', {
            language: this.language,
            continuous: this.continuous,
            interimResults: this.interimResults
        });
        
        return true;
    }

    async start() {
        if (!this.hasInitialized) {
            await this.init();
        }
        
        if (this.isListening) {
            this._debug('Already listening, ignoring start request');
            return;
        }
        
        try {
            await this._requestMicrophoneAccess();
        } catch (error) {
            this._errorHandler('not-allowed');
            throw error;
        }
        
        try {
            this.recognition.start();
            this._startAudioLevelMonitoring();
            this._startTimers();
        } catch (error) {
            this._debug('Recognition start error', error);
            throw new Error('语音识别启动失败');
        }
    }

    async stop() {
        if (this.recognition && this.isListening) {
            try {
                this.recognition.stop();
            } catch (e) {
                this._debug('Stop error (may already be stopped)', e);
            }
        }
    }

    _onRecognitionStart() {
        this.isListening = true;
        this._debug('Recognition started');
        if (this.onStart) this.onStart();
    }

    _onRecognitionEnd() {
        this._stopTimers();
        this._stopAudioLevelMonitoring();
        
        if (this.isListening) {
            this.isListening = false;
            this._debug('Recognition ended');
            if (this.onEnd) this.onEnd();
        }
    }

    _onRecognitionError(event) {
        const error = event.error;
        this._debug('Recognition error', error);
        
        this._stopTimers();
        this._stopAudioLevelMonitoring();
        
        this.isListening = false;
        
        if (this.onError) this.onError(error);
    }

    _onRecognitionResult(event) {
        this._resetSilenceTimer();
        
        let finalTranscript = '';
        let interimTranscript = '';
        
        for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
                finalTranscript += transcript;
            } else {
                interimTranscript += transcript;
            }
        }
        
        this._debug('Recognition result', {
            final: finalTranscript,
            interim: interimTranscript,
            isFinal: !!finalTranscript
        });
        
        if (this.onResult) {
            this.onResult({
                final: finalTranscript,
                interim: interimTranscript,
                isFinal: !!finalTranscript
            });
        }
        
        if (finalTranscript && !this.continuous) {
            this.stop();
        }
    }

    async _requestMicrophoneAccess() {
        try {
            this.mediaStream = await navigator.mediaDevices.getUserMedia({ 
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true
                } 
            });
            
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            this.analyser = this.audioContext.createAnalyser();
            this.analyser.fftSize = 256;
            
            const source = this.audioContext.createMediaStreamSource(this.mediaStream);
            source.connect(this.analyser);
            
            this._debug('Microphone access granted');
            return true;
        } catch (error) {
            this._debug('Microphone access denied', error);
            throw new Error('麦克风权限被拒绝，请在浏览器设置中允许麦克风访问');
        }
    }

    _startAudioLevelMonitoring() {
        if (!this.analyser) return;
        
        const dataArray = new Uint8Array(this.analyser.frequencyBinCount);
        
        this.audioLevelInterval = setInterval(() => {
            this.analyser.getByteFrequencyData(dataArray);
            const sum = dataArray.reduce((a, b) => a + b, 0);
            const average = sum / dataArray.length;
            const level = Math.min(1, average / 128);
            
            if (this.onAudioLevel) {
                this.onAudioLevel(level);
            }
            
            if (level > 0.05) {
                this._resetSilenceTimer();
            }
        }, 100);
    }

    _stopAudioLevelMonitoring() {
        if (this.audioLevelInterval) {
            clearInterval(this.audioLevelInterval);
            this.audioLevelInterval = null;
        }
        
        if (this.mediaStream) {
            this.mediaStream.getTracks().forEach(track => track.stop());
            this.mediaStream = null;
        }
        
        if (this.audioContext) {
            if (this.audioContext.state !== 'closed') {
                this.audioContext.close().catch(() => {});
            }
            this.audioContext = null;
        }
    }

    _startTimers() {
        this._startRecognitionTimer();
        this._startSilenceTimer();
    }

    _stopTimers() {
        if (this.recognitionTimer) {
            clearTimeout(this.recognitionTimer);
            this.recognitionTimer = null;
        }
        
        if (this.silenceTimer) {
            clearTimeout(this.silenceTimer);
            this.silenceTimer = null;
        }
    }

    _startRecognitionTimer() {
        this.recognitionTimer = setTimeout(() => {
            this._debug('Recognition timeout');
            if (this.onTimeout) this.onTimeout('recognition');
            this.stop();
        }, this.recognitionTimeout);
    }

    _startSilenceTimer() {
        this.silenceTimer = setTimeout(() => {
            this._debug('Silence timeout');
            if (this.onTimeout) this.onTimeout('silence');
            this.stop();
        }, this.silenceTimeout);
    }

    _resetSilenceTimer() {
        if (this.silenceTimer) {
            clearTimeout(this.silenceTimer);
        }
        this._startSilenceTimer();
    }

    _errorHandler(error) {
        this._stopTimers();
        this._stopAudioLevelMonitoring();
        this.isListening = false;
        if (this.onError) this.onError(error);
    }

    _debug(message, data) {
        if (this.onDebug) {
            this.onDebug(message, data);
        }
    }

    static checkBrowserSupport() {
        return !!(window.SpeechRecognition || window.webkitSpeechRecognition);
    }

    static checkHTTPS() {
        const isLocalhost = window.location.hostname === 'localhost' || 
                           window.location.hostname === '127.0.0.1' ||
                           window.location.protocol === 'file:';
        const isHTTPS = window.location.protocol === 'https:';
        return isLocalhost || isHTTPS;
    }

    static checkMicrophoneSupport() {
        return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
    }

    static async checkNetwork() {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000);
            
            const response = await fetch('https://www.google.com/generate_204', {
                mode: 'no-cors',
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            return true;
        } catch (error) {
            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 5000);
                
                const response = await fetch('https://clients3.google.com/generate_204', {
                    mode: 'no-cors',
                    signal: controller.signal
                });
                
                clearTimeout(timeoutId);
                return true;
            } catch (e) {
                console.warn('Network check failed, but Chrome might still work locally');
                return true;
            }
        }
    }

    destroy() {
        this.stop();
        this.recognition = null;
        this.hasInitialized = false;
    }
}

export { SpeechRecognizer };
