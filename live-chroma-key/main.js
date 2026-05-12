class ChromaKeyApp {
    constructor() {
        this.video = document.getElementById('video');
        this.outputCanvas = document.getElementById('output');
        this.previewCanvas = document.getElementById('preview');
        this.outputCtx = this.outputCanvas.getContext('2d');
        this.previewCtx = this.previewCanvas.getContext('2d');
        
        this.processCanvas = document.createElement('canvas');
        this.processCtx = this.processCanvas.getContext('2d');
        
        this.chromaKeyer = new ChromaKeyer();
        this.spillSuppressor = new SpillSuppressor();
        this.backgroundBlender = new BackgroundBlender();
        
        this.stream = null;
        this.animationId = null;
        this.isPipetteActive = false;
        this.isAddPipetteActive = false;
        this.isSampling = false;
        this.sampleStart = null;
        this.sampleEnd = null;
        
        this.downsampleFactor = 2;
        this.targetFPS = 30;
        this.lastFrameTime = 0;
        this.frameInterval = 1000 / this.targetFPS;
        
        this.initElements();
        this.bindEvents();
        this.updateColorDisplay();
        this.updateColorList();
    }
    
    initElements() {
        this.startBtn = document.getElementById('startBtn');
        this.stopBtn = document.getElementById('stopBtn');
        this.pipetteBtn = document.getElementById('pipetteBtn');
        this.addPipetteBtn = document.getElementById('addPipetteBtn');
        this.sampleBtn = document.getElementById('sampleBtn');
        this.clearColorsBtn = document.getElementById('clearColorsBtn');
        this.bgImageInput = document.getElementById('bgImageInput');
        this.bgVideoInput = document.getElementById('bgVideoInput');
        this.overlay = document.getElementById('overlay');
        this.selectionOverlay = document.getElementById('selectionOverlay');
        this.selectionBox = document.getElementById('selectionBox');
        
        this.colorBox = document.getElementById('colorBox');
        this.colorValue = document.getElementById('colorValue');
        this.colorList = document.getElementById('colorList');
        
        this.toleranceSlider = document.getElementById('tolerance');
        this.toleranceValue = document.getElementById('toleranceValue');
        
        this.softnessSlider = document.getElementById('softness');
        this.softnessValue = document.getElementById('softnessValue');
        
        this.saturationSlider = document.getElementById('saturation');
        this.saturationValue = document.getElementById('saturationValue');
        
        this.edgeProtectionSlider = document.getElementById('edgeProtection');
        this.edgeProtectionValue = document.getElementById('edgeProtectionValue');
        
        this.morphologySlider = document.getElementById('morphology');
        this.morphologyValue = document.getElementById('morphologyValue');
        
        this.spatialSlider = document.getElementById('spatial');
        this.spatialValue = document.getElementById('spatialValue');
        
        this.skinProtectionSlider = document.getElementById('skinProtection');
        this.skinProtectionValue = document.getElementById('skinProtectionValue');
        
        this.humanProtectionSlider = document.getElementById('humanProtection');
        this.humanProtectionValue = document.getElementById('humanProtectionValue');
        
        this.spillIntensitySlider = document.getElementById('spillIntensity');
        this.spillIntensityValue = document.getElementById('spillIntensityValue');
        
        this.spillThresholdSlider = document.getElementById('spillThreshold');
        this.spillThresholdValue = document.getElementById('spillThresholdValue');
        
        this.shadowIntensitySlider = document.getElementById('shadowIntensity');
        this.shadowIntensityValue = document.getElementById('shadowIntensityValue');
        
        this.shadowBlurSlider = document.getElementById('shadowBlur');
        this.shadowBlurValue = document.getElementById('shadowBlurValue');
        
        this.presetButtons = document.querySelectorAll('.preset-btn');
    }
    
    bindEvents() {
        this.startBtn.addEventListener('click', () => this.startCamera());
        this.stopBtn.addEventListener('click', () => this.stopCamera());
        this.pipetteBtn.addEventListener('click', () => this.togglePipette());
        this.addPipetteBtn.addEventListener('click', () => this.toggleAddPipette());
        this.sampleBtn.addEventListener('click', () => this.toggleSampling());
        this.clearColorsBtn.addEventListener('click', () => this.clearColors());
        
        this.outputCanvas.addEventListener('click', (e) => this.handleCanvasClick(e));
        this.outputCanvas.addEventListener('mousemove', (e) => this.handleCanvasMove(e));
        this.outputCanvas.addEventListener('mousedown', (e) => this.handleCanvasMouseDown(e));
        this.outputCanvas.addEventListener('mouseup', (e) => this.handleCanvasMouseUp(e));
        
        this.bgImageInput.addEventListener('change', (e) => this.handleImageUpload(e));
        this.bgVideoInput.addEventListener('change', (e) => this.handleVideoUpload(e));
        
        this.toleranceSlider.addEventListener('input', () => {
            this.chromaKeyer.setTolerance(parseFloat(this.toleranceSlider.value));
            this.toleranceValue.textContent = parseFloat(this.toleranceSlider.value).toFixed(2);
        });
        
        this.softnessSlider.addEventListener('input', () => {
            this.chromaKeyer.setSoftness(parseFloat(this.softnessSlider.value));
            this.softnessValue.textContent = parseFloat(this.softnessSlider.value).toFixed(2);
        });
        
        this.saturationSlider.addEventListener('input', () => {
            this.chromaKeyer.setSaturationThreshold(parseFloat(this.saturationSlider.value));
            this.saturationValue.textContent = parseFloat(this.saturationSlider.value).toFixed(2);
        });
        
        this.edgeProtectionSlider.addEventListener('input', () => {
            this.chromaKeyer.setEdgeProtection(parseFloat(this.edgeProtectionSlider.value));
            this.edgeProtectionValue.textContent = parseFloat(this.edgeProtectionSlider.value).toFixed(2);
        });
        
        this.morphologySlider.addEventListener('input', () => {
            this.chromaKeyer.setMorphologyIterations(parseInt(this.morphologySlider.value));
            this.morphologyValue.textContent = this.morphologySlider.value;
        });
        
        this.spatialSlider.addEventListener('input', () => {
            this.chromaKeyer.setSpatialConsistency(parseFloat(this.spatialSlider.value));
            this.spatialValue.textContent = parseFloat(this.spatialSlider.value).toFixed(2);
        });
        
        this.skinProtectionSlider.addEventListener('input', () => {
            this.chromaKeyer.setSkinProtection(parseFloat(this.skinProtectionSlider.value));
            this.skinProtectionValue.textContent = parseFloat(this.skinProtectionSlider.value).toFixed(2);
        });
        
        this.humanProtectionSlider.addEventListener('input', () => {
            this.chromaKeyer.setHumanProtection(parseFloat(this.humanProtectionSlider.value));
            this.humanProtectionValue.textContent = parseFloat(this.humanProtectionSlider.value).toFixed(2);
        });
        
        this.spillIntensitySlider.addEventListener('input', () => {
            this.spillSuppressor.setIntensity(parseFloat(this.spillIntensitySlider.value));
            this.spillIntensityValue.textContent = parseFloat(this.spillIntensitySlider.value).toFixed(2);
        });
        
        this.spillThresholdSlider.addEventListener('input', () => {
            this.spillSuppressor.setThreshold(parseFloat(this.spillThresholdSlider.value));
            this.spillThresholdValue.textContent = parseFloat(this.spillThresholdSlider.value).toFixed(2);
        });
        
        this.shadowIntensitySlider.addEventListener('input', () => {
            this.backgroundBlender.setShadowIntensity(parseFloat(this.shadowIntensitySlider.value));
            this.shadowIntensityValue.textContent = parseFloat(this.shadowIntensitySlider.value).toFixed(2);
        });
        
        this.shadowBlurSlider.addEventListener('input', () => {
            this.backgroundBlender.setShadowBlur(parseFloat(this.shadowBlurSlider.value));
            this.shadowBlurValue.textContent = this.shadowBlurSlider.value;
        });
        
        this.presetButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const preset = btn.dataset.preset;
                this.applyPreset(preset);
            });
        });
        
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.cancelAllModes();
            }
        });
    }
    
    async startCamera() {
        try {
            this.stream = await navigator.mediaDevices.getUserMedia({
                video: { 
                    width: { ideal: 1280 },
                    height: { ideal: 720 },
                    facingMode: 'user'
                },
                audio: false
            });
            
            this.video.srcObject = this.stream;
            await this.video.play();
            
            const origWidth = this.video.videoWidth;
            const origHeight = this.video.videoHeight;
            
            this.outputCanvas.width = origWidth;
            this.outputCanvas.height = origHeight;
            this.previewCanvas.width = origWidth;
            this.previewCanvas.height = origHeight;
            
            const processWidth = Math.floor(origWidth / this.downsampleFactor);
            const processHeight = Math.floor(origHeight / this.downsampleFactor);
            this.processCanvas.width = processWidth;
            this.processCanvas.height = processHeight;
            this.chromaKeyer.setDownsampleFactor(this.downsampleFactor);
            
            this.startBtn.disabled = true;
            this.stopBtn.disabled = false;
            this.pipetteBtn.disabled = false;
            this.addPipetteBtn.disabled = false;
            this.sampleBtn.disabled = false;
            this.clearColorsBtn.disabled = false;
            
            this.lastFrameTime = performance.now();
            this.render();
        } catch (err) {
            console.error('无法访问摄像头:', err);
            alert('无法访问摄像头，请确保已授予权限，并且在 HTTPS 环境下运行。');
        }
    }
    
    stopCamera() {
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.stream = null;
        }
        
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
        
        this.video.srcObject = null;
        this.outputCtx.clearRect(0, 0, this.outputCanvas.width, this.outputCanvas.height);
        
        this.startBtn.disabled = false;
        this.stopBtn.disabled = true;
        this.pipetteBtn.disabled = true;
        this.addPipetteBtn.disabled = true;
        this.sampleBtn.disabled = true;
        this.clearColorsBtn.disabled = true;
        
        this.cancelAllModes();
    }
    
    cancelAllModes() {
        if (this.isPipetteActive) {
            this.togglePipette();
        }
        if (this.isAddPipetteActive) {
            this.toggleAddPipette();
        }
        if (this.isSampling) {
            this.toggleSampling();
        }
    }
    
    togglePipette() {
        this.cancelAllModes();
        this.isPipetteActive = !this.isPipetteActive;
        
        if (this.isPipetteActive) {
            this.pipetteBtn.classList.add('active');
            this.overlay.classList.remove('hidden');
            this.outputCanvas.style.cursor = 'crosshair';
        } else {
            this.pipetteBtn.classList.remove('active');
            this.overlay.classList.add('hidden');
            this.outputCanvas.style.cursor = 'default';
        }
    }
    
    toggleAddPipette() {
        this.cancelAllModes();
        this.isAddPipetteActive = !this.isAddPipetteActive;
        
        if (this.isAddPipetteActive) {
            this.addPipetteBtn.classList.add('active');
            this.overlay.classList.remove('hidden');
            this.outputCanvas.style.cursor = 'crosshair';
        } else {
            this.addPipetteBtn.classList.remove('active');
            this.overlay.classList.add('hidden');
            this.outputCanvas.style.cursor = 'default';
        }
    }
    
    toggleSampling() {
        this.cancelAllModes();
        this.isSampling = !this.isSampling;
        
        if (this.isSampling) {
            this.sampleBtn.classList.add('active');
            this.selectionOverlay.classList.remove('hidden');
            this.outputCanvas.style.cursor = 'crosshair';
        } else {
            this.sampleBtn.classList.remove('active');
            this.selectionOverlay.classList.add('hidden');
            this.outputCanvas.style.cursor = 'default';
        }
        
        this.sampleStart = null;
        this.sampleEnd = null;
        this.selectionBox.style.display = 'none';
    }
    
    clearColors() {
        this.chromaKeyer.clearBackgroundColors();
        this.updateColorList();
        this.updateColorDisplay();
    }
    
    handleCanvasMove(e) {
        if (!this.isPipetteActive && !this.isAddPipetteActive && !this.isSampling) return;
        
        const rect = this.outputCanvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        if (this.isPipetteActive || this.isAddPipetteActive) {
            const tip = this.overlay.querySelector('.pipette-tip');
            tip.style.left = x + 'px';
            tip.style.top = y + 'px';
        }
        
        if (this.isSampling && this.sampleStart) {
            this.sampleEnd = { x, y };
            this.updateSelectionBox();
        }
    }
    
    handleCanvasClick(e) {
        if (!this.isPipetteActive && !this.isAddPipetteActive) return;
        
        const rect = this.outputCanvas.getBoundingClientRect();
        const scaleX = this.outputCanvas.width / rect.width;
        const scaleY = this.outputCanvas.height / rect.height;
        const x = Math.floor((e.clientX - rect.left) * scaleX);
        const y = Math.floor((e.clientY - rect.top) * scaleY);
        
        this.previewCtx.drawImage(this.video, 0, 0);
        const imageData = this.previewCtx.getImageData(x, y, 1, 1);
        const pixel = imageData.data;
        
        if (this.isPipetteActive) {
            this.chromaKeyer.setTargetColor(pixel[0], pixel[1], pixel[2]);
            this.togglePipette();
        } else if (this.isAddPipetteActive) {
            this.chromaKeyer.addBackgroundColor(pixel[0], pixel[1], pixel[2]);
        }
        
        this.updateColorDisplay();
        this.updateColorList();
    }
    
    handleCanvasMouseDown(e) {
        if (!this.isSampling) return;
        
        const rect = this.outputCanvas.getBoundingClientRect();
        this.sampleStart = {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        };
        this.sampleEnd = { ...this.sampleStart };
        this.selectionBox.style.display = 'block';
    }
    
    handleCanvasMouseUp(e) {
        if (!this.isSampling || !this.sampleStart || !this.sampleEnd) return;
        
        const rect = this.outputCanvas.getBoundingClientRect();
        const scaleX = this.outputCanvas.width / rect.width;
        const scaleY = this.outputCanvas.height / rect.height;
        
        const x1 = Math.min(this.sampleStart.x, this.sampleEnd.x) * scaleX;
        const y1 = Math.min(this.sampleStart.y, this.sampleEnd.y) * scaleY;
        const w = Math.abs(this.sampleEnd.x - this.sampleStart.x) * scaleX;
        const h = Math.abs(this.sampleEnd.y - this.sampleStart.y) * scaleY;
        
        if (w > 10 && h > 10) {
            this.previewCtx.drawImage(this.video, 0, 0);
            const imageData = this.previewCtx.getImageData(0, 0, this.previewCanvas.width, this.previewCanvas.height);
            this.chromaKeyer.addColorRangeFromSample(imageData, Math.floor(x1), Math.floor(y1), Math.floor(w), Math.floor(h));
            this.updateColorList();
        }
        
        this.sampleStart = null;
        this.sampleEnd = null;
        this.selectionBox.style.display = 'none';
        this.toggleSampling();
    }
    
    updateSelectionBox() {
        if (!this.sampleStart || !this.sampleEnd) return;
        
        const x = Math.min(this.sampleStart.x, this.sampleEnd.x);
        const y = Math.min(this.sampleStart.y, this.sampleEnd.y);
        const w = Math.abs(this.sampleEnd.x - this.sampleStart.x);
        const h = Math.abs(this.sampleEnd.y - this.sampleStart.y);
        
        this.selectionBox.style.left = x + 'px';
        this.selectionBox.style.top = y + 'px';
        this.selectionBox.style.width = w + 'px';
        this.selectionBox.style.height = h + 'px';
    }
    
    updateColorDisplay() {
        const colors = this.chromaKeyer.backgroundColors;
        if (colors.length > 0) {
            const color = colors[colors.length - 1];
            this.colorBox.style.backgroundColor = `rgb(${color.r}, ${color.g}, ${color.b})`;
            this.colorValue.textContent = `RGB(${color.r}, ${color.g}, ${color.b})`;
        } else {
            this.colorBox.style.backgroundColor = '#fff';
            this.colorValue.textContent = '未选择';
        }
    }
    
    updateColorList() {
        this.colorList.innerHTML = '';
        const colors = this.chromaKeyer.backgroundColors;
        const ranges = this.chromaKeyer.colorRanges;
        
        colors.forEach((color, index) => {
            const item = document.createElement('div');
            item.className = 'color-item';
            item.style.backgroundColor = `rgb(${color.r}, ${color.g}, ${color.b})`;
            item.dataset.index = index;
            item.title = `点击删除此颜色`;
            item.addEventListener('click', (e) => {
                e.stopPropagation();
                this.chromaKeyer.removeBackgroundColor(index);
                this.updateColorList();
                this.updateColorDisplay();
            });
            this.colorList.appendChild(item);
        });
        
        for (let i = 0; i < ranges.length; i++) {
            const item = document.createElement('div');
            item.className = 'color-item range';
            item.style.background = 'linear-gradient(135deg, #888, #444)';
            item.title = `采样区域 ${i + 1} (点击删除)`;
            item.addEventListener('click', (e) => {
                e.stopPropagation();
                ranges.splice(i, 1);
                this.updateColorList();
            });
            this.colorList.appendChild(item);
        }
        
        if (colors.length === 0 && ranges.length === 0) {
            const placeholder = document.createElement('div');
            placeholder.className = 'color-placeholder';
            placeholder.textContent = '暂无背景色';
            this.colorList.appendChild(placeholder);
        }
    }
    
    async handleImageUpload(e) {
        const file = e.target.files[0];
        if (!file) return;
        
        try {
            await this.backgroundBlender.setBackgroundImage(file);
        } catch (err) {
            console.error('加载背景图片失败:', err);
            alert('加载背景图片失败');
        }
        
        e.target.value = '';
    }
    
    async handleVideoUpload(e) {
        const file = e.target.files[0];
        if (!file) return;
        
        try {
            await this.backgroundBlender.setBackgroundVideo(file);
        } catch (err) {
            console.error('加载背景视频失败:', err);
            alert('加载背景视频失败');
        }
        
        e.target.value = '';
    }
    
    applyPreset(preset) {
        const presetImages = {
            beach: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1920',
            studio: 'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=1920',
            office: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=1920'
        };
        
        if (preset === 'none') {
            this.backgroundBlender.clearBackground();
        } else if (presetImages[preset]) {
            this.backgroundBlender.setBackgroundImageURL(presetImages[preset]);
        }
    }
    
    render(timestamp) {
        if (!this.video.videoWidth || !this.video.videoHeight) {
            this.animationId = requestAnimationFrame((t) => this.render(t));
            return;
        }
        
        const elapsed = timestamp - this.lastFrameTime;
        if (elapsed < this.frameInterval) {
            this.animationId = requestAnimationFrame((t) => this.render(t));
            return;
        }
        this.lastFrameTime = timestamp - (elapsed % this.frameInterval);
        
        const pw = this.processCanvas.width;
        const ph = this.processCanvas.height;
        const ow = this.outputCanvas.width;
        const oh = this.outputCanvas.height;
        
        this.processCtx.drawImage(this.video, 0, 0, pw, ph);
        
        let imageData = this.processCtx.getImageData(0, 0, pw, ph);
        
        imageData = this.chromaKeyer.process(imageData);
        
        imageData = this.spillSuppressor.process(imageData, this.chromaKeyer.backgroundColors[0] || { r: 0, g: 255, b: 0 });
        
        this.processCtx.putImageData(imageData, 0, 0);
        
        this.backgroundBlender.drawBackground(this.outputCtx, ow, oh);
        
        this.outputCtx.imageSmoothingEnabled = true;
        this.outputCtx.imageSmoothingQuality = 'medium';
        this.outputCtx.drawImage(this.processCanvas, 0, 0, ow, oh);
        
        this.animationId = requestAnimationFrame((t) => this.render(t));
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new ChromaKeyApp();
});
