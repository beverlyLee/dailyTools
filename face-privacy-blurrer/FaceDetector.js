export class FaceDetector {
    constructor(options = {}) {
        this.options = {
            minDetectionConfidence: options.minDetectionConfidence || 0.5,
            modelSelection: options.modelSelection || 0,
            onReady: options.onReady || null,
            onError: options.onError || null,
            maxInputSize: options.maxInputSize || 640
        };
        
        this.faceDetection = null;
        this.isReady = false;
        this.isLoading = false;
        this.pendingResults = [];
        this.lastDetections = [];
        this.consecutiveErrors = 0;
        this.maxConsecutiveErrors = 5;
        
        this.tempCanvas = document.createElement('canvas');
        this.tempCtx = this.tempCanvas.getContext('2d', { willReadFrequently: true });
        
        this.init();
    }

    async init() {
        console.log('[FaceDetector] 开始初始化...');
        
        if (this.isReady || this.isLoading) {
            console.log('[FaceDetector] 已在初始化中或已就绪，跳过');
            return;
        }
        
        this.isLoading = true;
        
        try {
            console.log('[FaceDetector] 检查 window.FaceDetection...');
            
            if (!window.FaceDetection) {
                throw new Error('MediaPipe Face Detection 未加载，请检查 CDN 脚本是否成功下载。');
            }
            
            console.log('[FaceDetector] window.FaceDetection 存在，创建实例...');
            
            this.faceDetection = new FaceDetection({
                locateFile: (file) => {
                    const url = `https://cdn.jsdelivr.net/npm/@mediapipe/face_detection@0.4.1646425229/${file}`;
                    console.log('[FaceDetector] 加载资源:', file, '->', url);
                    return url;
                }
            });
            
            console.log('[FaceDetector] 实例创建成功，设置选项...');
            
            this.faceDetection.setOptions({
                modelSelection: this.options.modelSelection,
                minDetectionConfidence: this.options.minDetectionConfidence
            });
            
            this.faceDetection.onResults((results) => {
                try {
                    this.consecutiveErrors = 0;
                    
                    const detections = [];
                    
                    if (results.detections && results.detections.length > 0) {
                        console.log('[FaceDetector] onResults: 检测到', results.detections.length, '个人脸');
                        
                        for (const detection of results.detections) {
                            const bbox = detection.boundingBox;
                            
                            console.log('[FaceDetector] bbox 原始值:', JSON.stringify(bbox));
                            console.log('[FaceDetector] score:', detection.score);
                            
                            detections.push({
                                x: bbox.xCenter - bbox.width / 2,
                                y: bbox.yCenter - bbox.height / 2,
                                width: bbox.width,
                                height: bbox.height,
                                confidence: detection.score || 0,
                                keypoints: {}
                            });
                        }
                        
                        console.log('[FaceDetector] 转换后 detections:', detections.length, '个');
                        if (detections.length > 0) {
                            const d = detections[0];
                            console.log('[FaceDetector] 第一个检测坐标:', 'x=', d.x, 'y=', d.y, 'w=', d.width, 'h=', d.height);
                        }
                    }
                    
                    this.lastDetections = detections;
                    this.pendingResults.push(detections);
                    
                } catch (error) {
                    console.error('[FaceDetector] 处理结果时出错:', error);
                    this.consecutiveErrors++;
                    if (this.consecutiveErrors >= this.maxConsecutiveErrors) {
                        console.error('[FaceDetector] 连续错误次数过多，尝试重新初始化...');
                        this.reinitialize();
                    }
                }
            });
            
            console.log('[FaceDetector] 初始化完成，等待模型加载...');
            console.log('[FaceDetector] ✅ 初始化完成! 等待 ready 事件...');
            
            this.isReady = true;
            this.isLoading = false;
            this.consecutiveErrors = 0;
            
            if (this.options.onReady) {
                this.options.onReady();
            }
            
        } catch (error) {
            this.isLoading = false;
            console.error('[FaceDetector] ❌ 初始化失败:', error);
            console.error('[FaceDetector] 错误详情:', error.message);
            if (this.options.onError) {
                this.options.onError(error);
            }
        }
    }

    async reinitialize() {
        console.log('[FaceDetector] 尝试重新初始化...');
        
        if (this.faceDetection) {
            try {
                this.faceDetection.close();
            } catch (e) {
                console.warn('[FaceDetector] 关闭旧模型时警告:', e);
            }
            this.faceDetection = null;
        }
        
        this.isReady = false;
        this.isLoading = false;
        this.pendingResults = [];
        this.lastDetections = [];
        this.consecutiveErrors = 0;
        
        await this.init();
    }

    async detect(imageSource) {
        if (!this.isReady || !this.faceDetection) {
            console.warn('[FaceDetector] 检测器未就绪');
            return this.lastDetections;
        }
        
        try {
            const imageWidth = imageSource.videoWidth || imageSource.width || 640;
            const imageHeight = imageSource.videoHeight || imageSource.height || 480;
            
            let processedImage = imageSource;
            
            if (Math.max(imageWidth, imageHeight) > this.options.maxInputSize) {
                const scale = this.options.maxInputSize / Math.max(imageWidth, imageHeight);
                const newWidth = Math.round(imageWidth * scale);
                const newHeight = Math.round(imageHeight * scale);
                
                this.tempCanvas.width = newWidth;
                this.tempCanvas.height = newHeight;
                this.tempCtx.drawImage(imageSource, 0, 0, newWidth, newHeight);
                processedImage = this.tempCanvas;
            }
            
            this.pendingResults = [];
            await this.faceDetection.send({ image: processedImage });
            
            if (this.pendingResults.length > 0) {
                return this.pendingResults[0];
            }
            
            return this.lastDetections;
            
        } catch (error) {
            console.error('[FaceDetector] 检测失败:', error);
            this.consecutiveErrors++;
            
            if (this.consecutiveErrors >= this.maxConsecutiveErrors) {
                console.error('[FaceDetector] 连续错误次数过多，尝试重新初始化...');
                this.reinitialize();
            }
            
            return this.lastDetections;
        }
    }

    updateConfidence(confidence) {
        if (this.faceDetection) {
            this.options.minDetectionConfidence = confidence;
            this.faceDetection.setOptions({
                modelSelection: this.options.modelSelection,
                minDetectionConfidence: confidence
            });
        }
    }

    close() {
        if (this.faceDetection) {
            try {
                this.faceDetection.close();
            } catch (e) {
                console.warn('[FaceDetector] 关闭时警告:', e);
            }
            this.faceDetection = null;
        }
        this.isReady = false;
        this.isLoading = false;
        this.pendingResults = [];
        console.log('[FaceDetector] 已关闭');
    }
}
