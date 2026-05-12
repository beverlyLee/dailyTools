import { BrightnessCompensator } from './BrightnessCompensator.js';
import { TextSharpen } from './TextSharpen.js';

class App {
    constructor() {
        this.originalImageData = null;
        this.processedImageData = null;
        this.currentImage = null;
        this.sliderPosition = 0.5;
        this.isDragging = false;
        this.processTimer = null;
        
        this.brightnessCompensator = new BrightnessCompensator({
            sensitivity: 50,
            brightnessBoost: 40
        });
        this.textSharpen = new TextSharpen({
            strength: 30
        });
        
        this.initElements();
        this.initEventListeners();
    }

    initElements() {
        this.uploadSection = document.getElementById('uploadSection');
        this.uploadArea = document.getElementById('uploadArea');
        this.fileInput = document.getElementById('fileInput');
        this.uploadBtn = document.getElementById('uploadBtn');
        this.controls = document.getElementById('controls');
        this.previewSection = document.getElementById('previewSection');
        this.comparisonCanvas = document.getElementById('comparisonCanvas');
        this.comparisonMain = document.getElementById('comparisonMain');
        this.sliderHandle = document.getElementById('sliderHandle');
        this.sliderContainer = document.querySelector('.slider-container');
        
        this.shadowSensitivityInput = document.getElementById('shadowSensitivity');
        this.shadowSensitivityValue = document.getElementById('shadowSensitivityValue');
        this.brightnessBoostInput = document.getElementById('brightnessBoost');
        this.brightnessBoostValue = document.getElementById('brightnessBoostValue');
        this.sharpenStrengthInput = document.getElementById('sharpenStrength');
        this.sharpenStrengthValue = document.getElementById('sharpenStrengthValue');
        
        this.resetBtn = document.getElementById('resetBtn');
        this.downloadBtn = document.getElementById('downloadBtn');
    }

    initEventListeners() {
        this.uploadBtn.addEventListener('click', () => this.fileInput.click());
        this.uploadArea.addEventListener('click', () => this.fileInput.click());
        this.fileInput.addEventListener('change', (e) => this.handleFileSelect(e));
        
        this.uploadArea.addEventListener('dragover', (e) => this.handleDragOver(e));
        this.uploadArea.addEventListener('dragleave', (e) => this.handleDragLeave(e));
        this.uploadArea.addEventListener('drop', (e) => this.handleDrop(e));
        
        this.shadowSensitivityInput.addEventListener('input', (e) => this.onSliderChange('shadow', e.target.value));
        this.brightnessBoostInput.addEventListener('input', (e) => this.onSliderChange('brightness', e.target.value));
        this.sharpenStrengthInput.addEventListener('input', (e) => this.onSliderChange('sharpen', e.target.value));
        
        this.resetBtn.addEventListener('click', () => this.reset());
        this.downloadBtn.addEventListener('click', () => this.downloadImage());
        
        this.initComparisonSlider();
    }

    onSliderChange(type, value) {
        const intValue = parseInt(value);
        
        switch(type) {
            case 'shadow':
                this.shadowSensitivityValue.textContent = value;
                this.brightnessCompensator.setSensitivity(intValue);
                break;
            case 'brightness':
                this.brightnessBoostValue.textContent = value;
                this.brightnessCompensator.setBrightnessBoost(intValue);
                break;
            case 'sharpen':
                this.sharpenStrengthValue.textContent = value;
                this.textSharpen.setStrength(intValue);
                break;
        }
        
        this.scheduleProcess();
    }

    scheduleProcess() {
        if (this.processTimer) {
            clearTimeout(this.processTimer);
        }
        
        this.processTimer = setTimeout(() => {
            this.processImage();
        }, 50);
    }

    handleDragOver(e) {
        e.preventDefault();
        e.stopPropagation();
        this.uploadArea.classList.add('dragover');
    }

    handleDragLeave(e) {
        e.preventDefault();
        e.stopPropagation();
        this.uploadArea.classList.remove('dragover');
    }

    handleDrop(e) {
        e.preventDefault();
        e.stopPropagation();
        this.uploadArea.classList.remove('dragover');
        
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            this.loadImage(files[0]);
        }
    }

    handleFileSelect(e) {
        const files = e.target.files;
        if (files.length > 0) {
            this.loadImage(files[0]);
        }
    }

    loadImage(file) {
        if (!file.type.startsWith('image/')) {
            alert('请选择图片文件');
            return;
        }
        
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                this.currentImage = img;
                this.initCanvas(img);
                this.uploadSection.style.display = 'none';
                this.controls.style.display = 'block';
                this.previewSection.style.display = 'block';
                this.downloadBtn.style.display = 'block';
                
                this.processImage();
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }

    initCanvas(img) {
        const maxWidth = 1000;
        let width = img.width;
        let height = img.height;
        
        if (width > maxWidth) {
            const ratio = maxWidth / width;
            width = maxWidth;
            height = Math.round(height * ratio);
        }
        
        this.comparisonCanvas.width = width;
        this.comparisonCanvas.height = height;
        
        const ctx = this.comparisonCanvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        
        this.originalImageData = ctx.getImageData(0, 0, width, height);
    }

    processImage() {
        if (!this.originalImageData) return;
        
        try {
            const brightnessResult = this.brightnessCompensator.applyBrightnessCompensation(
                this.originalImageData
            );
            
            this.processedImageData = this.textSharpen.sharpen(
                brightnessResult.imageData
            );
            
            this.updateComparison();
        } catch (error) {
            console.error('图像处理出错:', error);
        }
    }

    reset() {
        this.uploadSection.style.display = 'block';
        this.controls.style.display = 'none';
        this.previewSection.style.display = 'none';
        this.downloadBtn.style.display = 'none';
        
        this.shadowSensitivityInput.value = 50;
        this.shadowSensitivityValue.textContent = '50';
        this.brightnessBoostInput.value = 40;
        this.brightnessBoostValue.textContent = '40';
        this.sharpenStrengthInput.value = 30;
        this.sharpenStrengthValue.textContent = '30';
        
        this.brightnessCompensator.setSensitivity(50);
        this.brightnessCompensator.setBrightnessBoost(40);
        this.textSharpen.setStrength(30);
        
        this.originalImageData = null;
        this.processedImageData = null;
        this.currentImage = null;
        this.fileInput.value = '';
    }

    initComparisonSlider() {
        this.sliderHandle.addEventListener('mousedown', (e) => this.startDrag(e));
        document.addEventListener('mousemove', (e) => this.drag(e));
        document.addEventListener('mouseup', () => this.stopDrag());
        
        this.sliderHandle.addEventListener('touchstart', (e) => this.startDrag(e));
        document.addEventListener('touchmove', (e) => this.drag(e));
        document.addEventListener('touchend', () => this.stopDrag());
    }

    startDrag(e) {
        this.isDragging = true;
        e.preventDefault();
    }

    drag(e) {
        if (!this.isDragging) return;
        
        const rect = this.sliderContainer.getBoundingClientRect();
        const clientX = e.clientX || e.touches[0].clientX;
        let position = (clientX - rect.left) / rect.width;
        position = Math.max(0, Math.min(1, position));
        
        this.sliderPosition = position;
        this.updateComparison();
    }

    stopDrag() {
        this.isDragging = false;
    }

    updateComparison() {
        if (!this.originalImageData || !this.processedImageData) return;
        
        const ctx = this.comparisonCanvas.getContext('2d');
        const width = this.comparisonCanvas.width;
        const height = this.comparisonCanvas.height;
        
        const outputData = ctx.createImageData(width, height);
        
        const splitX = Math.floor(width * this.sliderPosition);
        
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const idx = (y * width + x) * 4;
                
                if (x <= splitX) {
                    outputData.data[idx] = this.originalImageData.data[idx];
                    outputData.data[idx + 1] = this.originalImageData.data[idx + 1];
                    outputData.data[idx + 2] = this.originalImageData.data[idx + 2];
                    outputData.data[idx + 3] = this.originalImageData.data[idx + 3];
                } else {
                    outputData.data[idx] = this.processedImageData.data[idx];
                    outputData.data[idx + 1] = this.processedImageData.data[idx + 1];
                    outputData.data[idx + 2] = this.processedImageData.data[idx + 2];
                    outputData.data[idx + 3] = this.processedImageData.data[idx + 3];
                }
            }
        }
        
        ctx.putImageData(outputData, 0, 0);
        
        this.sliderHandle.style.left = `${this.sliderPosition * 100}%`;
        this.sliderHandle.style.transform = 'translateX(-50%)';
    }

    downloadImage() {
        if (!this.processedImageData) return;
        
        const downloadCanvas = document.createElement('canvas');
        downloadCanvas.width = this.comparisonCanvas.width;
        downloadCanvas.height = this.comparisonCanvas.height;
        const ctx = downloadCanvas.getContext('2d');
        ctx.putImageData(this.processedImageData, 0, 0);
        
        const link = document.createElement('a');
        link.download = `shadow_removed_${Date.now()}.png`;
        link.href = downloadCanvas.toDataURL('image/png');
        link.click();
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new App();
});
