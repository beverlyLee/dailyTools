import { LeafSegmenter } from './LeafSegmenter.js';
import { SpotExtractor } from './SpotExtractor.js';
import { FeatureCalculator } from './FeatureCalculator.js';

class App {
    constructor() {
        console.log('=== 植物叶片病虫害识别辅助工具（优化版）===');
        
        this.currentImage = null;
        this.leafSegmenter = null;
        this.spotExtractor = null;
        this.featureCalculator = new FeatureCalculator();
        
        this.initElements();
        this.initEventListeners();
    }

    initElements() {
        this.uploadArea = document.getElementById('uploadArea');
        this.fileInput = document.getElementById('fileInput');
        this.uploadBtn = document.getElementById('uploadBtn');
        this.controls = document.getElementById('controls');
        this.resultsSection = document.getElementById('resultsSection');
        
        this.originalCanvas = document.getElementById('originalCanvas');
        this.segmentedCanvas = document.getElementById('segmentedCanvas');
        this.spotCanvas = document.getElementById('spotCanvas');
        
        this.kClustersInput = document.getElementById('kClusters');
        this.kClustersValue = document.getElementById('kClustersValue');
        this.yellowThresholdInput = document.getElementById('yellowThreshold');
        this.yellowThresholdValue = document.getElementById('yellowThresholdValue');
        this.brownThresholdInput = document.getElementById('brownThreshold');
        this.brownThresholdValue = document.getElementById('brownThresholdValue');
        this.redThresholdInput = document.getElementById('redThreshold');
        this.redThresholdValue = document.getElementById('redThresholdValue');
        this.whiteThresholdInput = document.getElementById('whiteThreshold');
        this.whiteThresholdValue = document.getElementById('whiteThresholdValue');
        this.grayThresholdInput = document.getElementById('grayThreshold');
        this.grayThresholdValue = document.getElementById('grayThresholdValue');
        this.useEdgeEnhancementInput = document.getElementById('useEdgeEnhancement');
        this.edgeEnhancementLabel = document.getElementById('edgeEnhancementLabel');
        this.useRelativeDetectionInput = document.getElementById('useRelativeDetection');
        this.relativeDetectionLabel = document.getElementById('relativeDetectionLabel');
        
        this.analyzeBtn = document.getElementById('analyzeBtn');
        this.resetBtn = document.getElementById('resetBtn');
        
        this.coverageRateElement = document.getElementById('coverageRate');
        this.leafStatusElement = document.getElementById('leafStatus');
        this.possibleCauseElement = document.getElementById('possibleCause');
        this.suggestionElement = document.getElementById('suggestion');
    }

    initEventListeners() {
        this.uploadBtn.addEventListener('click', () => this.fileInput.click());
        this.uploadArea.addEventListener('click', () => this.fileInput.click());
        this.fileInput.addEventListener('change', (e) => this.handleFileSelect(e));
        
        this.uploadArea.addEventListener('dragover', (e) => this.handleDragOver(e));
        this.uploadArea.addEventListener('dragleave', (e) => this.handleDragLeave(e));
        this.uploadArea.addEventListener('drop', (e) => this.handleDrop(e));
        
        this.kClustersInput.addEventListener('input', (e) => this.updateParamValue('kClusters', e.target.value));
        this.yellowThresholdInput.addEventListener('input', (e) => this.updateParamValue('yellowThreshold', e.target.value));
        this.brownThresholdInput.addEventListener('input', (e) => this.updateParamValue('brownThreshold', e.target.value));
        this.redThresholdInput.addEventListener('input', (e) => this.updateParamValue('redThreshold', e.target.value));
        this.whiteThresholdInput.addEventListener('input', (e) => this.updateParamValue('whiteThreshold', e.target.value));
        this.grayThresholdInput.addEventListener('input', (e) => this.updateParamValue('grayThreshold', e.target.value));
        this.useEdgeEnhancementInput.addEventListener('change', (e) => {
            this.edgeEnhancementLabel.textContent = e.target.checked ? '已启用' : '已禁用';
        });
        this.useRelativeDetectionInput.addEventListener('change', (e) => {
            this.relativeDetectionLabel.textContent = e.target.checked ? '已启用' : '已禁用';
        });
        
        this.analyzeBtn.addEventListener('click', () => this.analyze());
        this.resetBtn.addEventListener('click', () => this.reset());
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
                this.resultsSection.style.display = 'none';
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
        const maxWidth = 600;
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
        this.segmentedCanvas.width = displayWidth;
        this.segmentedCanvas.height = displayHeight;
        this.spotCanvas.width = displayWidth;
        this.spotCanvas.height = displayHeight;
        
        const originalCtx = this.originalCanvas.getContext('2d');
        originalCtx.drawImage(img, 0, 0, displayWidth, displayHeight);
    }

    updateParamValue(type, value) {
        const intValue = parseInt(value);
        
        switch(type) {
            case 'kClusters':
                this.kClustersValue.textContent = value;
                break;
            case 'yellowThreshold':
                this.yellowThresholdValue.textContent = value;
                break;
            case 'brownThreshold':
                this.brownThresholdValue.textContent = value;
                break;
            case 'redThreshold':
                this.redThresholdValue.textContent = value;
                break;
            case 'whiteThreshold':
                this.whiteThresholdValue.textContent = value;
                break;
            case 'grayThreshold':
                this.grayThresholdValue.textContent = value;
                break;
        }
    }

    analyze() {
        if (!this.currentImage) {
            console.error('没有加载图片');
            return;
        }
        
        this.analyzeBtn.textContent = '分析中...';
        this.analyzeBtn.disabled = true;
        
        console.log('=== 开始分析（优化版）===');
        
        setTimeout(() => {
            try {
                const analysisCanvas = document.createElement('canvas');
                analysisCanvas.width = this.currentImage.width;
                analysisCanvas.height = this.currentImage.height;
                const analysisCtx = analysisCanvas.getContext('2d');
                analysisCtx.drawImage(this.currentImage, 0, 0);
                const imageData = analysisCtx.getImageData(0, 0, analysisCanvas.width, analysisCanvas.height);
                
                console.log('分析图像尺寸:', imageData.width, 'x', imageData.height);
                
                const kClusters = parseInt(this.kClustersInput.value);
                const yellowThreshold = parseInt(this.yellowThresholdInput.value);
                const brownThreshold = parseInt(this.brownThresholdInput.value);
                const redThreshold = parseInt(this.redThresholdInput.value);
                const whiteThreshold = parseInt(this.whiteThresholdInput.value);
                const grayThreshold = parseInt(this.grayThresholdInput.value);
                const useEdgeEnhancement = this.useEdgeEnhancementInput.checked;
                const useRelativeDetection = this.useRelativeDetectionInput.checked;
                
                console.log('参数配置:');
                console.log('  K-Means 聚类数:', kClusters);
                console.log('  黄色阈值:', yellowThreshold, '%');
                console.log('  褐色阈值:', brownThreshold, '%');
                console.log('  红色阈值:', redThreshold, '%');
                console.log('  白色阈值:', whiteThreshold, '%');
                console.log('  灰色阈值:', grayThreshold, '%');
                console.log('  边缘增强:', useEdgeEnhancement);
                console.log('  相对检测:', useRelativeDetection);
                
                this.leafSegmenter = new LeafSegmenter({ k: kClusters });
                const segmentationResult = this.leafSegmenter.segment(imageData);
                
                this.spotExtractor = new SpotExtractor({
                    yellowThreshold,
                    brownThreshold,
                    redThreshold,
                    whiteThreshold,
                    grayThreshold,
                    useEdgeEnhancement,
                    useRelativeDetection
                });
                const extractionResult = this.spotExtractor.extract(
                    imageData,
                    segmentationResult.mask,
                    segmentationResult.leafPixels,
                    segmentationResult
                );
                
                const features = this.featureCalculator.calculate(
                    segmentationResult,
                    extractionResult
                );
                
                this.displayResults(
                    segmentationResult,
                    extractionResult,
                    features
                );
                
                this.resultsSection.style.display = 'block';
                
            } catch (error) {
                console.error('分析出错:', error);
                alert('分析失败：' + error.message + '\n请查看控制台获取详细信息');
            } finally {
                this.analyzeBtn.textContent = '开始分析';
                this.analyzeBtn.disabled = false;
            }
        }, 100);
    }

    displayResults(segmentationResult, extractionResult, features) {
        const displayWidth = this.originalCanvas.width;
        const displayHeight = this.originalCanvas.height;
        const scaleX = displayWidth / this.currentImage.width;
        const scaleY = displayHeight / this.currentImage.height;
        
        this.drawImageData(this.segmentedCanvas, segmentationResult.segmentedImage);
        this.drawSpotResult(extractionResult, scaleX, scaleY);
        this.drawSpotOutlines(extractionResult.spots, scaleX, scaleY);
        this.updateDiagnosisPanel(features, extractionResult);
    }

    drawImageData(canvas, imageData) {
        const ctx = canvas.getContext('2d');
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = imageData.width;
        tempCanvas.height = imageData.height;
        const tempCtx = tempCanvas.getContext('2d');
        tempCtx.putImageData(imageData, 0, 0);
        
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(tempCanvas, 0, 0, canvas.width, canvas.height);
    }

    drawSpotResult(extractionResult, scaleX, scaleY) {
        const ctx = this.spotCanvas.getContext('2d');
        
        ctx.clearRect(0, 0, this.spotCanvas.width, this.spotCanvas.height);
        ctx.drawImage(this.currentImage, 0, 0, this.spotCanvas.width, this.spotCanvas.height);
    }

    drawSpotOutlines(spots, scaleX, scaleY) {
        const ctx = this.spotCanvas.getContext('2d');
        
        const typeColors = {
            1: '#f9a825',
            2: '#6d4c41',
            3: '#e53935',
            4: '#9e9e9e',
            5: '#424242'
        };
        
        const typeLabels = {
            1: '黄',
            2: '褐',
            3: '红',
            4: '白',
            5: '灰'
        };
        
        spots.forEach((spot, index) => {
            const color = typeColors[spot.dominantType] || '#ff5252';
            const label = typeLabels[spot.dominantType] || (index + 1).toString();
            
            ctx.strokeStyle = color;
            ctx.lineWidth = 3;
            ctx.setLineDash([5, 3]);
            
            const x = Math.round(spot.bbox.x * scaleX);
            const y = Math.round(spot.bbox.y * scaleY);
            const width = Math.round(spot.bbox.width * scaleX);
            const height = Math.round(spot.bbox.height * scaleY);
            
            ctx.strokeRect(x, y, width, height);
            ctx.setLineDash([]);
            
            ctx.fillStyle = color;
            ctx.globalAlpha = 0.25;
            ctx.fillRect(x, y, width, height);
            ctx.globalAlpha = 1;
            
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 11px Arial';
            const displayLabel = `#${index + 1}${label}`;
            const labelWidth = ctx.measureText(displayLabel).width;
            
            ctx.fillStyle = color;
            ctx.fillRect(x + 2, y + 2, labelWidth + 10, 20);
            ctx.fillStyle = '#ffffff';
            ctx.fillText(displayLabel, x + 7, y + 17);
        });
    }

    updateDiagnosisPanel(features, extractionResult) {
        const coveragePercent = (features.coverageRate * 100).toFixed(2);
        this.coverageRateElement.textContent = `${coveragePercent}%`;
        
        this.leafStatusElement.textContent = features.diagnosis.statusText;
        this.leafStatusElement.className = `status ${features.diagnosis.statusClass}`;
        
        this.possibleCauseElement.textContent = features.diagnosis.possibleCause;
        this.suggestionElement.textContent = features.diagnosis.suggestion;
        
        console.log('=== 诊断结果 ===');
        console.log('病斑覆盖率:', coveragePercent + '%');
        console.log('叶片状态:', features.diagnosis.statusText);
        console.log('可能病因:', features.diagnosis.possibleCause);
        console.log('建议措施:', features.diagnosis.suggestion);
        
        if (extractionResult) {
            console.log('病斑类型分布:');
            console.log('  黄色:', extractionResult.yellow, '像素');
            console.log('  褐色:', extractionResult.brown, '像素');
            console.log('  红色:', extractionResult.red, '像素');
            console.log('  白色:', extractionResult.white, '像素');
            console.log('  灰色:', extractionResult.gray, '像素');
        }
    }

    reset() {
        if (!this.currentImage) return;
        
        console.log('重置参数...');
        
        this.kClustersInput.value = 4;
        this.kClustersValue.textContent = '4';
        this.yellowThresholdInput.value = 50;
        this.yellowThresholdValue.textContent = '50';
        this.brownThresholdInput.value = 40;
        this.brownThresholdValue.textContent = '40';
        this.redThresholdInput.value = 30;
        this.redThresholdValue.textContent = '30';
        this.whiteThresholdInput.value = 45;
        this.whiteThresholdValue.textContent = '45';
        this.grayThresholdInput.value = 50;
        this.grayThresholdValue.textContent = '50';
        this.useEdgeEnhancementInput.checked = true;
        this.edgeEnhancementLabel.textContent = '已启用';
        this.useRelativeDetectionInput.checked = true;
        this.relativeDetectionLabel.textContent = '已启用';
        
        this.resultsSection.style.display = 'none';
        
        this.initCanvases(this.currentImage);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new App();
    console.log('应用初始化完成');
});
