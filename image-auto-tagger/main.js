import { ImagePreprocessor } from './ImagePreprocessor.js';
import { ObjectDetector } from './ObjectDetector.js';
import { LabelMapper, IMAGENET_LABELS } from './LabelMapper.js';

class App {
    constructor() {
        console.log('=== 图片内容自动打标签工具 ===');
        
        this.currentImage = null;
        this.currentTags = [];
        this.preprocessor = new ImagePreprocessor({ targetSize: 224 });
        this.detector = new ObjectDetector();
        this.labelMapper = null;
        this.modelLoaded = false;
        
        this.initElements();
        this.initEventListeners();
        this.loadAllResources();
    }

    async loadAllResources() {
        try {
            console.log('开始加载资源...');
            
            console.log('加载标准中文映射表...');
            const response = await fetch('./imagenet_labels_chinese.json');
            const standardTranslations = await response.json();
            console.log('标准中文映射表加载完成，共', Object.keys(standardTranslations).length, '条');
            
            this.labelMapper = new LabelMapper({
                standardTranslations: standardTranslations
            });
            
            this.loadModelInBackground();
            
        } catch (error) {
            console.error('资源加载失败:', error);
            console.log('使用备用翻译方法');
            this.labelMapper = new LabelMapper();
            this.loadModelInBackground();
        }
    }

    initElements() {
        this.uploadArea = document.getElementById('uploadArea');
        this.fileInput = document.getElementById('fileInput');
        this.uploadBtn = document.getElementById('uploadBtn');
        
        this.loadingSection = document.getElementById('loadingSection');
        this.loadingText = document.getElementById('loadingText');
        
        this.resultsSection = document.getElementById('resultsSection');
        this.previewImage = document.getElementById('previewImage');
        this.tagsContainer = document.getElementById('tagsContainer');
        this.predictionsList = document.getElementById('predictionsList');
        this.uploadSection = document.getElementById('uploadSection');
        
        this.copyTagsBtn = document.getElementById('copyTagsBtn');
        this.resetBtn = document.getElementById('resetBtn');
    }

    initEventListeners() {
        if (this.uploadBtn && this.fileInput) {
            this.uploadBtn.addEventListener('click', () => this.fileInput.click());
        }
        if (this.uploadArea && this.fileInput) {
            this.uploadArea.addEventListener('click', () => this.fileInput.click());
        }
        if (this.fileInput) {
            this.fileInput.addEventListener('change', (e) => this.handleFileSelect(e));
        }
        
        if (this.uploadArea) {
            this.uploadArea.addEventListener('dragover', (e) => this.handleDragOver(e));
            this.uploadArea.addEventListener('dragleave', (e) => this.handleDragLeave(e));
            this.uploadArea.addEventListener('drop', (e) => this.handleDrop(e));
        }
        
        if (this.copyTagsBtn) {
            this.copyTagsBtn.addEventListener('click', () => this.copyTags());
        }
        if (this.resetBtn) {
            this.resetBtn.addEventListener('click', () => this.reset());
        }
    }

    async loadModelInBackground() {
        try {
            console.log('开始预加载模型...');
            await this.detector.load();
            this.modelLoaded = true;
            console.log('模型预加载完成');
        } catch (error) {
            console.warn('模型预加载失败:', error.message);
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
            this.processImage(files[0]);
        }
    }

    handleFileSelect(e) {
        const files = e.target.files;
        if (files.length > 0) {
            this.processImage(files[0]);
        }
    }

    async processImage(file) {
        if (!file.type.startsWith('image/')) {
            alert('请选择图片文件');
            return;
        }
        
        console.log('处理图片:', file.name, file.size, 'bytes');
        
        this.showLoading('正在加载图片...');
        
        try {
            const imageData = await this.loadImage(file);
            this.showLoading('正在分析图片...');
            
            const results = await this.analyzeImage(imageData);
            
            this.currentTags = results.tags;
            this.displayResults(imageData, results);
            this.showResults();
            
        } catch (error) {
            console.error('处理图片失败:', error);
            alert('处理图片失败: ' + error.message);
            this.hideLoading();
        }
    }

    loadImage(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    this.currentImage = img;
                    resolve(img);
                };
                img.onerror = () => reject(new Error('图片加载失败'));
                img.src = e.target.result;
            };
            reader.onerror = () => reject(new Error('文件读取失败'));
            reader.readAsDataURL(file);
        });
    }

    async analyzeImage(image) {
        if (!this.modelLoaded) {
            this.showLoading('正在加载 AI 模型 (首次使用)...');
            await this.detector.load();
            this.modelLoaded = true;
        }
        
        this.showLoading('正在识别图片内容...');
        
        const preprocessed = this.preprocessor.preprocess(image);
        
        console.log('\n========== 模型原始输出 ==========');
        console.log('图片尺寸:', image.width, 'x', image.height);
        
        const rawPredictions = await this.detector.detect(preprocessed, 10);
        preprocessed.dispose();
        
        console.log('\n模型返回的 Top-10 原始预测 (index, probability, className):');
        rawPredictions.forEach((pred, i) => {
            const className = IMAGENET_LABELS[pred.index] || 'unknown';
            console.log(`  ${i + 1}. [${pred.index}] ${(pred.probability * 100).toFixed(2)}% - ${className}`);
        });
        
        const predictionsWithLabels = rawPredictions.map(pred => ({
            className: IMAGENET_LABELS[pred.index] || 'unknown',
            probability: pred.probability,
            index: pred.index
        }));
        
        console.log('\n========== 标签映射过程 ==========');
        const mappedResult = this.labelMapper.mapLabels(predictionsWithLabels, 10);
        
        console.log('\n映射后的预测结果:');
        mappedResult.predictions.forEach((pred, i) => {
            console.log(`  ${i + 1}. ${pred.label} (${(pred.confidence * 100).toFixed(2)}%) - 分类: [${pred.categories.join(', ')}]`);
        });
        
        console.log('\n最终标签:', mappedResult.tags);
        console.log('========== 调试信息结束 ==========\n');
        
        return mappedResult;
    }

    showLoading(message) {
        this.loadingText.textContent = message;
        this.loadingSection.style.display = 'block';
        this.uploadSection.style.display = 'none';
        this.resultsSection.style.display = 'none';
    }

    hideLoading() {
        this.loadingSection.style.display = 'none';
    }

    showResults() {
        this.loadingSection.style.display = 'none';
        this.uploadSection.style.display = 'none';
        this.resultsSection.style.display = 'block';
    }

    displayResults(image, results) {
        this.previewImage.src = image.src;
        
        this.renderTags(results.tags, results.predictions);
        this.renderPredictions(results.predictions);
    }

    renderTags(tags, predictions) {
        this.tagsContainer.innerHTML = '';
        
        const categoryTags = new Set();
        const specificTags = new Set();
        
        for (const pred of predictions) {
            if (pred.confidence >= 0.05) {
                specificTags.add(pred.label);
                for (const cat of pred.categories) {
                    categoryTags.add(cat);
                }
            }
        }
        
        const allTags = tags || [...categoryTags, ...specificTags];
        
        let delay = 0;
        allTags.forEach((tag, index) => {
            const tagElement = document.createElement('span');
            const isCategory = categoryTags.has(tag);
            tagElement.className = `tag ${isCategory ? 'category' : 'specific'}`;
            tagElement.textContent = tag;
            tagElement.style.animationDelay = `${delay}ms`;
            this.tagsContainer.appendChild(tagElement);
            delay += 100;
        });
        
        this.currentTags = allTags;
        console.log('生成的标签:', allTags);
    }

    renderPredictions(predictions) {
        this.predictionsList.innerHTML = '';
        
        const filteredPredictions = predictions.filter(pred => pred.confidence >= 0.05);
        
        console.log('识别详情 (仅显示置信度 ≥ 5% 的预测):');
        if (filteredPredictions.length === 0) {
            console.log('  没有满足置信度阈值的预测');
            this.predictionsList.innerHTML = '<p style="color: #666; text-align: center; padding: 20px;">没有识别到高置信度的标签</p>';
            return;
        }
        
        let delay = 0;
        filteredPredictions.forEach((pred, index) => {
            const item = document.createElement('div');
            item.className = 'prediction-item';
            item.style.animationDelay = `${delay}ms`;
            
            const confidencePercent = (pred.confidence * 100).toFixed(1);
            
            item.innerHTML = `
                <div style="flex: 1;">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                        <span class="prediction-label">${pred.label}</span>
                        <span class="prediction-confidence">${confidencePercent}%</span>
                    </div>
                    <div class="confidence-bar">
                        <div class="confidence-fill" style="width: 0%"></div>
                    </div>
                </div>
            `;
            
            this.predictionsList.appendChild(item);
            
            setTimeout(() => {
                const fill = item.querySelector('.confidence-fill');
                fill.style.width = `${confidencePercent}%`;
            }, 100);
            
            delay += 150;
            
            console.log(`  ${index + 1}. ${pred.label}: ${confidencePercent}% (原始: ${pred.classId})`);
        });
    }

    async copyTags() {
        if (this.currentTags.length === 0) {
            return;
        }
        
        const tagsText = this.currentTags.join(', ');
        
        try {
            await navigator.clipboard.writeText(tagsText);
            this.copyTagsBtn.textContent = '已复制! ✓';
            setTimeout(() => {
                this.copyTagsBtn.textContent = '复制所有标签';
            }, 2000);
            console.log('标签已复制到剪贴板:', tagsText);
        } catch (error) {
            console.error('复制失败:', error);
            alert('复制失败，请手动复制: ' + tagsText);
        }
    }

    reset() {
        this.currentImage = null;
        this.currentTags = [];
        this.fileInput.value = '';
        
        this.uploadSection.style.display = 'block';
        this.loadingSection.style.display = 'none';
        this.resultsSection.style.display = 'none';
        
        this.tagsContainer.innerHTML = '';
        this.predictionsList.innerHTML = '';
        
        console.log('已重置，可以上传新图片');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new App();
    console.log('应用初始化完成');
});
