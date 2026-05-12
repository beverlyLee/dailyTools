export class EmotionDetector {
    constructor() {
        this.isReady = false;
        this.video = null;
        this.canvas = null;
        this.ctx = null;
        this.detectionInterval = null;
        this.onEmotionDetected = null;
        this.onFaceDetected = null;
    }

    async init() {
        if (this.isReady) {
            return;
        }

        const modelUrl = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model/';

        await faceapi.nets.tinyFaceDetector.loadFromUri(modelUrl);
        await faceapi.nets.faceExpressionNet.loadFromUri(modelUrl);
        
        this.isReady = true;
    }

    async start(videoElement, canvasElement) {
        if (!this.isReady) {
            await this.init();
        }

        this.video = videoElement;
        this.canvas = canvasElement;
        this.ctx = canvasElement.getContext('2d');

        const displaySize = { width: this.video.videoWidth, height: this.video.videoHeight };
        faceapi.matchDimensions(this.canvas, displaySize);

        this.detectionInterval = setInterval(async () => {
            await this.detect();
        }, 100);
    }

    stop() {
        if (this.detectionInterval) {
            clearInterval(this.detectionInterval);
            this.detectionInterval = null;
        }
    }

    async detect() {
        if (!this.video || this.video.paused || this.video.ended) {
            return;
        }

        const displaySize = { width: this.video.videoWidth, height: this.video.videoHeight };

        const detections = await faceapi
            .detectAllFaces(this.video, new faceapi.TinyFaceDetectorOptions())
            .withFaceExpressions();

        const resizedDetections = faceapi.resizeResults(detections, displaySize);

        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        if (this.onFaceDetected) {
            this.onFaceDetected(resizedDetections.length > 0);
        }

        if (resizedDetections.length > 0) {
            faceapi.draw.drawDetections(this.canvas, resizedDetections);
            
            const expressions = resizedDetections[0].expressions;
            
            if (this.onEmotionDetected) {
                this.onEmotionDetected(expressions);
            }
        }
    }

    getEmotionLabel(emotionName) {
        const labels = {
            happy: '高兴',
            sad: '悲伤',
            angry: '愤怒',
            neutral: '平静',
            surprised: '惊讶',
            fearful: '恐惧',
            disgusted: '厌恶'
        };
        return labels[emotionName] || emotionName;
    }
}
