import { TextRegionDetector } from './MSERDetector.js';
import { GeometryFilter } from './GeometryFilter.js';
import { RegionMerger } from './RegionMerger.js';

class App {
    constructor() {
        console.log('=== 截图文字区域自动提取器 ===');
        
        this.currentImage = null;
        this.detectedRegions = [];
        this.croppedImages = [];
        
        this.textDetector = new TextRegionDetector({
            minArea: 10,
            maxArea: 100000,
            minWidth: 6,
            minHeight: 6
        });
        
        this.geometryFilter = new GeometryFilter({
            minWidth: 4,
            minHeight: 4,
            minAspectRatio: 0.01,
            maxAspectRatio: 100,
            minFillRatio: 0.001,
            maxFillRatio: 1.0,
            enableIconFiltering: false
        });
        
        this.regionMerger = new RegionMerger({
            horizontalGap: 80,
            verticalGap: 50,
            sameLineTolerance: 0.7,
            paragraphGap: 100
        });
        
        this.initElements();
        this.initEventListeners();
    }

    initElements() {
        this.uploadArea = document.getElementById('uploadArea');
        this.fileInput = document.getElementById('fileInput');
        this.uploadBtn = document.getElementById('uploadBtn');
        this.controls = document.getElementById('controls');
        this.previewSection = document.getElementById('previewSection');
        this.resultsSection = document.getElementById('resultsSection');
        this.resultsGrid = document.getElementById('resultsGrid');
        this.downloadAllSection = document.getElementById('downloadAllSection');
        
        this.originalCanvas = document.getElementById('originalCanvas');
        this.detectedCanvas = document.getElementById('detectedCanvas');
        
        this.minAreaInput = document.getElementById('minArea');
        this.minAreaValue = document.getElementById('minAreaValue');
        this.maxAreaInput = document.getElementById('maxArea');
        this.maxAreaValue = document.getElementById('maxAreaValue');
        this.horizontalGapInput = document.getElementById('horizontalGap');
        this.horizontalGapValue = document.getElementById('horizontalGapValue');
        this.verticalGapInput = document.getElementById('verticalGap');
        this.verticalGapValue = document.getElementById('verticalGapValue');
        
        this.detectBtn = document.getElementById('detectBtn');
        this.resetBtn = document.getElementById('resetBtn');
        this.downloadAllBtn = document.getElementById('downloadAllBtn');
    }

    initEventListeners() {
        this.uploadBtn.addEventListener('click', () => this.fileInput.click());
        this.uploadArea.addEventListener('click', () => this.fileInput.click());
        this.fileInput.addEventListener('change', (e) => this.handleFileSelect(e));
        
        this.uploadArea.addEventListener('dragover', (e) => this.handleDragOver(e));
        this.uploadArea.addEventListener('dragleave', (e) => this.handleDragLeave(e));
        this.uploadArea.addEventListener('drop', (e) => this.handleDrop(e));
        
        this.minAreaInput.addEventListener('input', (e) => this.updateParamValue('minArea', e.target.value));
        this.maxAreaInput.addEventListener('input', (e) => this.updateParamValue('maxArea', e.target.value));
        this.horizontalGapInput.addEventListener('input', (e) => this.updateParamValue('horizontalGap', e.target.value));
        this.verticalGapInput.addEventListener('input', (e) => this.updateParamValue('verticalGap', e.target.value));
        
        this.detectBtn.addEventListener('click', () => this.detectTextRegions());
        this.resetBtn.addEventListener('click', () => this.reset());
        this.downloadAllBtn.addEventListener('click', () => this.downloadAllRegions());
    }

    updateParamValue(type, value) {
        const intValue = parseInt(value);
        
        switch(type) {
            case 'minArea':
                this.minAreaValue.textContent = value;
                this.textDetector.minArea = intValue;
                break;
            case 'maxArea':
                this.maxAreaValue.textContent = value;
                this.textDetector.maxArea = intValue;
                break;
            case 'horizontalGap':
                this.horizontalGapValue.textContent = value;
                this.regionMerger.horizontalGap = intValue;
                break;
            case 'verticalGap':
                this.verticalGapValue.textContent = value;
                this.regionMerger.verticalGap = intValue;
                this.regionMerger.paragraphGap = intValue * 2;
                break;
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
        
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                this.currentImage = img;
                console.log('图片加载完成:', img.width, 'x', img.height);
                
                this.initCanvases(img);
                this.controls.style.display = 'block';
                this.previewSection.style.display = 'block';
                this.resultsSection.style.display = 'none';
                this.downloadAllSection.style.display = 'none';
                this.detectedRegions = [];
                this.croppedImages = [];
            };
            img.onerror = () => {
                alert('图片加载失败，请重试');
                console.error('图片加载失败');
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }

    initCanvases(img) {
        const maxWidth = 1000;
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
        this.detectedCanvas.width = displayWidth;
        this.detectedCanvas.height = displayHeight;
        
        const originalCtx = this.originalCanvas.getContext('2d');
        originalCtx.drawImage(img, 0, 0, displayWidth, displayHeight);
        
        const detectedCtx = this.detectedCanvas.getContext('2d');
        detectedCtx.drawImage(img, 0, 0, displayWidth, displayHeight);
    }

    detectTextRegions() {
        if (!this.currentImage) {
            console.error('没有加载图片');
            return;
        }
        
        this.detectBtn.textContent = '检测中...';
        this.detectBtn.disabled = true;
        
        console.log('=== 开始文字区域检测 ===');
        
        setTimeout(() => {
            try {
                const detectionCanvas = document.createElement('canvas');
                detectionCanvas.width = this.currentImage.width;
                detectionCanvas.height = this.currentImage.height;
                const detectionCtx = detectionCanvas.getContext('2d');
                detectionCtx.drawImage(this.currentImage, 0, 0);
                const imageData = detectionCtx.getImageData(0, 0, detectionCanvas.width, detectionCanvas.height);
                
                console.log('检测图像尺寸:', imageData.width, 'x', imageData.height);
                
                const detectedRegions = this.textDetector.detect(imageData);
                console.log('检测阶段完成，区域数:', detectedRegions.length);
                
                if (detectedRegions.length === 0) {
                    console.warn('检测阶段没有找到任何区域！');
                }
                
                const filteredRegions = this.geometryFilter.filter(detectedRegions);
                console.log('筛选阶段完成，区域数:', filteredRegions.length);
                
                if (filteredRegions.length === 0) {
                    console.warn('筛选后没有区域！');
                }
                
                this.detectedRegions = this.regionMerger.merge(filteredRegions);
                console.log('合并阶段完成，最终区域数:', this.detectedRegions.length);
                
                if (this.detectedRegions.length === 0) {
                    alert('没有检测到文字区域。请尝试：\n1. 减小"最小区域面积"参数\n2. 增大"最大区域面积"参数\n3. 使用不同的测试图片');
                    console.error('最终没有可用的区域');
                } else {
                    console.log('检测到的区域:', this.detectedRegions);
                }
                
                this.drawDetectedRegions();
                this.createCroppedImages();
                
                if (this.detectedRegions.length > 0) {
                    this.resultsSection.style.display = 'block';
                    if (this.croppedImages.length > 0) {
                        this.downloadAllSection.style.display = 'block';
                    }
                }
                
            } catch (error) {
                console.error('文字区域检测出错:', error);
                alert('检测失败：' + error.message + '\n请查看控制台获取详细信息');
            } finally {
                this.detectBtn.textContent = '检测文字区域';
                this.detectBtn.disabled = false;
            }
        }, 100);
    }

    drawDetectedRegions() {
        const ctx = this.detectedCanvas.getContext('2d');
        const img = this.currentImage;
        
        const maxWidth = 1000;
        let displayWidth = img.width;
        let displayHeight = img.height;
        
        if (displayWidth > maxWidth) {
            const ratio = maxWidth / displayWidth;
            displayWidth = maxWidth;
            displayHeight = Math.round(displayHeight * ratio);
        }
        
        const scaleX = displayWidth / img.width;
        const scaleY = displayHeight / img.height;
        
        console.log('绘制缩放比例:', scaleX.toFixed(3), scaleY.toFixed(3));
        
        ctx.clearRect(0, 0, this.detectedCanvas.width, this.detectedCanvas.height);
        ctx.drawImage(img, 0, 0, displayWidth, displayHeight);
        
        const colors = [
            '#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4',
            '#ffeaa7', '#dfe6e9', '#fd79a8', '#a29bfe',
            '#e17055', '#00b894', '#0984e3', '#6c5ce7'
        ];
        
        this.detectedRegions.forEach((region, index) => {
            const color = colors[index % colors.length];
            
            const x = Math.round(region.x * scaleX);
            const y = Math.round(region.y * scaleY);
            const width = Math.round(region.width * scaleX);
            const height = Math.round(region.height * scaleY);
            
            console.log('绘制区域', index + 1, ':', region.x, region.y, region.width, region.height,
                '-> 显示:', x, y, width, height);
            
            ctx.strokeStyle = color;
            ctx.lineWidth = 2;
            ctx.strokeRect(x, y, width, height);
            
            ctx.fillStyle = color;
            ctx.globalAlpha = 0.15;
            ctx.fillRect(x, y, width, height);
            ctx.globalAlpha = 1;
            
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 11px Arial';
            const label = `#${index + 1}`;
            const labelWidth = ctx.measureText(label).width;
            
            ctx.fillStyle = color;
            ctx.fillRect(x + 2, y + 2, labelWidth + 6, 16);
            ctx.fillStyle = '#ffffff';
            ctx.fillText(label, x + 5, y + 14);
        });
    }

    createCroppedImages() {
        this.resultsGrid.innerHTML = '';
        this.croppedImages = [];
        
        console.log('开始裁剪区域...');
        
        const fullCanvas = document.createElement('canvas');
        fullCanvas.width = this.currentImage.width;
        fullCanvas.height = this.currentImage.height;
        const fullCtx = fullCanvas.getContext('2d');
        fullCtx.drawImage(this.currentImage, 0, 0);
        const fullImageData = fullCtx.getImageData(0, 0, fullCanvas.width, fullCanvas.height);
        
        console.log('原图尺寸:', fullCanvas.width, 'x', fullCanvas.height);
        
        const crops = this.regionMerger.cropRegions(fullImageData, this.detectedRegions);
        
        crops.forEach((crop, index) => {
            console.log('裁剪区域', index + 1, ':', crop.imageData.width, 'x', crop.imageData.height);
            
            const canvas = document.createElement('canvas');
            canvas.width = crop.imageData.width;
            canvas.height = crop.imageData.height;
            const ctx = canvas.getContext('2d');
            
            try {
                const imgData = new ImageData(
                    crop.imageData.data, 
                    crop.imageData.width, 
                    crop.imageData.height
                );
                ctx.putImageData(imgData, 0, 0);
                
                this.croppedImages.push({
                    canvas,
                    region: crop.region,
                    index
                });
                
                const card = document.createElement('div');
                card.className = 'result-card';
                
                const title = document.createElement('div');
                title.className = 'result-title';
                title.textContent = `区域 ${index + 1} (${crop.imageData.width}x${crop.imageData.height})`;
                
                const canvasContainer = document.createElement('div');
                canvasContainer.className = 'result-canvas';
                canvasContainer.appendChild(canvas);
                
                const downloadBtn = document.createElement('button');
                downloadBtn.className = 'btn btn-small btn-primary';
                downloadBtn.textContent = '下载';
                downloadBtn.addEventListener('click', () => this.downloadRegion(index));
                
                card.appendChild(title);
                card.appendChild(canvasContainer);
                card.appendChild(downloadBtn);
                
                this.resultsGrid.appendChild(card);
            } catch (e) {
                console.error('创建裁剪区域失败:', e);
            }
        });
        
        console.log('成功创建', this.croppedImages.length, '个裁剪区域');
    }

    downloadRegion(index) {
        const crop = this.croppedImages[index];
        if (!crop) return;
        
        const link = document.createElement('a');
        link.download = `text_region_${index + 1}.png`;
        link.href = crop.canvas.toDataURL('image/png');
        link.click();
    }

    downloadAllRegions() {
        this.croppedImages.forEach((crop, index) => {
            setTimeout(() => {
                const link = document.createElement('a');
                link.download = `text_region_${index + 1}.png`;
                link.href = crop.canvas.toDataURL('image/png');
                link.click();
            }, index * 200);
        });
    }

    reset() {
        if (!this.currentImage) return;
        
        console.log('重置参数...');
        
        this.minAreaInput.value = 10;
        this.minAreaValue.textContent = '10';
        this.maxAreaInput.value = 100000;
        this.maxAreaValue.textContent = '100000';
        this.horizontalGapInput.value = 80;
        this.horizontalGapValue.textContent = '80';
        this.verticalGapInput.value = 50;
        this.verticalGapValue.textContent = '50';
        
        this.textDetector.minArea = 10;
        this.textDetector.maxArea = 100000;
        this.regionMerger.horizontalGap = 80;
        this.regionMerger.verticalGap = 50;
        this.regionMerger.paragraphGap = 100;
        
        this.detectedRegions = [];
        this.croppedImages = [];
        this.resultsSection.style.display = 'none';
        this.downloadAllSection.style.display = 'none';
        
        this.initCanvases(this.currentImage);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new App();
    console.log('应用初始化完成');
});
