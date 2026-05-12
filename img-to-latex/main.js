import { FormulaPreprocessor } from './FormulaPreprocessor.js?v=202506092';
import { LatexPredictor } from './LatexPredictor.js?v=202506092';
import { MathJaxRenderer } from './MathJaxRenderer.js?v=202506092';

class App {
    constructor() {
        this.elements = {};
        this.preprocessor = null;
        this.predictor = null;
        this.renderer = null;
        
        this.currentImage = null;
        this.processedCanvas = null;
        this.currentLatex = null;
        this.lastDemoType = 'integral';
        
        this.options = {
            mode: 'analysis',
            autoCrop: true,
            denoise: true,
            binarize: true
        };
        
        this.init();
    }

    async init() {
        console.log('[App] 开始初始化...');
        this.cacheElements();
        this.bindEvents();
        this.initModules();
        console.log('[App] 初始化完成');
    }

    cacheElements() {
        this.elements = {
            imageInput: document.getElementById('imageInput'),
            uploadBtn: document.getElementById('uploadBtn'),
            pasteBtn: document.getElementById('pasteBtn'),
            clearBtn: document.getElementById('clearBtn'),
            recognizeBtn: document.getElementById('recognizeBtn'),
            
            modeSelect: document.getElementById('modeSelect'),
            modelPathGroup: document.getElementById('modelPathGroup'),
            modelInput: document.getElementById('modelInput'),
            autoCrop: document.getElementById('autoCrop'),
            denoise: document.getElementById('denoise'),
            binarize: document.getElementById('binarize'),
            
            statusText: document.getElementById('statusText'),
            modelStatus: document.getElementById('modelStatus'),
            progressItem: document.getElementById('progressItem'),
            progressText: document.getElementById('progressText'),
            
            placeholderView: document.getElementById('placeholderView'),
            workspace: document.getElementById('workspace'),
            originalImage: document.getElementById('originalImage'),
            preprocessedCanvas: document.getElementById('preprocessedCanvas'),
            latexOutput: document.getElementById('latexOutput'),
            renderedLatex: document.getElementById('renderedLatex'),
            
            imageSize: document.getElementById('imageSize'),
            preprocessedSize: document.getElementById('preprocessedSize'),
            copyBtn: document.getElementById('copyBtn'),
            
            demoButtons: document.querySelectorAll('.demo-btn')
        };
        
        console.log('[App] 元素缓存完成:', Object.keys(this.elements).length, '个元素');
    }

    bindEvents() {
        if (this.elements.uploadBtn && this.elements.imageInput) {
            this.elements.uploadBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.elements.imageInput.click();
            });
            this.elements.imageInput.addEventListener('change', (e) => this.handleImageUpload(e));
        }
        
        if (this.elements.pasteBtn) {
            this.elements.pasteBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.pasteFromClipboard();
            });
        }
        
        document.addEventListener('paste', (e) => this.handlePaste(e));
        
        if (this.elements.clearBtn) {
            this.elements.clearBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.clearAll();
            });
        }
        
        if (this.elements.recognizeBtn) {
            this.elements.recognizeBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.recognizeFormula();
            });
        }
        
        if (this.elements.modeSelect) {
            this.elements.modeSelect.addEventListener('change', (e) => this.handleModeChange(e));
        }
        
        if (this.elements.modelInput) {
            this.elements.modelInput.addEventListener('change', (e) => this.handleModelUpload(e));
        }
        
        if (this.elements.autoCrop) {
            this.elements.autoCrop.addEventListener('change', (e) => {
                this.options.autoCrop = e.target.checked;
                if (this.currentImage) {
                    this.preprocessAndShow();
                }
            });
        }
        
        if (this.elements.denoise) {
            this.elements.denoise.addEventListener('change', (e) => {
                this.options.denoise = e.target.checked;
                if (this.currentImage) {
                    this.preprocessAndShow();
                }
            });
        }
        
        if (this.elements.binarize) {
            this.elements.binarize.addEventListener('change', (e) => {
                this.options.binarize = e.target.checked;
                if (this.currentImage) {
                    this.preprocessAndShow();
                }
            });
        }
        
        if (this.elements.copyBtn) {
            this.elements.copyBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.copyLatex();
            });
        }
        
        this.elements.demoButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const demoType = btn.dataset.demo;
                this.runDemo(demoType);
            });
        });
        
        console.log('[App] 事件绑定完成');
    }

    initModules() {
        console.log('[App] 初始化各模块...');
        
        this.preprocessor = new FormulaPreprocessor({
            targetWidth: 256,
            targetHeight: 256,
            padding: 15
        });
        
        this.predictor = new LatexPredictor({
            mode: 'demo'
        });
        
        this.renderer = new MathJaxRenderer({
            containerId: 'renderedLatex'
        });
        
        this.updateModelStatus('演示模式', 'ready');
    }

    handleImageUpload(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        console.log('[App] 加载图片文件:', file.name);
        this.loadImageFromFile(file);
    }

    async handlePaste(event) {
        const items = event.clipboardData?.items;
        if (!items) return;
        
        for (const item of items) {
            if (item.type.startsWith('image/')) {
                const file = item.getAsFile();
                if (file) {
                    console.log('[App] 从剪贴板粘贴图片');
                    await this.loadImageFromFile(file);
                    break;
                }
            }
        }
    }

    async pasteFromClipboard() {
        try {
            const clipboardItems = await navigator.clipboard.read();
            
            for (const item of clipboardItems) {
                for (const type of item.types) {
                    if (type.startsWith('image/')) {
                        const blob = await item.getType(type);
                        await this.loadImageFromFile(blob);
                        return;
                    }
                }
            }
            
            alert('剪贴板中没有图片');
        } catch (error) {
            console.error('[App] 访问剪贴板失败:', error);
            alert('无法访问剪贴板，请使用 Ctrl+V 粘贴');
        }
    }

    async loadImageFromFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    this.currentImage = img;
                    this.showWorkspace();
                    this.displayOriginalImage(img);
                    this.preprocessAndShow();
                    resolve();
                };
                img.onerror = () => {
                    this.updateStatus('图片加载失败', 'error');
                    reject(new Error('图片加载失败'));
                };
                img.src = e.target.result;
            };
            
            reader.onerror = () => {
                this.updateStatus('文件读取失败', 'error');
                reject(new Error('文件读取失败'));
            };
            
            reader.readAsDataURL(file);
        });
    }

    displayOriginalImage(img) {
        if (this.elements.originalImage) {
            this.elements.originalImage.src = img.src;
        }
        
        if (this.elements.imageSize) {
            this.elements.imageSize.textContent = `${img.naturalWidth} × ${img.naturalHeight}`;
        }
    }

    async preprocessAndShow() {
        if (!this.currentImage) return;
        
        this.updateStatus('正在预处理...', 'loading');
        
        try {
            this.preprocessor.updateOptions({
                autoCrop: this.options.autoCrop,
                denoise: this.options.denoise,
                binarize: this.options.binarize
            });
            
            this.processedCanvas = await this.preprocessor.process(this.currentImage);
            
            const outputCanvas = this.elements.preprocessedCanvas;
            if (outputCanvas) {
                outputCanvas.width = this.processedCanvas.width;
                outputCanvas.height = this.processedCanvas.height;
                const ctx = outputCanvas.getContext('2d');
                ctx.drawImage(this.processedCanvas, 0, 0);
            }
            
            if (this.elements.preprocessedSize) {
                this.elements.preprocessedSize.textContent = 
                    `${this.processedCanvas.width} × ${this.processedCanvas.height}`;
            }
            
            this.updateStatus('预处理完成，点击识别按钮开始', 'ready');
            
        } catch (error) {
            console.error('[App] 预处理失败:', error);
            this.updateStatus('预处理失败', 'error');
        }
    }

    async recognizeFormula() {
        if (!this.processedCanvas) {
            this.updateStatus('请先上传图片', 'error');
            return;
        }
        
        if (!this.predictor.isReady) {
            this.updateStatus('模型未就绪', 'error');
            return;
        }
        
        this.updateStatus('正在识别...', 'running');
        this.showProgress(0);
        
        try {
            this.showProgress(20);
            
            const latex = await this.predictor.predict(
                this.processedCanvas, 
                this.preprocessor,
                {
                    demoType: this.lastDemoType
                }
            );
            
            this.showProgress(80);
            
            this.currentLatex = latex;
            this.showLatexResult(latex);
            
            await this.renderer.render(latex);
            
            this.showProgress(100);
            this.updateStatus('识别完成', 'ready');
            
            setTimeout(() => this.hideProgress(), 500);
            
        } catch (error) {
            console.error('[App] 识别失败:', error);
            this.updateStatus('识别失败: ' + error.message, 'error');
            this.hideProgress();
        }
    }

    showLatexResult(latex) {
        if (this.elements.latexOutput) {
            this.elements.latexOutput.value = latex;
        }
        
        if (this.elements.copyBtn) {
            this.elements.copyBtn.style.display = 'inline-block';
        }
    }

    async copyLatex() {
        if (!this.currentLatex) return;
        
        try {
            await navigator.clipboard.writeText(this.currentLatex);
            
            const originalText = this.elements.copyBtn.textContent;
            this.elements.copyBtn.textContent = '已复制!';
            setTimeout(() => {
                this.elements.copyBtn.textContent = originalText;
            }, 2000);
            
        } catch (error) {
            console.error('[App] 复制失败:', error);
            
            const textarea = this.elements.latexOutput;
            if (textarea) {
                textarea.select();
                document.execCommand('copy');
            }
        }
    }

    async handleModeChange(event) {
        const mode = event.target.value;
        this.options.mode = mode;
        
        if (mode === 'onnx') {
            if (this.elements.modelPathGroup) {
                this.elements.modelPathGroup.style.display = 'flex';
            }
            this.updateModelStatus('等待加载模型', 'loading');
            this.predictor.setMode('onnx');
        } else if (mode === 'analysis') {
            if (this.elements.modelPathGroup) {
                this.elements.modelPathGroup.style.display = 'none';
            }
            this.updateModelStatus('图像分析模式', 'ready');
            this.predictor.setMode('analysis');
        } else {
            if (this.elements.modelPathGroup) {
                this.elements.modelPathGroup.style.display = 'none';
            }
            this.updateModelStatus('演示模式', 'ready');
            this.predictor.setMode('demo');
        }
    }

    async handleModelUpload(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        this.updateStatus('正在加载模型...', 'loading');
        this.updateModelStatus('加载中...', 'loading');
        
        try {
            await this.predictor.loadModelFromFile(file);
            this.updateModelStatus('模型已就绪', 'ready');
            this.updateStatus('模型加载完成', 'ready');
        } catch (error) {
            console.error('[App] 模型加载失败:', error);
            this.updateModelStatus('加载失败', 'error');
            this.updateStatus('模型加载失败: ' + error.message, 'error');
        }
    }

    async runDemo(demoType) {
        this.lastDemoType = demoType;
        
        this.updateStatus('演示模式: ' + this.getDemoName(demoType), 'running');
        
        this.showWorkspace();
        this.renderer.clear();
        
        if (this.currentLatex) {
            this.showLatexResult('');
        }
        
        if (!this.currentImage) {
            const demoCanvas = this.createDemoCanvas(demoType);
            this.processedCanvas = demoCanvas;
            
            const outputCanvas = this.elements.preprocessedCanvas;
            if (outputCanvas) {
                outputCanvas.width = demoCanvas.width;
                outputCanvas.height = demoCanvas.height;
                const ctx = outputCanvas.getContext('2d');
                ctx.drawImage(demoCanvas, 0, 0);
            }
            
            if (this.elements.imageSize) {
                this.elements.imageSize.textContent = '示例公式';
            }
            if (this.elements.preprocessedSize) {
                this.elements.preprocessedSize.textContent = `${demoCanvas.width} × ${demoCanvas.height}`;
            }
        }
        
        await this.recognizeFormula();
    }

    getDemoName(type) {
        const names = {
            integral: '积分公式',
            matrix: '矩阵运算',
            fraction: '分式组合',
            sum: '求和公式'
        };
        return names[type] || '示例公式';
    }

    createDemoCanvas(demoType) {
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 256;
        const ctx = canvas.getContext('2d');
        
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        ctx.fillStyle = '#000000';
        ctx.font = 'bold 32px "Times New Roman", serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'alphabetic';
        
        if (demoType === 'integral') {
            ctx.font = 'bold 80px "Times New Roman", serif';
            ctx.fillText('∫', 60, 170);
            
            ctx.font = 'bold 18px "Times New Roman", serif';
            ctx.fillText('∞', 100, 100);
            ctx.fillText('0', 100, 210);
            
            ctx.font = 'bold 28px "Times New Roman", serif';
            ctx.fillText('e', 160, 160);
            ctx.font = 'bold 18px "Times New Roman", serif';
            ctx.fillText('-x', 195, 130);
            ctx.font = 'bold 14px "Times New Roman", serif';
            ctx.fillText('2', 220, 120);
            
            ctx.font = 'bold 28px "Times New Roman", serif';
            ctx.fillText('dx =', 270, 165);
            
            ctx.font = 'bold 28px "Times New Roman", serif';
            ctx.fillText('√π', 360, 150);
            
            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(340, 175);
            ctx.lineTo(395, 175);
            ctx.stroke();
            
            ctx.font = 'bold 24px "Times New Roman", serif';
            ctx.fillText('2', 368, 210);
            
        } else if (demoType === 'matrix') {
            ctx.font = 'bold 36px "Times New Roman", serif';
            ctx.fillText('[', 60, 140);
            ctx.fillText(']', 150, 140);
            
            ctx.font = 'bold 28px "Times New Roman", serif';
            ctx.fillText('a  b', 105, 110);
            ctx.fillText('c  d', 105, 170);
            
            ctx.font = 'bold 32px "Times New Roman", serif';
            ctx.fillText('[', 180, 140);
            ctx.fillText(']', 220, 140);
            ctx.font = 'bold 28px "Times New Roman", serif';
            ctx.fillText('x', 200, 120);
            ctx.fillText('y', 200, 160);
            
            ctx.font = 'bold 36px "Times New Roman", serif';
            ctx.fillText('=', 260, 140);
            
            ctx.fillText('[', 300, 140);
            ctx.fillText(']', 420, 140);
            
            ctx.font = 'bold 24px "Times New Roman", serif';
            ctx.fillText('ax + by', 360, 110);
            ctx.fillText('cx + dy', 360, 170);
            
        } else if (demoType === 'fraction') {
            ctx.font = 'bold 28px "Times New Roman", serif';
            ctx.fillText('n!', 100, 100);
            
            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(60, 120);
            ctx.lineTo(140, 120);
            ctx.stroke();
            
            ctx.fillText('k!(n-k)!', 100, 160);
            
            ctx.font = 'bold 36px "Times New Roman", serif';
            ctx.fillText('=', 190, 130);
            
            ctx.font = 'bold 32px "Times New Roman", serif';
            ctx.fillText('(', 240, 130);
            ctx.fillText(')', 310, 130);
            ctx.font = 'bold 40px "Times New Roman", serif';
            ctx.fillText('n', 275, 105);
            ctx.fillText('k', 275, 165);
            
        } else if (demoType === 'sum') {
            ctx.font = 'bold 60px "Times New Roman", serif';
            ctx.fillText('Σ', 90, 160);
            
            ctx.font = 'bold 20px "Times New Roman", serif';
            ctx.fillText('∞', 90, 90);
            ctx.fillText('n=1', 90, 220);
            
            ctx.font = 'bold 28px "Times New Roman", serif';
            ctx.fillText('1', 170, 110);
            
            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(140, 135);
            ctx.lineTo(200, 135);
            ctx.stroke();
            
            ctx.font = 'bold 24px "Times New Roman", serif';
            ctx.fillText('n', 165, 170);
            ctx.font = 'bold 18px "Times New Roman", serif';
            ctx.fillText('2', 180, 155);
            
            ctx.font = 'bold 32px "Times New Roman", serif';
            ctx.fillText('=', 240, 140);
            
            ctx.font = 'bold 28px "Times New Roman", serif';
            ctx.fillText('π', 300, 110);
            ctx.font = 'bold 18px "Times New Roman", serif';
            ctx.fillText('2', 315, 95);
            
            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(275, 135);
            ctx.lineTo(335, 135);
            ctx.stroke();
            
            ctx.font = 'bold 24px "Times New Roman", serif';
            ctx.fillText('6', 305, 170);
            
        } else {
            ctx.font = 'bold 32px "Times New Roman", serif';
            ctx.fillText('ax² + bx + c = 0', canvas.width / 2, canvas.height / 2);
        }
        
        return canvas;
    }

    showWorkspace() {
        if (this.elements.placeholderView) {
            this.elements.placeholderView.style.display = 'none';
        }
        if (this.elements.workspace) {
            this.elements.workspace.style.display = 'grid';
        }
        if (this.elements.clearBtn) {
            this.elements.clearBtn.style.display = 'inline-flex';
        }
        if (this.elements.recognizeBtn) {
            this.elements.recognizeBtn.style.display = 'inline-flex';
        }
    }

    hideWorkspace() {
        if (this.elements.placeholderView) {
            this.elements.placeholderView.style.display = 'block';
        }
        if (this.elements.workspace) {
            this.elements.workspace.style.display = 'none';
        }
        if (this.elements.clearBtn) {
            this.elements.clearBtn.style.display = 'none';
        }
        if (this.elements.recognizeBtn) {
            this.elements.recognizeBtn.style.display = 'none';
        }
        if (this.elements.copyBtn) {
            this.elements.copyBtn.style.display = 'none';
        }
    }

    clearAll() {
        this.currentImage = null;
        this.processedCanvas = null;
        this.currentLatex = null;
        
        if (this.elements.imageInput) {
            this.elements.imageInput.value = '';
        }
        if (this.elements.latexOutput) {
            this.elements.latexOutput.value = '';
        }
        
        this.renderer.clear();
        this.hideWorkspace();
        this.updateStatus('等待上传图片', 'idle');
    }

    updateStatus(text, type) {
        const el = this.elements.statusText;
        if (el) {
            el.textContent = text;
            el.className = 'status-value ' + type;
        }
    }

    updateModelStatus(text, type) {
        const el = this.elements.modelStatus;
        if (el) {
            el.textContent = text;
            el.className = 'status-value ' + type;
        }
    }

    showProgress(value) {
        if (this.elements.progressItem) {
            this.elements.progressItem.style.display = 'flex';
        }
        if (this.elements.progressText) {
            this.elements.progressText.textContent = value + '%';
        }
    }

    hideProgress() {
        if (this.elements.progressItem) {
            this.elements.progressItem.style.display = 'none';
        }
    }
}

console.log('[main.js] 模块加载完成，立即启动 App');
new App();
