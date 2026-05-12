class IDPhotoStudio {
    constructor() {
        this.previewCanvas = document.getElementById('previewCanvas');
        this.previewCtx = this.previewCanvas.getContext('2d');
        this.uploadOverlay = document.getElementById('uploadOverlay');
        
        this.segmenter = new PortraitSegmenter();
        this.colorReplacer = new ColorReplacer();
        this.skinSmoother = new SkinSmoothing();
        
        this.originalImage = null;
        this.originalCanvas = document.createElement('canvas');
        this.originalCtx = this.originalCanvas.getContext('2d');
        
        this.segmentedMask = null;
        this.processedCanvas = document.createElement('canvas');
        this.processedCtx = this.processedCanvas.getContext('2d');
        
        this.currentBgColor = { r: 67, g: 142, b: 219 };
        this.currentBgKey = 'blue';
        this.currentSize = 'original';
        
        this.sizePresets = {
            '1inch': { width: 295, height: 413, name: '一寸 (295×413)' },
            '2inch': { width: 413, height: 579, name: '二寸 (413×579)' },
            'passport': { width: 354, height: 472, name: '护照 (354×472)' },
            'original': { width: 0, height: 0, name: '原始尺寸' }
        };
        
        this.beautyPresets = {
            'none': { smoothness: 0, brightness: 0, contrast: 0, saturation: 0 },
            'light': { smoothness: 0.25, brightness: 0.03, contrast: 0.05, saturation: 0.05 },
            'medium': { smoothness: 0.5, brightness: 0.05, contrast: 0.08, saturation: 0.1 },
            'strong': { smoothness: 0.75, brightness: 0.08, contrast: 0.12, saturation: 0.15 }
        };
        
        this.cameraStream = null;
        this.capturedImage = null;
        
        this.initElements();
        this.bindEvents();
    }
    
    initElements() {
        this.imageInput = document.getElementById('imageInput');
        this.cameraBtn = document.getElementById('cameraBtn');
        this.resetBtn = document.getElementById('resetBtn');
        this.downloadBtn = document.getElementById('downloadBtn');
        
        this.colorOptions = document.querySelectorAll('.color-option');
        this.customColor = document.getElementById('customColor');
        
        this.smoothnessSlider = document.getElementById('smoothness');
        this.smoothnessValue = document.getElementById('smoothnessValue');
        this.brightnessSlider = document.getElementById('brightness');
        this.brightnessValue = document.getElementById('brightnessValue');
        this.contrastSlider = document.getElementById('contrast');
        this.contrastValue = document.getElementById('contrastValue');
        this.saturationSlider = document.getElementById('saturation');
        this.saturationValue = document.getElementById('saturationValue');
        
        this.presetButtons = document.querySelectorAll('.preset-btn');
        this.sizeButtons = document.querySelectorAll('.size-btn');
        this.sizeInfo = document.getElementById('sizeInfo');
        
        this.cameraModal = document.getElementById('cameraModal');
        this.cameraVideo = document.getElementById('cameraVideo');
        this.cameraCanvas = document.getElementById('cameraCanvas');
        this.cameraCtx = this.cameraCanvas.getContext('2d');
        this.captureBtn = document.getElementById('captureBtn');
        this.retakeBtn = document.getElementById('retakeBtn');
        this.usePhotoBtn = document.getElementById('usePhotoBtn');
        this.closeCameraBtn = document.getElementById('closeCameraBtn');
    }
    
    bindEvents() {
        this.imageInput.addEventListener('change', (e) => this.handleImageUpload(e));
        this.uploadOverlay.addEventListener('click', () => this.imageInput.click());
        
        this.uploadOverlay.addEventListener('dragover', (e) => {
            e.preventDefault();
            this.uploadOverlay.style.background = 'rgba(0, 0, 0, 0.7)';
        });
        this.uploadOverlay.addEventListener('dragleave', () => {
            this.uploadOverlay.style.background = 'rgba(0, 0, 0, 0.5)';
        });
        this.uploadOverlay.addEventListener('drop', (e) => {
            e.preventDefault();
            this.uploadOverlay.style.background = 'rgba(0, 0, 0, 0.5)';
            if (e.dataTransfer.files.length > 0) {
                this.loadImage(e.dataTransfer.files[0]);
            }
        });
        
        this.cameraBtn.addEventListener('click', () => this.openCamera());
        this.resetBtn.addEventListener('click', () => this.reset());
        this.downloadBtn.addEventListener('click', () => this.downloadImage());
        
        this.colorOptions.forEach(option => {
            option.addEventListener('click', () => {
                this.selectColor(option.dataset.color);
            });
        });
        
        this.customColor.addEventListener('input', (e) => {
            const hex = e.target.value;
            this.setCustomColor(hex);
        });
        
        this.smoothnessSlider.addEventListener('input', () => {
            this.skinSmoother.setSmoothness(parseFloat(this.smoothnessSlider.value));
            this.smoothnessValue.textContent = parseFloat(this.smoothnessSlider.value).toFixed(2);
            this.processImage();
        });
        
        this.brightnessSlider.addEventListener('input', () => {
            this.skinSmoother.setBrightness(parseFloat(this.brightnessSlider.value));
            this.brightnessValue.textContent = parseFloat(this.brightnessSlider.value).toFixed(2);
            this.processImage();
        });
        
        this.contrastSlider.addEventListener('input', () => {
            this.skinSmoother.setContrast(parseFloat(this.contrastSlider.value));
            this.contrastValue.textContent = parseFloat(this.contrastSlider.value).toFixed(2);
            this.processImage();
        });
        
        this.saturationSlider.addEventListener('input', () => {
            this.skinSmoother.setSaturation(parseFloat(this.saturationSlider.value));
            this.saturationValue.textContent = parseFloat(this.saturationSlider.value).toFixed(2);
            this.processImage();
        });
        
        this.presetButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                this.applyBeautyPreset(btn.dataset.preset);
            });
        });
        
        this.sizeButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                this.selectSize(btn.dataset.size);
            });
        });
        
        this.captureBtn.addEventListener('click', () => this.capturePhoto());
        this.retakeBtn.addEventListener('click', () => this.retakePhoto());
        this.usePhotoBtn.addEventListener('click', () => this.useCapturedPhoto());
        this.closeCameraBtn.addEventListener('click', () => this.closeCamera());
    }
    
    handleImageUpload(e) {
        const file = e.target.files[0];
        if (!file) return;
        this.loadImage(file);
        e.target.value = '';
    }
    
    async loadImage(file) {
        try {
            const img = new Image();
            const reader = new FileReader();
            
            await new Promise((resolve, reject) => {
                reader.onload = (e) => {
                    img.onload = () => resolve();
                    img.onerror = () => reject(new Error('图片加载失败'));
                    img.src = e.target.result;
                };
                reader.onerror = () => reject(new Error('文件读取失败'));
                reader.readAsDataURL(file);
            });
            
            this.processOriginalImage(img);
        } catch (err) {
            console.error('加载图片失败:', err);
            alert('图片加载失败，请选择有效的图片文件');
        }
    }
    
    processOriginalImage(img) {
        this.originalImage = img;
        
        let width = img.width;
        let height = img.height;
        
        const maxSide = 1200;
        if (width > maxSide || height > maxSide) {
            const ratio = Math.min(maxSide / width, maxSide / height);
            width = Math.floor(width * ratio);
            height = Math.floor(height * ratio);
        }
        
        this.originalCanvas.width = width;
        this.originalCanvas.height = height;
        this.originalCtx.drawImage(img, 0, 0, width, height);
        
        this.segmentImage();
        this.processImage();
        
        this.uploadOverlay.classList.add('hidden');
        this.resetBtn.disabled = false;
        this.downloadBtn.disabled = false;
    }
    
    segmentImage() {
        const result = this.segmenter.segment(this.originalCanvas);
        this.segmentedMask = result.mask;
    }
    
    processImage() {
        if (!this.originalImage || !this.segmentedMask) return;
        
        const width = this.originalCanvas.width;
        const height = this.originalCanvas.height;
        
        const imageData = this.originalCtx.getImageData(0, 0, width, height);
        
        const bgReplaced = this.colorReplacer.replaceBackground(
            imageData,
            this.segmentedMask,
            this.currentBgColor
        );
        
        const smoothed = this.skinSmoother.smooth(bgReplaced);
        
        this.processedCanvas.width = smoothed.width;
        this.processedCanvas.height = smoothed.height;
        this.processedCtx.drawImage(smoothed, 0, 0);
        
        this.displayPreview();
    }
    
    displayPreview() {
        const displayWidth = this.previewCanvas.clientWidth;
        const displayHeight = this.previewCanvas.clientHeight;
        
        const imgRatio = this.processedCanvas.width / this.processedCanvas.height;
        const canvasRatio = displayWidth / displayHeight;
        
        let drawWidth, drawHeight;
        if (imgRatio > canvasRatio) {
            drawWidth = displayWidth;
            drawHeight = displayWidth / imgRatio;
        } else {
            drawHeight = displayHeight;
            drawWidth = displayHeight * imgRatio;
        }
        
        this.previewCanvas.width = this.processedCanvas.width;
        this.previewCanvas.height = this.processedCanvas.height;
        
        this.previewCtx.clearRect(0, 0, this.previewCanvas.width, this.previewCanvas.height);
        this.previewCtx.drawImage(
            this.processedCanvas, 
            0, 0, 
            this.processedCanvas.width, 
            this.processedCanvas.height
        );
    }
    
    selectColor(colorKey) {
        this.colorOptions.forEach(opt => opt.classList.remove('active'));
        const selectedOption = document.querySelector(`.color-option[data-color="${colorKey}"]`);
        if (selectedOption) {
            selectedOption.classList.add('active');
        }
        
        this.currentBgKey = colorKey;
        this.currentBgColor = this.colorReplacer.setBackground(colorKey);
        
        if (colorKey !== 'custom') {
            const hex = this.rgbToHex(this.currentBgColor.r, this.currentBgColor.g, this.currentBgColor.b);
            this.customColor.value = hex;
        }
        
        this.processImage();
    }
    
    setCustomColor(hex) {
        const rgb = this.hexToRgb(hex);
        this.currentBgColor = rgb;
        this.currentBgKey = 'custom';
        
        this.colorOptions.forEach(opt => opt.classList.remove('active'));
        
        this.processImage();
    }
    
    rgbToHex(r, g, b) {
        return '#' + [r, g, b].map(x => {
            const hex = x.toString(16);
            return hex.length === 1 ? '0' + hex : hex;
        }).join('');
    }
    
    hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : { r: 255, g: 255, b: 255 };
    }
    
    applyBeautyPreset(presetKey) {
        const preset = this.beautyPresets[presetKey];
        if (!preset) return;
        
        this.presetButtons.forEach(btn => btn.classList.remove('active'));
        document.querySelector(`.preset-btn[data-preset="${presetKey}"]`).classList.add('active');
        
        this.skinSmoother.setSmoothness(preset.smoothness);
        this.skinSmoother.setBrightness(preset.brightness);
        this.skinSmoother.setContrast(preset.contrast);
        this.skinSmoother.setSaturation(preset.saturation);
        
        this.smoothnessSlider.value = preset.smoothness;
        this.smoothnessValue.textContent = preset.smoothness.toFixed(2);
        this.brightnessSlider.value = preset.brightness;
        this.brightnessValue.textContent = preset.brightness.toFixed(2);
        this.contrastSlider.value = preset.contrast;
        this.contrastValue.textContent = preset.contrast.toFixed(2);
        this.saturationSlider.value = preset.saturation;
        this.saturationValue.textContent = preset.saturation.toFixed(2);
        
        this.processImage();
    }
    
    selectSize(sizeKey) {
        this.currentSize = sizeKey;
        this.sizeButtons.forEach(btn => btn.classList.remove('active'));
        document.querySelector(`.size-btn[data-size="${sizeKey}"]`).classList.add('active');
        
        const preset = this.sizePresets[sizeKey];
        this.sizeInfo.textContent = `当前尺寸: ${preset.name}`;
        
        if (this.processedCanvas.width > 0) {
            this.displayPreview();
        }
    }
    
    async openCamera() {
        try {
            this.cameraStream = await navigator.mediaDevices.getUserMedia({
                video: { 
                    width: { ideal: 1280 },
                    height: { ideal: 720 },
                    facingMode: 'user'
                },
                audio: false
            });
            
            this.cameraVideo.srcObject = this.cameraStream;
            await this.cameraVideo.play();
            
            this.cameraModal.classList.remove('hidden');
            this.captureBtn.classList.remove('hidden');
            this.retakeBtn.classList.add('hidden');
            this.usePhotoBtn.classList.add('hidden');
            this.cameraVideo.classList.remove('hidden');
            this.cameraCanvas.classList.add('hidden');
            
        } catch (err) {
            console.error('无法访问摄像头:', err);
            alert('无法访问摄像头，请确保已授予权限。\n\n提示：如果使用HTTP协议，某些浏览器可能不允许访问摄像头。');
        }
    }
    
    closeCamera() {
        if (this.cameraStream) {
            this.cameraStream.getTracks().forEach(track => track.stop());
            this.cameraStream = null;
        }
        this.cameraModal.classList.add('hidden');
        this.capturedImage = null;
    }
    
    capturePhoto() {
        const width = this.cameraVideo.videoWidth;
        const height = this.cameraVideo.videoHeight;
        
        this.cameraCanvas.width = width;
        this.cameraCanvas.height = height;
        this.cameraCtx.drawImage(this.cameraVideo, 0, 0, width, height);
        
        this.cameraVideo.classList.add('hidden');
        this.cameraCanvas.classList.remove('hidden');
        
        this.captureBtn.classList.add('hidden');
        this.retakeBtn.classList.remove('hidden');
        this.usePhotoBtn.classList.remove('hidden');
        
        this.capturedImage = new Image();
        this.capturedImage.src = this.cameraCanvas.toDataURL();
    }
    
    retakePhoto() {
        this.cameraVideo.classList.remove('hidden');
        this.cameraCanvas.classList.add('hidden');
        
        this.captureBtn.classList.remove('hidden');
        this.retakeBtn.classList.add('hidden');
        this.usePhotoBtn.classList.add('hidden');
        
        this.capturedImage = null;
    }
    
    useCapturedPhoto() {
        if (!this.capturedImage) return;
        
        if (this.cameraStream) {
            this.cameraStream.getTracks().forEach(track => track.stop());
            this.cameraStream = null;
        }
        this.cameraModal.classList.add('hidden');
        
        this.processOriginalImage(this.capturedImage);
    }
    
    reset() {
        this.originalImage = null;
        this.segmentedMask = null;
        
        this.previewCanvas.width = 0;
        this.previewCanvas.height = 0;
        
        this.uploadOverlay.classList.remove('hidden');
        this.resetBtn.disabled = true;
        this.downloadBtn.disabled = true;
        
        this.selectColor('blue');
        this.applyBeautyPreset('medium');
        this.selectSize('original');
    }
    
    downloadImage() {
        if (!this.processedCanvas || this.processedCanvas.width === 0) return;
        
        const exportCanvas = document.createElement('canvas');
        const exportCtx = exportCanvas.getContext('2d');
        
        if (this.currentSize !== 'original' && this.sizePresets[this.currentSize]) {
            const preset = this.sizePresets[this.currentSize];
            exportCanvas.width = preset.width;
            exportCanvas.height = preset.height;
            
            exportCtx.fillStyle = `rgb(${this.currentBgColor.r}, ${this.currentBgColor.g}, ${this.currentBgColor.b})`;
            exportCtx.fillRect(0, 0, preset.width, preset.height);
            
            const imgRatio = this.processedCanvas.width / this.processedCanvas.height;
            const targetRatio = preset.width / preset.height;
            
            let drawWidth, drawHeight, offsetX, offsetY;
            
            if (imgRatio > targetRatio) {
                drawHeight = preset.height;
                drawWidth = preset.height * imgRatio;
                offsetX = (preset.width - drawWidth) / 2;
                offsetY = 0;
            } else {
                drawWidth = preset.width;
                drawHeight = preset.width / imgRatio;
                offsetX = 0;
                offsetY = (preset.height - drawHeight) / 2;
            }
            
            exportCtx.drawImage(this.processedCanvas, offsetX, offsetY, drawWidth, drawHeight);
        } else {
            exportCanvas.width = this.processedCanvas.width;
            exportCanvas.height = this.processedCanvas.height;
            exportCtx.drawImage(this.processedCanvas, 0, 0);
        }
        
        const link = document.createElement('a');
        link.download = `证件照_${this.currentBgKey}_${this.currentSize}_${Date.now()}.jpg`;
        link.href = exportCanvas.toDataURL('image/jpeg', 0.95);
        link.click();
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new IDPhotoStudio();
});
