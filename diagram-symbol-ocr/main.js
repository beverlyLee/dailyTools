import { ComponentSegmenter } from './ComponentSegmenter.js';
import { TemplateMatcher } from './TemplateMatcher.js';
import { ParameterReader } from './ParameterReader.js';

class App {
    constructor() {
        this.elements = {};
        this.originalImage = null;
        this.canvas = null;
        this.segmenter = null;
        this.matcher = null;
        this.parameterReader = null;
        this.currentComponents = [];
        this.currentResults = [];
        this.manualConfirmedResults = {};
        this.isProcessing = false;

        this.options = {
            matchThreshold: 0.65,
            minArea: 100
        };

        this.init();
    }

    init() {
        this.cacheElements();
        this.bindEvents();
        this.initModules();
    }

    cacheElements() {
        this.elements = {
            uploadArea: document.getElementById('uploadArea'),
            fileInput: document.getElementById('fileInput'),
            uploadBtn: document.getElementById('uploadBtn'),
            analyzeBtn: document.getElementById('analyzeBtn'),
            loadDemoBtn: document.getElementById('loadDemoBtn'),
            resetBtn: document.getElementById('resetBtn'),
            matchThreshold: document.getElementById('matchThreshold'),
            thresholdValue: document.getElementById('thresholdValue'),
            minArea: document.getElementById('minArea'),
            minAreaValue: document.getElementById('minAreaValue'),
            loadingSection: document.getElementById('loadingSection'),
            loadingText: document.getElementById('loadingText'),
            progressBar: document.getElementById('progressBar'),
            mainContent: document.getElementById('mainContent'),
            originalCanvas: document.getElementById('originalCanvas'),
            componentCount: document.getElementById('componentCount'),
            resultsContainer: document.getElementById('resultsContainer'),
            bomBody: document.getElementById('bomBody'),
            exportBomBtn: document.getElementById('exportBomBtn'),
            downloadBomBtn: document.getElementById('downloadBomBtn'),
            templatesContainer: document.getElementById('templatesContainer')
        };
    }

    bindEvents() {
        if (this.elements.uploadBtn) {
            this.elements.uploadBtn.addEventListener('click', () => {
                if (this.elements.fileInput) {
                    this.elements.fileInput.click();
                }
            });
        }

        if (this.elements.uploadArea) {
            this.elements.uploadArea.addEventListener('click', () => {
                if (this.elements.fileInput) {
                    this.elements.fileInput.click();
                }
            });

            this.elements.uploadArea.addEventListener('dragover', (e) => {
                e.preventDefault();
                this.elements.uploadArea.classList.add('dragover');
            });

            this.elements.uploadArea.addEventListener('dragleave', () => {
                this.elements.uploadArea.classList.remove('dragover');
            });

            this.elements.uploadArea.addEventListener('drop', (e) => {
                e.preventDefault();
                this.elements.uploadArea.classList.remove('dragover');
                const files = e.dataTransfer.files;
                if (files.length > 0) {
                    this.handleFile(files[0]);
                }
            });
        }

        if (this.elements.fileInput) {
            this.elements.fileInput.addEventListener('change', (e) => {
                if (e.target.files.length > 0) {
                    this.handleFile(e.target.files[0]);
                }
            });
        }

        if (this.elements.analyzeBtn) {
            this.elements.analyzeBtn.addEventListener('click', () => this.analyzeImage());
        }

        if (this.elements.loadDemoBtn) {
            this.elements.loadDemoBtn.addEventListener('click', () => this.loadDemo());
        }

        if (this.elements.resetBtn) {
            this.elements.resetBtn.addEventListener('click', () => this.reset());
        }

        if (this.elements.matchThreshold) {
            this.elements.matchThreshold.addEventListener('input', (e) => {
                this.options.matchThreshold = parseFloat(e.target.value);
                if (this.elements.thresholdValue) {
                    this.elements.thresholdValue.textContent = e.target.value;
                }
            });

            this.elements.matchThreshold.addEventListener('change', () => {
                if (this.currentComponents.length > 0 && !this.isProcessing) {
                    this.reAnalyze();
                }
            });
        }

        if (this.elements.minArea) {
            this.elements.minArea.addEventListener('input', (e) => {
                this.options.minArea = parseInt(e.target.value);
                if (this.elements.minAreaValue) {
                    this.elements.minAreaValue.textContent = e.target.value;
                }
            });

            this.elements.minArea.addEventListener('change', () => {
                if (this.currentComponents.length > 0 && !this.isProcessing) {
                    this.reAnalyze();
                }
            });
        }

        if (this.elements.exportBomBtn) {
            this.elements.exportBomBtn.addEventListener('click', () => this.exportBom());
        }

        if (this.elements.downloadBomBtn) {
            this.elements.downloadBomBtn.addEventListener('click', () => this.downloadBom());
        }
    }

    async initModules() {
        this.segmenter = new ComponentSegmenter({
            minArea: this.options.minArea
        });

        this.matcher = new TemplateMatcher({
            matchThreshold: this.options.matchThreshold
        });

        await this.matcher.loadTemplates();

        this.parameterReader = new ParameterReader();
        
        if (typeof Tesseract !== 'undefined') {
            try {
                await this.parameterReader.initOCR();
            } catch (e) {
                console.warn('OCR 初始化失败:', e);
            }
        }

        this.renderTemplates();
    }

    renderTemplates() {
        const templates = this.matcher.getTemplates();
        if (!this.elements.templatesContainer) return;

        this.elements.templatesContainer.innerHTML = '';
        
        templates.forEach(template => {
            const item = document.createElement('div');
            item.className = 'template-item';
            
            const canvas = template.symbol;
            canvas.style.margin = '0 auto';
            
            const name = document.createElement('div');
            name.className = 'template-name';
            name.textContent = template.name;
            
            const category = document.createElement('div');
            category.className = 'template-category';
            category.textContent = template.category;
            
            item.appendChild(canvas.cloneNode(true));
            item.appendChild(name);
            item.appendChild(category);
            
            this.elements.templatesContainer.appendChild(item);
        });
    }

    async handleFile(file) {
        if (!file.type.startsWith('image/')) {
            alert('请选择图片文件');
            return;
        }

        this.showLoading('正在加载图片...', 10);

        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = async () => {
                this.originalImage = img;
                await this.setupCanvas();
                this.hideLoading();
                this.showMainContent();
                
                if (this.elements.analyzeBtn) {
                    this.elements.analyzeBtn.disabled = false;
                }
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }

    async setupCanvas() {
        if (!this.elements.originalCanvas || !this.originalImage) return;

        const img = this.originalImage;
        const maxWidth = 800;
        const maxHeight = 600;
        
        let width = img.naturalWidth;
        let height = img.naturalHeight;

        if (width > maxWidth) {
            const ratio = maxWidth / width;
            width = maxWidth;
            height = height * ratio;
        }
        if (height > maxHeight) {
            const ratio = maxHeight / height;
            height = maxHeight;
            width = width * ratio;
        }

        this.elements.originalCanvas.width = width;
        this.elements.originalCanvas.height = height;

        const ctx = this.elements.originalCanvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        this.canvas = this.elements.originalCanvas;
    }

    async loadDemo() {
        this.showLoading('正在生成示例电路图...', 20);

        const demoCanvas = this.createDemoSchematic();
        this.originalImage = demoCanvas;
        
        this.elements.originalCanvas.width = demoCanvas.width;
        this.elements.originalCanvas.height = demoCanvas.height;
        const ctx = this.elements.originalCanvas.getContext('2d');
        ctx.drawImage(demoCanvas, 0, 0);
        
        this.canvas = this.elements.originalCanvas;

        this.hideLoading();
        this.showMainContent();
        
        if (this.elements.analyzeBtn) {
            this.elements.analyzeBtn.disabled = false;
        }

        setTimeout(() => {
            this.analyzeImage();
        }, 300);
    }

    createDemoSchematic() {
        const canvas = document.createElement('canvas');
        canvas.width = 600;
        canvas.height = 400;
        const ctx = canvas.getContext('2d');

        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, 600, 400);

        ctx.strokeStyle = 'black';
        ctx.lineWidth = 2;

        this.drawResistor(ctx, 100, 150, 80, 50);
        this.drawLed(ctx, 250, 150, 60);
        this.drawCapacitor(ctx, 400, 150, 60, 40);

        ctx.beginPath();
        ctx.strokeRect(180, 250, 120, 80);
        ctx.fillStyle = 'black';
        ctx.font = 'bold 16px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Arduino', 240, 320);

        ctx.strokeStyle = '#ccc';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(50, 175);
        ctx.lineTo(60, 175);
        ctx.moveTo(180, 175);
        ctx.lineTo(190, 175);
        ctx.moveTo(310, 175);
        ctx.lineTo(370, 175);
        ctx.moveTo(460, 175);
        ctx.lineTo(550, 175);
        ctx.stroke();

        ctx.fillStyle = '#333';
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('R1 1kΩ', 140, 130);
        ctx.fillText('LED', 280, 130);
        ctx.fillText('C1 100nF', 430, 130);

        return canvas;
    }

    drawResistor(ctx, x, y, w, h) {
        ctx.save();
        ctx.strokeStyle = 'black';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x, y + h / 2);
        ctx.lineTo(x + 10, y + h / 2);
        ctx.lineTo(x + 20, y);
        ctx.lineTo(x + 40, y + h);
        ctx.lineTo(x + 60, y);
        ctx.lineTo(x + w - 10, y + h / 2);
        ctx.lineTo(x + w, y + h / 2);
        ctx.stroke();
        ctx.restore();
    }

    drawLed(ctx, x, y, size) {
        ctx.save();
        ctx.strokeStyle = 'black';
        ctx.lineWidth = 2;
        ctx.fillStyle = 'black';

        const h = size * 0.5;
        const w = size * 0.6;

        ctx.beginPath();
        ctx.moveTo(x - size * 0.4, y);
        ctx.lineTo(x - w * 0.3, y);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(x - w * 0.3, y - h);
        ctx.lineTo(x - w * 0.3, y + h);
        ctx.lineTo(x + w * 0.3, y);
        ctx.closePath();
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(x + w * 0.3, y - h);
        ctx.lineTo(x + w * 0.3, y + h);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(x + w * 0.3, y);
        ctx.lineTo(x + size * 0.4, y);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(x + w * 0.2, y - size * 0.5);
        ctx.lineTo(x + w * 0.5, y - size * 0.2);
        ctx.moveTo(x + w * 0.4, y - size * 0.6);
        ctx.lineTo(x + w * 0.7, y - size * 0.3);
        ctx.stroke();

        ctx.restore();
    }

    drawCapacitor(ctx, x, y, w, h) {
        ctx.save();
        ctx.strokeStyle = 'black';
        ctx.lineWidth = 2;

        ctx.beginPath();
        ctx.moveTo(x - w * 0.5, y);
        ctx.lineTo(x - 10, y);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(x - 10, y - h * 0.5);
        ctx.lineTo(x - 10, y + h * 0.5);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(x + 10, y - h * 0.5);
        ctx.lineTo(x + 10, y + h * 0.5);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(x + 10, y);
        ctx.lineTo(x + w * 0.5, y);
        ctx.stroke();

        ctx.restore();
    }

    async analyzeImage() {
        if (this.isProcessing || !this.canvas) return;

        this.isProcessing = true;
        if (this.elements.analyzeBtn) {
            this.elements.analyzeBtn.disabled = true;
        }

        try {
            this.showLoading('正在进行连通域分析...', 20);
            this.segmenter.options.minArea = this.options.minArea;
            const segmentResult = this.segmenter.segment(this.canvas);
            
            this.currentComponents = segmentResult.components;
            
            this.updateProgress(40);
            this.updateLoadingText(`识别到 ${this.currentComponents.length} 个元件区域`);

            this.matcher.setMatchThreshold(this.options.matchThreshold);
            this.currentResults = [];

            for (let i = 0; i < this.currentComponents.length; i++) {
                const component = this.currentComponents[i];
                const compImage = this.segmenter.extractComponentImage(this.canvas, component);
                
                const componentInfo = {
                    width: component.width,
                    height: component.height,
                    area: component.area,
                    aspectRatio: component.width / component.height,
                    centerX: component.centerX,
                    centerY: component.centerY
                };
                
                const matchResult = this.matcher.match(compImage, componentInfo);
                
                const progress = 40 + (i + 1) / this.currentComponents.length * 50;
                this.updateProgress(progress);
                this.updateLoadingText(`正在匹配元件 ${i + 1}/${this.currentComponents.length}`);

                this.currentResults.push({
                    component: component,
                    match: matchResult,
                    image: compImage,
                    parameters: null
                });
            }

            this.updateProgress(95);
            this.updateLoadingText('正在生成识别结果...');

            this.drawComponentBoxes();
            this.renderResults();
            this.updateBom();

            this.updateProgress(100);
            this.hideLoading();
            this.showMainContent();

            if (this.elements.exportBomBtn) {
                this.elements.exportBomBtn.disabled = false;
            }
            if (this.elements.downloadBomBtn) {
                this.elements.downloadBomBtn.disabled = false;
            }

        } catch (error) {
            console.error('分析失败:', error);
            alert('分析失败: ' + error.message);
        } finally {
            this.isProcessing = false;
            if (this.elements.analyzeBtn) {
                this.elements.analyzeBtn.disabled = false;
            }
        }
    }

    async reAnalyze() {
        if (this.currentComponents.length > 0) {
            await this.analyzeImage();
        }
    }

    drawComponentBoxes() {
        if (!this.elements.originalCanvas) return;

        const ctx = this.elements.originalCanvas.getContext('2d');
        ctx.drawImage(this.originalImage, 0, 0, 
            this.elements.originalCanvas.width, 
            this.elements.originalCanvas.height);

        this.currentResults.forEach((result, index) => {
            const comp = result.component;
            
            let color = '#ff9800';
            if (result.match.matched) {
                color = '#4caf50';
            }

            ctx.save();
            ctx.strokeStyle = color;
            ctx.lineWidth = 2;
            ctx.strokeRect(comp.x, comp.y, comp.width, comp.height);

            ctx.fillStyle = color;
            ctx.font = 'bold 12px Arial';
            ctx.fillText(`#${index + 1}`, comp.x, comp.y - 5);
            
            if (result.match.matched) {
                ctx.fillText(result.match.bestMatch.name, 
                    comp.x + comp.width + 5, 
                    comp.y + 15);
            }
            ctx.restore();
        });

        if (this.elements.componentCount) {
            const matched = this.currentResults.filter(r => r.match.matched).length;
            this.elements.componentCount.textContent = 
                `已识别 ${this.currentResults.length} 个区域，${matched} 个匹配成功`;
        }
    }

    renderResults() {
        if (!this.elements.resultsContainer) return;

        this.elements.resultsContainer.innerHTML = '';

        if (this.currentResults.length === 0) {
            this.elements.resultsContainer.innerHTML = `
                <div class="results-placeholder">
                    <p>未识别到任何元件</p>
                </div>
            `;
            return;
        }

        const allScores = this.currentResults.map(r => 
            r.match.bestMatch ? r.match.bestMatch.score : 0
        );
        const maxScore = Math.max(...allScores);
        const minScore = Math.min(...allScores);

        this.currentResults.forEach((result, index) => {
            const card = document.createElement('div');
            const isManuallyConfirmed = this.manualConfirmedResults[index] !== undefined;
            card.className = `component-card ${result.match.matched ? 'matched' : 'unmatched'} ${isManuallyConfirmed ? 'manual-confirmed' : ''}`;

            let name = '未知元件';
            let score = 0;
            let featureScores = null;
            let isReviewNeeded = false;
            let finalMatchInfo = null;
            
            if (isManuallyConfirmed) {
                finalMatchInfo = this.manualConfirmedResults[index];
                name = finalMatchInfo.name;
                score = 1.0;
                featureScores = null;
            } else if (result.match.bestMatch) {
                finalMatchInfo = result.match.bestMatch;
                name = result.match.bestMatch.name;
                score = result.match.bestMatch.score;
                featureScores = result.match.bestMatch.featureScores;
                isReviewNeeded = !result.match.matched && score >= 0.5;
            }

            const normalizedScore = maxScore > minScore ? 
                (score - minScore) / (maxScore - minScore) : 0.5;
            const scoreClass = this.getScoreClass(score);
            const scoreGradient = this.getScoreGradient(score);
            const confidenceLevel = isManuallyConfirmed ? 
                { class: 'confidence-manual', text: '人工确认' } : 
                this.getConfidenceLevel(score);

            const templates = this.matcher.getTemplates();
            const templateOptions = templates.map(t => 
                `<option value="${t.name}" ${finalMatchInfo && finalMatchInfo.name === t.name ? 'selected' : ''}>
                    ${t.name}
                </option>`
            ).join('');

            const allMatchesHtml = result.match.allMatches ? 
                result.match.allMatches.slice(0, 3).map((m, i) => `
                    <div class="alt-match ${i === 0 ? 'best' : ''}">
                        <span class="alt-name">${m.name}</span>
                        <span class="alt-score">${(m.score * 100).toFixed(1)}%</span>
                    </div>
                `).join('') : '';

            const featureBreakdown = featureScores ? `
                <div class="feature-breakdown">
                    <div class="feature-title">特征匹配度分析:</div>
                    <div class="feature-bar">
                        <span class="feature-label">轮廓特征</span>
                        <div class="feature-bar-bg">
                            <div class="feature-bar-fill contour" style="width: ${(featureScores.contour * 100).toFixed(0)}%"></div>
                        </div>
                        <span class="feature-score">${(featureScores.contour * 100).toFixed(0)}%</span>
                    </div>
                    <div class="feature-bar">
                        <span class="feature-label">形状上下文</span>
                        <div class="feature-bar-bg">
                            <div class="feature-bar-fill context" style="width: ${(featureScores.shapeContext * 100).toFixed(0)}%"></div>
                        </div>
                        <span class="feature-score">${(featureScores.shapeContext * 100).toFixed(0)}%</span>
                    </div>
                    <div class="feature-bar">
                        <span class="feature-label">Hu不变矩</span>
                        <div class="feature-bar-bg">
                            <div class="feature-bar-fill hu" style="width: ${(featureScores.hu * 100).toFixed(0)}%"></div>
                        </div>
                        <span class="feature-score">${(featureScores.hu * 100).toFixed(0)}%</span>
                    </div>
                    <div class="feature-bar">
                        <span class="feature-label">方向链码</span>
                        <div class="feature-bar-bg">
                            <div class="feature-bar-fill chain" style="width: ${(featureScores.chainCode * 100).toFixed(0)}%"></div>
                        </div>
                        <span class="feature-score">${(featureScores.chainCode * 100).toFixed(0)}%</span>
                    </div>
                </div>
            ` : '';

            const manualActionHtml = `
                <div class="manual-action-panel" style="margin-top: 12px; padding-top: 12px; border-top: 1px solid #eee;">
                    <div style="margin-bottom: 8px; font-size: 13px; color: #666;">
                        ${isManuallyConfirmed ? '✅ 已人工确认' : (isReviewNeeded ? '⚠️ 建议人工确认' : '也可以手动指定类型:')}
                    </div>
                    <div style="display: flex; gap: 8px; align-items: center;">
                        <select class="manual-select" data-index="${index}" style="
                            flex: 1;
                            padding: 8px;
                            border: 1px solid #ddd;
                            border-radius: 4px;
                            background: white;
                            font-size: 13px;
                        ">
                            <option value="">选择元件类型...</option>
                            ${templateOptions}
                        </select>
                        <button class="manual-confirm-btn" data-index="${index}" style="
                            padding: 8px 16px;
                            border: none;
                            border-radius: 4px;
                            background: #2196f3;
                            color: white;
                            font-size: 13px;
                            cursor: pointer;
                        ">
                            ${isManuallyConfirmed ? '修改' : '确认'}
                        </button>
                        ${isManuallyConfirmed ? `
                            <button class="manual-reset-btn" data-index="${index}" style="
                                padding: 8px 12px;
                                border: 1px solid #ddd;
                                border-radius: 4px;
                                background: #fff;
                                color: #666;
                                font-size: 13px;
                                cursor: pointer;
                            ">
                                重置
                            </button>
                        ` : ''}
                    </div>
                </div>
            `;

            card.innerHTML = `
                <div class="component-header">
                    <img class="component-icon" src="${result.image.toDataURL()}">
                    <div class="component-info">
                        <h4>#${index + 1} ${name}</h4>
                        <div class="score-container">
                            <span class="match-score ${scoreClass}" style="background: ${scoreGradient}">
                                ${isManuallyConfirmed ? '人工确认' : `匹配度: ${(score * 100).toFixed(1)}%`}
                            </span>
                            <span class="confidence-badge ${confidenceLevel.class}">
                                ${confidenceLevel.text}
                            </span>
                        </div>
                    </div>
                </div>
                <div class="component-details">
                    <p>位置: (${result.component.x}, ${result.component.y})</p>
                    <p>尺寸: ${result.component.width} × ${result.component.height}</p>
                    ${finalMatchInfo ? `<p>类型: ${finalMatchInfo.category || 'unknown'}</p>` : ''}
                </div>
                ${featureBreakdown}
                ${allMatchesHtml ? `
                    <div class="alt-matches">
                        <div class="alt-title">候选匹配:</div>
                        ${allMatchesHtml}
                    </div>
                ` : ''}
                ${manualActionHtml}
            `;

            this.elements.resultsContainer.appendChild(card);
        });
        
        this.bindManualConfirmEvents();
    }
    
    bindManualConfirmEvents() {
        const confirmButtons = document.querySelectorAll('.manual-confirm-btn');
        confirmButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const index = parseInt(e.target.dataset.index);
                this.handleManualConfirm(index);
            });
        });
        
        const resetButtons = document.querySelectorAll('.manual-reset-btn');
        resetButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const index = parseInt(e.target.dataset.index);
                this.handleManualReset(index);
            });
        });
    }
    
    handleManualConfirm(index) {
        const select = document.querySelector(`.manual-select[data-index="${index}"]`);
        if (!select) return;
        
        const selectedValue = select.value;
        if (!selectedValue) {
            alert('请先选择一个元件类型');
            return;
        }
        
        const templates = this.matcher.getTemplates();
        const template = templates.find(t => t.name === selectedValue);
        if (!template) return;
        
        this.manualConfirmedResults[index] = {
            name: template.name,
            category: template.category,
            description: template.description,
            manuallyConfirmed: true
        };
        
        this.currentResults[index].match.matched = true;
        this.currentResults[index].match.manuallyConfirmed = true;
        
        this.drawComponentBoxes();
        this.renderResults();
        this.updateBom();
    }
    
    handleManualReset(index) {
        delete this.manualConfirmedResults[index];
        this.currentResults[index].match.manuallyConfirmed = false;
        
        this.drawComponentBoxes();
        this.renderResults();
        this.updateBom();
    }

    getScoreClass(score) {
        if (score >= 0.85) return 'excellent';
        if (score >= 0.75) return 'high';
        if (score >= 0.6) return 'medium';
        return 'low';
    }

    getScoreGradient(score) {
        if (score >= 0.85) {
            return 'linear-gradient(90deg, #4caf50, #8bc34a)';
        }
        if (score >= 0.75) {
            return 'linear-gradient(90deg, #8bc34a, #cddc39)';
        }
        if (score >= 0.6) {
            return 'linear-gradient(90deg, #ff9800, #ffc107)';
        }
        return 'linear-gradient(90deg, #f44336, #ff9800)';
    }

    getConfidenceLevel(score) {
        if (score >= 0.85) {
            return { class: 'confidence-high', text: '高置信度' };
        }
        if (score >= 0.75) {
            return { class: 'confidence-medium', text: '中高置信度' };
        }
        if (score >= 0.6) {
            return { class: 'confidence-low', text: '低置信度' };
        }
        return { class: 'confidence-very-low', text: '需人工确认' };
    }

    updateBom() {
        if (!this.elements.bomBody) return;

        const matchedComponents = this.currentResults.map((r, index) => {
            const manualMatch = this.manualConfirmedResults[index];
            if (manualMatch) {
                return {
                    name: manualMatch.name,
                    category: manualMatch.category,
                    manuallyConfirmed: true
                };
            }
            if (r.match.matched && r.match.bestMatch) {
                return {
                    name: r.match.bestMatch.name,
                    category: r.match.bestMatch.category,
                    manuallyConfirmed: false
                };
            }
            return null;
        }).filter(Boolean);

        const counts = {};
        matchedComponents.forEach(comp => {
            const key = comp.name;
            if (!counts[key]) {
                counts[key] = { 
                    name: comp.name, 
                    category: comp.category, 
                    count: 0,
                    manuallyConfirmed: comp.manuallyConfirmed
                };
            }
            counts[key].count++;
            if (comp.manuallyConfirmed) {
                counts[key].manuallyConfirmed = true;
            }
        });

        const bomItems = Object.values(counts);

        if (bomItems.length === 0) {
            this.elements.bomBody.innerHTML = `
                <tr>
                    <td colspan="5" class="empty-state">暂无匹配的元件</td>
                </tr>
            `;
            return;
        }

        this.elements.bomBody.innerHTML = bomItems.map((item, index) => `
            <tr>
                <td>${index + 1}</td>
                <td>${item.name}${item.manuallyConfirmed ? ' (人工)' : ''}</td>
                <td>${item.category}</td>
                <td>-</td>
                <td>${item.count}</td>
            </tr>
        `).join('');
    }

    exportBom() {
        try {
            if (!this.currentResults || this.currentResults.length === 0) {
                alert('请先分析电路图');
                return;
            }

            const matchedComponents = this.currentResults.map((r, index) => {
                const manualMatch = this.manualConfirmedResults[index];
                if (manualMatch) {
                    return {
                        name: manualMatch.name || '未知',
                        category: manualMatch.category || 'unknown'
                    };
                }
                if (r && r.match && r.match.matched && r.match.bestMatch) {
                    return {
                        name: r.match.bestMatch.name || '未知',
                        category: r.match.bestMatch.category || 'unknown'
                    };
                }
                return null;
            }).filter(Boolean);

            if (matchedComponents.length === 0) {
                alert('暂无可导出的元件');
                return;
            }

            const counts = {};
            matchedComponents.forEach(comp => {
                try {
                    const key = String(comp.name);
                    if (!counts[key]) {
                        counts[key] = { 
                            name: comp.name, 
                            category: comp.category, 
                            count: 0 
                        };
                    }
                    counts[key].count++;
                } catch (e) {
                    console.warn('处理元件时出错:', e);
                }
            });

            const bomItems = Object.values(counts);
            
            if (bomItems.length === 0) {
                alert('暂无可导出的元件');
                return;
            }

            let text = '序号,元件名称,类型,参数,数量\n';
            bomItems.forEach((item, index) => {
                const safeName = String(item.name).replace(/,/g, '，');
                const safeCategory = String(item.category).replace(/,/g, '，');
                text += `${index + 1},${safeName},${safeCategory},-,${item.count}\n`;
            });

            if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(text)
                    .then(() => {
                        alert('BOM 已复制到剪贴板');
                    })
                    .catch(err => {
                        console.warn('剪贴板写入失败:', err);
                        this.showTextPrompt(text);
                    });
            } else {
                this.showTextPrompt(text);
            }
        } catch (error) {
            console.error('导出 BOM 失败:', error);
            alert('导出失败，请重试');
        }
    }

    showTextPrompt(text) {
        try {
            const textarea = document.createElement('textarea');
            textarea.value = text;
            textarea.style.position = 'fixed';
            textarea.style.left = '-9999px';
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand('copy');
            document.body.removeChild(textarea);
            alert('BOM 已复制到剪贴板');
        } catch (e) {
            prompt('请复制以下 BOM 内容:', text);
        }
    }

    downloadBom() {
        try {
            if (!this.currentResults || this.currentResults.length === 0) {
                alert('请先分析电路图');
                return;
            }

            const matchedComponents = this.currentResults.map((r, index) => {
                const manualMatch = this.manualConfirmedResults[index];
                if (manualMatch) {
                    return {
                        name: manualMatch.name || '未知',
                        category: manualMatch.category || 'unknown'
                    };
                }
                if (r && r.match && r.match.matched && r.match.bestMatch) {
                    return {
                        name: r.match.bestMatch.name || '未知',
                        category: r.match.bestMatch.category || 'unknown'
                    };
                }
                return null;
            }).filter(Boolean);

            if (matchedComponents.length === 0) {
                alert('暂无可下载的元件');
                return;
            }

            const counts = {};
            matchedComponents.forEach(comp => {
                try {
                    const key = String(comp.name);
                    if (!counts[key]) {
                        counts[key] = { 
                            name: comp.name, 
                            category: comp.category, 
                            count: 0 
                        };
                    }
                    counts[key].count++;
                } catch (e) {
                    console.warn('处理元件时出错:', e);
                }
            });

            const bomItems = Object.values(counts);
            
            if (bomItems.length === 0) {
                alert('暂无可下载的元件');
                return;
            }

            let csv = '序号,元件名称,类型,参数,数量\n';
            bomItems.forEach((item, index) => {
                const safeName = String(item.name).replace(/,/g, '，');
                const safeCategory = String(item.category).replace(/,/g, '，');
                csv += `${index + 1},${safeName},${safeCategory},-,${item.count}\n`;
            });

            try {
                const BOM = '\uFEFF';
                const blob = new Blob([BOM + csv], { type: 'text/csv;charset=utf-8;' });
                const link = document.createElement('a');
                
                if (link.download !== undefined) {
                    const url = URL.createObjectURL(blob);
                    link.href = url;
                    link.download = `bom_${new Date().toISOString().slice(0, 10)}.csv`;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    
                    setTimeout(() => {
                        URL.revokeObjectURL(url);
                    }, 100);
                } else {
                    window.open('data:text/csv;charset=utf-8,' + encodeURIComponent(csv));
                }
            } catch (error) {
                console.error('下载 BOM 失败:', error);
                alert('下载失败，请尝试复制 BOM 内容');
            }
        } catch (error) {
            console.error('下载 BOM 失败:', error);
            alert('下载失败，请重试');
        }
    }

    reset() {
        this.originalImage = null;
        this.currentComponents = [];
        this.currentResults = [];
        this.isProcessing = false;

        if (this.elements.originalCanvas) {
            const ctx = this.elements.originalCanvas.getContext('2d');
            ctx.clearRect(0, 0, this.elements.originalCanvas.width, this.elements.originalCanvas.height);
        }

        if (this.elements.resultsContainer) {
            this.elements.resultsContainer.innerHTML = `
                <div class="results-placeholder">
                    <p>点击"开始分析"按钮进行元件识别</p>
                </div>
            `;
        }

        if (this.elements.bomBody) {
            this.elements.bomBody.innerHTML = `
                <tr>
                    <td colspan="5" class="empty-state">暂无数据</td>
                </tr>
            `;
        }

        if (this.elements.componentCount) {
            this.elements.componentCount.textContent = '已识别 0 个元件';
        }

        if (this.elements.analyzeBtn) {
            this.elements.analyzeBtn.disabled = true;
        }

        if (this.elements.exportBomBtn) {
            this.elements.exportBomBtn.disabled = true;
        }

        if (this.elements.downloadBomBtn) {
            this.elements.downloadBomBtn.disabled = true;
        }

        this.hideMainContent();
    }

    showLoading(text, progress) {
        if (this.elements.loadingSection) {
            this.elements.loadingSection.style.display = 'flex';
        }
        if (this.elements.mainContent) {
            this.elements.mainContent.style.display = 'none';
        }
        if (this.elements.uploadArea) {
            this.elements.uploadArea.style.display = 'none';
        }
        this.updateLoadingText(text);
        this.updateProgress(progress);
    }

    hideLoading() {
        if (this.elements.loadingSection) {
            this.elements.loadingSection.style.display = 'none';
        }
    }

    updateLoadingText(text) {
        if (this.elements.loadingText) {
            this.elements.loadingText.textContent = text;
        }
    }

    updateProgress(value) {
        if (this.elements.progressBar) {
            this.elements.progressBar.style.width = value + '%';
        }
    }

    showMainContent() {
        if (this.elements.mainContent) {
            this.elements.mainContent.style.display = 'block';
        }
        if (this.elements.uploadArea) {
            this.elements.uploadArea.style.display = 'none';
        }
    }

    hideMainContent() {
        if (this.elements.mainContent) {
            this.elements.mainContent.style.display = 'none';
        }
        if (this.elements.uploadArea) {
            this.elements.uploadArea.style.display = 'flex';
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    if (typeof Tesseract === 'undefined') {
        let checkCount = 0;
        const checkInterval = setInterval(() => {
            checkCount++;
            if (typeof Tesseract !== 'undefined' || checkCount > 60) {
                clearInterval(checkInterval);
                new App();
            }
        }, 500);
    } else {
        new App();
    }
});
