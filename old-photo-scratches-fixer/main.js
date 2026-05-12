import { DefectScanner } from './DefectScanner.js';
import { TextureSynthesizer } from './TextureSynthesizer.js';
import { FeatherBlender } from './FeatherBlender.js';

class App {
    constructor() {
        console.log('=== 老照片划痕自动修复工具 ===');
        
        this.currentImage = null;
        this.currentImageData = null;
        this.defectMask = null;
        this.binaryMask = null;
        this.resultImageData = null;
        
        this.sliderPosition = 0.5;
        this.isDragging = false;
        
        this.initElements();
        this.initEventListeners();
        this.createProcessors();
    }

    initElements() {
        this.uploadArea = document.getElementById('uploadArea');
        this.fileInput = document.getElementById('fileInput');
        this.uploadBtn = document.getElementById('uploadBtn');
        this.controls = document.getElementById('controls');
        this.previewSection = document.getElementById('previewSection');
        
        this.originalCanvas = document.getElementById('originalCanvas');
        this.resultCanvas = document.getElementById('resultCanvas');
        this.maskCanvas = document.getElementById('maskCanvas');
        this.comparisonCanvas = document.getElementById('comparisonCanvas');
        this.sliderHandle = document.getElementById('sliderHandle');
        
        this.resultPreviewBox = document.getElementById('resultPreviewBox');
        this.maskPreviewBox = document.getElementById('maskPreviewBox');
        this.comparisonSection = document.getElementById('comparisonSection');
        
        this.brightnessThresholdInput = document.getElementById('brightnessThreshold');
        this.brightnessThresholdValue = document.getElementById('brightnessThresholdValue');
        this.darkStainThresholdInput = document.getElementById('darkStainThreshold');
        this.darkStainThresholdValue = document.getElementById('darkStainThresholdValue');
        this.localContrastThresholdInput = document.getElementById('localContrastThreshold');
        this.localContrastThresholdValue = document.getElementById('localContrastThresholdValue');
        this.edgeStrengthThresholdInput = document.getElementById('edgeStrengthThreshold');
        this.edgeStrengthThresholdValue = document.getElementById('edgeStrengthThresholdValue');
        this.colorVarianceThresholdInput = document.getElementById('colorVarianceThreshold');
        this.colorVarianceThresholdValue = document.getElementById('colorVarianceThresholdValue');
        this.colorDistanceThresholdInput = document.getElementById('colorDistanceThreshold');
        this.colorDistanceThresholdValue = document.getElementById('colorDistanceThresholdValue');
        this.minDefectSizeInput = document.getElementById('minDefectSize');
        this.minDefectSizeValue = document.getElementById('minDefectSizeValue');
        this.maxDefectSizeInput = document.getElementById('maxDefectSize');
        this.maxDefectSizeValue = document.getElementById('maxDefectSizeValue');
        this.localWindowSizeInput = document.getElementById('localWindowSize');
        this.localWindowSizeValue = document.getElementById('localWindowSizeValue');
        this.patchSizeInput = document.getElementById('patchSize');
        this.patchSizeValue = document.getElementById('patchSizeValue');
        this.featherRadiusInput = document.getElementById('featherRadius');
        this.featherRadiusValue = document.getElementById('featherRadiusValue');
        this.blendStrengthInput = document.getElementById('blendStrength');
        this.blendStrengthValue = document.getElementById('blendStrengthValue');
        
        this.detectDarkStainsInput = document.getElementById('detectDarkStains');
        this.useEdgeValidationInput = document.getElementById('useEdgeValidation');
        this.useColorValidationInput = document.getElementById('useColorValidation');
        
        this.previewMaskBtn = document.getElementById('previewMaskBtn');
        this.repairBtn = document.getElementById('repairBtn');
        this.resetBtn = document.getElementById('resetBtn');
        this.resetParamsBtn = document.getElementById('resetParamsBtn');
        this.downloadBtn = document.getElementById('downloadBtn');
        
        this.statusMessage = document.getElementById('statusMessage');
    }

    createProcessors() {
        this.defectScanner = new DefectScanner({
            brightnessThreshold: parseInt(this.brightnessThresholdInput.value),
            darkStainThreshold: parseInt(this.darkStainThresholdInput.value),
            colorDistanceThreshold: parseInt(this.colorDistanceThresholdInput.value),
            localContrastThreshold: parseInt(this.localContrastThresholdInput.value),
            edgeStrengthThreshold: parseInt(this.edgeStrengthThresholdInput.value),
            colorVarianceThreshold: parseInt(this.colorVarianceThresholdInput.value),
            minDefectSize: parseInt(this.minDefectSizeInput.value),
            maxDefectSize: parseInt(this.maxDefectSizeInput.value),
            localWindowSize: parseInt(this.localWindowSizeInput.value),
            detectDarkStains: this.detectDarkStainsInput.checked,
            useEdgeValidation: this.useEdgeValidationInput.checked,
            useColorValidation: this.useColorValidationInput.checked
        });
        
        this.textureSynthesizer = new TextureSynthesizer({
            patchSize: parseInt(this.patchSizeInput.value)
        });
        
        this.featherBlender = new FeatherBlender({
            featherRadius: parseInt(this.featherRadiusInput.value),
            blendStrength: parseInt(this.blendStrengthInput.value) / 100
        });
    }

    initEventListeners() {
        this.uploadBtn.addEventListener('click', () => this.fileInput.click());
        this.uploadArea.addEventListener('click', () => this.fileInput.click());
        this.fileInput.addEventListener('change', (e) => this.handleFileSelect(e));
        
        this.uploadArea.addEventListener('dragover', (e) => this.handleDragOver(e));
        this.uploadArea.addEventListener('dragleave', (e) => this.handleDragLeave(e));
        this.uploadArea.addEventListener('drop', (e) => this.handleDrop(e));
        
        this.brightnessThresholdInput.addEventListener('input', (e) => 
            this.updateParamValue('brightnessThreshold', e.target.value));
        this.darkStainThresholdInput.addEventListener('input', (e) => 
            this.updateParamValue('darkStainThreshold', e.target.value));
        this.localContrastThresholdInput.addEventListener('input', (e) => 
            this.updateParamValue('localContrastThreshold', e.target.value));
        this.edgeStrengthThresholdInput.addEventListener('input', (e) => 
            this.updateParamValue('edgeStrengthThreshold', e.target.value));
        this.colorVarianceThresholdInput.addEventListener('input', (e) => 
            this.updateParamValue('colorVarianceThreshold', e.target.value));
        this.colorDistanceThresholdInput.addEventListener('input', (e) => 
            this.updateParamValue('colorDistanceThreshold', e.target.value));
        this.minDefectSizeInput.addEventListener('input', (e) => 
            this.updateParamValue('minDefectSize', e.target.value));
        this.maxDefectSizeInput.addEventListener('input', (e) => 
            this.updateParamValue('maxDefectSize', e.target.value));
        this.localWindowSizeInput.addEventListener('input', (e) => 
            this.updateParamValue('localWindowSize', e.target.value));
        this.patchSizeInput.addEventListener('input', (e) => 
            this.updateParamValue('patchSize', e.target.value));
        this.featherRadiusInput.addEventListener('input', (e) => 
            this.updateParamValue('featherRadius', e.target.value));
        this.blendStrengthInput.addEventListener('input', (e) => 
            this.updateParamValue('blendStrength', e.target.value));
        
        this.detectDarkStainsInput.addEventListener('change', (e) => 
            this.updateCheckboxParam('detectDarkStains', e.target.checked));
        this.useEdgeValidationInput.addEventListener('change', (e) => 
            this.updateCheckboxParam('useEdgeValidation', e.target.checked));
        this.useColorValidationInput.addEventListener('change', (e) => 
            this.updateCheckboxParam('useColorValidation', e.target.checked));
        
        this.previewMaskBtn.addEventListener('click', () => this.previewMask());
        this.repairBtn.addEventListener('click', () => this.repair());
        this.resetBtn.addEventListener('click', () => this.reset());
        this.resetParamsBtn.addEventListener('click', () => this.resetParams());
        this.downloadBtn.addEventListener('click', () => this.download());
        
        this.comparisonCanvas.addEventListener('mousedown', (e) => this.startDrag(e));
        this.sliderHandle.addEventListener('mousedown', (e) => this.startDrag(e));
        document.addEventListener('mousemove', (e) => this.onDrag(e));
        document.addEventListener('mouseup', () => this.stopDrag());
        
        this.comparisonCanvas.addEventListener('touchstart', (e) => this.startDrag(e));
        document.addEventListener('touchmove', (e) => this.onDrag(e));
        document.addEventListener('touchend', () => this.stopDrag());
    }

    updateParamValue(type, value) {
        const intValue = parseInt(value);
        
        const valueElements = {
            brightnessThreshold: this.brightnessThresholdValue,
            darkStainThreshold: this.darkStainThresholdValue,
            colorDistanceThreshold: this.colorDistanceThresholdValue,
            localContrastThreshold: this.localContrastThresholdValue,
            edgeStrengthThreshold: this.edgeStrengthThresholdValue,
            colorVarianceThreshold: this.colorVarianceThresholdValue,
            minDefectSize: this.minDefectSizeValue,
            maxDefectSize: this.maxDefectSizeValue,
            localWindowSize: this.localWindowSizeValue,
            patchSize: this.patchSizeValue,
            featherRadius: this.featherRadiusValue,
            blendStrength: this.blendStrengthValue
        };
        
        if (valueElements[type]) {
            valueElements[type].textContent = value;
        }
        
        if (this.defectScanner) {
            this.defectScanner[type] = intValue;
        }
        
        if (this.textureSynthesizer && type === 'patchSize') {
            this.textureSynthesizer.patchSize = intValue;
        }
        
        if (this.featherBlender) {
            if (type === 'featherRadius') {
                this.featherBlender.featherRadius = intValue;
            } else if (type === 'blendStrength') {
                this.featherBlender.blendStrength = intValue / 100;
            }
        }
    }

    updateCheckboxParam(type, value) {
        if (this.defectScanner) {
            this.defectScanner[type] = value;
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
        
        console.log('加载图片:', file.name, file.size, 'bytes');
        this.showStatus('正在加载图片...');
        
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                this.currentImage = img;
                console.log('图片加载完成:', img.width, 'x', img.height);
                
                this.initCanvases(img);
                this.controls.style.display = 'block';
                this.previewSection.style.display = 'block';
                this.resultPreviewBox.style.display = 'none';
                this.maskPreviewBox.style.display = 'none';
                this.comparisonSection.style.display = 'none';
                this.downloadBtn.style.display = 'none';
                this.hideStatus();
            };
            img.onerror = () => {
                alert('图片加载失败，请重试');
                console.error('图片加载失败');
                this.hideStatus();
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }

    initCanvases(img) {
        const maxWidth = 1200;
        let displayWidth = img.width;
        let displayHeight = img.height;
        
        if (displayWidth > maxWidth) {
            const ratio = maxWidth / displayWidth;
            displayWidth = maxWidth;
            displayHeight = Math.round(displayHeight * ratio);
        }
        
        console.log('画布尺寸:', displayWidth, 'x', displayHeight);
        
        this.originalCanvas.width = displayWidth;
        this.originalCanvas.height = displayHeight;
        this.resultCanvas.width = displayWidth;
        this.resultCanvas.height = displayHeight;
        this.maskCanvas.width = displayWidth;
        this.maskCanvas.height = displayHeight;
        
        const originalCtx = this.originalCanvas.getContext('2d');
        originalCtx.drawImage(img, 0, 0, displayWidth, displayHeight);
        
        this.currentImageData = originalCtx.getImageData(0, 0, displayWidth, displayHeight);
    }

    showStatus(message) {
        this.statusMessage.textContent = message;
        this.statusMessage.style.display = 'block';
    }

    hideStatus() {
        this.statusMessage.style.display = 'none';
    }

    previewMask() {
        if (!this.currentImageData) {
            console.error('没有加载图片');
            return;
        }
        
        this.previewMaskBtn.textContent = '检测中...';
        this.previewMaskBtn.disabled = true;
        this.showStatus('正在检测缺陷区域...');
        
        setTimeout(() => {
            try {
                console.log('=== 开始缺陷检测 ===');
                
                this.createProcessors();
                
                const result = this.defectScanner.scan(this.currentImageData);
                this.defectMask = result.maskData;
                this.binaryMask = result.binaryMask;
                
                console.log('检测到', result.regions.length, '个缺陷区域');
                
                this.maskPreviewBox.style.display = 'block';
                
                const maskCtx = this.maskCanvas.getContext('2d');
                maskCtx.clearRect(0, 0, this.maskCanvas.width, this.maskCanvas.height);
                maskCtx.putImageData(this.currentImageData, 0, 0);
                
                const tempCanvas = document.createElement('canvas');
                tempCanvas.width = this.defectMask.width;
                tempCanvas.height = this.defectMask.height;
                const tempCtx = tempCanvas.getContext('2d');
                tempCtx.putImageData(this.defectMask, 0, 0);
                
                maskCtx.globalAlpha = 0.7;
                maskCtx.drawImage(tempCanvas, 0, 0);
                maskCtx.globalAlpha = 1;
                
                if (result.regions.length === 0) {
                    this.showStatus('未检测到明显的缺陷区域，请调整参数重试');
                    setTimeout(() => this.hideStatus(), 2000);
                } else {
                    this.showStatus(`检测到 ${result.regions.length} 个缺陷区域`);
                    setTimeout(() => this.hideStatus(), 2000);
                }
                
            } catch (error) {
                console.error('缺陷检测出错:', error);
                alert('检测失败：' + error.message + '\n请查看控制台获取详细信息');
                this.hideStatus();
            } finally {
                this.previewMaskBtn.textContent = '预览检测区域';
                this.previewMaskBtn.disabled = false;
            }
        }, 100);
    }

    repair() {
        if (!this.currentImageData) {
            console.error('没有加载图片');
            return;
        }
        
        this.repairBtn.textContent = '修复中...';
        this.repairBtn.disabled = true;
        this.showStatus('正在修复照片...');
        
        setTimeout(() => {
            try {
                console.log('=== 开始照片修复 ===');
                
                if (!this.defectMask) {
                    this.createProcessors();
                    const result = this.defectScanner.scan(this.currentImageData);
                    this.defectMask = result.maskData;
                    this.binaryMask = result.binaryMask;
                    console.log('内部检测到', result.regions.length, '个缺陷区域');
                }
                
                const defectPixelCount = this.binaryMask.reduce((a, b) => a + b, 0);
                console.log('待修复像素数:', defectPixelCount);
                
                if (defectPixelCount === 0) {
                    this.resultImageData = this.currentImageData;
                    this.showStatus('未检测到需要修复的缺陷');
                    setTimeout(() => this.hideStatus(), 2000);
                } else {
                    this.createProcessors();
                    
                    console.log('执行纹理合成...');
                    this.showStatus('正在填充纹理...');
                    
                    const workingBinaryMask = new Uint8Array(this.binaryMask);
                    const synthesized = this.textureSynthesizer.inpaint(
                        this.currentImageData, 
                        workingBinaryMask
                    );
                    
                    console.log('执行羽化融合...');
                    this.showStatus('正在平滑融合...');
                    
                    this.resultImageData = this.featherBlender.blend(
                        this.currentImageData,
                        synthesized,
                        this.binaryMask
                    );
                    
                    console.log('修复完成');
                    this.hideStatus();
                }
                
                this.resultPreviewBox.style.display = 'block';
                this.comparisonSection.style.display = 'block';
                this.downloadBtn.style.display = 'inline-block';
                
                const resultCtx = this.resultCanvas.getContext('2d');
                resultCtx.putImageData(this.resultImageData, 0, 0);
                
                this.initComparisonSlider();
                
            } catch (error) {
                console.error('修复出错:', error);
                alert('修复失败：' + error.message + '\n请查看控制台获取详细信息');
                this.hideStatus();
            } finally {
                this.repairBtn.textContent = '开始修复';
                this.repairBtn.disabled = false;
            }
        }, 100);
    }

    initComparisonSlider() {
        const canvas = this.comparisonCanvas;
        const ctx = canvas.getContext('2d');
        
        canvas.width = this.currentImageData.width;
        canvas.height = this.currentImageData.height;
        
        this.sliderPosition = 0.5;
        this.updateSliderPosition();
        this.updateComparisonView();
    }

    updateSliderPosition() {
        const canvasWidth = this.comparisonCanvas.offsetWidth;
        const left = this.sliderPosition * canvasWidth;
        this.sliderHandle.style.left = left + 'px';
    }

    updateComparisonView() {
        const canvas = this.comparisonCanvas;
        const ctx = canvas.getContext('2d');
        
        const width = canvas.width;
        const height = canvas.height;
        const splitX = Math.floor(this.sliderPosition * width);
        
        ctx.clearRect(0, 0, width, height);
        
        ctx.putImageData(this.currentImageData, 0, 0);
        
        ctx.save();
        ctx.beginPath();
        ctx.rect(splitX, 0, width - splitX, height);
        ctx.clip();
        ctx.putImageData(this.resultImageData, 0, 0);
        ctx.restore();
        
        ctx.beginPath();
        ctx.moveTo(splitX, 0);
        ctx.lineTo(splitX, height);
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 2;
        ctx.stroke();
    }

    startDrag(e) {
        e.preventDefault();
        this.isDragging = true;
    }

    onDrag(e) {
        if (!this.isDragging) return;
        
        const canvas = this.comparisonCanvas;
        const rect = canvas.getBoundingClientRect();
        
        let clientX = e.clientX;
        if (e.touches && e.touches.length > 0) {
            clientX = e.touches[0].clientX;
        }
        
        let position = (clientX - rect.left) / rect.width;
        position = Math.max(0, Math.min(1, position));
        
        this.sliderPosition = position;
        this.updateSliderPosition();
        this.updateComparisonView();
    }

    stopDrag() {
        this.isDragging = false;
    }

    download() {
        if (!this.resultImageData) {
            console.error('没有修复结果可下载');
            return;
        }
        
        const canvas = document.createElement('canvas');
        canvas.width = this.resultImageData.width;
        canvas.height = this.resultImageData.height;
        const ctx = canvas.getContext('2d');
        ctx.putImageData(this.resultImageData, 0, 0);
        
        const link = document.createElement('a');
        link.download = 'fixed_old_photo.png';
        link.href = canvas.toDataURL('image/png');
        link.click();
        
        console.log('修复结果已下载');
    }

    resetParams() {
        console.log('恢复默认参数...');
        
        this.brightnessThresholdInput.value = 40;
        this.brightnessThresholdValue.textContent = '40';
        this.darkStainThresholdInput.value = 30;
        this.darkStainThresholdValue.textContent = '30';
        this.colorDistanceThresholdInput.value = 35;
        this.colorDistanceThresholdValue.textContent = '35';
        this.localContrastThresholdInput.value = 20;
        this.localContrastThresholdValue.textContent = '20';
        this.edgeStrengthThresholdInput.value = 25;
        this.edgeStrengthThresholdValue.textContent = '25';
        this.colorVarianceThresholdInput.value = 25;
        this.colorVarianceThresholdValue.textContent = '25';
        this.minDefectSizeInput.value = 5;
        this.minDefectSizeValue.textContent = '5';
        this.maxDefectSizeInput.value = 20000;
        this.maxDefectSizeValue.textContent = '20000';
        this.localWindowSizeInput.value = 31;
        this.localWindowSizeValue.textContent = '31';
        this.patchSizeInput.value = 15;
        this.patchSizeValue.textContent = '15';
        this.featherRadiusInput.value = 8;
        this.featherRadiusValue.textContent = '8';
        this.blendStrengthInput.value = 40;
        this.blendStrengthValue.textContent = '40';
        this.detectDarkStainsInput.checked = true;
        this.useEdgeValidationInput.checked = true;
        this.useColorValidationInput.checked = true;
        
        this.createProcessors();
        this.showStatus('参数已恢复默认');
        setTimeout(() => this.hideStatus(), 1500);
    }

    reset() {
        console.log('重置...');
        
        this.currentImage = null;
        this.currentImageData = null;
        this.defectMask = null;
        this.binaryMask = null;
        this.resultImageData = null;
        
        this.controls.style.display = 'none';
        this.previewSection.style.display = 'none';
        this.fileInput.value = '';
        
        this.hideStatus();
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new App();
    console.log('应用初始化完成');
});
