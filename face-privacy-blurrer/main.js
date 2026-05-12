import { FaceDetector } from './FaceDetector.js';
import { DynamicBlur } from './DynamicBlur.js';
import { FrameBuffer } from './FrameBuffer.js';

class App {
    constructor() {
        this.elements = {};
        
        this.faceDetector = null;
        this.dynamicBlur = new DynamicBlur();
        this.frameBuffer = new FrameBuffer({
            maxFrames: 5,
            smoothingFactor: 0.4,
            trackTimeout: 800
        });
        
        this.isRunning = false;
        this.isDetecting = false;
        this.videoStream = null;
        this.animationFrameId = null;
        this.detectionTimeout = null;
        
        this.fps = 0;
        this.frameCount = 0;
        this.lastFpsUpdate = performance.now();
        this.lastDetections = [];
        
        this.lastFrameTime = 0;
        this.minDetectionInterval = 50;
        
        this.options = {
            blurMode: 'pixelate',
            blurStrength: 25,
            padding: 0.3,
            confidence: 0.5,
            showDetections: true
        };
        
        this.init();
    }

    async init() {
        console.log('[App] 开始初始化...');
        this.cacheElements();
        this.bindEvents();
        this.initFaceDetector();
        console.log('[App] 初始化完成');
    }

    cacheElements() {
        this.elements = {
            startCameraBtn: document.getElementById('startCameraBtn'),
            startScreenBtn: document.getElementById('startScreenBtn'),
            loadVideoBtn: document.getElementById('loadVideoBtn'),
            videoFileInput: document.getElementById('videoFileInput'),
            stopBtn: document.getElementById('stopBtn'),
            
            blurMode: document.getElementById('blurMode'),
            blurStrength: document.getElementById('blurStrength'),
            blurStrengthValue: document.getElementById('blurStrengthValue'),
            padding: document.getElementById('padding'),
            paddingValue: document.getElementById('paddingValue'),
            confidence: document.getElementById('confidence'),
            confidenceValue: document.getElementById('confidenceValue'),
            showDetections: document.getElementById('showDetections'),
            
            statusText: document.getElementById('statusText'),
            modelStatus: document.getElementById('modelStatus'),
            faceCount: document.getElementById('faceCount'),
            fpsDisplay: document.getElementById('fpsDisplay'),
            
            placeholderView: document.getElementById('placeholderView'),
            videoContainer: document.getElementById('videoContainer'),
            sourceVideo: document.getElementById('sourceVideo'),
            outputCanvas: document.getElementById('outputCanvas')
        };
        
        console.log('[App] 元素缓存完成:', Object.keys(this.elements).length, '个元素');
    }

    bindEvents() {
        if (this.elements.startCameraBtn) {
            this.elements.startCameraBtn.addEventListener('click', (e) => {
                console.log('[App] 点击开启摄像头按钮');
                e.preventDefault();
                this.startCamera();
            });
        }
        
        if (this.elements.startScreenBtn) {
            this.elements.startScreenBtn.addEventListener('click', (e) => {
                console.log('[App] 点击屏幕录制按钮');
                e.preventDefault();
                this.startScreenCapture();
            });
        }
        
        if (this.elements.loadVideoBtn && this.elements.videoFileInput) {
            this.elements.loadVideoBtn.addEventListener('click', (e) => {
                console.log('[App] 点击加载视频按钮');
                e.preventDefault();
                this.elements.videoFileInput.click();
            });
            this.elements.videoFileInput.addEventListener('change', (e) => this.loadVideoFile(e));
        }
        
        if (this.elements.stopBtn) {
            this.elements.stopBtn.addEventListener('click', (e) => {
                console.log('[App] 点击停止按钮');
                e.preventDefault();
                this.stop();
            });
        }
        
        if (this.elements.blurMode) {
            this.elements.blurMode.addEventListener('change', (e) => {
                this.options.blurMode = e.target.value;
                this.dynamicBlur.setMode(this.options.blurMode);
            });
        }
        
        if (this.elements.blurStrength) {
            this.elements.blurStrength.addEventListener('input', (e) => {
                if (this.elements.blurStrengthValue) {
                    this.elements.blurStrengthValue.textContent = e.target.value;
                }
                this.options.blurStrength = parseInt(e.target.value);
                this.dynamicBlur.setStrength(this.options.blurStrength);
            });
        }
        
        if (this.elements.padding) {
            this.elements.padding.addEventListener('input', (e) => {
                if (this.elements.paddingValue) {
                    this.elements.paddingValue.textContent = e.target.value;
                }
                this.options.padding = parseInt(e.target.value) / 100;
                this.dynamicBlur.setPadding(this.options.padding);
            });
        }
        
        if (this.elements.confidence) {
            this.elements.confidence.addEventListener('input', (e) => {
                if (this.elements.confidenceValue) {
                    this.elements.confidenceValue.textContent = e.target.value;
                }
                this.options.confidence = parseFloat(e.target.value);
                if (this.faceDetector) {
                    this.faceDetector.updateConfidence(this.options.confidence);
                }
            });
        }
        
        if (this.elements.showDetections) {
            this.elements.showDetections.addEventListener('change', (e) => {
                this.options.showDetections = e.target.checked;
            });
        }
        
        console.log('[App] 事件绑定完成');
    }

    initFaceDetector() {
        console.log('[App] 初始化人脸检测器...');
        this.updateModelStatus('加载中...', 'loading');
        
        this.faceDetector = new FaceDetector({
            minDetectionConfidence: this.options.confidence,
            modelSelection: 0,
            maxInputSize: 640,
            onReady: () => {
                console.log('[App] FaceDetector 就绪回调触发');
                this.updateModelStatus('已就绪', 'ready');
            },
            onError: (error) => {
                console.error('[App] FaceDetector 错误:', error);
                this.updateModelStatus('加载失败', 'error');
            }
        });
    }

    async startCamera() {
        console.log('[App] 启动摄像头...');
        
        try {
            this.updateStatus('正在请求摄像头权限...', 'loading');
            
            this.videoStream = await navigator.mediaDevices.getUserMedia({
                video: { 
                    width: { ideal: 640 },
                    height: { ideal: 480 },
                    facingMode: 'user'
                },
                audio: false
            });
            
            console.log('[App] 摄像头权限获取成功');
            await this.startVideoStream('摄像头');
            
        } catch (error) {
            console.error('[App] 摄像头启动失败:', error);
            this.updateStatus('摄像头访问失败', 'error');
            alert('无法访问摄像头：' + error.message);
        }
    }

    async startScreenCapture() {
        console.log('[App] 启动屏幕录制...');
        
        try {
            this.updateStatus('正在请求屏幕录制权限...', 'loading');
            this.videoStream = await navigator.mediaDevices.getDisplayMedia({
                video: {
                    cursor: 'always'
                },
                audio: false
            });
            
            console.log('[App] 屏幕共享权限获取成功');
            await this.startVideoStream('屏幕录制');
            
        } catch (error) {
            if (error.name === 'NotAllowedError') {
                this.updateStatus('用户取消了屏幕共享', 'idle');
            } else {
                console.error('[App] 屏幕录制失败:', error);
                this.updateStatus('屏幕录制失败', 'error');
                alert('无法开始屏幕录制：' + error.message);
            }
        }
    }

    async loadVideoFile(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        console.log('[App] 加载视频文件:', file.name);
        
        try {
            this.updateStatus('正在加载视频文件...', 'loading');
            
            const url = URL.createObjectURL(file);
            this.elements.sourceVideo.src = url;
            
            await new Promise((resolve, reject) => {
                const timeout = setTimeout(() => reject(new Error('视频元数据加载超时')), 10000);
                this.elements.sourceVideo.onloadedmetadata = () => {
                    clearTimeout(timeout);
                    resolve();
                };
                this.elements.sourceVideo.onerror = () => {
                    clearTimeout(timeout);
                    reject(new Error('视频文件加载失败'));
                };
            });
            
            console.log('[App] 视频元数据就绪');
            this.showVideoContainer();
            this.setupCanvas();
            
            await this.elements.sourceVideo.play();
            
            this.isRunning = true;
            this.frameBuffer.reset();
            this.updateStatus('视频播放中', 'running');
            this.showStopButton();
            
            this.scheduleNextDetection();
            this.startRenderLoop();
            
        } catch (error) {
            console.error('[App] 视频加载失败:', error);
            this.updateStatus('视频加载失败', 'error');
            alert('无法加载视频文件：' + error.message);
        }
    }

    async startVideoStream(sourceName) {
        const video = this.elements.sourceVideo;
        video.srcObject = this.videoStream;
        
        console.log('[App] 等待视频元数据...');
        
        await new Promise((resolve) => {
            const checkMetadata = setInterval(() => {
                if (video.videoWidth && video.videoHeight) {
                    clearInterval(checkMetadata);
                    resolve();
                }
            }, 100);
            
            video.onloadedmetadata = () => {
                clearInterval(checkMetadata);
                resolve();
            };
            
            setTimeout(() => {
                clearInterval(checkMetadata);
                resolve();
            }, 5000);
        });
        
        console.log('[App] 视频元数据就绪:', video.videoWidth, 'x', video.videoHeight);
        
        this.showVideoContainer();
        this.setupCanvas();
        
        await video.play();
        
        console.log('[App] 视频播放开始');
        
        this.isRunning = true;
        this.frameBuffer.reset();
        this.lastDetections = [];
        this.lastFrameTime = 0;
        
        this.updateStatus(`${sourceName}运行中`, 'running');
        this.showStopButton();
        
        this.scheduleNextDetection();
        this.startRenderLoop();
    }

    showVideoContainer() {
        if (this.elements.placeholderView) {
            this.elements.placeholderView.style.display = 'none';
        }
        if (this.elements.videoContainer) {
            this.elements.videoContainer.style.display = 'flex';
        }
    }

    hideVideoContainer() {
        if (this.elements.placeholderView) {
            this.elements.placeholderView.style.display = 'flex';
        }
        if (this.elements.videoContainer) {
            this.elements.videoContainer.style.display = 'none';
        }
    }

    setupCanvas() {
        const video = this.elements.sourceVideo;
        const canvas = this.elements.outputCanvas;
        
        const maxWidth = 960;
        const maxHeight = 720;
        
        let width = video.videoWidth || 640;
        let height = video.videoHeight || 480;
        
        const scaleX = maxWidth / width;
        const scaleY = maxHeight / height;
        const scale = Math.min(scaleX, scaleY, 1);
        
        width = Math.floor(width * scale);
        height = Math.floor(height * scale);
        
        canvas.width = width;
        canvas.height = height;
        
        console.log('[App] Canvas尺寸:', width, 'x', height);
    }

    scheduleNextDetection() {
        if (!this.isRunning) return;
        
        this.detectionTimeout = setTimeout(() => {
            this.runDetection();
        }, this.minDetectionInterval);
    }

    cancelDetection() {
        if (this.detectionTimeout) {
            clearTimeout(this.detectionTimeout);
            this.detectionTimeout = null;
        }
    }

    async runDetection() {
        if (!this.isRunning) {
            console.log('[App] 检测未运行，跳过');
            return;
        }
        
        const video = this.elements.sourceVideo;
        
        if (!video || !video.videoWidth || !video.videoHeight) {
            this.scheduleNextDetection();
            return;
        }
        
        if (video.paused || video.ended) {
            this.scheduleNextDetection();
            return;
        }
        
        if (!this.faceDetector || !this.faceDetector.isReady) {
            this.scheduleNextDetection();
            return;
        }
        
        if (this.isDetecting) {
            this.scheduleNextDetection();
            return;
        }
        
        this.isDetecting = true;
        
        try {
            const detections = await this.faceDetector.detect(video);
            
            console.log('[App] 原始检测结果:', detections.length, '个');
            
            this.lastDetections = this.frameBuffer.process(detections);
            console.log('[App] 平滑后检测结果:', this.lastDetections.length, '个');
            
            if (this.elements.faceCount) {
                this.elements.faceCount.textContent = this.lastDetections.length;
            }
            
        } catch (error) {
            console.error('[App] 检测失败:', error);
        } finally {
            this.isDetecting = false;
            this.scheduleNextDetection();
        }
    }

    startRenderLoop() {
        const render = () => {
            if (!this.isRunning) return;
            
            this.renderFrame();
            
            this.frameCount++;
            const now = performance.now();
            if (now - this.lastFpsUpdate >= 1000) {
                this.fps = Math.round(this.frameCount * 1000 / (now - this.lastFpsUpdate));
                if (this.elements.fpsDisplay) {
                    this.elements.fpsDisplay.textContent = this.fps;
                }
                this.frameCount = 0;
                this.lastFpsUpdate = now;
            }
            
            this.animationFrameId = requestAnimationFrame(render);
        };
        
        this.animationFrameId = requestAnimationFrame(render);
        console.log('[App] 渲染循环启动');
    }

    stopRenderLoop() {
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }
    }

    renderFrame() {
        const video = this.elements.sourceVideo;
        const canvas = this.elements.outputCanvas;
        
        if (!video || !canvas) return;
        
        const ctx = canvas.getContext('2d');
        
        if (video.paused || video.ended) {
            if (video.srcObject && video.ended) {
                this.stop();
            }
            return;
        }
        
        if (!video.videoWidth || !video.videoHeight) {
            return;
        }
        
        this.dynamicBlur.apply(
            ctx,
            video,
            this.lastDetections,
            canvas.width,
            canvas.height
        );
        
        if (this.options.showDetections && this.lastDetections.length > 0) {
            this.drawDetectionBoxes(ctx, this.lastDetections, canvas.width, canvas.height);
        }
    }

    drawDetectionBoxes(ctx, detections, canvasWidth, canvasHeight) {
        detections.forEach((det, index) => {
            const x = det.x * canvasWidth;
            const y = det.y * canvasHeight;
            const width = det.width * canvasWidth;
            const height = det.height * canvasHeight;
            
            ctx.save();
            ctx.strokeStyle = 'rgba(0, 255, 0, 0.8)';
            ctx.lineWidth = 2;
            ctx.strokeRect(x, y, width, height);
            
            ctx.fillStyle = 'rgba(0, 255, 0, 0.1)';
            ctx.fillRect(x, y, width, height);
            
            ctx.fillStyle = 'rgba(0, 255, 0, 0.9)';
            ctx.font = 'bold 14px Arial';
            const label = `#${index + 1} ${(det.confidence * 100).toFixed(0)}%`;
            const labelWidth = ctx.measureText(label).width;
            
            ctx.fillRect(x, y - 20, labelWidth + 10, 20);
            ctx.fillStyle = '#000';
            ctx.fillText(label, x + 5, y - 6);
            
            ctx.restore();
        });
    }

    stop() {
        console.log('[App] 停止所有操作...');
        
        this.isRunning = false;
        
        this.cancelDetection();
        this.stopRenderLoop();
        
        if (this.videoStream) {
            this.videoStream.getTracks().forEach(track => track.stop());
            this.videoStream = null;
        }
        
        const video = this.elements.sourceVideo;
        if (video) {
            if (video.srcObject) {
                video.srcObject = null;
            }
            if (video.src && video.src.startsWith('blob:')) {
                URL.revokeObjectURL(video.src);
                video.src = '';
            }
            video.pause();
        }
        
        const canvas = this.elements.outputCanvas;
        if (canvas) {
            const ctx = canvas.getContext('2d');
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
        
        this.frameBuffer.reset();
        this.lastDetections = [];
        
        if (this.elements.faceCount) {
            this.elements.faceCount.textContent = '0';
        }
        if (this.elements.fpsDisplay) {
            this.elements.fpsDisplay.textContent = '0';
        }
        
        this.hideVideoContainer();
        this.hideStopButton();
        this.updateStatus('已停止', 'idle');
        
        if (this.elements.videoFileInput) {
            this.elements.videoFileInput.value = '';
        }
        
        console.log('[App] 已停止');
    }

    showStopButton() {
        if (this.elements.stopBtn) {
            this.elements.stopBtn.style.display = 'inline-flex';
        }
        if (this.elements.startCameraBtn) {
            this.elements.startCameraBtn.disabled = true;
        }
        if (this.elements.startScreenBtn) {
            this.elements.startScreenBtn.disabled = true;
        }
        if (this.elements.loadVideoBtn) {
            this.elements.loadVideoBtn.disabled = true;
        }
    }

    hideStopButton() {
        if (this.elements.stopBtn) {
            this.elements.stopBtn.style.display = 'none';
        }
        if (this.elements.startCameraBtn) {
            this.elements.startCameraBtn.disabled = false;
        }
        if (this.elements.startScreenBtn) {
            this.elements.startScreenBtn.disabled = false;
        }
        if (this.elements.loadVideoBtn) {
            this.elements.loadVideoBtn.disabled = false;
        }
    }

    updateStatus(text, type) {
        const el = this.elements.statusText;
        if (el) {
            el.textContent = text;
            el.className = 'status-value ' + type;
        }
    }

    updateModelStatus(text, type) {
        const el = this.elements.modelStatus;
        if (el) {
            el.textContent = text;
            el.className = 'status-value ' + type;
        }
    }
}

console.log('[main.js] 模块加载完成，立即启动 App');
new App();
