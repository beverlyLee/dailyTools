class ExamPaperExtractor {
    constructor() {
        this.currentStep = 1;
        this.totalSteps = 5;
        
        this.images = [];
        this.currentImageIndex = 0;
        this.correctedImages = [];
        this.allBlocks = [];
        this.selectedBlocks = [];
        
        this.perspectiveCorrector = null;
        this.textBlockSplitter = null;
        this.a4LayoutEngine = null;
        
        this.init();
    }
    
    init() {
        this.cacheElements();
        this.bindEvents();
        this.updateStepUI();
    }
    
    cacheElements() {
        this.$uploadArea = document.getElementById('uploadArea');
        this.$fileInput = document.getElementById('fileInput');
        this.$imageList = document.getElementById('imageList');
        
        this.$prevImage = document.getElementById('prevImage');
        this.$nextImage = document.getElementById('nextImage');
        this.$imageCounter = document.getElementById('imageCounter');
        this.$correctionCanvas = document.getElementById('correctionCanvas');
        this.$resetPoints = document.getElementById('resetPoints');
        this.$applyCorrection = document.getElementById('applyCorrection');
        
        this.$splitCanvas = document.getElementById('splitCanvas');
        this.$gapThreshold = document.getElementById('gapThreshold');
        this.$gapValue = document.getElementById('gapValue');
        this.$minBlockHeight = document.getElementById('minBlockHeight');
        this.$minHeightValue = document.getElementById('minHeightValue');
        this.$performSplit = document.getElementById('performSplit');
        
        this.$blocksGrid = document.getElementById('blocksGrid');
        this.$selectedCount = document.getElementById('selectedCount');
        this.$selectAll = document.getElementById('selectAll');
        this.$clearSelection = document.getElementById('clearSelection');
        
        this.$previewCanvas = document.getElementById('previewCanvas');
        this.$margin = document.getElementById('margin');
        this.$blockGap = document.getElementById('blockGap');
        this.$refreshPreview = document.getElementById('refreshPreview');
        this.$exportPDF = document.getElementById('exportPDF');
        
        this.$prevStep = document.getElementById('prevStep');
        this.$nextStep = document.getElementById('nextStep');
        
        this.$workflowSteps = document.querySelectorAll('.workflow .step');
        this.$stepPanels = document.querySelectorAll('.step-panel');
    }
    
    bindEvents() {
        this.$uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            this.$uploadArea.classList.add('dragover');
        });
        
        this.$uploadArea.addEventListener('dragleave', () => {
            this.$uploadArea.classList.remove('dragover');
        });
        
        this.$uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            this.$uploadArea.classList.remove('dragover');
            this.handleFiles(e.dataTransfer.files);
        });
        
        this.$fileInput.addEventListener('change', (e) => {
            this.handleFiles(e.target.files);
        });
        
        this.$prevStep.addEventListener('click', () => this.goToStep(this.currentStep - 1));
        this.$nextStep.addEventListener('click', () => this.goToStep(this.currentStep + 1));
        
        this.$prevImage.addEventListener('click', () => this.navigateImage(-1));
        this.$nextImage.addEventListener('click', () => this.navigateImage(1));
        
        this.$resetPoints.addEventListener('click', () => {
            if (this.perspectiveCorrector) {
                this.perspectiveCorrector.resetPoints();
            }
        });
        
        this.$applyCorrection.addEventListener('click', () => this.applyCorrection());
        
        this.$gapThreshold.addEventListener('input', (e) => {
            this.$gapValue.textContent = e.target.value + 'px';
            if (this.textBlockSplitter) {
                this.textBlockSplitter.setGapThreshold(parseInt(e.target.value));
            }
        });
        
        this.$minBlockHeight.addEventListener('input', (e) => {
            this.$minHeightValue.textContent = e.target.value + 'px';
            if (this.textBlockSplitter) {
                this.textBlockSplitter.setMinBlockHeight(parseInt(e.target.value));
            }
        });
        
        this.$performSplit.addEventListener('click', () => this.performSplit());
        
        this.$selectAll.addEventListener('click', () => this.selectAllBlocks(true));
        this.$clearSelection.addEventListener('click', () => this.selectAllBlocks(false));
        
        this.$refreshPreview.addEventListener('click', () => this.refreshPreview());
        this.$exportPDF.addEventListener('click', () => this.exportPDF());
    }
    
    handleFiles(files) {
        const imageFiles = Array.from(files).filter(file => 
            file.type.startsWith('image/')
        );
        
        if (imageFiles.length === 0) {
            alert('请选择图片文件');
            return;
        }
        
        for (const file of imageFiles) {
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    this.images.push({
                        file: file,
                        img: img,
                        corrected: null
                    });
                    this.renderImageList();
                };
                img.src = e.target.result;
            };
            reader.readAsDataURL(file);
        }
    }
    
    renderImageList() {
        this.$imageList.innerHTML = '';
        
        for (let i = 0; i < this.images.length; i++) {
            const imageData = this.images[i];
            const $item = document.createElement('div');
            $item.className = 'image-item';
            $item.innerHTML = `
                <img src="${imageData.img.src}">
                <button class="remove-btn" data-index="${i}">&times;</button>
                <div class="status ${imageData.corrected ? 'done' : ''}">
                    ${imageData.corrected ? '已矫正' : '待处理'}
                </div>
            `;
            
            $item.querySelector('.remove-btn').addEventListener('click', (e) => {
                e.stopPropagation();
                const index = parseInt(e.target.dataset.index);
                this.images.splice(index, 1);
                this.renderImageList();
            });
            
            this.$imageList.appendChild($item);
        }
    }
    
    validateStep(currentStep) {
        if (currentStep === 1) {
            if (this.images.length === 0) {
                alert('请先上传试卷图片');
                return false;
            }
        } else if (currentStep === 2) {
            const uncorrectedCount = this.images.filter(img => !img.corrected).length;
            if (uncorrectedCount > 0) {
                if (!confirm(`还有 ${uncorrectedCount} 张图片未矫正，确定要继续吗？`)) {
                    return false;
                }
            }
        } else if (currentStep === 3) {
            if (this.allBlocks.length === 0) {
                alert('请先执行题目分割');
                return false;
            }
        } else if (currentStep === 4) {
            if (this.selectedBlocks.length === 0) {
                alert('请选择至少一道错题');
                return false;
            }
        }
        
        return true;
    }
    
    goToStep(step) {
        if (step < 1 || step > this.totalSteps) return;
        
        if (step > this.currentStep && !this.validateStep(this.currentStep)) {
            return;
        }
        
        this.currentStep = step;
        this.updateStepUI();
        
        if (step === 2) {
            this.initCorrectionStep();
        } else if (step === 3) {
            this.initSplitStep();
        } else if (step === 4) {
            this.initSelectStep();
        } else if (step === 5) {
            this.initExportStep();
        }
    }
    
    updateStepUI() {
        this.$workflowSteps.forEach(($step, index) => {
            $step.classList.remove('active', 'completed');
            if (index + 1 < this.currentStep) {
                $step.classList.add('completed');
            } else if (index + 1 === this.currentStep) {
                $step.classList.add('active');
            }
        });
        
        this.$stepPanels.forEach(($panel, index) => {
            $panel.classList.toggle('active', index + 1 === this.currentStep);
        });
        
        this.$prevStep.style.display = this.currentStep === 1 ? 'none' : 'inline-block';
        this.$nextStep.style.display = this.currentStep === this.totalSteps ? 'none' : 'inline-block';
    }
    
    initCorrectionStep() {
        if (!this.perspectiveCorrector) {
            this.perspectiveCorrector = new PerspectiveCorrector(this.$correctionCanvas);
        }
        
        this.currentImageIndex = 0;
        this.updateImageNavigation();
        this.loadCurrentImage();
    }
    
    navigateImage(direction) {
        this.currentImageIndex += direction;
        this.currentImageIndex = Math.max(0, Math.min(this.images.length - 1, this.currentImageIndex));
        this.updateImageNavigation();
        this.loadCurrentImage();
    }
    
    updateImageNavigation() {
        this.$imageCounter.textContent = `${this.currentImageIndex + 1} / ${this.images.length}`;
        this.$prevImage.disabled = this.currentImageIndex === 0;
        this.$nextImage.disabled = this.currentImageIndex === this.images.length - 1;
    }
    
    loadCurrentImage() {
        if (this.images.length === 0) return;
        
        const imageData = this.images[this.currentImageIndex];
        const imgToLoad = imageData.corrected || imageData.img;
        this.perspectiveCorrector.loadImage(imgToLoad);
    }
    
    applyCorrection() {
        try {
            const corrected = this.perspectiveCorrector.applyCorrection();
            this.images[this.currentImageIndex].corrected = corrected;
            this.renderImageList();
            
            if (this.currentImageIndex < this.images.length - 1) {
                if (confirm('矫正成功！是否继续处理下一张图片？')) {
                    this.navigateImage(1);
                }
            } else {
                alert('矫正完成！可以进入下一步了。');
            }
        } catch (error) {
            alert(error.message);
        }
    }
    
    initSplitStep() {
        if (!this.textBlockSplitter) {
            this.textBlockSplitter = new TextBlockSplitter(this.$splitCanvas);
        }
        
        this.textBlockSplitter.setGapThreshold(parseInt(this.$gapThreshold.value));
        this.textBlockSplitter.setMinBlockHeight(parseInt(this.$minBlockHeight.value));
        
        this.correctedImages = this.images.map(img => img.corrected || img.img);
        
        if (this.correctedImages.length > 0) {
            this.textBlockSplitter.loadImage(this.correctedImages[0]);
        }
    }
    
    performSplit() {
        this.allBlocks = [];
        
        for (const image of this.correctedImages) {
            this.textBlockSplitter.loadImage(image);
            const blocks = this.textBlockSplitter.split();
            this.allBlocks.push(...blocks);
        }
        
        if (this.correctedImages.length > 0) {
            this.textBlockSplitter.loadImage(this.correctedImages[0]);
            this.textBlockSplitter.split();
        }
        
        alert(`分割完成！共检测到 ${this.allBlocks.length} 个题目区块。`);
    }
    
    initSelectStep() {
        this.$blocksGrid.innerHTML = '';
        
        for (let i = 0; i < this.allBlocks.length; i++) {
            const block = this.allBlocks[i];
            const $blockItem = document.createElement('div');
            $blockItem.className = 'block-item';
            $blockItem.dataset.index = i;
            
            const img = document.createElement('img');
            img.src = block.canvas.toDataURL();
            $blockItem.appendChild(img);
            
            $blockItem.addEventListener('click', () => {
                block.selected = !block.selected;
                $blockItem.classList.toggle('selected', block.selected);
                this.updateSelectedCount();
            });
            
            this.$blocksGrid.appendChild($blockItem);
        }
        
        this.updateSelectedCount();
    }
    
    selectAllBlocks(selected) {
        this.allBlocks.forEach((block, index) => {
            block.selected = selected;
            const $blockItem = this.$blocksGrid.children[index];
            if ($blockItem) {
                $blockItem.classList.toggle('selected', selected);
            }
        });
        this.updateSelectedCount();
    }
    
    updateSelectedCount() {
        this.selectedBlocks = this.allBlocks.filter(block => block.selected);
        this.$selectedCount.textContent = this.selectedBlocks.length;
    }
    
    initExportStep() {
        if (!this.a4LayoutEngine) {
            this.a4LayoutEngine = new A4LayoutEngine(this.$previewCanvas);
        }
        
        this.a4LayoutEngine.setMargin(parseInt(this.$margin.value));
        this.a4LayoutEngine.setBlockGap(parseInt(this.$blockGap.value));
        this.a4LayoutEngine.setBlocks(this.allBlocks);
        this.a4LayoutEngine.layout();
        this.a4LayoutEngine.preview(0);
    }
    
    refreshPreview() {
        this.a4LayoutEngine.setMargin(parseInt(this.$margin.value));
        this.a4LayoutEngine.setBlockGap(parseInt(this.$blockGap.value));
        this.a4LayoutEngine.setBlocks(this.allBlocks);
        this.a4LayoutEngine.layout();
        this.a4LayoutEngine.preview(0);
    }
    
    async exportPDF() {
        try {
            this.$exportPDF.textContent = '导出中...';
            this.$exportPDF.disabled = true;
            
            await this.a4LayoutEngine.exportToPDF('错题本.pdf');
            
            this.$exportPDF.textContent = '导出 PDF';
            this.$exportPDF.disabled = false;
        } catch (error) {
            alert('导出失败: ' + error.message);
            this.$exportPDF.textContent = '导出 PDF';
            this.$exportPDF.disabled = false;
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new ExamPaperExtractor();
});
