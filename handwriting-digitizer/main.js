import { ImprovedSauvola } from './ImprovedSauvola.js';
import { NoiseRemover } from './NoiseRemover.js';
import { FastSkewCorrector } from './FastSkewCorrector.js';
import { ColorInkEnhancer } from './ColorInkEnhancer.js';

class App {
    constructor() {
        console.log('App 构造函数开始...');
        
        this.originalImageData = null;
        this.processedImageData = null;
        this.skewCorrectedImageData = null;
        this.currentImage = null;
        this.sliderPosition = 0.5;
        this.isDragging = false;
        this.processingInfo = '';
        
        this.improvedSauvola = new ImprovedSauvola({
            windowSize: 31,
            k: 0.35,
            textProtection: 0.9
        });
        this.noiseRemover = new NoiseRemover({
            minPixelArea: 3
        });
        this.skewCorrector = new FastSkewCorrector();
        this.colorInkEnhancer = new ColorInkEnhancer();
        
        console.log('模块初始化完成');
        
        this.initElements();
        this.initEventListeners();
        
        console.log('App 初始化完成');
    }

    initElements() {
        console.log('开始初始化元素...');
        
        this.uploadArea = document.getElementById('uploadArea');
        console.log('uploadArea:', this.uploadArea);
        
        this.fileInput = document.getElementById('fileInput');
        console.log('fileInput:', this.fileInput);
        
        this.uploadBtn = document.getElementById('uploadBtn');
        console.log('uploadBtn:', this.uploadBtn);
        
        this.controls = document.getElementById('controls');
        this.previewSection = document.getElementById('previewSection');
        this.originalCanvas = document.getElementById('originalCanvas');
        this.processedCanvas = document.getElementById('processedCanvas');
        this.comparisonCanvas = document.getElementById('comparisonCanvas');
        this.comparisonSection = document.getElementById('comparison');
        this.sliderHandle = document.getElementById('sliderHandle');
        this.sliderContainer = document.getElementById('sliderContainer');
        this.infoPanel = document.getElementById('infoPanel');
        this.infoText = document.getElementById('infoText');
        
        console.log('sliderContainer:', this.sliderContainer);
        console.log('sliderHandle:', this.sliderHandle);
        
        this.enableSkewInput = document.getElementById('enableSkew');
        this.enableColorEnhanceInput = document.getElementById('enableColorEnhance');
        this.windowSizeInput = document.getElementById('windowSize');
        this.windowSizeValue = document.getElementById('windowSizeValue');
        this.kValueInput = document.getElementById('kValue');
        this.kValueValue = document.getElementById('kValueValue');
        this.minAreaInput = document.getElementById('minArea');
        this.minAreaValue = document.getElementById('minAreaValue');
        this.textProtectionInput = document.getElementById('textProtection');
        this.textProtectionValue = document.getElementById('textProtectionValue');
        
        this.processBtn = document.getElementById('processBtn');
        this.resetBtn = document.getElementById('resetBtn');
        this.downloadBtn = document.getElementById('downloadBtn');
        
        console.log('所有元素初始化完成');
    }

    initEventListeners() {
        console.log('开始绑定事件监听器...');
        
        if (this.uploadBtn && this.uploadBtn.addEventListener) {
            this.uploadBtn.addEventListener('click', () => this.fileInput.click());
        }
        if (this.uploadArea && this.uploadArea.addEventListener) {
            this.uploadArea.addEventListener('click', () => this.fileInput.click());
        }
        if (this.fileInput && this.fileInput.addEventListener) {
            this.fileInput.addEventListener('change', (e) => this.handleFileSelect(e));
        }
        
        if (this.uploadArea && this.uploadArea.addEventListener) {
            this.uploadArea.addEventListener('dragover', (e) => this.handleDragOver(e));
            this.uploadArea.addEventListener('dragleave', (e) => this.handleDragLeave(e));
            this.uploadArea.addEventListener('drop', (e) => this.handleDrop(e));
        }
        
        if (this.windowSizeInput && this.windowSizeInput.addEventListener) {
            this.windowSizeInput.addEventListener('input', (e) => this.updateSliderValue('windowSize', e.target.value));
        }
        if (this.kValueInput && this.kValueInput.addEventListener) {
            this.kValueInput.addEventListener('input', (e) => this.updateSliderValue('kValue', e.target.value));
        }
        if (this.minAreaInput && this.minAreaInput.addEventListener) {
            this.minAreaInput.addEventListener('input', (e) => this.updateSliderValue('minArea', e.target.value));
        }
        if (this.textProtectionInput && this.textProtectionInput.addEventListener) {
            this.textProtectionInput.addEventListener('input', (e) => this.updateSliderValue('textProtection', e.target.value));
        }
        
        if (this.processBtn && this.processBtn.addEventListener) {
            this.processBtn.addEventListener('click', () => this.processImage());
        }
        if (this.resetBtn && this.resetBtn.addEventListener) {
            this.resetBtn.addEventListener('click', () => this.reset());
        }
        if (this.downloadBtn && this.downloadBtn.addEventListener) {
            this.downloadBtn.addEventListener('click', () => this.downloadImage());
        }
        
        this.initComparisonSlider();
        
        console.log('所有事件监听器绑定完成');
    }

    initComparisonSlider() {
        console.log('初始化比较滑块...');
        console.log('sliderHandle:', this.sliderHandle);
        
        if (this.sliderHandle && this.sliderHandle.addEventListener) {
            this.sliderHandle.addEventListener('mousedown', (e) => this.startDrag(e));
            this.sliderHandle.addEventListener('touchstart', (e) => this.startDrag(e));
        }
        
        document.addEventListener('mousemove', (e) => this.drag(e));
        document.addEventListener('mouseup', () => this.stopDrag());
        document.addEventListener('touchmove', (e) => this.drag(e));
        document.addEventListener('touchend', () => this.stopDrag());
        
        console.log('比较滑块初始化完成');
    }

    updateSliderValue(type, value) {
        const intValue = parseInt(value);
        
        if (type === 'windowSize') {
            if (this.windowSizeValue) {
                this.windowSizeValue.textContent = value;
            }
            this.improvedSauvola.setWindowSize(intValue);
        } else if (type === 'kValue') {
            const k = intValue / 100;
            if (this.kValueValue) {
                this.kValueValue.textContent = k.toFixed(2);
            }
            this.improvedSauvola.setK(k);
        } else if (type === 'minArea') {
            if (this.minAreaValue) {
                this.minAreaValue.textContent = value;
            }
            this.noiseRemover.setMinPixelArea(intValue);
        } else if (type === 'textProtection') {
            const protection = intValue / 100;
            if (this.textProtectionValue) {
                this.textProtectionValue.textContent = protection.toFixed(2);
            }
            this.improvedSauvola.setTextProtection(protection);
        }
        
        if (this.processedImageData) {
            this.processImage();
        }
    }

    handleDragOver(e) {
        e.preventDefault();
        e.stopPropagation();
        if (this.uploadArea) {
            this.uploadArea.classList.add('dragover');
        }
    }

    handleDragLeave(e) {
        e.preventDefault();
        e.stopPropagation();
        if (this.uploadArea) {
            this.uploadArea.classList.remove('dragover');
        }
    }

    handleDrop(e) {
        e.preventDefault();
        e.stopPropagation();
        if (this.uploadArea) {
            this.uploadArea.classList.remove('dragover');
        }
        
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
        const self = this;
        
        reader.onload = function(e) {
            const img = new Image();
            img.onload = function() {
                self.currentImage = img;
                self.initCanvases(img);
                if (self.controls) {
                    self.controls.style.display = 'block';
                }
                if (self.previewSection) {
                    self.previewSection.style.display = 'block';
                }
                if (self.downloadBtn) {
                    self.downloadBtn.style.display = 'none';
                }
                self.processedImageData = null;
                self.skewCorrectedImageData = null;
                if (self.comparisonSection) {
                    self.comparisonSection.style.display = 'none';
                }
                if (self.infoPanel) {
                    self.infoPanel.style.display = 'none';
                }
            };
            img.src = e.target.result;
        };
        
        reader.readAsDataURL(file);
    }

    initCanvases(img) {
        const maxWidth = 700;
        let w = img.width;
        let h = img.height;
        
        if (w > maxWidth) {
            const ratio = maxWidth / w;
            w = maxWidth;
            h = Math.round(h * ratio);
        }
        
        if (this.originalCanvas) {
            this.originalCanvas.width = w;
            this.originalCanvas.height = h;
        }
        if (this.processedCanvas) {
            this.processedCanvas.width = w;
            this.processedCanvas.height = h;
        }
        if (this.comparisonCanvas) {
            this.comparisonCanvas.width = w;
            this.comparisonCanvas.height = h;
        }
        
        if (this.originalCanvas) {
            const originalCtx = this.originalCanvas.getContext('2d');
            originalCtx.drawImage(img, 0, 0, w, h);
            this.originalImageData = originalCtx.getImageData(0, 0, w, h);
        }
        
        if (this.processedCanvas) {
            const processedCtx = this.processedCanvas.getContext('2d');
            processedCtx.drawImage(img, 0, 0, w, h);
        }
    }

    async processImage() {
        if (!this.originalImageData) {
            console.warn('没有原始图像数据');
            return;
        }
        
        if (this.processBtn) {
            this.processBtn.textContent = '处理中...';
            this.processBtn.disabled = true;
        }
        
        const self = this;
        
        try {
            await new Promise(resolve => setTimeout(resolve, 50));
            
            console.log('=== 开始图像处理 ===');
            console.log('原始图像:', this.originalImageData.width, 'x', this.originalImageData.height);
            
            let currentWidth = this.originalImageData.width;
            let currentHeight = this.originalImageData.height;
            let currentData = new Uint8ClampedArray(this.originalImageData.data);
            
            const steps = [];
            
            if (this.enableSkewInput && this.enableSkewInput.checked) {
                console.log('1. 开始倾斜校正...');
                const skewInput = { width: currentWidth, height: currentHeight, data: currentData };
                const skewResult = this.skewCorrector.apply(skewInput);
                console.log('   倾斜校正完成:', skewResult.imageData.width, 'x', skewResult.imageData.height, '角度:', skewResult.angle);
                currentData = skewResult.imageData.data;
                currentWidth = skewResult.imageData.width;
                currentHeight = skewResult.imageData.height;
                
                if (skewResult.corrected) {
                    steps.push('✓ 倾斜校正 (' + skewResult.angle.toFixed(2) + '°)');
                } else {
                    steps.push('○ 图像已基本水平 (' + skewResult.angle.toFixed(2) + '°)');
                }
                
                this.skewCorrectedImageData = { 
                    width: currentWidth, 
                    height: currentHeight, 
                    data: new Uint8ClampedArray(currentData) 
                };
            }
            
            if (this.enableColorEnhanceInput && this.enableColorEnhanceInput.checked) {
                console.log('2. 开始多色字迹增强...');
                const colorInput = { width: currentWidth, height: currentHeight, data: currentData };
                const colorResult = this.colorInkEnhancer.apply(colorInput);
                console.log('   颜色增强完成');
                currentData = colorResult.imageData.data;
                steps.push('✓ 多色字迹增强');
            }
            
            console.log('3. 开始改进版 Sauvola 二值化...');
            const binInput = { width: currentWidth, height: currentHeight, data: currentData };
            const binResult = this.improvedSauvola.apply(binInput);
            console.log('   二值化完成:', binResult.imageData.width, 'x', binResult.imageData.height);
            currentData = binResult.imageData.data;
            currentWidth = binResult.imageData.width;
            currentHeight = binResult.imageData.height;
            steps.push('✓ 改进版 Sauvola 二值化');
            
            console.log('4. 开始噪点去除...');
            const noiseInput = { width: currentWidth, height: currentHeight, data: currentData };
            const noiseResult = this.noiseRemover.apply(noiseInput);
            console.log('   噪点去除完成:', noiseResult.imageData.width, 'x', noiseResult.imageData.height);
            currentData = noiseResult.imageData.data;
            currentWidth = noiseResult.imageData.width;
            currentHeight = noiseResult.imageData.height;
            steps.push('✓ 噪点去除');
            
            this.processingInfo = steps.join(' | ');
            
            this.processedImageData = { width: currentWidth, height: currentHeight, data: currentData };
            
            console.log('5. 渲染到画布...');
            if (this.processedCanvas) {
                const processedCtx = this.processedCanvas.getContext('2d');
                this.processedCanvas.width = currentWidth;
                this.processedCanvas.height = currentHeight;
                
                const tempCanvas = document.createElement('canvas');
                tempCanvas.width = currentWidth;
                tempCanvas.height = currentHeight;
                const tempCtx = tempCanvas.getContext('2d');
                const imageDataObj = tempCtx.createImageData(currentWidth, currentHeight);
                imageDataObj.data.set(currentData);
                tempCtx.putImageData(imageDataObj, 0, 0);
                
                processedCtx.drawImage(tempCanvas, 0, 0);
            }
            
            if (this.downloadBtn) {
                this.downloadBtn.style.display = 'block';
            }
            if (this.comparisonSection) {
                this.comparisonSection.style.display = 'block';
            }
            if (this.infoPanel) {
                this.infoPanel.style.display = 'block';
            }
            if (this.infoText) {
                this.infoText.textContent = this.processingInfo;
            }
            
            this.updateComparison();
            this.updateSliderHandle();
            
            console.log('=== 图像处理完成 ===');
            
        } catch (error) {
            console.error('图像处理出错:', error);
            console.error('错误消息:', error.message);
            console.error('错误堆栈:', error.stack);
            alert('图像处理失败: ' + error.message);
        } finally {
            if (this.processBtn) {
                this.processBtn.textContent = '处理图片';
                this.processBtn.disabled = false;
            }
        }
    }

    updateSliderHandle() {
        if (this.sliderHandle) {
            this.sliderHandle.style.left = (this.sliderPosition * 100) + '%';
            this.sliderHandle.style.transform = 'translateX(-50%)';
        }
    }

    reset() {
        if (!this.currentImage) {
            return;
        }
        
        if (this.windowSizeInput) {
            this.windowSizeInput.value = 31;
        }
        if (this.windowSizeValue) {
            this.windowSizeValue.textContent = '31';
        }
        if (this.kValueInput) {
            this.kValueInput.value = 35;
        }
        if (this.kValueValue) {
            this.kValueValue.textContent = '0.35';
        }
        if (this.minAreaInput) {
            this.minAreaInput.value = 3;
        }
        if (this.minAreaValue) {
            this.minAreaValue.textContent = '3';
        }
        if (this.textProtectionInput) {
            this.textProtectionInput.value = 90;
        }
        if (this.textProtectionValue) {
            this.textProtectionValue.textContent = '0.90';
        }
        if (this.enableSkewInput) {
            this.enableSkewInput.checked = true;
        }
        if (this.enableColorEnhanceInput) {
            this.enableColorEnhanceInput.checked = true;
        }
        
        this.improvedSauvola.setWindowSize(31);
        this.improvedSauvola.setK(0.35);
        this.improvedSauvola.setTextProtection(0.9);
        this.noiseRemover.setMinPixelArea(3);
        
        this.processedImageData = null;
        this.skewCorrectedImageData = null;
        if (this.downloadBtn) {
            this.downloadBtn.style.display = 'none';
        }
        if (this.comparisonSection) {
            this.comparisonSection.style.display = 'none';
        }
        if (this.infoPanel) {
            this.infoPanel.style.display = 'none';
        }
        
        this.initCanvases(this.currentImage);
    }

    startDrag(e) {
        this.isDragging = true;
        e.preventDefault();
    }

    drag(e) {
        if (!this.isDragging) {
            return;
        }
        if (!this.sliderContainer) {
            return;
        }
        
        const rect = this.sliderContainer.getBoundingClientRect();
        let clientX = e.clientX;
        if (!clientX && e.touches && e.touches[0]) {
            clientX = e.touches[0].clientX;
        }
        if (clientX === undefined) {
            return;
        }
        
        let position = (clientX - rect.left) / rect.width;
        position = Math.max(0, Math.min(1, position));
        
        this.sliderPosition = position;
        this.updateComparison();
        this.updateSliderHandle();
    }

    stopDrag() {
        this.isDragging = false;
    }

    updateComparison() {
        if (!this.processedImageData || !this.comparisonCanvas) {
            return;
        }
        
        const ctx = this.comparisonCanvas.getContext('2d');
        const compWidth = this.comparisonCanvas.width;
        const compHeight = this.comparisonCanvas.height;
        
        const outputData = ctx.createImageData(compWidth, compHeight);
        
        const splitX = Math.floor(compWidth * this.sliderPosition);
        
        let baseImage;
        if (this.skewCorrectedImageData) {
            baseImage = this.skewCorrectedImageData;
        } else {
            baseImage = this.originalImageData;
        }
        
        const baseW = baseImage.width;
        const baseH = baseImage.height;
        
        const procW = this.processedImageData.width;
        const procH = this.processedImageData.height;
        
        for (let y = 0; y < compHeight; y++) {
            for (let x = 0; x < compWidth; x++) {
                const outIdx = (y * compWidth + x) * 4;
                
                if (x <= splitX) {
                    const srcX = Math.floor((x / compWidth) * baseW);
                    const srcY = Math.floor((y / compHeight) * baseH);
                    
                    if (srcX >= 0 && srcX < baseW && srcY >= 0 && srcY < baseH) {
                        const srcIdx = (srcY * baseW + srcX) * 4;
                        outputData.data[outIdx] = baseImage.data[srcIdx];
                        outputData.data[outIdx + 1] = baseImage.data[srcIdx + 1];
                        outputData.data[outIdx + 2] = baseImage.data[srcIdx + 2];
                        outputData.data[outIdx + 3] = 255;
                    } else {
                        outputData.data[outIdx] = 255;
                        outputData.data[outIdx + 1] = 255;
                        outputData.data[outIdx + 2] = 255;
                        outputData.data[outIdx + 3] = 255;
                    }
                } else {
                    const srcX = Math.floor((x / compWidth) * procW);
                    const srcY = Math.floor((y / compHeight) * procH);
                    
                    if (srcX >= 0 && srcX < procW && srcY >= 0 && srcY < procH) {
                        const srcIdx = (srcY * procW + srcX) * 4;
                        outputData.data[outIdx] = this.processedImageData.data[srcIdx];
                        outputData.data[outIdx + 1] = this.processedImageData.data[srcIdx + 1];
                        outputData.data[outIdx + 2] = this.processedImageData.data[srcIdx + 2];
                        outputData.data[outIdx + 3] = 255;
                    } else {
                        outputData.data[outIdx] = 255;
                        outputData.data[outIdx + 1] = 255;
                        outputData.data[outIdx + 2] = 255;
                        outputData.data[outIdx + 3] = 255;
                    }
                }
            }
        }
        
        ctx.putImageData(outputData, 0, 0);
    }

    downloadImage() {
        if (!this.processedImageData) {
            return;
        }
        
        const downloadCanvas = document.createElement('canvas');
        downloadCanvas.width = this.processedImageData.width;
        downloadCanvas.height = this.processedImageData.height;
        const ctx = downloadCanvas.getContext('2d');
        const imageDataObj = ctx.createImageData(
            this.processedImageData.width,
            this.processedImageData.height
        );
        imageDataObj.data.set(this.processedImageData.data);
        ctx.putImageData(imageDataObj, 0, 0);
        
        const link = document.createElement('a');
        link.download = 'digitized_note_' + Date.now() + '.png';
        link.href = downloadCanvas.toDataURL('image/png');
        link.click();
    }
}

console.log('手写笔记数字化工具加载中...');
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM 已加载，初始化应用...');
    new App();
});
