import { KMeansSegmenter } from './KMeansSegmenter.js';
import { IlluminationNormalizer } from './IlluminationNormalizer.js';
import { ColorBoost } from './ColorBoost.js';

class App {
    constructor() {
        this.originalImageData = null;
        this.processedImageData = null;
        this.currentImage = null;
        this.sliderPosition = 0.5;
        this.isDragging = false;
        
        this.kMeansSegmenter = new KMeansSegmenter(12, 3);
        this.illuminationNormalizer = new IlluminationNormalizer(75);
        this.colorBoost = new ColorBoost(65);
        
        this.initElements();
        this.initEventListeners();
    }

    initElements() {
        this.uploadArea = document.getElementById('uploadArea');
        this.fileInput = document.getElementById('fileInput');
        this.uploadBtn = document.getElementById('uploadBtn');
        this.controls = document.getElementById('controls');
        this.previewSection = document.getElementById('previewSection');
        this.originalCanvas = document.getElementById('originalCanvas');
        this.processedCanvas = document.getElementById('processedCanvas');
        this.comparisonCanvas = document.getElementById('comparisonCanvas');
        this.comparisonSection = document.getElementById('comparison');
        this.sliderHandle = document.getElementById('sliderHandle');
        this.sliderContainer = document.querySelector('.slider-container');
        
        this.clusterIterationsInput = document.getElementById('clusterIterations');
        this.clusterIterationsValue = document.getElementById('clusterIterationsValue');
        this.illuminationStrengthInput = document.getElementById('illuminationStrength');
        this.illuminationStrengthValue = document.getElementById('illuminationStrengthValue');
        this.colorBoostStrengthInput = document.getElementById('colorBoostStrength');
        this.colorBoostStrengthValue = document.getElementById('colorBoostStrengthValue');
        this.contrastBoostInput = document.getElementById('contrastBoost');
        this.contrastBoostValue = document.getElementById('contrastBoostValue');
        
        this.processBtn = document.getElementById('processBtn');
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
        
        this.clusterIterationsInput.addEventListener('input', (e) => this.updateSliderValueOnly('cluster', e.target.value));
        this.illuminationStrengthInput.addEventListener('input', (e) => this.updateSliderValueOnly('illumination', e.target.value));
        this.colorBoostStrengthInput.addEventListener('input', (e) => this.updateSliderValueOnly('color', e.target.value));
        this.contrastBoostInput.addEventListener('input', (e) => this.updateSliderValueOnly('contrast', e.target.value));

        this.clusterIterationsInput.addEventListener('change', () => this.scheduleReProcess());
        this.illuminationStrengthInput.addEventListener('change', () => this.scheduleReProcess());
        this.colorBoostStrengthInput.addEventListener('change', () => this.scheduleReProcess());
        this.contrastBoostInput.addEventListener('change', () => this.scheduleReProcess());
        
        this.processBtn.addEventListener('click', () => this.processImage());
        this.resetBtn.addEventListener('click', () => this.reset());
        this.downloadBtn.addEventListener('click', () => this.downloadImage());
        
        this.initComparisonSlider();
    }

    updateSliderValueOnly(type, value) {
        switch(type) {
            case 'cluster':
                this.clusterIterationsValue.textContent = value;
                this.kMeansSegmenter.setIterations(parseInt(value));
                break;
            case 'illumination':
                this.illuminationStrengthValue.textContent = value;
                this.illuminationNormalizer.setStrength(parseInt(value));
                break;
            case 'color':
                this.colorBoostStrengthValue.textContent = value;
                this.colorBoost.setStrength(parseInt(value));
                break;
            case 'contrast':
                this.contrastBoostValue.textContent = value;
                this.colorBoost.setContrastBoost(parseInt(value));
                break;
        }
    }

    scheduleReProcess() {
        if (this.processedImageData) {
            this.processImage();
        }
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
                this.initCanvases(img);
                this.controls.style.display = 'block';
                this.previewSection.style.display = 'block';
                this.downloadBtn.style.display = 'none';
                this.processedImageData = null;
                this.comparisonSection.style.display = 'none';
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }

    initCanvases(img) {
        const maxWidth = 900;
        let width = img.width;
        let height = img.height;
        
        if (width > maxWidth) {
            const ratio = maxWidth / width;
            width = maxWidth;
            height = height * ratio;
        }
        
        this.originalCanvas.width = width;
        this.originalCanvas.height = height;
        this.processedCanvas.width = width;
        this.processedCanvas.height = height;
        this.comparisonCanvas.width = width;
        this.comparisonCanvas.height = height;
        
        const originalCtx = this.originalCanvas.getContext('2d');
        originalCtx.drawImage(img, 0, 0, width, height);
        
        this.originalImageData = originalCtx.getImageData(0, 0, width, height);
        
        const processedCtx = this.processedCanvas.getContext('2d');
        processedCtx.drawImage(img, 0, 0, width, height);
    }

    processImage() {
        if (!this.originalImageData) return;
        
        const width = this.originalImageData.width;
        const height = this.originalImageData.height;
        
        const inputData = new ImageData(
            new Uint8ClampedArray(this.originalImageData.data),
            width,
            height
        );

        const preNormalizeResult = this.illuminationNormalizer.preNormalize(inputData);
        
        const segmentResult = this.kMeansSegmenter.segment(preNormalizeResult.imageData);
        
        const illuminationResult = this.illuminationNormalizer.normalize(
            inputData,
            segmentResult
        );
        
        const colorResult = this.colorBoost.enhance(
            illuminationResult.imageData,
            segmentResult
        );
        
        this.processedImageData = colorResult.imageData;
        
        const processedCtx = this.processedCanvas.getContext('2d');
        processedCtx.putImageData(this.processedImageData, 0, 0);
        
        this.downloadBtn.style.display = 'block';
        this.comparisonSection.style.display = 'block';
        this.updateComparison();
    }

    reset() {
        if (!this.currentImage) return;
        
        this.clusterIterationsInput.value = 12;
        this.clusterIterationsValue.textContent = '12';
        this.illuminationStrengthInput.value = 75;
        this.illuminationStrengthValue.textContent = '75';
        this.colorBoostStrengthInput.value = 65;
        this.colorBoostStrengthValue.textContent = '65';
        this.contrastBoostInput.value = 55;
        this.contrastBoostValue.textContent = '55';
        
        this.kMeansSegmenter.setIterations(12);
        this.kMeansSegmenter.setK(3);
        this.illuminationNormalizer.setStrength(75);
        this.colorBoost.setStrength(65);
        this.colorBoost.setContrastBoost(55);
        
        this.processedImageData = null;
        this.downloadBtn.style.display = 'none';
        this.comparisonSection.style.display = 'none';
        
        this.initCanvases(this.currentImage);
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
        downloadCanvas.width = this.processedCanvas.width;
        downloadCanvas.height = this.processedCanvas.height;
        const ctx = downloadCanvas.getContext('2d');
        ctx.putImageData(this.processedImageData, 0, 0);
        
        const link = document.createElement('a');
        link.download = `enhanced_whiteboard_${Date.now()}.png`;
        link.href = downloadCanvas.toDataURL('image/png');
        link.click();
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new App();
});
