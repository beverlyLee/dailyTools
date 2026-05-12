import { TesseractHelper } from './TesseractHelper.js';
import { RegionSelector } from './RegionSelector.js';
import { PixelateFilter } from './PixelateFilter.js';

class App {
    constructor() {
        this.uploadArea = null;
        this.fileInput = null;
        this.uploadBtn = null;
        this.loadingSection = null;
        this.loadingText = null;
        this.progressBar = null;
        this.mainContent = null;
        this.originalCanvas = null;
        this.resultCanvas = null;
        this.resultBox = null;
        this.ocrBtn = null;
        this.clearRegionsBtn = null;
        this.resetBtn = null;
        this.downloadBtn = null;
        this.blurMode = null;
        this.blurStrength = null;
        this.blurStrengthValue = null;
        this.enableIdCard = null;
        this.enableBankCard = null;
        this.enablePhone = null;
        this.regionInfo = null;

        this.originalImage = null;
        this.regionSelector = null;
        this.pixelateFilter = new PixelateFilter();
        this.tesseractHelper = null;
        this.isProcessing = false;
        this.resultCanvasData = null;
        this.currentRegions = [];
        this.ocrInitPromise = null;

        this.init();
    }

    init() {
        this.cacheElements();
        this.bindEvents();
        this.preloadOCR();
    }

    cacheElements() {
        this.uploadArea = document.getElementById('uploadArea');
        this.fileInput = document.getElementById('fileInput');
        this.uploadBtn = document.getElementById('uploadBtn');
        this.loadingSection = document.getElementById('loadingSection');
        this.loadingText = document.getElementById('loadingText');
        this.progressBar = document.getElementById('progressBar');
        this.mainContent = document.getElementById('mainContent');
        this.originalCanvas = document.getElementById('originalCanvas');
        this.resultCanvas = document.getElementById('resultCanvas');
        this.resultBox = document.getElementById('resultBox');
        this.ocrBtn = document.getElementById('ocrBtn');
        this.clearRegionsBtn = document.getElementById('clearRegionsBtn');
        this.resetBtn = document.getElementById('resetBtn');
        this.downloadBtn = document.getElementById('downloadBtn');
        this.blurMode = document.getElementById('blurMode');
        this.blurStrength = document.getElementById('blurStrength');
        this.blurStrengthValue = document.getElementById('blurStrengthValue');
        this.enableIdCard = document.getElementById('enableIdCard');
        this.enableBankCard = document.getElementById('enableBankCard');
        this.enablePhone = document.getElementById('enablePhone');
        this.regionInfo = document.getElementById('regionInfo');
    }

    bindEvents() {
        if (this.uploadBtn) {
            this.uploadBtn.addEventListener('click', () => {
                if (this.fileInput) this.fileInput.click();
            });
        }
        
        if (this.uploadArea) {
            this.uploadArea.addEventListener('click', () => {
                if (this.fileInput) this.fileInput.click();
            });

            this.uploadArea.addEventListener('dragover', (e) => {
                e.preventDefault();
                this.uploadArea.classList.add('dragover');
            });

            this.uploadArea.addEventListener('dragleave', () => {
                this.uploadArea.classList.remove('dragover');
            });

            this.uploadArea.addEventListener('drop', (e) => {
                e.preventDefault();
                this.uploadArea.classList.remove('dragover');
                const files = e.dataTransfer.files;
                if (files.length > 0) {
                    this.handleFile(files[0]);
                }
            });
        }

        if (this.fileInput) {
            this.fileInput.addEventListener('change', (e) => {
                if (e.target.files.length > 0) {
                    this.handleFile(e.target.files[0]);
                }
            });
        }

        if (this.blurStrength) {
            this.blurStrength.addEventListener('input', (e) => {
                if (this.blurStrengthValue) {
                    this.blurStrengthValue.textContent = e.target.value;
                }
            });

            this.blurStrength.addEventListener('change', () => {
                if (this.currentRegions.length > 0) {
                    this.applyMask();
                }
            });
        }

        if (this.blurMode) {
            this.blurMode.addEventListener('change', () => {
                if (this.currentRegions.length > 0) {
                    this.applyMask();
                }
            });
        }

        if (this.ocrBtn) {
            this.ocrBtn.addEventListener('click', () => this.runOCR());
        }

        if (this.clearRegionsBtn) {
            this.clearRegionsBtn.addEventListener('click', () => this.clearRegions());
        }

        if (this.resetBtn) {
            this.resetBtn.addEventListener('click', () => this.reset());
        }

        if (this.downloadBtn) {
            this.downloadBtn.addEventListener('click', () => this.downloadResult());
        }
    }

    async preloadOCR() {
        if (typeof Tesseract === 'undefined') {
            return;
        }
        
        this.ocrInitPromise = this.initOCR();
    }

    async handleFile(file) {
        if (!file.type.startsWith('image/')) {
            alert('请选择图片文件');
            return;
        }

        this.resetInternalState();

        this.showLoading('正在加载图片...', 10);

        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = async () => {
                this.originalImage = img;
                await this.setupCanvas();
                this.hideLoading();
                this.showMainContent();
                
                setTimeout(() => {
                    this.runOCR();
                }, 300);
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }

    resetInternalState() {
        this.originalImage = null;
        this.resultCanvasData = null;
        this.currentRegions = [];
        this.isProcessing = false;

        if (this.regionSelector) {
            try {
                this.regionSelector.clearRegions();
            } catch (e) {
                console.warn('清除旧区域选择器失败:', e);
            }
            this.regionSelector = null;
        }

        if (this.originalCanvas) {
            const ctx = this.originalCanvas.getContext('2d');
            ctx.clearRect(0, 0, this.originalCanvas.width, this.originalCanvas.height);
        }

        if (this.resultCanvas) {
            const ctx = this.resultCanvas.getContext('2d');
            ctx.clearRect(0, 0, this.resultCanvas.width, this.resultCanvas.height);
        }

        if (this.resultBox) {
            this.resultBox.style.display = 'none';
        }

        if (this.downloadBtn) {
            this.downloadBtn.style.display = 'none';
        }

        this.updateRegionInfo(0);
    }

    async setupCanvas() {
        if (!this.originalCanvas || !this.originalImage) return;

        const img = this.originalImage;
        const maxWidth = 1000;
        const maxHeight = 800;
        
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

        this.originalCanvas.width = width;
        this.originalCanvas.height = height;

        const ctx = this.originalCanvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        try {
            this.regionSelector = new RegionSelector(this.originalCanvas, {
                onRegionsChange: (regions) => this.handleRegionsChange(regions)
            });
        } catch(e) {
            console.error('创建区域选择器失败:', e);
        }

        this.updateRegionInfo(0);
    }

    async initOCR() {
        if (this.tesseractHelper && this.tesseractHelper.isReady) {
            return this.tesseractHelper;
        }

        let checkCount = 0;
        while (typeof Tesseract === 'undefined' && checkCount < 20) {
            await new Promise(resolve => setTimeout(resolve, 500));
            checkCount++;
        }

        if (typeof Tesseract === 'undefined') {
            throw new Error('Tesseract.js 未加载，请检查网络连接');
        }

        try {
            this.tesseractHelper = new TesseractHelper({
                language: 'chi_sim+eng',
                onProgress: (m) => {
                    const progressMap = {
                        'loading tesseract core': 15,
                        'initializing tesseract': 25,
                        'loading language traineddata': 45,
                        'initializing api': 60,
                        'recognizing text': 80
                    };
                    const progress = progressMap[m.status] || 50;
                    this.updateProgress(progress);
                    if (m.status) {
                        this.updateLoadingText(this.getStatusText(m.status));
                    }
                }
            });

            await this.tesseractHelper.init();
            return this.tesseractHelper;
        } catch (error) {
            console.error('OCR 引擎初始化失败:', error);
            throw error;
        }
    }

    getStatusText(status) {
        const statusMap = {
            'loading tesseract core': '正在加载 OCR 引擎...',
            'initializing tesseract': '正在初始化 OCR 引擎...',
            'loading language traineddata': '正在加载语言模型...',
            'initializing api': '正在准备识别...',
            'recognizing text': '正在识别文字...'
        };
        return statusMap[status] || '处理中...';
    }

    async runOCR() {
        if (this.isProcessing || !this.originalImage) return;

        try {
            this.isProcessing = true;
            if (this.ocrBtn) this.ocrBtn.disabled = true;
            
            this.showLoading('正在初始化 OCR 引擎...', 10);
            
            try {
                if (this.ocrInitPromise) {
                    await this.ocrInitPromise;
                } else {
                    await this.initOCR();
                }
            } catch (ocrError) {
                console.error('OCR 初始化失败:', ocrError);
                this.updateLoadingText('OCR 引擎初始化失败，请重试');
                setTimeout(() => {
                    this.hideLoading();
                    this.showMainContent();
                }, 1500);
                return;
            }

            this.updateLoadingText('正在识别图片中的文字...');
            this.updateProgress(50);

            const options = {
                enableIdCard: this.enableIdCard ? this.enableIdCard.checked : true,
                enableBankCard: this.enableBankCard ? this.enableBankCard.checked : true,
                enablePhone: this.enablePhone ? this.enablePhone.checked : false
            };

            try {
                const result = await this.tesseractHelper.detectAndClassify(this.originalCanvas, options);

                if (result.regions && result.regions.length > 0) {
                    this.regionSelector.setRegions(result.regions);
                    this.currentRegions = result.regions;
                    this.updateRegionInfo(result.regions.length);
                    
                    this.updateProgress(90);
                    this.updateLoadingText('正在应用打码...');
                    
                    this.applyMask();
                } else {
                    this.updateRegionInfo(0);
                    this.currentRegions = [];
                    this.hideLoading();
                    this.showMainContent();
                }

                this.updateProgress(100);
            } catch (recognizeError) {
                console.error('识别失败:', recognizeError);
                this.updateLoadingText('识别失败，请重试');
                setTimeout(() => {
                    this.hideLoading();
                    this.showMainContent();
                }, 1500);
            }

        } catch (error) {
            console.error('OCR 流程失败:', error);
            this.hideLoading();
            this.showMainContent();
        } finally {
            this.isProcessing = false;
            if (this.ocrBtn) this.ocrBtn.disabled = false;
        }
    }

    handleRegionsChange(regions) {
        this.currentRegions = regions;
        this.updateRegionInfo(regions.length);
        if (!this.isProcessing) {
            this.applyMask();
        }
    }

    clearRegions() {
        if (this.regionSelector) {
            this.regionSelector.clearRegions();
        }
        this.currentRegions = [];
        this.updateRegionInfo(0);
        if (this.resultBox) {
            this.resultBox.style.display = 'none';
        }
        if (this.downloadBtn) {
            this.downloadBtn.style.display = 'none';
        }
    }

    applyMask() {
        if (!this.regionSelector || !this.originalCanvas) return;

        const regions = this.regionSelector.getMaskedRegions();
        
        if (regions.length === 0) {
            if (this.resultBox) {
                this.resultBox.style.display = 'none';
            }
            if (this.downloadBtn) {
                this.downloadBtn.style.display = 'none';
            }
            this.hideLoading();
            this.showMainContent();
            return;
        }

        const mode = this.blurMode ? this.blurMode.value : 'pixelate';
        const strength = this.blurStrength ? parseInt(this.blurStrength.value) : 20;

        const result = this.pixelateFilter.apply(this.originalCanvas, regions, {
            mode: mode,
            strength: strength
        });

        if (this.resultCanvas) {
            this.resultCanvas.width = result.width;
            this.resultCanvas.height = result.height;
            const ctx = this.resultCanvas.getContext('2d');
            ctx.drawImage(result, 0, 0);
        }

        this.resultCanvasData = result;
        if (this.resultBox) {
            this.resultBox.style.display = 'flex';
        }
        if (this.downloadBtn) {
            this.downloadBtn.style.display = 'inline-flex';
        }
        
        this.hideLoading();
        this.showMainContent();
    }

    downloadResult() {
        if (!this.resultCanvasData) return;

        const link = document.createElement('a');
        link.download = 'masked_image.png';
        link.href = this.resultCanvasData.toDataURL('image/png');
        link.click();
    }

    reset() {
        this.resetInternalState();
        this.originalImage = null;
        this.hideMainContent();
        if (this.fileInput) {
            this.fileInput.value = '';
        }
    }

    updateRegionInfo(count) {
        if (!this.regionInfo) return;
        
        if (count === 0) {
            this.regionInfo.textContent = '已识别 0 个敏感区域，可手动框选';
        } else {
            const maskedCount = this.regionSelector ? this.regionSelector.getMaskedRegions().length : 0;
            this.regionInfo.textContent = `已识别 ${count} 个区域，其中 ${maskedCount} 个将被打码`;
        }
    }

    showLoading(text, progress) {
        if (this.loadingSection) {
            this.loadingSection.style.display = 'flex';
        }
        if (this.mainContent) {
            this.mainContent.style.display = 'none';
        }
        this.updateLoadingText(text);
        this.updateProgress(progress);
    }

    hideLoading() {
        if (this.loadingSection) {
            this.loadingSection.style.display = 'none';
        }
    }

    updateLoadingText(text) {
        if (this.loadingText) {
            this.loadingText.textContent = text;
        }
    }

    updateProgress(value) {
        if (this.progressBar) {
            this.progressBar.style.width = value + '%';
        }
    }

    showMainContent() {
        if (this.mainContent) {
            this.mainContent.style.display = 'grid';
        }
        if (this.uploadArea) {
            this.uploadArea.style.display = 'none';
        }
    }

    hideMainContent() {
        if (this.mainContent) {
            this.mainContent.style.display = 'none';
        }
        if (this.uploadArea) {
            this.uploadArea.style.display = 'flex';
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
