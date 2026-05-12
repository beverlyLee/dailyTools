import { DotDetector } from './DotDetector.js';
import { CellLocator } from './CellLocator.js';
import { BrailleLookup } from './BrailleLookup.js';

class App {
    constructor() {
        this.originalImageData = null;
        this.currentImage = null;
        this.dots = [];
        this.cells = [];
        this.processedImage = null;
        
        this.dotDetector = new DotDetector({ minDotSize: 4, maxDotSize: 150 });
        this.cellLocator = new CellLocator({ cellSize: 50 });
        this.brailleLookup = new BrailleLookup();
        
        console.log('[App] 初始化应用...');
        console.log('[App] 打印盲文编码映射表:');
        this.brailleLookup.dumpMappingTable();
        
        this.initElements();
        this.initEventListeners();
    }

    initElements() {
        this.uploadSection = document.getElementById('uploadSection');
        this.uploadArea = document.getElementById('uploadArea');
        this.fileInput = document.getElementById('fileInput');
        this.uploadBtn = document.getElementById('uploadBtn');
        
        this.controls = document.getElementById('controls');
        this.brailleTypeSelect = document.getElementById('brailleType');
        this.outputLangSelect = document.getElementById('outputLang');
        this.thresholdInput = document.getElementById('threshold');
        this.thresholdValue = document.getElementById('thresholdValue');
        this.cellSizeInput = document.getElementById('cellSize');
        this.cellSizeValue = document.getElementById('cellSizeValue');
        this.minDotSizeInput = document.getElementById('minDotSize');
        this.minDotSizeValue = document.getElementById('minDotSizeValue');
        this.recognizeBtn = document.getElementById('recognizeBtn');
        this.resetBtn = document.getElementById('resetBtn');
        
        this.previewSection = document.getElementById('previewSection');
        this.originalCanvas = document.getElementById('originalCanvas');
        this.processedCanvas = document.getElementById('processedCanvas');
        
        this.resultSection = document.getElementById('resultSection');
        this.resultText = document.getElementById('resultText');
        this.copyBtn = document.getElementById('copyBtn');
        this.downloadBtn = document.getElementById('downloadBtn');
    }

    initEventListeners() {
        this.uploadBtn.addEventListener('click', () => this.fileInput.click());
        this.uploadArea.addEventListener('click', () => this.fileInput.click());
        this.fileInput.addEventListener('change', (e) => this.handleFileSelect(e));
        
        this.uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            this.uploadArea.classList.add('dragover');
        });
        
        this.uploadArea.addEventListener('dragleave', (e) => {
            e.preventDefault();
            this.uploadArea.classList.remove('dragover');
        });
        
        this.uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            this.uploadArea.classList.remove('dragover');
            if (e.dataTransfer.files.length > 0) {
                this.loadImage(e.dataTransfer.files[0]);
            }
        });
        
        this.thresholdInput.addEventListener('input', (e) => {
            this.thresholdValue.textContent = e.target.value;
        });
        
        this.cellSizeInput.addEventListener('input', (e) => {
            this.cellSizeValue.textContent = e.target.value;
            this.cellLocator.setCellSize(parseInt(e.target.value));
        });
        
        this.minDotSizeInput.addEventListener('input', (e) => {
            this.minDotSizeValue.textContent = e.target.value;
            this.dotDetector.setMinDotSize(parseInt(e.target.value));
        });
        
        this.recognizeBtn.addEventListener('click', () => this.recognize());
        this.resetBtn.addEventListener('click', () => this.reset());
        
        this.copyBtn.addEventListener('click', () => {
            const text = this.resultText.value;
            if (!text) return;
            navigator.clipboard.writeText(text).catch(() => {
                this.resultText.select();
                document.execCommand('copy');
            });
            alert('已复制到剪贴板');
        });
        
        this.downloadBtn.addEventListener('click', () => {
            const text = this.resultText.value;
            if (!text) return;
            const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `braille_${Date.now()}.txt`;
            link.click();
            URL.revokeObjectURL(url);
        });
    }

    handleFileSelect(e) {
        if (e.target.files.length > 0) {
            this.loadImage(e.target.files[0]);
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
                console.log('[App] 图片加载完成:', img.width, 'x', img.height);
                this.currentImage = img;
                this.initCanvases(img);
                this.uploadSection.style.display = 'none';
                this.controls.style.display = 'block';
                this.previewSection.style.display = 'block';
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }

    initCanvases(img) {
        const maxWidth = 800;
        let w = img.width, h = img.height;
        if (w > maxWidth) {
            const ratio = maxWidth / w;
            w = maxWidth;
            h = Math.round(h * ratio);
        }
        
        this.originalCanvas.width = w;
        this.originalCanvas.height = h;
        this.processedCanvas.width = w;
        this.processedCanvas.height = h;
        
        const oCtx = this.originalCanvas.getContext('2d');
        oCtx.drawImage(img, 0, 0, w, h);
        this.originalImageData = oCtx.getImageData(0, 0, w, h);
        
        const pCtx = this.processedCanvas.getContext('2d');
        pCtx.drawImage(img, 0, 0, w, h);
    }

    async recognize() {
        if (!this.originalImageData) {
            alert('请先上传图片');
            return;
        }
        
        this.recognizeBtn.textContent = '识别中...';
        this.recognizeBtn.disabled = true;
        this.resultSection.style.display = 'none';
        
        try {
            await new Promise(r => setTimeout(r, 50));
            
            const brailleType = this.brailleTypeSelect.value;
            const outputLang = this.outputLangSelect.value;
            
            console.log('[App] ========== 开始识别 ==========');
            console.log('[App] 盲文类型:', brailleType);
            console.log('[App] 输出语言:', outputLang);
            
            console.log('[App] 步骤1: 检测盲文点...');
            const dotResult = this.dotDetector.analyzeDots(this.originalImageData);
            this.dots = dotResult.dots;
            this.processedImage = dotResult.processedImage;
            
            console.log('[App] 检测到', this.dots.length, '个盲文点');
            
            if (this.dots.length === 0) {
                alert('未检测到盲文点！\n\n建议：\n1. 使用更清晰的盲文图片\n2. 确保盲文点与背景对比明显\n3. 调整"最小点大小"参数');
                this.recognizeBtn.textContent = '开始识别';
                this.recognizeBtn.disabled = false;
                return;
            }
            
            console.log('[App] 步骤2: 定位单元格...');
            this.cells = this.cellLocator.locateCells(this.dots, brailleType);
            
            console.log('[App] 生成', this.cells.length, '个单元格');
            
            if (this.cells.length === 0) {
                alert('未能定位盲文字符！\n\n建议：\n1. 确保盲文点阵排列整齐\n2. 调整"单元格大小"参数');
                this.recognizeBtn.textContent = '开始识别';
                this.recognizeBtn.disabled = false;
                return;
            }
            
            console.log('[App] 步骤3: 标记检测结果...');
            this.drawProcessedImage();
            
            console.log('[App] 步骤4: 翻译盲文...');
            const translated = this.brailleLookup.translate(this.cells, outputLang);
            
            console.log('[App] ========== 识别完成 ==========');
            console.log('[App] 盲文序列:', this.cells.map(c => 
                this.brailleLookup.getUnicodeBraille(c.code)
            ).join(' '));
            console.log('[App] 翻译结果:', translated);
            
            this.resultText.value = translated;
            this.resultSection.style.display = 'block';
            
        } catch (e) {
            console.error('[App] 识别出错:', e);
            console.error(e.stack);
            alert('识别失败: ' + e.message);
        } finally {
            this.recognizeBtn.textContent = '开始识别';
            this.recognizeBtn.disabled = false;
        }
    }

    drawProcessedImage() {
        const ctx = this.processedCanvas.getContext('2d');
        
        if (this.processedImage) {
            ctx.putImageData(this.dotDetector.toImageData(this.processedImage, ctx), 0, 0);
        } else {
            ctx.putImageData(this.originalImageData, 0, 0);
        }
        
        this.cellLocator.markDots(ctx, this.dots);
        this.cellLocator.markCells(ctx, this.cells);
    }

    reset() {
        this.uploadSection.style.display = 'block';
        this.controls.style.display = 'none';
        this.previewSection.style.display = 'none';
        this.resultSection.style.display = 'none';
        
        this.thresholdInput.value = 128;
        this.thresholdValue.textContent = '128';
        this.cellSizeInput.value = 50;
        this.cellSizeValue.textContent = '50';
        this.minDotSizeInput.value = 4;
        this.minDotSizeValue.textContent = '4';
        
        this.dotDetector.setMinDotSize(4);
        this.cellLocator.setCellSize(50);
        
        this.originalImageData = null;
        this.currentImage = null;
        this.dots = [];
        this.cells = [];
        this.processedImage = null;
        this.resultText.value = '';
        this.fileInput.value = '';
    }
}

console.log('[App] 盲文识别工具加载中...');
document.addEventListener('DOMContentLoaded', () => {
    console.log('[App] DOM已加载');
    new App();
});
